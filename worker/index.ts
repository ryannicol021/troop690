import { Hono } from 'hono';
import type { Context } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type Env = {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS: Fetcher;
  PUBLIC_SITE_URL:string;
  INTERIM_SITE_URL:string;
  SESSION_TTL_DAYS:string;
  BOOTSTRAP_SECRET?:string
};

type User = {
  accountId:number;
  personId:number|null;
  username:string;
  permissions:string[];
  person:any
};

type AppEnv = {
  Bindings: Env;
  Variables: {
    user: User | null;
  };
};

const app = new Hono<{Bindings:Env,Variables:{user:User|null}}>();

const json = (c:any, data:any, status=200) => c.json(data,status);

const sha256 = async (s:string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(s)
      )
    )
  )
  .map(x=>x.toString(16).padStart(2,'0'))
  .join('');

const random = (n=32) => {
  const b=new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
};

const b64 = (b:Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replaceAll('+','-')
    .replaceAll('/','_')
    .replaceAll('=','');

const unb64 = (s:string) =>
  Uint8Array.from(
    atob(
      s
        .replaceAll('-','+')
        .replaceAll('_','/')
    ),
    c=>c.charCodeAt(0)
  );

async function hashPassword(
  password: string,
  salt?: Uint8Array
) {
  const s = salt ?? random(16);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: s as unknown as BufferSource,
      iterations: 210000,
      hash: 'SHA-256'
    },
    key,
    256
  );

  return {
    hash: b64(new Uint8Array(bits)),
    salt: b64(s)
  };
}

async function verifyPassword(
  password:string,
  hash:string,
  salt:string
){
  const x=await hashPassword(
    password,
    unb64(salt)
  );

  return x.hash===hash;
}

async function userFromRequest(
  c: Context<AppEnv>
): Promise<User | null> {
  const token = getCookie(c, 'troop690_session');

  if (!token) {
    return null;
  }

  const tokenHash = await sha256(token);

  const row = await c.env.DB
    .prepare(`
      SELECT
        s.account_id,
        a.person_id,
        a.username,
        p.*
      FROM sessions s
      JOIN accounts a ON a.id = s.account_id
      LEFT JOIN people p ON p.id = a.person_id
      WHERE
        s.token_hash = ?
        AND s.expires_at > datetime('now')
        AND a.active = 1
    `)
    .bind(tokenHash)
    .first();

  if (!row) {
    return null;
  }

  const account = row as Record<string, any>;

  const permissionRows = account.person_id
    ? await c.env.DB
        .prepare(`
          SELECT DISTINCT pt.name
          FROM permission_titles pt
          JOIN position_permissions pp
            ON pp.permission_id = pt.id
          JOIN person_positions px
            ON px.position_id = pp.position_id
          WHERE px.person_id = ?
        `)
        .bind(account.person_id)
        .all()
    : { results: [] };

  const defaults = account.person_id
    ? (
        account.adult
          ? (
              account.adult_leader
                ? ['Adult Leader']
                : ['Adult']
            )
          : ['Youth']
      )
    : ['Guest'];

  const permissions = [
    ...new Set([
      ...defaults,
      ...(permissionRows.results ?? []).map(
        (x: Record<string, any>) => String(x.name)
      )
    ])
  ];

  return {
    accountId: Number(account.account_id),
    personId:
      account.person_id == null
        ? null
        : Number(account.person_id),
    username: String(account.username),
    permissions,
    person: account
  };
}

app.use('/api/*', async (c, next) => {
  c.set('user', await userFromRequest(c));
  await next();
});

const requirePerm = (permission: string) => (c: any) => {
  const user = c.get('user') as User | null;

  if (!user) {
    return json(c, { error: 'Login required' }, 401);
  }

  if (!user.permissions.includes(permission)) {
    return json(c, { error: 'Forbidden' }, 403);
  }

  return null;
};

app.get('/api/me',c=>
  json(c,{user:c.get('user')})
);

app.post('/api/login',async c=>{
  const {username,password}=await c.req.json();

  const a=await c.env.DB
    .prepare(
      'SELECT * FROM accounts WHERE username=? AND active=1'
    )
    .bind(String(username??''))
    .first<any>();

  if(
    !a||
    !a.password_hash||
    !a.password_salt||
    !(await verifyPassword(
      String(password??''),
      a.password_hash,
      a.password_salt
    ))
  ){
    return json(
      c,
      {error:'Invalid username or password'},
      401
    );
  }

  const token=b64(random(36));
  const days=Number(
    c.env.SESSION_TTL_DAYS||30
  );

  const exp=new Date(
    Date.now()+days*86400000
  )
    .toISOString()
    .replace('T',' ')
    .slice(0,19);

  await c.env.DB
    .prepare(
      'INSERT INTO sessions(account_id,token_hash,expires_at) VALUES(?,?,?)'
    )
    .bind(
      a.id,
      await sha256(token),
      exp
    )
    .run();

  setCookie(
    c,
    'troop690_session',
    token,
    {
      httpOnly:true,
      secure:true,
      sameSite:'Lax',
      path:'/',
      maxAge:days*86400
    }
  );

  return json(c,{ok:true});
});

app.post('/api/logout',async c=>{
  const t=getCookie(
    c,
    'troop690_session'
  );

  if(t){
    await c.env.DB
      .prepare(
        'DELETE FROM sessions WHERE token_hash=?'
      )
      .bind(await sha256(t))
      .run();
  }

  deleteCookie(
    c,
    'troop690_session',
    {path:'/'}
  );

  return json(c,{ok:true});
});

app.post('/api/bootstrap',async c=>{
  try{
    if(!c.env.BOOTSTRAP_SECRET){
      return json(
        c,
        {error:'Bootstrap disabled'},
        404
      );
    }

    const body=await c.req.json();

    if(body.secret!==c.env.BOOTSTRAP_SECRET){
      return json(
        c,
        {error:'Forbidden'},
        403
      );
    }

    const count=await c.env.DB
      .prepare(
        'SELECT COUNT(*) n FROM accounts WHERE active=1'
      )
      .first<any>();

    if(Number(count?.n)>0){
      return json(
        c,
        {error:'Already bootstrapped'},
        409
      );
    }

    const pos=await c.env.DB
      .prepare(
        "SELECT id FROM positions WHERE name='Scoutmaster'"
      )
      .first<any>();

    if(!pos){
      return json(
        c,
        {error:"Required position 'Scoutmaster' was not found"},
        500
      );
    }

    const admin=await c.env.DB
      .prepare(
        "SELECT id FROM permission_titles WHERE name='Admin'"
      )
      .first<any>();

    if(!admin){
      return json(
        c,
        {error:"Required permission 'Admin' was not found"},
        500
      );
    }

    const pw=await hashPassword(
      String(body.password||'')
    );

    const person=await c.env.DB
      .prepare(`
        INSERT INTO people(
          first_name,
          last_name,
          gender,
          adult,
          adult_leader
        )
        VALUES(?,?,?,?,?)
      `)
      .bind(
        body.firstName||'Administrator',
        body.lastName||'Troop 690',
        'Male',
        1,
        1
      )
      .run();

    const pid=person.meta.last_row_id as number;

    if(!pid){
      return json(
        c,
        {error:'Bootstrap created the person record but could not determine its ID'},
        500
      );
    }

    const a=await c.env.DB
      .prepare(`
        INSERT INTO accounts(
          person_id,
          username,
          password_hash,
          password_salt,
          active
        )
        VALUES(?,?,?,?,1)
      `)
      .bind(
        pid,
        body.username,
        pw.hash,
        pw.salt
      )
      .run();

    await c.env.DB
      .prepare(
        "INSERT OR IGNORE INTO person_positions(person_id,position_id) VALUES(?,?)"
      )
      .bind(
        pid,
        pos.id
      )
      .run();

    await c.env.DB
      .prepare(
        "INSERT OR IGNORE INTO position_permissions(position_id,permission_id) VALUES(?,?)"
      )
      .bind(
        pos.id,
        admin.id
      )
      .run();

    return json(c,{
      ok:true,
      accountId:a.meta.last_row_id,
      personId:pid
    });

  }catch(error){
    console.error('Bootstrap error:',error);

    return json(
      c,
      {
        error:
          error instanceof Error
            ? error.message
            : String(error)
      },
      500
    );
  }
});

app.get('/api/home',async c=>{
  const user=c.get('user');

  const content=await c.env.DB
    .prepare(
      'SELECT key,value FROM site_content'
    )
    .all<any>();

  const events=await c.env.DB
    .prepare(`
      SELECT
        e.*,
        p.first_name||' '||p.last_name leader_name
      FROM events e
      LEFT JOIN people p
        ON p.id=e.leader_person_id
      WHERE e.start_at>=datetime('now')
      ORDER BY e.start_at
      LIMIT 8
    `)
    .all<any>();

  const recent=await c.env.DB
    .prepare(`
      SELECT
        e.id,
        e.title,
        e.start_at,
        (
          SELECT storage_key
          FROM photos ph
          WHERE ph.event_id=e.id
          ORDER BY ph.id DESC
          LIMIT 1
        ) photo
      FROM events e
      WHERE EXISTS(
        SELECT 1
        FROM photos ph
        WHERE ph.event_id=e.id
      )
      ORDER BY e.start_at DESC
      LIMIT 6
    `)
    .all<any>();

  return json(c,{
    content:Object.fromEntries(
      (content.results??[]).map(
        x=>[x.key,x.value]
      )
    ),
    events:user?events.results:[],
    recent:user?recent.results:[]
  });
});

app.get('/api/eagles',async c=>{
  const q=c.req.query('q')?.trim();

  let sql='SELECT * FROM eagles';
  const binds:any[]=[];

  if(q){
    sql+=`
      WHERE
        first_name LIKE ?
        OR middle_name LIKE ?
        OR last_name LIKE ?
        OR CAST(eagle_number AS TEXT)=?
    `;

    const like=`%${q}%`;

    binds.push(
      like,
      like,
      like,
      q
    );
  }

  sql+=`
    ORDER BY
      eagle_year DESC,
      last_name,
      first_name
  `;

  const rows=await c.env.DB
    .prepare(sql)
    .bind(...binds)
    .all<any>();

  const today=new Date()
    .toISOString()
    .slice(0,10);

  return json(c,{
    eagles:(rows.results??[]).map(e=>{
      const eighteenth=new Date(
        e.eighteenth_birthday+'T00:00:00'
      );

      const full=new Date(today)>=eighteenth;

      const middle=e.middle_name
        ? ` ${e.middle_name}`
        : '';

      return {
        ...e,
        display_name:full
          ? `${e.first_name}${middle} ${e.last_name}${e.suffix?' '+e.suffix:''}`
          : `${e.first_name} ${e.last_name[0]}.`
      };
    })
  });
});

app.get('/api/calendar',async c=>{
  const deny=requirePerm('Youth')(c);
  if(deny)return deny;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        e.*,
        p.first_name||' '||p.last_name leader_name
      FROM events e
      LEFT JOIN people p
        ON p.id=e.leader_person_id
      ORDER BY e.start_at
    `)
    .all<any>();

  return json(c,{events:rows.results});
});

app.get('/api/events/:id',async c=>{
  const deny=requirePerm('Youth')(c);
  if(deny)return deny;

  const id=Number(
    c.req.param('id')
  );

  const e=await c.env.DB
    .prepare(`
      SELECT
        e.*,
        p.first_name||' '||p.last_name leader_name
      FROM events e
      LEFT JOIN people p
        ON p.id=e.leader_person_id
      WHERE e.id=?
    `)
    .bind(id)
    .first<any>();

  const docs=await c.env.DB
    .prepare(`
      SELECT d.*
      FROM documents d
      JOIN event_documents ed
        ON ed.document_id=d.id
      WHERE ed.event_id=?
    `)
    .bind(id)
    .all<any>();

  return json(c,{
    event:e,
    documents:docs.results
  });
});

app.post('/api/events/:id/attendance',async c=>{
  const u=c.get('user');

  if(!u||!u.personId){
    return json(
      c,
      {error:'Login required'},
      401
    );
  }

  const id=Number(
    c.req.param('id')
  );

  const x=await c.req.json();

  const target=Number(
    x.personId||u.personId
  );

  if(target!==u.personId){
    const rel=await c.env.DB
      .prepare(`
        SELECT 1
        FROM family_relationships
        WHERE person_id=?
          AND related_person_id=?
          AND role IN ('Parent','Guardian')
      `)
      .bind(
        u.personId,
        target
      )
      .first();

    if(!rel){
      return json(
        c,
        {error:'Not a connected family member'},
        403
      );
    }
  }

  await c.env.DB
    .prepare(`
      INSERT INTO event_attendance(
        event_id,
        person_id,
        status,
        marked_by
      )
      VALUES(?,?,?,?)
      ON CONFLICT(event_id,person_id)
      DO UPDATE SET
        status=excluded.status,
        marked_by=excluded.marked_by,
        updated_at=CURRENT_TIMESTAMP
    `)
    .bind(
      id,
      target,
      x.status||'Attending',
      u.personId
    )
    .run();

  return json(c,{ok:true});
});

app.get('/api/events/:id/attendance',async c=>{
  const d=requirePerm('Youth')(c);
  if(d)return d;

  const id=Number(
    c.req.param('id')
  );

  const u=c.get('user') as User;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        ea.*,
        p.first_name,
        p.last_name
      FROM event_attendance ea
      JOIN people p
        ON p.id=ea.person_id
      WHERE ea.event_id=?
    `)
    .bind(id)
    .all<any>();

  return json(c,{
    attendance:u.permissions.includes('Admin')
      ? rows.results
      : (rows.results??[]).filter(
          (x:any)=>x.person_id===u.personId
        )
  });
});

app.post('/api/admin/events/:id/attendance/confirm',async c=>{
  const d=admin(c);
  if(d)return d;

  const id=Number(
    c.req.param('id')
  );

  const x=await c.req.json();

  for(const item of (x.items||[])){
    await c.env.DB
      .prepare(`
        INSERT INTO event_attendance(
          event_id,
          person_id,
          status,
          marked_by
        )
        VALUES(?,?,?,?)
        ON CONFLICT(event_id,person_id)
        DO UPDATE SET
          status=excluded.status,
          marked_by=excluded.marked_by,
          updated_at=CURRENT_TIMESTAMP
      `)
      .bind(
        id,
        item.personId,
        item.status,
        x.markedBy||null
      )
      .run();
  }

  return json(c,{ok:true});
});

app.get('/api/calendar.ics',async c=>{
  const deny=requirePerm('Youth')(c);
  if(deny)return deny;

  const rows=await c.env.DB
    .prepare(
      'SELECT * FROM events ORDER BY start_at'
    )
    .all<any>();

  const ics=[
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Troop 690//Calendar//EN'
  ];

  for(const e of rows.results??[]){
    const dt=(s:string)=>
      s
        .replace(/[-:]/g,'')
        .replace(/\.\d+$/,'')+'Z';

    ics.push(
      'BEGIN:VEVENT',
      `UID:troop690-${e.id}@troop690.org`,
      `DTSTAMP:${dt(new Date().toISOString())}`,
      `DTSTART:${e.all_day
        ? dt(e.start_at.slice(0,10)+'T00:00:00')
        : dt(e.start_at)
      }`,
      ...(e.end_at
        ? [
            `DTEND:${e.all_day
              ? dt(e.end_at.slice(0,10)+'T00:00:00')
              : dt(e.end_at)
            }`
          ]
        : []
      ),
      `SUMMARY:${String(e.title).replace(/[\\,;]/g,'\\$&')}`,
      `DESCRIPTION:${String(e.description||'').replace(/[\\,;]/g,'\\$&')}`,
      `LOCATION:${String(e.location||'').replace(/[\\,;]/g,'\\$&')}`,
      'END:VEVENT'
    );
  }

  ics.push('END:VCALENDAR');

  return c.text(
    ics.join('\r\n'),
    200,
    {
      'Content-Type':'text/calendar; charset=utf-8'
    }
  );
});

app.get('/api/photos',async c=>{
  const deny=requirePerm('Youth')(c);
  if(deny)return deny;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        e.id,
        e.title,
        e.start_at,
        (
          SELECT COUNT(*)
          FROM photos p
          WHERE p.event_id=e.id
        ) photo_count
      FROM events e
      WHERE EXISTS(
        SELECT 1
        FROM photos p
        WHERE p.event_id=e.id
      )
      ORDER BY e.start_at DESC
    `)
    .all<any>();

  return json(c,{albums:rows.results});
});

app.get('/api/photos/:eventId',async c=>{
  const deny=requirePerm('Youth')(c);
  if(deny)return deny;

  const id=Number(
    c.req.param('eventId')
  );

  const photos=await c.env.DB
    .prepare(
      'SELECT * FROM photos WHERE event_id=? ORDER BY id'
    )
    .bind(id)
    .all<any>();

  return json(c,{photos:photos.results});
});

app.get('/api/documents',async c=>{
  const u=c.get('user');

  if(!u){
    return json(
      c,
      {error:'Login required'},
      401
    );
  }

  const vis=u.permissions.includes('Admin')
    ? `d.visibility IN ('public','member','admin')`
    : `d.visibility IN ('member','public')`;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        d.*,
        e.title event_title
      FROM documents d
      LEFT JOIN event_documents ed
        ON ed.document_id=d.id
      LEFT JOIN events e
        ON e.id=ed.event_id
      WHERE ${vis}
      ORDER BY d.name
    `)
    .all<any>();

  return json(c,{documents:rows.results});
});

app.get('/api/leadership',async c=>{
  const u=c.get('user');
  const member=!!u;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        lp.id,
        lp.name,
        lp.description,
        lp.public_visible,
        lp.visible_order,
        ${member
          ? 'p.first_name||" "||p.last_name'
          : 'NULL'
        } holder
      FROM leadership_positions lp
      LEFT JOIN leadership_holders lh
        ON lh.leadership_position_id=lp.id
      LEFT JOIN people p
        ON p.id=lh.person_id
      WHERE lp.public_visible=1
      ORDER BY lp.visible_order
    `)
    .all<any>();

  const hist=member
    ? await c.env.DB
        .prepare(
          'SELECT * FROM leadership_history ORDER BY end_year DESC,start_year DESC'
        )
        .all<any>()
    : {results:[]};

  return json(c,{
    positions:rows.results,
    history:hist.results
  });
});

app.get('/api/advancement',async c=>{
  const reqs=await c.env.DB
    .prepare(
      'SELECT * FROM advancement_requirements ORDER BY rank,visible_order,id'
    )
    .all<any>();

  const knots=await c.env.DB
    .prepare(
      'SELECT * FROM knots ORDER BY id'
    )
    .all<any>();

  const awards=await c.env.DB
    .prepare(
      'SELECT * FROM awards ORDER BY id'
    )
    .all<any>();

  return json(c,{
    requirements:reqs.results,
    knots:knots.results,
    awards:awards.results
  });
});

app.get('/api/summer-camp',async c=>{
  const camp=await c.env.DB
    .prepare(
      'SELECT * FROM summer_camp WHERE id=1'
    )
    .first<any>();

  const u=c.get('user');

  const docs=await c.env.DB
    .prepare(`
      SELECT *
      FROM documents
      WHERE source_type='summer_camp'
        AND visibility IN ('public'${u?",'member'":''})
      ORDER BY name
    `)
    .all<any>();

  return json(c,{
    camp,
    documents:docs.results
  });
});

app.get('/api/uniform',async c=>{
  const ctn=await c.env.DB
    .prepare(
      "SELECT key,value FROM site_content WHERE key LIKE 'uniform_%'"
    )
    .all<any>();

  const key=await c.env.DB
    .prepare(
      'SELECT * FROM uniform_key ORDER BY image_area,number'
    )
    .all<any>();

  return json(c,{
    content:Object.fromEntries(
      (ctn.results??[]).map(
        x=>[x.key,x.value]
      )
    ),
    key:key.results
  });
});

const admin = (c: any) =>
  requirePerm('Admin')(c);

app.get('/api/admin/members',async c=>{
  const d=admin(c);
  if(d)return d;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        p.*,
        a.username,
        a.active
      FROM people p
      LEFT JOIN accounts a
        ON a.person_id=p.id
      ORDER BY
        p.archived,
        p.adult,
        p.last_name,
        p.first_name
    `)
    .all<any>();

  return json(c,{
    members:rows.results
  });
});

app.get('/api/admin/positions',async c=>{
  const d=admin(c);
  if(d)return d;

  const rows=await c.env.DB
    .prepare(
      'SELECT * FROM positions ORDER BY category,name'
    )
    .all<any>();

  return json(c,{
    positions:rows.results
  });
});

app.post('/api/admin/members',async c=>{
  const d=admin(c);
  if(d)return d;

  const x=await c.req.json();

  if(x.adult_leader&&!x.adult){
    return json(
      c,
      {error:'Adult Leader requires Adult'},
      400
    );
  }

  const r=await c.env.DB
    .prepare(`
      INSERT INTO people(
        prefix,
        first_name,
        middle_name,
        last_name,
        suffix,
        gender,
        adult,
        adult_leader,
        rank,
        dob,
        phone,
        email,
        street,
        town,
        zip,
        join_date,
        cub_scout_pack,
        patrol,
        email_default_opt_out,
        scouting_membership_id,
        registration_expiration,
        syt_expiration,
        oa_member,
        eagle_scout_archive
      )
      VALUES(
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
      )
    `)
    .bind(
      x.prefix||'',
      x.first_name,
      x.middle_name||'',
      x.last_name,
      x.suffix||'',
      x.gender,
      x.adult?1:0,
      x.adult_leader?1:0,
      x.rank||'',
      x.dob||null,
      x.phone||'',
      x.email||'',
      x.street||'',
      x.town||'',
      x.zip||'',
      x.join_date||null,
      x.cub_scout_pack||'',
      x.patrol||'',
      x.email_default_opt_out?1:0,
      x.scouting_membership_id||'',
      x.registration_expiration||null,
      x.syt_expiration||null,
      x.oa_member?1:0,
      x.eagle_scout_archive?1:0
    )
    .run();

  return json(c,{
    id:r.meta.last_row_id
  });
});

app.put('/api/admin/members/:id',async c=>{
  const d=admin(c);
  if(d)return d;

  const id=Number(
    c.req.param('id')
  );

  const x=await c.req.json();

  const cols=[
    'prefix',
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'gender',
    'adult',
    'adult_leader',
    'rank',
    'dob',
    'phone',
    'email',
    'street',
    'town',
    'zip',
    'join_date',
    'cub_scout_pack',
    'patrol',
    'email_default_opt_out',
    'scouting_membership_id',
    'registration_expiration',
    'syt_expiration',
    'oa_member',
    'eagle_scout_archive',
    'archived'
  ];

  const vals=cols.map(
    k=>
      k in x
        ? typeof x[k]==='boolean'
          ? Number(x[k])
          : x[k]
        : undefined
  );

  const sets=cols.filter(
    (k,i)=>vals[i]!==undefined
  );

  const bind=sets.map(
    k=>
      x[k]===true
        ? 1
        : x[k]===false
          ? 0
          : x[k]
  );

  if(x.eagle_scout_archive){
    await c.env.DB
      .prepare(`
        UPDATE people
        SET
          adult=1,
          archived=1,
          eagle_scout_archive=1,
          updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `)
      .bind(id)
      .run();

    await c.env.DB
      .prepare(
        'UPDATE accounts SET active=0 WHERE person_id=?'
      )
      .bind(id)
      .run();
  }

  if(sets.length){
    await c.env.DB
      .prepare(`
        UPDATE people
        SET
          ${sets.map(k=>`${k}=?`).join(',')},
          updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `)
      .bind(...bind,id)
      .run();
  }

  return json(c,{ok:true});
});

app.delete('/api/admin/members/:id',async c=>{
  const d=admin(c);
  if(d)return d;

  const id=Number(
    c.req.param('id')
  );

  await c.env.DB
    .prepare(
      'DELETE FROM people WHERE id=?'
    )
    .bind(id)
    .run();

  return json(c,{ok:true});
});

app.post('/api/admin/invite/:id',async c=>{
  const d=admin(c);
  if(d)return d;

  const id=Number(
    c.req.param('id')
  );

  const p=await c.env.DB
    .prepare(
      'SELECT * FROM people WHERE id=?'
    )
    .bind(id)
    .first<any>();

  if(!p){
    return json(
      c,
      {error:'Not found'},
      404
    );
  }

  const base=(p.first_name+p.last_name)
    .replace(/[^A-Za-z0-9]/g,'');

  let u=base;
  let n=0;

  while(
    await c.env.DB
      .prepare(
        'SELECT id FROM accounts WHERE username=?'
      )
      .bind(u)
      .first()
  ){
    u=base+(++n);
  }

  const token=b64(random(36));
  const exp=new Date(
    Date.now()+72*3600000
  ).toISOString();

  const ih=await sha256(token);

  await c.env.DB
    .prepare(`
      INSERT OR REPLACE INTO accounts(
        person_id,
        username,
        active,
        invite_token_hash,
        invite_expires_at
      )
      VALUES(?,?,0,?,?)
    `)
    .bind(
      id,
      u,
      ih,
      exp
    )
    .run();

  return json(c,{
    username:u,
    inviteUrl:
      `${c.env.PUBLIC_SITE_URL}/claim/${encodeURIComponent(token)}`
  });
});

app.post('/api/claim',async c=>{
  const x=await c.req.json();

  const h=await sha256(
    x.token||''
  );

  const a=await c.env.DB
    .prepare(`
      SELECT *
      FROM accounts
      WHERE invite_token_hash=?
        AND invite_expires_at>datetime('now')
        AND active=0
    `)
    .bind(h)
    .first<any>();

  if(!a){
    return json(
      c,
      {error:'Invalid or expired invitation'},
      400
    );
  }

  const pw=await hashPassword(
    x.password||''
  );

  await c.env.DB
    .prepare(`
      UPDATE accounts
      SET
        username=?,
        password_hash=?,
        password_salt=?,
        active=1,
        invite_token_hash=NULL,
        invite_expires_at=NULL
      WHERE id=?
    `)
    .bind(
      x.username||a.username,
      pw.hash,
      pw.salt,
      a.id
    )
    .run();

  return json(c,{ok:true});
});

app.get('/api/admin/quick-text.csv',async c=>{
  const d=admin(c);
  if(d)return d;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        first_name,
        last_name,
        phone,
        email,
        adult,
        adult_leader,
        archived
      FROM people
      WHERE archived=0
      ORDER BY adult,last_name,first_name
    `)
    .all<any>();

  const scouts=(rows.results??[])
    .filter(x=>!x.adult);

  const adults=(rows.results??[])
    .filter(x=>x.adult);

  const out=[
    'SCOUTS',
    'Name,Phone'
  ];

  for(const x of scouts){
    out.push(
      `"${x.last_name}, ${x.first_name}","${x.phone||''}"`
    );
  }

  out.push(
    '',
    'ADULTS AND ADULT LEADERS',
    'Name,Phone'
  );

  for(const x of adults){
    out.push(
      `"${x.last_name}, ${x.first_name}","${x.phone||''}"`
    );
  }

  return c.text(
    out.join('\r\n'),
    200,
    {
      'Content-Type':'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="troop690-quick-text.csv"'
    }
  );
});

app.get('/api/admin/emergency-contacts.csv',async c=>{
  const d=admin(c);
  if(d)return d;

  const scouts=await c.env.DB
    .prepare(`
      SELECT *
      FROM people
      WHERE adult=0
        AND archived=0
      ORDER BY last_name,first_name
    `)
    .all<any>();

  const out=[
    'Scout Name,Contact 1 Name,Contact 1 Phone,Contact 2 Name,Contact 2 Phone'
  ];

  for(const s of scouts.results??[]){
    const rs=await c.env.DB
      .prepare(`
        SELECT
          p.*,
          fr.role
        FROM family_relationships fr
        JOIN people p
          ON p.id=fr.related_person_id
        WHERE fr.person_id=?
          AND fr.role IN ('Parent','Guardian')
      `)
      .bind(s.id)
      .all<any>();

    const list=(rs.results??[])
      .sort((a,b)=>{
        const rank=(x:any)=>
          x.role==='Parent'?0:1;

        return rank(a)-rank(b)
          ||a.last_name.localeCompare(b.last_name)
          ||a.first_name.localeCompare(b.first_name)
      });

    const a=list[0];
    const b=list[1];

    out.push(
      [
        `${s.last_name}, ${s.first_name}`,
        a?.first_name||'',
        a?.phone||'',
        b?.first_name||'',
        b?.phone||''
      ]
      .map(
        v=>`"${String(v).replaceAll('"','""')}"`
      )
      .join(',')
    );
  }

  return c.text(
    out.join('\r\n'),
    200,
    {
      'Content-Type':'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="troop690-emergency-contacts.csv"'
    }
  );
});

app.post('/api/admin/upload',async c=>{
  const d=admin(c);
  if(d)return d;

  const form=await c.req.formData();
  const file=form.get('file');
  const kind=String(
    form.get('kind')||'file'
  );

  if(!(file instanceof File)){
    return json(
      c,
      {error:'File required'},
      400
    );
  }

  const key=
    `${kind}/${Date.now()}-${file.name.replace(/[^A-Za-z0-9._-]/g,'_')}`;

  await c.env.FILES.put(
    key,
    file.stream(),
    {
      httpMetadata:{
        contentType:file.type
      }
    }
  );

  if(kind.startsWith('site:')){
    const keyName=kind.slice(5);

    await c.env.DB
      .prepare(`
        INSERT INTO site_content(key,value)
        VALUES(?,?)
        ON CONFLICT(key)
        DO UPDATE SET value=excluded.value
      `)
      .bind(
        keyName,
        key
      )
      .run();
  }

  return json(c,{key});
});

app.get('/files/:key{.+}',async c=>{
  const obj=await c.env.FILES.get(
    c.req.param('key')
  );

  if(!obj)return c.notFound();

  return new Response(
    obj.body,
    {
      headers:{
        'Content-Type':
          obj.httpMetadata?.contentType
          ||'application/octet-stream',
        'Cache-Control':
          'private, max-age=3600'
      }
    }
  );
});

app.post('/api/admin/events',async c=>{
  const d=admin(c);
  if(d)return d;

  const x=await c.req.json();

  const r=await c.env.DB
    .prepare(`
      INSERT INTO events(
        title,
        description,
        start_at,
        end_at,
        all_day,
        leader_person_id,
        uniform,
        estimated_cost,
        location,
        departure_location,
        return_location
      )
      VALUES(?,?,?,?,?,?,?,?,?,?,?)
    `)
    .bind(
      x.title,
      x.description||'',
      x.start_at,
      x.end_at||null,
      x.all_day?1:0,
      x.leader_person_id||null,
      x.uniform||'',
      x.estimated_cost||'',
      x.location||'',
      x.departure_location||'',
      x.return_location||''
    )
    .run();

  return json(c,{
    id:r.meta.last_row_id
  });
});

app.put('/api/admin/events/:id',async c=>{
  const d=admin(c);
  if(d)return d;

  const id=Number(
    c.req.param('id')
  );

  const x=await c.req.json();

  await c.env.DB
    .prepare(`
      UPDATE events
      SET
        title=?,
        description=?,
        start_at=?,
        end_at=?,
        all_day=?,
        leader_person_id=?,
        uniform=?,
        estimated_cost=?,
        location=?,
        departure_location=?,
        return_location=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `)
    .bind(
      x.title,
      x.description||'',
      x.start_at,
      x.end_at||null,
      x.all_day?1:0,
      x.leader_person_id||null,
      x.uniform||'',
      x.estimated_cost||'',
      x.location||'',
      x.departure_location||'',
      x.return_location||'',
      id
    )
    .run();

  return json(c,{ok:true});
});

app.delete('/api/admin/events/:id',async c=>{
  const d=admin(c);
  if(d)return d;

  await c.env.DB
    .prepare(
      'DELETE FROM events WHERE id=?'
    )
    .bind(
      Number(c.req.param('id'))
    )
    .run();

  return json(c,{ok:true});
});

app.post('/api/admin/photos',async c=>{
  const d=admin(c);
  if(d)return d;

  const form=await c.req.formData();
  const eventId=Number(
    form.get('eventId')
  );

  const file=form.get('file');
  const caption=String(
    form.get('caption')||''
  );

  if(!(file instanceof File)){
    return json(
      c,
      {error:'File required'},
      400
    );
  }

  const key=
    `photos/${eventId}/${Date.now()}-${file.name.replace(/[^A-Za-z0-9._-]/g,'_')}`;

  await c.env.FILES.put(
    key,
    file.stream(),
    {
      httpMetadata:{
        contentType:file.type
      }
    }
  );

  const r=await c.env.DB
    .prepare(`
      INSERT INTO photos(
        event_id,
        storage_key,
        caption
      )
      VALUES(?,?,?)
    `)
    .bind(
      eventId,
      key,
      caption
    )
    .run();

  return json(c,{
    id:r.meta.last_row_id,
    key
  });
});

app.delete('/api/admin/photos/:id',async c=>{
  const d=admin(c);
  if(d)return d;

  const id=Number(
    c.req.param('id')
  );

  const p=await c.env.DB
    .prepare(
      'SELECT storage_key FROM photos WHERE id=?'
    )
    .bind(id)
    .first<any>();

  if(p){
    await c.env.FILES.delete(
      p.storage_key
    );
  }

  await c.env.DB
    .prepare(
      'DELETE FROM photos WHERE id=?'
    )
    .bind(id)
    .run();

  return json(c,{ok:true});
});

app.post('/api/admin/documents',async c=>{
  const d=admin(c);
  if(d)return d;

  const form=await c.req.formData();

  const name=String(
    form.get('name')||''
  );

  const visibility=String(
    form.get('visibility')||'member'
  );

  const url=String(
    form.get('url')||''
  );

  const file=form.get('file');
  let key:string|null=null;

  if(file instanceof File){
    key=
      `documents/${Date.now()}-${file.name.replace(/[^A-Za-z0-9._-]/g,'_')}`;

    await c.env.FILES.put(
      key,
      file.stream(),
      {
        httpMetadata:{
          contentType:file.type
        }
      }
    );
  }

  const r=await c.env.DB
    .prepare(`
      INSERT INTO documents(
        name,
        external_url,
        storage_key,
        visibility,
        source_type,
        source_id
      )
      VALUES(?,?,?,?,?,?)
    `)
    .bind(
      name,
      url||null,
      key,
      visibility,
      'standalone',
      null
    )
    .run();

  return json(c,{
    id:r.meta.last_row_id
  });
});

app.delete('/api/admin/documents/:id',async c=>{
  const d=admin(c);
  if(d)return d;

  const id=Number(
    c.req.param('id')
  );

  const doc=await c.env.DB
    .prepare(
      'SELECT storage_key FROM documents WHERE id=?'
    )
    .bind(id)
    .first<any>();

  if(doc?.storage_key){
    await c.env.FILES.delete(
      doc.storage_key
    );
  }

  await c.env.DB
    .prepare(
      'DELETE FROM documents WHERE id=?'
    )
    .bind(id)
    .run();

  return json(c,{ok:true});
});

app.put('/api/settings',async c=>{
  const u=c.get('user');

  if(!u||!u.personId){
    return json(
      c,
      {error:'Login required'},
      401
    );
  }

  const x=await c.req.json();

  const cols=[
    'prefix',
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'dob',
    'phone',
    'email',
    'street',
    'town',
    'zip'
  ];

  const vals=cols.map(
    k=>x[k]??''
  );

  await c.env.DB
    .prepare(`
      UPDATE people
      SET
        ${cols.map(k=>k+'=?').join(',')},
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `)
    .bind(
      ...vals,
      u.personId
    )
    .run();

  return json(c,{ok:true});
});

app.post('/api/permissions/sign',async c=>{
  const u=c.get('user');

  if(!u||!u.personId){
    return json(
      c,
      {error:'Login required'},
      401
    );
  }

  const x=await c.req.json();

  const rel=await c.env.DB
    .prepare(`
      SELECT 1
      FROM family_relationships
      WHERE person_id=?
        AND related_person_id=?
        AND role IN ('Parent','Guardian')
    `)
    .bind(
      u.personId,
      x.scoutPersonId
    )
    .first();

  if(!rel){
    return json(
      c,
      {error:'Only a connected parent/guardian can sign'},
      403
    );
  }

  const templateKey=await c.env.DB
    .prepare(
      "SELECT value FROM site_content WHERE key='ahmr_template'"
    )
    .first<any>();

  if(!templateKey?.value){
    return json(
      c,
      {
        error:
          'An administrator must upload the official AHMR PDF template first'
      },
      400
    );
  }

  const tpl=await c.env.FILES.get(
    templateKey.value
  );

  if(!tpl){
    return json(
      c,
      {error:'AHMR template missing'},
      400
    );
  }

  const pdf=await PDFDocument.load(
    await tpl.arrayBuffer()
  );

  const page=pdf.getPages()[0];
  const font=await pdf.embedFont(
    StandardFonts.Helvetica
  );

  page.drawText(
    `Digital signature: ${String(x.signature||'').slice(0,100)}`,
    {
      x:50,
      y:45,
      size:10,
      font,
      color:rgb(0,0,0)
    }
  );

  page.drawText(
    `Signed: ${new Date().toLocaleString('en-US')}`,
    {
      x:50,
      y:30,
      size:8,
      font,
      color:rgb(0,0,0)
    }
  );

  const bytes=await pdf.save();

  const key=
    `permissions/${x.eventId}/${Date.now()}-${u.personId}.pdf`;

  await c.env.FILES.put(
    key,
    bytes,
    {
      httpMetadata:{
        contentType:'application/pdf'
      }
    }
  );

  const r=await c.env.DB
    .prepare(`
      INSERT INTO permission_forms(
        event_id,
        parent_person_id,
        scout_person_id,
        signature,
        pdf_storage_key
      )
      VALUES(?,?,?,?,?)
    `)
    .bind(
      x.eventId,
      u.personId,
      x.scoutPersonId,
      x.signature,
      key
    )
    .run();

  return json(c,{
    id:r.meta.last_row_id
  });
});

app.get('/api/admin/account-logins',async c=>{
  const d=admin(c);
  if(d)return d;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        a.id,
        a.username,
        a.active,
        p.id person_id,
        p.first_name,
        p.last_name
      FROM accounts a
      LEFT JOIN people p
        ON p.id=a.person_id
      ORDER BY
        p.last_name,
        p.first_name
    `)
    .all<any>();

  return json(c,{
    accounts:rows.results
  });
});

app.put('/api/admin/account-logins/:id',async c=>{
  const d=admin(c);
  if(d)return d;

  const id=Number(
    c.req.param('id')
  );

  const x=await c.req.json();

  await c.env.DB
    .prepare(
      'UPDATE accounts SET username=? WHERE id=?'
    )
    .bind(
      x.username,
      id
    )
    .run();

  return json(c,{ok:true});
});

app.delete('/api/admin/account-logins/:id',async c=>{
  const d=admin(c);
  if(d)return d;

  await c.env.DB
    .prepare(
      'DELETE FROM accounts WHERE id=?'
    )
    .bind(
      Number(c.req.param('id'))
    )
    .run();

  return json(c,{ok:true});
});

app.get('*',async c=>{
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
