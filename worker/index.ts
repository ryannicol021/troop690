import { Hono } from 'hono';
import type { Context } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type Env = { DB: D1Database; FILES: R2Bucket; ASSETS: Fetcher; PUBLIC_SITE_URL:string; INTERIM_SITE_URL:string; SESSION_TTL_DAYS:string; BOOTSTRAP_SECRET?:string; GEOAPIFY_API_KEY?:string };
type User = {
  accountId:number;
  personId:number|null;
  username:string;
  permissions:string[];
  isAdministrator:boolean;
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
const sha256 = async (s:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const random = (n=32) => { const b=new Uint8Array(n); crypto.getRandomValues(b); return b; };
const b64 = (b:Uint8Array) => btoa(String.fromCharCode(...b)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unb64 = (s:string) => Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));

async function hashPassword(password: string, salt?: Uint8Array) {
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
      iterations: 100000,
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

async function verifyPassword(password:string,hash:string,salt:string){
  const x=await hashPassword(password,unb64(salt));
  return x.hash===hash;
}

async function ensurePermissionSchema(c: Context<AppEnv>) {
  const permissionCols = await c.env.DB
    .prepare('PRAGMA table_info(permission_titles)')
    .all<any>();

  const permissionNames = new Set(
    (permissionCols.results ?? []).map((x:any)=>String(x.name))
  );

  if(!permissionNames.has('code')){
    await c.env.DB.prepare(
      'ALTER TABLE permission_titles ADD COLUMN code TEXT'
    ).run();
  }

  if(!permissionNames.has('description')){
    await c.env.DB.prepare(
      "ALTER TABLE permission_titles ADD COLUMN description TEXT NOT NULL DEFAULT ''"
    ).run();
  }

  if(!permissionNames.has('system')){
    await c.env.DB.prepare(
      'ALTER TABLE permission_titles ADD COLUMN system INTEGER NOT NULL DEFAULT 0'
    ).run();
  }

  await c.env.DB.prepare(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_titles_code ON permission_titles(code)'
  ).run();

  const positionCols = await c.env.DB
    .prepare('PRAGMA table_info(positions)')
    .all<any>();

  const positionNames = new Set(
    (positionCols.results ?? []).map((x:any)=>String(x.name))
  );

  if(!positionNames.has('code')){
    await c.env.DB.prepare(
      'ALTER TABLE positions ADD COLUMN code TEXT'
    ).run();
  }

  if(!positionNames.has('system')){
    await c.env.DB.prepare(
      'ALTER TABLE positions ADD COLUMN system INTEGER NOT NULL DEFAULT 0'
    ).run();
  }

  await c.env.DB.prepare(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_code ON positions(code)'
  ).run();

  await c.env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS position_base_roles(
      position_id INTEGER NOT NULL,
      base_position_id INTEGER NOT NULL,
      PRIMARY KEY(position_id,base_position_id),
      FOREIGN KEY(position_id) REFERENCES positions(id) ON DELETE CASCADE,
      FOREIGN KEY(base_position_id) REFERENCES positions(id) ON DELETE CASCADE
    )
  `).run();

const permissions=[
  ['CAL','View Calendar','View Calendar'],
  ['PHV','View Photo Gallery','View Photo Gallery'],
  ['DOCV','View Documents','View Documents'],
  ['LDV','View Member Leadership','View Member Leadership'],
  ['HSTV','View Leadership History','View Leadership History'],
  ['SET','Settings','Settings'],
  ['MIV','View Member Info','View Member Info'],
  ['MIE','Edit Member Info','Edit Member Info'],
  ['MDEL','Delete Members','Delete Members'],
  ['INV','Invite Accounts','Invite Accounts'],
  ['ACCT','Manage Account Logins','Manage Account Logins'],
  ['EML','View Email','View Email'],
  ['EMS','Send Email','Send Email'],
  ['EVT','Manage Calendar','Manage Calendar'],
  ['ATTV','View Attendance','View Attendance'],
  ['ATTM','Manage Attendance','Manage Attendance'],
  ['SIGN','Sign Digital Permissions','Sign Digital Permissions'],
  ['PHOTO','Manage Photos','Manage Photos'],
  ['DOC','Manage Documents','Manage Documents'],
  ['EAGLE','Manage Eagle Scouts','Manage Eagle Scouts'],
  ['LEAD','Manage Leadership','Manage Leadership'],
  ['HIST','Manage Leadership History','Manage Leadership History'],
  ['ADV','Manage Advancement','Manage Advancement'],
  ['CAMP','Manage Summer Camp','Manage Summer Camp'],
  ['UNIF','Manage Uniform','Manage Uniform'],
  ['HOME','Manage Homepage','Manage Homepage'],
  ['CONT','Manage Contact','Manage Contact'],
  ['POS','Manage Positions','Manage Positions'],
  ['PMAP','Manage Position Permissions','Manage Position Permissions'],
  ['PERM','Manage Permissions','Manage Permissions']
];

  for(const [code,name,description] of permissions){
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO permission_titles(
        code,name,description,system
      ) VALUES(?,?,?,1)
    `).bind(code,name,description).run();

    await c.env.DB.prepare(`
      UPDATE permission_titles
      SET name=?,description=?,system=1
      WHERE code=?
    `).bind(name,description,code).run();
  }

  await c.env.DB.batch([
    c.env.DB.prepare(`
      INSERT OR IGNORE INTO positions(name,category,code,system)
      VALUES('Guest','other','GUEST',1)
    `),
    c.env.DB.prepare(`
      INSERT OR IGNORE INTO positions(name,category,code,system)
      VALUES('Youth','youth','YOUTH',1)
    `),
    c.env.DB.prepare(`
      INSERT OR IGNORE INTO positions(name,category,code,system)
      VALUES('Adult','adult','ADULT',1)
    `),
    c.env.DB.prepare(`
      INSERT OR IGNORE INTO positions(name,category,code,system)
      VALUES('Adult Leader','adult','ADULTL',1)
    `),
    c.env.DB.prepare(`
      INSERT OR IGNORE INTO positions(name,category,code,system)
      VALUES('Administrator','adult','ADMIN',1)
    `)
  ]);

  await c.env.DB.batch([
    c.env.DB.prepare(`
      UPDATE positions
      SET code='GUEST',system=1,category='other'
      WHERE name='Guest'
    `),
    c.env.DB.prepare(`
      UPDATE positions
      SET code='YOUTH',system=1,category='youth'
      WHERE name='Youth'
    `),
    c.env.DB.prepare(`
      UPDATE positions
      SET code='ADULT',system=1,category='adult'
      WHERE name='Adult'
    `),
    c.env.DB.prepare(`
      UPDATE positions
      SET code='ADULTL',system=1,category='adult'
      WHERE name='Adult Leader'
    `),
    c.env.DB.prepare(`
      UPDATE positions
      SET code='ADMIN',system=1,category='adult'
      WHERE name='Administrator'
    `)
  ]);

  const oldAdminPermission=await c.env.DB.prepare(`
    SELECT id
    FROM permission_titles
    WHERE code='ADMIN'
  `).first<any>();

  const administrator=await c.env.DB.prepare(`
    SELECT id
    FROM positions
    WHERE code='ADMIN'
  `).first<any>();

  if(oldAdminPermission?.id&&administrator?.id){
    const legacyAdmins=await c.env.DB.prepare(`
      SELECT DISTINCT pp.person_id
      FROM person_positions pp
      JOIN position_permissions px
        ON px.position_id=pp.position_id
      WHERE px.permission_id=?
    `).bind(oldAdminPermission.id).all<any>();

    for(const row of (legacyAdmins.results??[])){
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO person_positions(
          person_id,
          position_id
        )
        VALUES(?,?)
      `).bind(
        Number(row.person_id),
        Number(administrator.id)
      ).run();
    }

    await c.env.DB.prepare(`
      DELETE FROM position_permissions
      WHERE permission_id=?
    `).bind(oldAdminPermission.id).run();

    await c.env.DB.prepare(`
      DELETE FROM permission_titles
      WHERE id=?
    `).bind(oldAdminPermission.id).run();
  }

  const allPermissions=await c.env.DB.prepare(`
    SELECT id
    FROM permission_titles
  `).all<any>();

  for(const row of (allPermissions.results??[])){
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO position_permissions(
        position_id,
        permission_id
      )
      VALUES(?,?)
    `).bind(
      Number(administrator.id),
      Number(row.id)
    ).run();
  }

  await c.env.DB.prepare(`
    INSERT OR IGNORE INTO position_permissions(
      position_id,
      permission_id
    )
    SELECT ?,id
    FROM permission_titles
  `).bind(administrator.id).run();
}

async function userFromRequest(c: Context<AppEnv>): Promise<User | null> {
  const token=getCookie(c,'troop690_session');

  if(!token)
    return null;

  const tokenHash=await sha256(token);

  const row=await c.env.DB.prepare(`
    SELECT
      s.account_id,
      a.person_id,
      a.username,
      p.*
    FROM sessions s
    JOIN accounts a
      ON a.id=s.account_id
    LEFT JOIN people p
      ON p.id=a.person_id
    WHERE s.token_hash=?
      AND s.expires_at>datetime('now')
      AND a.active=1
  `)
    .bind(tokenHash)
    .first<any>();

  if(!row)
    return null;

  const positionRows=row.person_id?
    await c.env.DB.prepare(`
      SELECT id,name,code
      FROM positions
      WHERE name=CASE
        WHEN ?=1 THEN 'Adult'
        ELSE 'Youth'
      END

      UNION

      SELECT id,name,code
      FROM positions
      WHERE name='Adult Leader'
        AND ?=1

      UNION

      SELECT DISTINCT
        pos.id,
        pos.name,
        pos.code
      FROM positions pos
      JOIN person_positions pp
        ON pp.position_id=pos.id
      WHERE pp.person_id=?
    `)
      .bind(
        Number(row.adult),
        Number(row.adult_leader),
        Number(row.person_id)
      )
      .all<any>()
    :
    await c.env.DB.prepare(`
      SELECT id,name,code
      FROM positions
      WHERE code='GUEST'
    `)
      .all<any>();

  const startingIds=(positionRows.results??[])
    .map((x:any)=>Number(x.id));

  const seen=new Set<number>();
  const queue=[...startingIds];
  const roleTree:number[]=[];

  while(queue.length){
    const id=Number(queue.shift());

    if(seen.has(id))
      continue;

    seen.add(id);
    roleTree.push(id);

    const bases=await c.env.DB.prepare(`
      SELECT base_position_id
      FROM position_base_roles
      WHERE position_id=?
    `)
      .bind(id)
      .all<any>();

    for(const row of (bases.results??[])){
      const baseId=Number(row.base_position_id);

      if(!seen.has(baseId))
        queue.push(baseId);
    }
  }

  let isAdministrator=false;

  if(roleTree.length){
    const adminRow=await c.env.DB.prepare(`
      SELECT 1
      FROM positions
      WHERE id IN(${roleTree.map(()=>'?').join(',')})
        AND code='ADMIN'
      LIMIT 1
    `)
      .bind(...roleTree)
      .first<any>();

    isAdministrator=!!adminRow;
  }

  let permissions:string[]=[];

  if(isAdministrator){
    const result=await c.env.DB.prepare(`
      SELECT code
      FROM permission_titles
      WHERE code IS NOT NULL
        AND code<>'ADMIN'
    `)
      .all<any>();

    permissions=(result.results??[])
      .map((x:any)=>String(x.code));
  }else if(roleTree.length){
    const result=await c.env.DB.prepare(`
      SELECT DISTINCT p.code
      FROM permission_titles p
      JOIN position_permissions pp
        ON pp.permission_id=p.id
      WHERE pp.position_id IN(${roleTree.map(()=>'?').join(',')})
        AND p.code IS NOT NULL
        AND p.code<>'ADMIN'
    `)
      .bind(...roleTree)
      .all<any>();

    permissions=(result.results??[])
      .map((x:any)=>String(x.code));
  }

  return {
    accountId:Number(row.account_id),
    personId:
      row.person_id==null?
        null:
        Number(row.person_id),
    username:String(row.username),
    permissions:[...new Set(permissions)],
    isAdministrator,
    person:row
  };
}

async function ensurePatrolSchema(c: Context<AppEnv>){
  await c.env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS patrol_units(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      custom_name INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await c.env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS patrol_members(
      patrol_id INTEGER NOT NULL,
      person_id INTEGER NOT NULL UNIQUE,
      PRIMARY KEY(patrol_id,person_id),
      FOREIGN KEY(patrol_id)
        REFERENCES patrol_units(id)
        ON DELETE CASCADE,
      FOREIGN KEY(person_id)
        REFERENCES people(id)
        ON DELETE CASCADE
    )
  `).run();

  await c.env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS individual_patrol_members(
      person_id INTEGER PRIMARY KEY,
      FOREIGN KEY(person_id)
        REFERENCES people(id)
        ON DELETE CASCADE
    )
  `).run();

  const count=await c.env.DB
    .prepare(
      'SELECT COUNT(*) count FROM patrol_units'
    )
    .first<any>();

  if(Number(count?.count||0)>0)
    return;

  const legacy=await c.env.DB
    .prepare(`
      SELECT
        id,
        patrol
      FROM people
      WHERE adult=0
        AND archived=0
        AND TRIM(COALESCE(patrol,''))<>''
    `)
    .all<any>();

  const patrolIds=new Map<string,number>();

  for(const row of (legacy.results??[])){
    const name=String(
      row.patrol||''
    ).trim();

    if(!name)
      continue;

    let patrolId=patrolIds.get(name);

    if(patrolId==null){
      const existing=await c.env.DB
        .prepare(`
          SELECT id
          FROM patrol_units
          WHERE name=?
        `)
        .bind(name)
        .first<any>();

      if(existing){
        patrolId=Number(existing.id);
      }else{
        const created=await c.env.DB
          .prepare(`
            INSERT INTO patrol_units(
              name,
              custom_name
            )
            VALUES(?,0)
          `)
          .bind(name)
          .run();

        patrolId=Number(
          created.meta.last_row_id
        );
      }

      patrolIds.set(
        name,
        patrolId
      );
    }

    await c.env.DB
      .prepare(`
        INSERT OR IGNORE INTO patrol_members(
          patrol_id,
          person_id
        )
        VALUES(?,?)
      `)
      .bind(
        patrolId,
        Number(row.id)
      )
      .run();
  }
}

async function ensureFamilySchema(c: Context<AppEnv>) {
  await c.env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS family_units(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await c.env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS family_members(
      family_id INTEGER NOT NULL,
      person_id INTEGER NOT NULL UNIQUE,
      PRIMARY KEY(family_id,person_id),
      FOREIGN KEY(family_id)
        REFERENCES family_units(id)
        ON DELETE CASCADE,
      FOREIGN KEY(person_id)
        REFERENCES people(id)
        ON DELETE CASCADE
    )
  `).run();

  await c.env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS family_individuals(
      person_id INTEGER PRIMARY KEY,
      FOREIGN KEY(person_id)
        REFERENCES people(id)
        ON DELETE CASCADE
    )
  `).run();

  await c.env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS family_schema_meta(
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `).run();

  const migrated=await c.env.DB
    .prepare(
      "SELECT value FROM family_schema_meta WHERE key='relationship_migration'"
    )
    .first<any>();

  if(migrated?.value==='done')
    return;

  const people=await c.env.DB
    .prepare(`
      SELECT id,first_name,last_name
      FROM people
    `)
    .all<any>();

  const byId=new Map<number,any>();

  for(const person of people.results??[])
    byId.set(
      Number(person.id),
      person
    );

  const relationships=await c.env.DB
    .prepare(`
      SELECT person_id,related_person_id
      FROM family_relationships
      WHERE role IN('Parent','Guardian','Sibling')
    `)
    .all<any>();

  const adjacency=new Map<number,Set<number>>();

  const connect=(a:number,b:number)=>{
    if(!adjacency.has(a))
      adjacency.set(a,new Set());

    if(!adjacency.has(b))
      adjacency.set(b,new Set());

    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  };

  for(const row of relationships.results??[])
    connect(
      Number(row.person_id),
      Number(row.related_person_id)
    );

  const visited=new Set<number>();

  const uniqueName=async(base:string)=>{
    const clean=base.trim()||'Family';
    let name=clean;
    let n=1;

    while(await c.env.DB.prepare(
      'SELECT id FROM family_units WHERE name=?'
    ).bind(name).first()){
      n++;
      name=`${clean} (${n})`;
    }

    return name;
  };

  for(const start of adjacency.keys()){
    if(visited.has(start))
      continue;

    const stack=[start];
    const component:number[]=[];

    while(stack.length){
      const id=stack.pop()!;

      if(visited.has(id))
        continue;

      visited.add(id);
      component.push(id);

      for(const next of adjacency.get(id)??[])
        if(!visited.has(next))
          stack.push(next);
    }

    if(component.length<2)
      continue;

    component.sort((a,b)=>{
      const pa=byId.get(a)??{};
      const pb=byId.get(b)??{};

      return String(
        pa.last_name||''
      ).localeCompare(
        String(pb.last_name||'')
      )||
      String(
        pa.first_name||''
      ).localeCompare(
        String(pb.first_name||'')
      );
    });

    const first=byId.get(
      component[0]
    )??{};

    const name=await uniqueName(
      String(first.last_name||'Family')
    );

    const family=await c.env.DB
      .prepare(
        'INSERT INTO family_units(name) VALUES(?) RETURNING id'
      )
      .bind(name)
      .first<any>();

    const familyId=Number(family?.id);

    for(const personId of component){
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO family_members(
          family_id,
          person_id
        )
        VALUES(?,?)
      `)
        .bind(
          familyId,
          personId
        )
        .run();
    }
  }

  await c.env.DB.prepare(
    "INSERT OR REPLACE INTO family_schema_meta(key,value) VALUES('relationship_migration','done')"
  ).run();
}

async function ensureSiteAdministratorSchema(c: Context<AppEnv>){
  await c.env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS site_administrator(
      id INTEGER PRIMARY KEY CHECK(id=1),
      person_id INTEGER NOT NULL UNIQUE
    )
  `).run();

  const current=await c.env.DB
    .prepare(`
      SELECT person_id
      FROM site_administrator
      WHERE id=1
    `)
    .first<any>();

  const admins=await c.env.DB
    .prepare(`
      SELECT DISTINCT pp.person_id
      FROM person_positions pp
      JOIN positions pos
        ON pos.id=pp.position_id
      JOIN people p
        ON p.id=pp.person_id
      WHERE pos.code='ADMIN'
        AND p.archived=0
      ORDER BY p.last_name,p.first_name
    `)
    .all<any>();

  const adminIds=(admins.results??[])
    .map((x:any)=>Number(x.person_id));

  if(!current){
    if(adminIds.length){
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO site_administrator(
          id,
          person_id
        )
        VALUES(1,?)
      `)
        .bind(adminIds[0])
        .run();
    }
  }else if(!adminIds.includes(Number(current.person_id))){
    if(adminIds.length){
      await c.env.DB.prepare(`
        UPDATE site_administrator
        SET person_id=?
        WHERE id=1
      `)
        .bind(adminIds[0])
        .run();
    }else{
      await c.env.DB.prepare(`
        DELETE FROM site_administrator
        WHERE id=1
      `).run();
    }
  }
}

async function ensureEventSchema(c:Context<AppEnv>){
  const cols=await c.env.DB
    .prepare(
      'PRAGMA table_info(events)'
    )
    .all<any>();

  const names=new Set(
    (cols.results??[]).map(
      (x:any)=>String(x.name)
    )
  );

  const additions=[
    ['event_type',"TEXT DEFAULT 'Other'"],
    ['location_name',"TEXT DEFAULT ''"],
    ['location_address',"TEXT DEFAULT ''"],
    ['departure_arrival_location_name',"TEXT DEFAULT ''"],
    ['departure_arrival_location_address',"TEXT DEFAULT ''"],
    ['dress_code',"TEXT DEFAULT ''"],
    ['service_hours',"REAL"],
    ['camping_nights',"REAL"],
    ['hiking_miles',"REAL"],
    ['leader_1_id',"INTEGER"],
    ['leader_2_id',"INTEGER"]
  ];

  for(const [name,type] of additions){
    if(!names.has(name)){
      await c.env.DB.prepare(`
        ALTER TABLE events
        ADD COLUMN ${name} ${type}
      `).run();
    }
  }
}

async function ensureAccountLinkSchema(c:Context<AppEnv>){
  const cols=await c.env.DB
    .prepare(
      'PRAGMA table_info(accounts)'
    )
    .all<any>();

  const names=new Set(
    (cols.results??[]).map(
      (x:any)=>String(x.name)
    )
  );

  if(!names.has('account_link_token')){
    await c.env.DB.prepare(`
      ALTER TABLE accounts
      ADD COLUMN account_link_token TEXT
    `).run();
  }

  await c.env.DB.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_accounts_account_link_token
    ON accounts(account_link_token)
  `).run();

  const rows=await c.env.DB
    .prepare(`
      SELECT id
      FROM accounts
      WHERE account_link_token IS NULL
         OR TRIM(account_link_token)=''
    `)
    .all<any>();

  for(const row of (rows.results??[])){
    await c.env.DB.prepare(`
      UPDATE accounts
      SET account_link_token=?
      WHERE id=?
        AND (
          account_link_token IS NULL
          OR TRIM(account_link_token)=''
        )
    `)
      .bind(
        crypto.randomUUID(),
        Number(row.id)
      )
      .run();
  }

  await c.env.DB.prepare(`
    UPDATE people
    SET
      adult=1,
      adult_leader=0,
      eagle_scout_archive=0,
      archived=0,
      updated_at=CURRENT_TIMESTAMP
    WHERE
      adult=1
      AND adult_leader=0
      AND eagle_scout_archive=0
      AND archived=1
  `).run();
}

let adminSchemaPromise:Promise<void>|null=null;

app.use('/api/*',async(c,next)=>{
  if(c.req.path.startsWith('/api/admin/')){
    try{
      if(!adminSchemaPromise){
        adminSchemaPromise=(async()=>{
          await ensurePermissionSchema(c);
          await ensureFamilySchema(c);
          await ensurePatrolSchema(c);
          await ensureSiteAdministratorSchema(c);
          await ensureEventSchema(c);
          await ensureAccountLinkSchema(c);
        })();
      }

      await adminSchemaPromise;
    }catch{
      adminSchemaPromise=null;
    }
  }

  try{
    c.set('user',await userFromRequest(c));
  }catch{
    c.set('user',null);
  }

  await next();
});

const requirePerm = (permission: string) => (c: any) => {
  const user = c.get('user') as User | null;

  if(!user){
    return json(c,{error:'Login required'},401);
  }

  if(user.isAdministrator){
    return null;
  }

  if(!user.permissions.includes(permission)){
    return json(c,{error:'Forbidden'},403);
  }

  return null;
};

app.get('/api/me',c=>json(c,{user:c.get('user')}));

app.post('/api/login',async c=>{
  try {
    const {
      username,
      password,
      rememberMe
    }=await c.req.json();

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
    const days=Number(c.env.SESSION_TTL_DAYS||30);

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
        ...(rememberMe?
          {maxAge:days*86400}:
          {})
      }
    );

    return json(c,{ok:true});
  } catch(e:any) {
    return json(
      c,
      {
        error: `Login error: ${e?.message || String(e)}`
      },
      500
    );
  }
});

app.post('/api/logout',async c=>{
  const t=getCookie(c,'troop690_session');

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
  if(!c.env.BOOTSTRAP_SECRET)
    return json(c,{error:'Bootstrap disabled'},404);

  const body=await c.req.json();

  if(body.secret!==c.env.BOOTSTRAP_SECRET)
    return json(c,{error:'Forbidden'},403);

  const count=await c.env.DB
    .prepare(
      'SELECT COUNT(*) n FROM accounts WHERE active=1'
    )
    .first<any>();

  if(Number(count?.n)>0)
    return json(c,{error:'Already bootstrapped'},409);

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

  const pos=await c.env.DB
    .prepare(
      "SELECT id FROM positions WHERE code='ADMIN'"
    )
    .first<any>();

  await c.env.DB
    .prepare(
      "INSERT OR IGNORE INTO person_positions(person_id,position_id) VALUES(?,?)"
    )
    .bind(pid,pos.id)
    .run();

  return json(c,{
    ok:true,
    accountId:a.meta.last_row_id,
    personId:pid
  });
});

app.get('/api/home',async c=>{
  const user=c.get('user');

  const content=await c.env.DB
    .prepare('SELECT key,value FROM site_content')
    .all<any>();

  let events:any[]=[];
  let recent:any[]=[];

  // Public visitors only need homepage content. Keep member-only queries
  // out of the public request path so a problem with optional event/photo
  // data cannot prevent the homepage itself from loading.
  if(user){
    const eventRows=await c.env.DB
      .prepare(`
        SELECT
          e.*,
          p.first_name||' '||p.last_name leader_name,
          p1.first_name||' '||p1.last_name leader_1_name,
          p2.first_name||' '||p2.last_name leader_2_name
        FROM events e
        LEFT JOIN people p
          ON p.id=e.leader_person_id
        LEFT JOIN people p1
          ON p1.id=e.leader_1_id
        LEFT JOIN people p2
          ON p2.id=e.leader_2_id
        WHERE e.start_at>=datetime('now')
        ORDER BY e.start_at
        LIMIT 8
      `)
      .all<any>();

    const recentRows=await c.env.DB
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

    events=eventRows.results??[];
    recent=recentRows.results??[];
  }

  return json(c,{
    content:Object.fromEntries(
      (content.results??[]).map(
        x=>[x.key,x.value]
      )
    ),
    events,
    recent
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

  sql+=' ORDER BY eagle_year DESC,last_name,first_name';

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
      const middle=e.middle_name?
        ` ${e.middle_name}`:
        '';

      return {
        ...e,
        display_name:
          full?
            `${e.first_name}${middle} ${e.last_name}${e.suffix?' '+e.suffix:''}`:
            `${e.first_name} ${e.last_name[0]}.`
      };
    })
  });
});

app.get('/api/calendar',async c=>{
  const deny=requirePerm('CAL')(c);
  if(deny)return deny;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        e.*,
        p.first_name||' '||p.last_name leader_name,
        p1.first_name||' '||p1.last_name leader_1_name,
        p2.first_name||' '||p2.last_name leader_2_name
      FROM events e
      LEFT JOIN people p
        ON p.id=e.leader_person_id
      LEFT JOIN people p1
        ON p1.id=e.leader_1_id
      LEFT JOIN people p2
        ON p2.id=e.leader_2_id
      ORDER BY e.start_at
    `)
    .all<any>();

  return json(c,{events:rows.results});
});

app.get('/api/events/:id',async c=>{
  const deny=requirePerm('CAL')(c);
  if(deny)return deny;

  const id=Number(c.req.param('id'));

  const e=await c.env.DB
    .prepare(`
      SELECT
        e.*,
        p.first_name||' '||p.last_name leader_name,
        p1.first_name||' '||p1.last_name leader_1_name,
        p2.first_name||' '||p2.last_name leader_2_name
      FROM events e
      LEFT JOIN people p
        ON p.id=e.leader_person_id
      LEFT JOIN people p1
        ON p1.id=e.leader_1_id
      LEFT JOIN people p2
        ON p2.id=e.leader_2_id
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

  if(!u||!u.personId)
    return json(c,{error:'Login required'},401);

  const id=Number(c.req.param('id'));
  const x=await c.req.json();
  const target=Number(x.personId||u.personId);

  if(target!==u.personId){
    const rel=await c.env.DB
      .prepare(`
        SELECT 1
        FROM family_members a
        JOIN family_members b
          ON b.family_id=a.family_id
        JOIN people caller
          ON caller.id=a.person_id
        JOIN people target_person
          ON target_person.id=b.person_id
        WHERE
          a.person_id=?
          AND b.person_id=?
          AND caller.adult=1
          AND target_person.adult=0
      `)
      .bind(
        u.personId,
        target
      )
      .first();

    if(!rel)
      return json(
        c,
        {
          error:
            'Only a parent can manage a youth member in their family'
        },
        403
      );
  }

  if(target===u.personId){
    const caller=await c.env.DB
      .prepare(
        'SELECT adult FROM people WHERE id=?'
      )
      .bind(u.personId)
      .first<any>();

    if(!Number(caller?.adult)){
      const existing=await c.env.DB
        .prepare(`
          SELECT marked_by
          FROM event_attendance
          WHERE event_id=?
            AND person_id=?
        `)
        .bind(id,target)
        .first<any>();

      if(existing?.marked_by){
        const marker=await c.env.DB
          .prepare(
            'SELECT adult FROM people WHERE id=?'
          )
          .bind(existing.marked_by)
          .first<any>();

        if(Number(marker?.adult)){
          return json(
            c,
            {
              error:
                'A parent has already set this attendance.'
            },
            403
          );
        }
      }
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
  const d=requirePerm('CAL')(c);
  if(d)return d;

  const id=Number(c.req.param('id'));
  const u=c.get('user') as User;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        ea.*,
        p.first_name,
        p.last_name
      FROM event_attendance ea
      JOIN people p ON p.id=ea.person_id
      WHERE ea.event_id=?
    `)
    .bind(id)
    .all<any>();

  return json(c,{
    attendance:u.permissions.includes('ATTM')?
      rows.results:
      (rows.results??[]).filter(
        (x:any)=>x.person_id===u.personId
      )
  });
});

app.post('/api/admin/events/:id/attendance/confirm',async c=>{
  const d=admin(c,'ATTM');
  if(d)return d;

  const id=Number(c.req.param('id'));
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
  const deny=requirePerm('CAL')(c);
  if(deny)return deny;

  const rows=await c.env.DB
    .prepare('SELECT * FROM events ORDER BY start_at')
    .all<any>();

  const ics=[
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Troop 690//Calendar//EN'
  ];

  for(const e of rows.results??[]){
    const dt=(s:string)=>
      s.replace(/[-:]/g,'')
       .replace(/\.\d+$/,'')+'Z';

    ics.push(
      'BEGIN:VEVENT',
      `UID:troop690-${e.id}@troop690.org`,
      `DTSTAMP:${dt(new Date().toISOString())}`,
      `DTSTART:${e.all_day?
        dt(e.start_at.slice(0,10)+'T00:00:00'):
        dt(e.start_at)
      }`,
      ...(e.end_at?
        [`DTEND:${e.all_day?
          dt(e.end_at.slice(0,10)+'T00:00:00'):
          dt(e.end_at)
        }`]:
        []
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
    {'Content-Type':'text/calendar; charset=utf-8'}
  );
});

app.get('/api/photos',async c=>{
  const deny=requirePerm('PHV')(c);
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
  const deny=requirePerm('PHV')(c);
  if(deny)return deny;

  const id=Number(c.req.param('eventId'));

  const photos=await c.env.DB
    .prepare(
      'SELECT * FROM photos WHERE event_id=? ORDER BY id'
    )
    .bind(id)
    .all<any>();

  return json(c,{photos:photos.results});
});

app.get('/api/documents',async c=>{
  const deny=requirePerm('DOCV')(c);
  if(deny)return deny;

  const u=c.get('user');

  const vis=u?.permissions.includes('DOC')?
    "d.visibility IN ('public','member','admin')":
    "d.visibility IN ('member','public')";

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

  const canHolder=
    !!u&&u.permissions.includes('LDV');

  const canHistory=
    !!u&&u.permissions.includes('HSTV');

  const rows=await c.env.DB
    .prepare(`
      SELECT
        lp.id,
        lp.name,
        lp.description,
        lp.public_visible,
        lp.visible_order,
        ${canHolder?
          'p.first_name||" "||p.last_name':
          'NULL'
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

  const hist=canHistory?
    await c.env.DB
      .prepare(
        'SELECT * FROM leadership_history ORDER BY end_year DESC,start_year DESC'
      )
      .all<any>():
    {results:[]};

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
      WHERE
        source_type='summer_camp'
        AND visibility IN (
          'public'
          ${u&&u.permissions.includes('DOCV')?
            ",'member'":
            ''
          }
        )
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

const admin = (
  c:any,
  permission='PMAP'
) => requirePerm(permission)(c);

app.get('/api/admin/members',async c=>{
  const d=admin(c,'MIV');
  if(d)return d;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        p.*,
        (
          SELECT person_id
          FROM site_administrator
          WHERE id=1
        ) site_administrator_id,
        (
          SELECT pu.name
          FROM patrol_members pm
          JOIN patrol_units pu
            ON pu.id=pm.patrol_id
          WHERE pm.person_id=p.id
          LIMIT 1
        ) patrol_name,
        a.username,
        a.active,
        a.invite_expires_at,
        GROUP_CONCAT(DISTINCT pp.position_id) position_ids,
        GROUP_CONCAT(
          DISTINCT CASE
            WHEN pos.code IS NULL
              OR pos.code NOT IN(
                'GUEST',
                'YOUTH',
                'ADULT',
                'ADULTL',
                'ADMIN'
              )
            THEN pos.name
          END
        ) position_names
      FROM people p
      LEFT JOIN accounts a
        ON a.person_id=p.id
      LEFT JOIN person_positions pp
        ON pp.person_id=p.id
      LEFT JOIN positions pos
        ON pos.id=pp.position_id
      GROUP BY p.id,a.id
      ORDER BY
        p.archived,
        p.adult,
        p.last_name,
        p.first_name
    `)
    .all<any>();

  const contactRows=await c.env.DB
    .prepare(`
      SELECT
        fmChild.person_id child_id,
        p.id parent_id,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.phone,
        p.email
      FROM family_members fmChild
      JOIN family_members fmParent
        ON fmParent.family_id=fmChild.family_id
      JOIN people p
        ON p.id=fmParent.person_id
      WHERE
        fmChild.person_id IN(
          SELECT id
          FROM people
          WHERE adult=0
        )
        AND p.adult=1
      ORDER BY
        p.first_name,
        p.last_name
    `)
    .all<any>();

  const contactsByChild=new Map<number,any[]>();

  for(const row of (contactRows.results??[])){
    const childId=Number(row.child_id);

    if(!contactsByChild.has(childId))
      contactsByChild.set(childId,[]);

    contactsByChild.get(childId)!.push({
      id:Number(row.parent_id),
      first_name:String(row.first_name||''),
      middle_name:String(row.middle_name||''),
      last_name:String(row.last_name||''),
      phone:String(row.phone||''),
      email:String(row.email||'')
    });
  }

  return json(c,{
    members:(rows.results??[]).map((x:any)=>{
      const contacts=
        (
          contactsByChild.get(Number(x.id))||
          []
        )
        .sort(
          (a:any,b:any)=>
            `${a.first_name} ${a.last_name}`
              .localeCompare(
                `${b.first_name} ${b.last_name}`
              )
        )
        .slice(0,2);

      return {
        ...x,
        patrol:x.patrol_name||'',
        position_ids:String(
          x.position_ids||''
        )
          .split(',')
          .filter(Boolean)
          .map(Number),

        position_names:String(
          x.position_names||''
        )
          .split(',')
          .filter(Boolean),

        emergency_contacts:contacts
      };
    })
  });
});

app.get('/api/admin/view-as-options',async c=>{
  const d=admin(c,'PMAP');
  if(d)return d;

  const codes=[
    'GUEST',
    'YOUTH',
    'ADULT',
    'ADULTL'
  ];

  const roles:any={};

  for(const code of codes){
    const rows=await c.env.DB
      .prepare(`
        WITH RECURSIVE role_tree(id) AS(
          SELECT id
          FROM positions
          WHERE code=?

          UNION

          SELECT br.base_position_id
          FROM position_base_roles br
          JOIN role_tree rt
            ON rt.id=br.position_id
        )
        SELECT DISTINCT pt.code
        FROM role_tree rt
        JOIN position_permissions pp
          ON pp.position_id=rt.id
        JOIN permission_titles pt
          ON pt.id=pp.permission_id
        WHERE
          pt.code IS NOT NULL
          AND pt.code<>'ADMIN'
      `)
      .bind(code)
      .all<any>();

    roles[code]=
      (rows.results??[])
        .map((x:any)=>String(x.code));
  }

  return json(c,{roles});
});

app.get('/api/admin/positions',async c=>{
  const d=admin(c,'POS');
  if(d)return d;

  const rows=await c.env.DB
    .prepare(
      'SELECT * FROM positions ORDER BY category,name'
    )
    .all<any>();

  return json(c,{positions:rows.results});
});

app.get('/api/admin/member-positions',async c=>{
  const d=admin(c,'MIE');
  if(d)return d;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        id,
        name,
        category,
        code,
        system
      FROM positions
      WHERE code IS NULL
         OR code NOT IN(
           'GUEST',
           'YOUTH',
           'ADULT',
           'ADULTL'
         )
      ORDER BY
        CASE category
          WHEN 'youth' THEN 0
          WHEN 'adult' THEN 1
          ELSE 2
        END,
        name
    `)
    .all<any>();

  return json(c,{
    positions:rows.results??[]
  });
});

app.get('/api/admin/patrols',async c=>{
  const d=admin(c,'MIV');
  if(d)return d;

  const patrolRows=await c.env.DB
    .prepare(`
      SELECT
        id,
        name,
        custom_name
      FROM patrol_units
      ORDER BY
        name
    `)
    .all<any>();

  const patrols=(patrolRows.results??[])
    .map((p:any)=>({
      id:Number(p.id),
      name:String(p.name||''),
      custom_name:Number(
        p.custom_name||0
      ),
      members:[]
    }));

  const patrolMap=new Map<number,any>();

  for(const p of patrols)
    patrolMap.set(
      p.id,
      p
    );

  const positionRows=await c.env.DB
    .prepare(`
      SELECT
        pp.person_id,
        GROUP_CONCAT(
          DISTINCT pos.name
        ) position_names
      FROM person_positions pp
      JOIN positions pos
        ON pos.id=pp.position_id
      WHERE pos.name IN(
        'Senior Patrol Leader',
        'Assistant Senior Patrol Leader',
        'Patrol Leader',
        'Assistant Patrol Leader'
      )
      GROUP BY pp.person_id
    `)
    .all<any>();

  const positionMap=new Map<number,string[]>();

  for(const row of (positionRows.results??[])){
    positionMap.set(
      Number(row.person_id),
      String(
        row.position_names||''
      )
        .split(',')
        .map(
          (x:string)=>x.trim()
        )
        .filter(Boolean)
    );
  }

  const people=await c.env.DB
    .prepare(`
      SELECT
        p.id,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.rank,
        pm.patrol_id
      FROM people p
      LEFT JOIN patrol_members pm
        ON pm.person_id=p.id
      WHERE
        p.adult=0
        AND p.archived=0
    `)
    .all<any>();

  const individuals=await c.env.DB
    .prepare(`
      SELECT
        p.id,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.rank
      FROM individual_patrol_members ip
      JOIN people p
        ON p.id=ip.person_id
      WHERE
        p.adult=0
        AND p.archived=0
      ORDER BY
        p.last_name,
        p.first_name,
        p.middle_name
    `)
    .all<any>();

  const individualIds=new Set(
    (individuals.results??[])
      .map(
        (x:any)=>Number(x.id)
      )
  );

  const unassigned:any[]=[];

  for(const row of (people.results??[])){
    const member={
      id:Number(row.id),
      first_name:String(
        row.first_name||''
      ),
      middle_name:String(
        row.middle_name||''
      ),
      last_name:String(
        row.last_name||''
      ),
      rank:String(
        row.rank||''
      ),
      position_names:
        positionMap.get(
          Number(row.id)
        )||[]
    };

    if(
      row.patrol_id==null&&
      !individualIds.has(
        Number(row.id)
      )
    ){
      unassigned.push(member);
    }

    if(row.patrol_id!=null){
      const patrol=patrolMap.get(
        Number(row.patrol_id)
      );

      if(patrol)
        patrol.members.push(member);
    }
  }

  return json(c,{
    unassigned,
    individuals:
      (individuals.results??[])
        .map((x:any)=>({
          id:Number(x.id),
          first_name:String(
            x.first_name||''
          ),
          middle_name:String(
            x.middle_name||''
          ),
          last_name:String(
            x.last_name||''
          ),
          rank:String(
            x.rank||''
          ),
          position_names:
            positionMap.get(
              Number(x.id)
            )||[]
        })),
    patrols
  });
});

app.post('/api/admin/patrols',async c=>{
  const d=admin(c,'MIE');
  if(d)return d;

  let name='New Patrol';
  let n=2;

  while(await c.env.DB
    .prepare(`
      SELECT id
      FROM patrol_units
      WHERE name=?
    `)
    .bind(name)
    .first()
  ){
    name=`New Patrol (${n++})`;
  }

  await c.env.DB
    .prepare(`
      INSERT INTO patrol_units(
        name,
        custom_name
      )
      VALUES(?,0)
    `)
    .bind(name)
    .run();

  return patrolResponse(c);
});

app.put('/api/admin/patrols/:id',async c=>{
  const d=admin(c,'MIE');
  if(d)return d;

  const id=Number(
    c.req.param('id')
  );

  const x=await c.req.json();
  const base=String(
    x.name||''
  ).trim();

  if(!base)
    return json(
      c,
      {error:'Patrol name is required'},
      400
    );

  const exists=await c.env.DB
    .prepare(`
      SELECT id
      FROM patrol_units
      WHERE id=?
    `)
    .bind(id)
    .first();

  if(!exists)
    return json(
      c,
      {error:'Patrol not found'},
      404
    );

  const clash=await c.env.DB
    .prepare(`
      SELECT id
      FROM patrol_units
      WHERE name=?
        AND id<>?
    `)
    .bind(base,id)
    .first();

  if(clash)
    return json(
      c,
      {error:'A patrol with that name already exists.'},
      409
    );

  await c.env.DB
    .prepare(`
      UPDATE patrol_units
      SET
        name=?,
        custom_name=1
      WHERE id=?
    `)
    .bind(base,id)
    .run();

  return patrolResponse(c);
});

app.post('/api/admin/patrols/move',async c=>{
  const d=admin(c,'MIE');
  if(d)return d;

  const x=await c.req.json();

  const personId=Number(
    x.personId
  );

  const target=String(
    x.target||'unassigned'
  );

  const person=await c.env.DB
    .prepare(`
      SELECT
        id,
        adult,
        archived
      FROM people
      WHERE id=?
    `)
    .bind(personId)
    .first<any>();

  if(!person)
    return json(
      c,
      {error:'Member not found'},
      404
    );

  if(
    Number(person.adult)||
    Number(person.archived)
  ){
    return json(
      c,
      {error:'Only active Youth can be assigned to patrols.'},
      400
    );
  }

  if(
    target!=='unassigned'&&
    target!=='individual'
  ){
    const patrolId=Number(target);

    const patrol=await c.env.DB
      .prepare(`
        SELECT id
        FROM patrol_units
        WHERE id=?
      `)
      .bind(patrolId)
      .first();

    if(!patrol)
      return json(
        c,
        {error:'Patrol not found'},
        404
      );
  }

  await c.env.DB
    .prepare(`
      DELETE FROM patrol_members
      WHERE person_id=?
    `)
    .bind(personId)
    .run();

  await c.env.DB
    .prepare(`
      DELETE FROM individual_patrol_members
      WHERE person_id=?
    `)
    .bind(personId)
    .run();

  if(target==='individual'){
    await c.env.DB
      .prepare(`
        INSERT OR IGNORE INTO individual_patrol_members(
          person_id
        )
        VALUES(?)
      `)
      .bind(personId)
      .run();
  }else if(target!=='unassigned'){
    await c.env.DB
      .prepare(`
        INSERT INTO patrol_members(
          patrol_id,
          person_id
        )
        VALUES(?,?)
      `)
      .bind(
        Number(target),
        personId
      )
      .run();
  }

  await c.env.DB
    .prepare(`
      DELETE FROM patrol_units
      WHERE NOT EXISTS(
        SELECT 1
        FROM patrol_members pm
        WHERE pm.patrol_id=patrol_units.id
      )
    `)
    .run();

  return patrolResponse(c);
});

async function patrolResponse(c:any){
  const patrolRows=await c.env.DB
    .prepare(`
      SELECT
        id,
        name,
        custom_name
      FROM patrol_units
      ORDER BY name
    `)
    .all();

  const positions=await c.env.DB
    .prepare(`
      SELECT
        pp.person_id,
        GROUP_CONCAT(
          DISTINCT pos.name
        ) position_names
      FROM person_positions pp
      JOIN positions pos
        ON pos.id=pp.position_id
      WHERE pos.name IN(
        'Senior Patrol Leader',
        'Assistant Senior Patrol Leader',
        'Patrol Leader',
        'Assistant Patrol Leader'
      )
      GROUP BY pp.person_id
    `)
    .all();

  const positionMap=new Map<number,string[]>();

  for(const row of (positions.results??[])){
    positionMap.set(
      Number(row.person_id),
      String(
        row.position_names||''
      )
        .split(',')
        .map(
          (x:string)=>x.trim()
        )
        .filter(Boolean)
    );
  }

  const patrols=(patrolRows.results??[])
    .map((p:any)=>({
      id:Number(p.id),
      name:String(p.name||''),
      custom_name:Number(
        p.custom_name||0
      ),
      members:[]
    }));

  const patrolMap=new Map<number,any>();

  for(const p of patrols)
    patrolMap.set(
      p.id,
      p
    );

  const people=await c.env.DB
    .prepare(`
      SELECT
        p.id,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.rank,
        pm.patrol_id
      FROM people p
      LEFT JOIN patrol_members pm
        ON pm.person_id=p.id
      WHERE
        p.adult=0
        AND p.archived=0
    `)
    .all();

  const individualRows=await c.env.DB
    .prepare(`
      SELECT
        p.id,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.rank
      FROM individual_patrol_members ip
      JOIN people p
        ON p.id=ip.person_id
      WHERE
        p.adult=0
        AND p.archived=0
      ORDER BY
        p.last_name,
        p.first_name,
        p.middle_name
    `)
    .all();

  const individualIds=new Set(
    (individualRows.results??[])
      .map(
        (x:any)=>Number(x.id)
      )
  );

  const unassigned:any[]=[];

  for(const row of (people.results??[])){
    const member={
      id:Number(row.id),
      first_name:String(
        row.first_name||''
      ),
      middle_name:String(
        row.middle_name||''
      ),
      last_name:String(
        row.last_name||''
      ),
      rank:String(
        row.rank||''
      ),
      position_names:
        positionMap.get(
          Number(row.id)
        )||[]
    };

    if(
      row.patrol_id==null&&
      !individualIds.has(
        Number(row.id)
      )
    ){
      unassigned.push(member);
    }

    if(row.patrol_id!=null){
      patrolMap
        .get(Number(row.patrol_id))
        ?.members.push(member);
    }
  }

  return json(c,{
    unassigned,
    individuals:
      individualRows.results??[],
    patrols
  });
}

app.get('/api/admin/families',async c=>{
  const d=admin(c,'MIV');
  if(d)return d;

  const familyRows=await c.env.DB
    .prepare(`
      SELECT
        fu.id family_id,
        fu.name family_name,
        p.id person_id,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.adult,
        p.adult_leader
      FROM family_units fu
      LEFT JOIN family_members fm
        ON fm.family_id=fu.id
      LEFT JOIN people p
        ON p.id=fm.person_id
        AND p.archived=0
      ORDER BY
        fu.id,
        p.last_name,
        p.first_name,
        p.middle_name
    `)
    .all<any>();

  const unassigned=await c.env.DB
    .prepare(`
      SELECT
        id,
        first_name,
        middle_name,
        last_name,
        adult,
        adult_leader
      FROM people p
      WHERE
        p.archived=0
        AND NOT EXISTS(
          SELECT 1
          FROM family_members fm
          WHERE fm.person_id=p.id
        )
      AND NOT EXISTS(
        SELECT 1
        FROM family_individuals fi
        WHERE fi.person_id=p.id
      )
      ORDER BY
        last_name,
        first_name,
        middle_name
    `)
    .all<any>();

  const individuals=await c.env.DB
    .prepare(`
      SELECT
        p.id,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.adult,
        p.adult_leader
      FROM family_individuals fi
      JOIN people p
        ON p.id=fi.person_id
        AND p.archived=0
      ORDER BY
        p.last_name,
        p.first_name,
        p.middle_name
    `)
    .all<any>();

  const families:any[]=[];
  const byFamily=new Map<number,any>();

  for(const row of familyRows.results??[]){
    const id=Number(row.family_id);

    if(!byFamily.has(id)){
      const family={
        id,
        name:row.family_name||null,
        members:[]
      };

      byFamily.set(id,family);
      families.push(family);
    }

    if(row.person_id!=null){
      byFamily.get(id).members.push({
        id:Number(row.person_id),
        first_name:row.first_name,
        middle_name:row.middle_name,
        last_name:row.last_name,
        adult:Number(row.adult),
        adult_leader:Number(row.adult_leader)
      });
    }
  }

  return json(c,{
    unassigned:unassigned.results??[],
    individuals:individuals.results??[],
    families
  });
});

app.post('/api/admin/families',async c=>{
  const d=admin(c,'MIE');
  if(d)return d;

  await c.env.DB.prepare(
    'INSERT INTO family_units(name) VALUES(NULL)'
  ).run();

  return familiesResponse(c);
});

app.put('/api/admin/families/:id',async c=>{
  const d=admin(c,'MIE');
  if(d)return d;

  const id=Number(c.req.param('id'));
  const x=await c.req.json();
  const name=String(x.name||'').trim();

  if(!Number.isInteger(id)||!name)
    return json(c,{error:'Invalid family name'},400);

  const duplicate=await c.env.DB
    .prepare(`
      SELECT id
      FROM family_units
      WHERE name=?
        AND id<>?
    `)
    .bind(name,id)
    .first();

  if(duplicate)
    return json(
      c,
      {error:'A family with that name already exists.'},
      409
    );

  const family=await c.env.DB
    .prepare(
      'SELECT id FROM family_units WHERE id=?'
    )
    .bind(id)
    .first();

  if(!family)
    return json(
      c,
      {error:'Family not found'},
      404
    );

  await c.env.DB.prepare(`
    UPDATE family_units
    SET name=?
    WHERE id=?
  `)
    .bind(name,id)
    .run();

  return familiesResponse(c);
});

app.post('/api/admin/families/assign',async c=>{
  const d=admin(c,'MIE');
  if(d)return d;

  const x=await c.req.json();

  const personId=Number(x.personId);
  const familyId=
    x.familyId==null?
      null:
      Number(x.familyId);
  const individual=!!x.individual;

  if(!Number.isInteger(personId))
    return json(
      c,
      {error:'Invalid member'},
      400
    );

  const person=await c.env.DB
    .prepare(
      'SELECT id,last_name FROM people WHERE id=?'
    )
    .bind(personId)
    .first<any>();

  if(!person)
    return json(
      c,
      {error:'Member not found'},
      404
    );

  if(
    individual&&
    familyId!==null
  )
    return json(
      c,
      {error:'Invalid family assignment'},
      400
    );

  if(familyId!==null){
    const family=await c.env.DB
      .prepare(`
        SELECT id,name
        FROM family_units
        WHERE id=?
      `)
      .bind(familyId)
      .first<any>();

    if(!family)
      return json(
        c,
        {error:'Family not found'},
        404
      );

    if(!family.name){
      const base=
        String(
          person.last_name||
          'Family'
        ).trim()||
        'Family';

      let name=base;
      let n=1;

      while(await c.env.DB.prepare(`
        SELECT id
        FROM family_units
        WHERE name=?
          AND id<>?
      `)
        .bind(name,familyId)
        .first()
      ){
        n++;
        name=`${base} (${n})`;
      }

      await c.env.DB.prepare(`
        UPDATE family_units
        SET name=?
        WHERE id=?
      `)
        .bind(name,familyId)
        .run();
    }
  }

  await c.env.DB.prepare(
    'DELETE FROM family_members WHERE person_id=?'
  )
    .bind(personId)
    .run();

  await c.env.DB.prepare(
    'DELETE FROM family_individuals WHERE person_id=?'
  )
    .bind(personId)
    .run();

  if(familyId!==null){
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO family_members(
        family_id,
        person_id
      )
      VALUES(?,?)
    `)
      .bind(
        familyId,
        personId
      )
      .run();
  }else if(individual){
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO family_individuals(person_id) VALUES(?)'
    )
      .bind(personId)
      .run();
  }

  await c.env.DB.prepare(`
    DELETE FROM family_units
    WHERE NOT EXISTS(
      SELECT 1
      FROM family_members fm
      WHERE fm.family_id=family_units.id
    )
  `).run();

  return familiesResponse(c);
});

async function familiesResponse(c:any){
  const familyRows=await c.env.DB
    .prepare(`
      SELECT
        fu.id family_id,
        fu.name family_name,
        p.id person_id,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.adult,
        p.adult_leader
      FROM family_units fu
      LEFT JOIN family_members fm
        ON fm.family_id=fu.id
      LEFT JOIN people p
        ON p.id=fm.person_id
        AND p.archived=0
      ORDER BY
        fu.id,
        p.last_name,
        p.first_name,
        p.middle_name
    `)
    .all();

  const unassigned=await c.env.DB
    .prepare(`
      SELECT
        id,
        first_name,
        middle_name,
        last_name,
        adult,
        adult_leader
      FROM people p
      WHERE
        p.archived=0
        AND NOT EXISTS(
          SELECT 1
          FROM family_members fm
          WHERE fm.person_id=p.id
        )
        AND NOT EXISTS(
          SELECT 1
          FROM family_individuals fi
          WHERE fi.person_id=p.id
        )
      ORDER BY
        last_name,
        first_name,
        middle_name
    `)
    .all();

  const individuals=await c.env.DB
    .prepare(`
      SELECT
        p.id,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.adult,
        p.adult_leader
      FROM family_individuals fi
      JOIN people p
        ON p.id=fi.person_id
        AND p.archived=0
      ORDER BY
        p.last_name,
        p.first_name,
        p.middle_name
    `)
    .all();

  const families:any[]=[];
  const byFamily=new Map<number,any>();

  for(const row of familyRows.results??[]){
    const id=Number(row.family_id);

    if(!byFamily.has(id)){
      const family={
        id,
        name:row.family_name||null,
        members:[]
      };

      byFamily.set(id,family);
      families.push(family);
    }

    if(row.person_id!=null){
      byFamily.get(id).members.push({
        id:Number(row.person_id),
        first_name:row.first_name,
        middle_name:row.middle_name,
        last_name:row.last_name,
        adult:Number(row.adult),
        adult_leader:Number(row.adult_leader)
      });
    }
  }

  return json(c,{
    unassigned:unassigned.results??[],
    individuals:individuals.results??[],
    families
  });
}

app.post('/api/admin/positions',async c=>{
  const d=admin(c,'POS');
  if(d)return d;

  const x=await c.req.json();

  const name=String(
    x.name||''
  ).trim();

  const category=
    String(x.category||'')
      .toLowerCase()==='youth'?
        'youth':
        String(x.category||'')
          .toLowerCase()==='adult'?
            'adult':
            '';

  if(!name){
    return json(
      c,
      {error:'Position name is required'},
      400
    );
  }

  if(!category){
    return json(
      c,
      {error:'Position type must be Youth or Adult'},
      400
    );
  }

  const exists=await c.env.DB.prepare(`
    SELECT id
    FROM positions
    WHERE lower(name)=lower(?)
    LIMIT 1
  `)
    .bind(name)
    .first<any>();

  if(exists){
    return json(
      c,
      {error:'A position with that name already exists'},
      409
    );
  }

  const r=await c.env.DB.prepare(`
    INSERT INTO positions(
      name,
      category,
      code,
      system
    )
    VALUES(?,?,NULL,0)
  `)
    .bind(
      name,
      category
    )
    .run();

  return json(c,{
    id:r.meta.last_row_id,
    name,
    category,
    code:null,
    system:0
  });
});

app.put('/api/admin/positions/:id',async c=>{
  const d=admin(c,'POS');
  if(d)return d;

  const id=Number(c.req.param('id'));
  const x=await c.req.json();

  const position=await c.env.DB.prepare(`
    SELECT id,name,category,code,system
    FROM positions
    WHERE id=?
  `)
    .bind(id)
    .first<any>();

  if(!position){
    return json(
      c,
      {error:'Position not found'},
      404
    );
  }

  if(Number(position.system)){
    return json(
      c,
      {error:'Built-in positions cannot be renamed or changed'},
      400
    );
  }

  const name=String(
    x.name||''
  ).trim();

  const category=
    String(x.category||'')
      .toLowerCase()==='youth'?
        'youth':
        String(x.category||'')
          .toLowerCase()==='adult'?
            'adult':
            '';

  if(!name){
    return json(
      c,
      {error:'Position name is required'},
      400
    );
  }

  if(!category){
    return json(
      c,
      {error:'Position type must be Youth or Adult'},
      400
    );
  }

  const exists=await c.env.DB.prepare(`
    SELECT id
    FROM positions
    WHERE lower(name)=lower(?)
      AND id<>?
    LIMIT 1
  `)
    .bind(
      name,
      id
    )
    .first<any>();

  if(exists){
    return json(
      c,
      {error:'A position with that name already exists'},
      409
    );
  }

  await c.env.DB.prepare(`
    UPDATE positions
    SET
      name=?,
      category=?
    WHERE id=?
  `)
    .bind(
      name,
      category,
      id
    )
    .run();

  return json(c,{ok:true});
});

app.delete('/api/admin/positions/:id',async c=>{
  const d=admin(c,'POS');
  if(d)return d;

  const id=Number(c.req.param('id'));

  const position=await c.env.DB.prepare(`
    SELECT id,name,system
    FROM positions
    WHERE id=?
  `)
    .bind(id)
    .first<any>();

  if(!position){
    return json(
      c,
      {error:'Position not found'},
      404
    );
  }

  if(Number(position.system)){
    return json(
      c,
      {error:'Built-in positions cannot be deleted'},
      400
    );
  }

  await c.env.DB.prepare(`
    DELETE FROM positions
    WHERE id=?
  `)
    .bind(id)
    .run();

  return json(c,{ok:true});
});

app.post('/api/admin/members',async c=>{
  const d=admin(c,'MIE');
  if(d)return d;

  const x=await c.req.json();

  const firstName=String(x.first_name||'').trim();
  const lastName=String(x.last_name||'').trim();

  if(!firstName||!lastName){
    return json(
      c,
      {error:'First name and last name are required'},
      400
    );
  }

  const adult=!!x.adult;
  const adultLeader=!!x.adult_leader;

  const phoneDigits=
    String(x.phone||'')
      .replace(/\D/g,'');

  const phone=
    phoneDigits.length===10?
      `(${phoneDigits.slice(0,3)}) ${phoneDigits.slice(3,6)}-${phoneDigits.slice(6)}`:
      String(x.phone||'');

  const rank=String(x.rank||'');

  if(
    adult &&
    rank &&
    rank!=='Eagle Scout'
  ){
    return json(
      c,
      {
        error:
          'Adults may only have Eagle Scout as a rank.'
      },
      400
    );
  }

  if(adultLeader&&!adult){
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
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `)
    .bind(
      x.prefix||'',
      firstName,
      x.middle_name||'',
      lastName,
      x.suffix||'',
      x.gender||'Male',
      adult?1:0,
      adultLeader?1:0,
      x.rank||'',
      x.dob||null,
      phone,
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

  const id=Number(r.meta.last_row_id);

  const positionIds=[
    ...new Set(
      (
        Array.isArray(x.position_ids)?
          x.position_ids:
          []
      )
      .map(Number)
      .filter(Number.isInteger)
    )
  ];

  if(positionIds.length){
    const allowed=await c.env.DB
      .prepare(`
        SELECT id
        FROM positions
        WHERE id IN(
          ${positionIds.map(()=>'?').join(',')}
        )
        AND (
          code IS NULL
          OR code NOT IN(
            'GUEST',
            'YOUTH',
            'ADULT',
            'ADULTL'
          )
        )
        AND (
          (?=0 AND category='youth')
          OR
          (?=1 AND ?=1 AND category='adult')
        )
      `)
      .bind(
        ...positionIds,
        adult?1:0,
        adult?1:0,
        adultLeader?1:0
      )
      .all<any>();

    for(const p of (allowed.results??[])){
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO person_positions(
          person_id,
          position_id
        )
        VALUES(?,?)
      `)
        .bind(id,Number(p.id))
        .run();
    }
  }

  return json(c,{id});
});

app.put('/api/admin/members/:id',async c=>{
  const d=admin(c,'MIE');
  if(d)return d;

  const id=Number(c.req.param('id'));
  const x=await c.req.json();

  const before=await c.env.DB
    .prepare(`
      SELECT
        adult,
        eagle_scout_archive,
        archived
      FROM people
      WHERE id=?
    `)
    .bind(id)
    .first<any>();

  const adult=
    'adult' in x?
      !!x.adult:
      undefined;

  const adultLeader=
    'adult_leader' in x?
      !!x.adult_leader:
      undefined;

  const siteAdministrator=await c.env.DB
    .prepare(`
      SELECT person_id
      FROM site_administrator
      WHERE id=1
    `)
    .first<any>();

  const isSiteAdministrator=
    Number(siteAdministrator?.person_id)===id;

  if(
    adultLeader===true &&
    adult===false
  ){
    return json(
      c,
      {error:'Adult Leader requires Adult'},
      400
    );
  }

  if('phone' in x){
    const digits=
      String(x.phone||'')
        .replace(/\D/g,'');

    x.phone=
      digits.length===10?
        `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`:
        String(x.phone||'');
  }
  
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

  const unarchiving=
    Number(before?.eagle_scout_archive)===1 &&
    'eagle_scout_archive' in x &&
    x.eagle_scout_archive===false;

  if(unarchiving){
    x.adult=true;
    x.adult_leader=false;
    x.eagle_scout_archive=false;
    x.archived=false;
    x.position_ids=[];

    await c.env.DB.prepare(
      'DELETE FROM family_members WHERE person_id=?'
    )
      .bind(id)
      .run();

    await c.env.DB.prepare(
      'DELETE FROM family_individuals WHERE person_id=?'
    )
      .bind(id)
      .run();

    await c.env.DB.prepare(
      'DELETE FROM patrol_members WHERE person_id=?'
    )
      .bind(id)
      .run();

    await c.env.DB.prepare(
      'DELETE FROM individual_patrol_members WHERE person_id=?'
    )
      .bind(id)
      .run();
  }
  
  const sets:string[]=[];
  const bind:any[]=[];

  for(const k of cols){
    if(!(k in x))
      continue;

    sets.push(k);

    bind.push(
      typeof x[k]==='boolean'?
        Number(x[k]):
        x[k]
    );
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
      .bind(
        ...bind,
        id
      )
      .run();
  }

  if(
    isSiteAdministrator &&
    Array.isArray(x.position_ids)
  ){
    const adminPosition=await c.env.DB
      .prepare(`
        SELECT id
        FROM positions
        WHERE code='ADMIN'
        LIMIT 1
      `)
      .first<any>();

    const keepsAdministrator=
      adminPosition?.id!=null &&
      x.position_ids
        .map(Number)
        .includes(Number(adminPosition.id));

    if(!keepsAdministrator){
      return json(
        c,
        {
          error:
            'The Site Administrator must retain Administrator permissions.'
        },
        400
      );
    }
  }
  
  if(
    before&&
    adult!==undefined&&
    Number(before.adult)!==Number(adult)
  ){
    await c.env.DB.prepare(
      'DELETE FROM family_members WHERE person_id=?'
    )
      .bind(id)
      .run();

    await c.env.DB.prepare(
      'DELETE FROM family_individuals WHERE person_id=?'
    )
      .bind(id)
      .run();

    await c.env.DB.prepare(
      'DELETE FROM patrol_members WHERE person_id=?'
    )
      .bind(id)
      .run();

    await c.env.DB.prepare(
      'DELETE FROM individual_patrol_members WHERE person_id=?'
    )
      .bind(id)
      .run();

    await c.env.DB.prepare(`
      DELETE FROM family_units
      WHERE NOT EXISTS(
        SELECT 1
        FROM family_members fm
        WHERE fm.family_id=family_units.id
      )
    `).run();
  }
  
  if(
    x.eagle_scout_archive &&
    Number(before?.eagle_scout_archive)!==1
  ){
    const current=await c.env.DB
      .prepare(`
        SELECT
          adult,
          adult_leader,
          eagle_scout_archive
        FROM people
        WHERE id=?
      `)
      .bind(id)
      .first<any>();

    if(!current){
      return json(
        c,
        {error:'Member not found'},
        404
      );
    }

    if(isSiteAdministrator){
      return json(
        c,
        {
          error:
            'The Site Administrator cannot be moved to the Eagle Scout Archive.'
        },
        400
      );
    }
    
    if(
      Number(current.adult) &&
      !Number(current.adult_leader)
    ){
      return json(
        c,
        {
          error:
            'Only Youth or Adult Leaders can be moved to the Eagle Scout Archive.'
        },
        400
      );
    }

    await c.env.DB
      .prepare(`
        UPDATE people
        SET
          adult=1,
          adult_leader=0,
          eagle_scout_archive=1,
          archived=1,
          updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `)
      .bind(id)
      .run();

    await c.env.DB
      .prepare(`
        DELETE FROM person_positions
        WHERE person_id=?
      `)
      .bind(id)
      .run();

    await c.env.DB
      .prepare(`
        DELETE FROM accounts
        WHERE person_id=?
      `)
      .bind(id)
      .run();
  }

  if(Array.isArray(x.position_ids)){
    const ids=[
      ...new Set(
        x.position_ids
          .map(Number)
          .filter(Number.isInteger)
      )
    ];

    await c.env.DB.prepare(`
      DELETE FROM person_positions
      WHERE person_id=?
    `)
      .bind(id)
      .run();

    if(ids.length){
      const allowed=await c.env.DB
        .prepare(`
          SELECT id
          FROM positions
          WHERE id IN(
            ${ids.map(()=>'?').join(',')}
          )
          AND (
            code IS NULL
            OR code NOT IN(
              'GUEST',
              'YOUTH',
              'ADULT',
              'ADULTL'
            )
          )
        `)
        .bind(...ids)
        .all<any>();

      for(const p of (allowed.results??[])){
        await c.env.DB.prepare(`
          INSERT OR IGNORE INTO person_positions(
            person_id,
            position_id
          )
          VALUES(?,?)
        `)
          .bind(
            id,
            Number(p.id)
          )
          .run();
      }
    }
  }

  return json(c,{ok:true});
});

app.delete('/api/admin/members/:id',async c=>{
  const d=admin(c,'MDEL');
  if(d)return d;

  const id=Number(c.req.param('id'));

  const siteAdministrator=await c.env.DB
    .prepare(`
      SELECT person_id
      FROM site_administrator
      WHERE id=1
    `)
    .first<any>();

  if(Number(siteAdministrator?.person_id)===id){
    return json(
      c,
      {
        error:
          'The Site Administrator cannot be deleted. Select another Site Administrator first.'
      },
      400
    );
  }

  await c.env.DB.prepare(
    'DELETE FROM family_members WHERE person_id=?'
  )
    .bind(id)
    .run();

  await c.env.DB.prepare(
    'DELETE FROM family_individuals WHERE person_id=?'
  )
    .bind(id)
    .run();

  await c.env.DB.prepare(
    'DELETE FROM patrol_members WHERE person_id=?'
  )
    .bind(id)
    .run();

  await c.env.DB.prepare(
    'DELETE FROM individual_patrol_members WHERE person_id=?'
  )
    .bind(id)
    .run();

  await c.env.DB.prepare(`
    DELETE FROM family_units
    WHERE NOT EXISTS(
      SELECT 1
      FROM family_members fm
      WHERE fm.family_id=family_units.id
    )
  `).run();

  await c.env.DB
    .prepare(
      'DELETE FROM accounts WHERE person_id=?'
    )
    .bind(id)
    .run();

  await c.env.DB
    .prepare(
      'DELETE FROM people WHERE id=?'
    )
    .bind(id)
    .run();

  return json(c,{ok:true});
});

app.post('/api/admin/invite/:id',async c=>{
  const d=admin(c,'INV');
  if(d)return d;

  const id=Number(c.req.param('id'));

  const p=await c.env.DB
    .prepare(`
      SELECT *
      FROM people
      WHERE id=?
    `)
    .bind(id)
    .first<any>();

  if(!p)
    return json(
      c,
      {error:'Member not found'},
      404
    );

  const existing=await c.env.DB
    .prepare(`
      SELECT
        id,
        username,
        active,
        account_link_token
      FROM accounts
      WHERE person_id=?
      LIMIT 1
    `)
    .bind(id)
    .first<any>();

  let token=String(
    existing?.account_link_token||''
  );

  if(!token)
    token=crypto.randomUUID();

  const exp=new Date(
    Date.now()+72*3600000
  ).toISOString();

  if(existing){
    await c.env.DB
      .prepare(`
        UPDATE accounts
        SET
          account_link_token=?,
          invite_token_hash=?,
          invite_expires_at=?
        WHERE id=?
      `)
      .bind(
        token,
        await sha256(token),
        exp,
        Number(existing.id)
      )
      .run();

    return json(c,{
      username:String(existing.username||''),
      token,
      mode:Number(existing.active)?
        'reset':
        'create'
    });
  }

  const base=(
    String(p.first_name||'')+
    String(p.last_name||'')
  )
    .replace(/[^A-Za-z0-9]/g,'');

  let u=base||'member';
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

  await c.env.DB
    .prepare(`
      INSERT INTO accounts(
        person_id,
        username,
        active,
        invite_token_hash,
        invite_expires_at,
        account_link_token
      )
      VALUES(?,?,0,?,?,?)
    `)
    .bind(
      id,
      u,
      await sha256(token),
      exp,
      token
    )
    .run();

  return json(c,{
    username:u,
    token,
    mode:'create'
  });
});

app.get('/api/claim',async c=>{
  const token=String(
    c.req.query('token')||''
  );

  if(!token)
    return json(
      c,
      {error:'Invalid account link'},
      400
    );

  const h=await sha256(token);

  const a=await c.env.DB
    .prepare(`
      SELECT
        username,
        active
      FROM accounts
      WHERE
        (
          account_link_token=?
          OR invite_token_hash=?
        )
        AND invite_expires_at>datetime('now')
      LIMIT 1
    `)
    .bind(
      token,
      h
    )
    .first<any>();

  if(!a)
    return json(
      c,
      {error:'Invalid or expired account link'},
      400
    );

  return json(c,{
    mode:Number(a.active)?
      'reset':
      'create',
    username:String(a.username||'')
  });
});

app.post('/api/claim',async c=>{
  const x=await c.req.json();
  const h=await sha256(x.token||'');

  const a=await c.env.DB
    .prepare(`
      SELECT *
      FROM accounts
      WHERE
        (
          account_link_token=?
          OR invite_token_hash=?
        )
        AND invite_expires_at>datetime('now')
    `)
    .bind(
      x.token||'',
      h
    )
    .first<any>();

  if(!a)
    return json(
      c,
      {error:'Invalid or expired invitation'},
      400
    );

  const isReset=Number(a.active)===1;

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
        invite_token_hash=?,
        invite_expires_at=?
      WHERE id=?
    `)
    .bind(
      isReset?
        a.username:
        (x.username||a.username),
      pw.hash,
      pw.salt,
      a.invite_token_hash||
        await sha256(x.token||''),
      new Date(
        Date.now()+72*3600000
      ).toISOString(),
      a.id
    )
    .run();

  return json(c,{
    ok:true,
    mode:isReset?
      'reset':
      'create'
  });
});

app.get('/api/admin/quick-text.csv',async c=>{
  const d=admin(c,'EML');
  if(d)return d;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        prefix,
        first_name,
        middle_name,
        last_name,
        suffix,
        phone
      FROM people
      WHERE archived=0
      ORDER BY
        last_name,
        first_name,
        middle_name,
        suffix
    `)
    .all<any>();

  const formatPhone=(value:any)=>{
    const digits=String(
      value||''
    ).replace(/\D/g,'');

    if(digits.length===10){
      return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    }

    return String(value||'');
  };

  const fullName=(x:any)=>{
    return [
      x.prefix,
      x.first_name,
      x.middle_name?
        String(x.middle_name).trim().charAt(0):
        '',
      x.last_name,
      x.suffix
    ]
      .map((v:any)=>String(v||'').trim())
      .filter(Boolean)
      .join(' ');
  };

  const out=[
    'Name,Phone'
  ];

  for(const x of (rows.results??[])){
    out.push(
      [
        fullName(x),
        formatPhone(x.phone)
      ]
      .map(v=>
        `"${String(v).replaceAll('"','""')}"`
      )
      .join(',')
    );
  }

  return c.text(
    out.join('\r\n'),
    200,
    {
      'Content-Type':
        'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="troop690-quick-text.csv"'
    }
  );
});

app.get('/api/admin/emergency-contacts.csv',async c=>{
  const d=admin(c,'MIV');
  if(d)return d;

  const scouts=await c.env.DB
    .prepare(`
      SELECT
        s.first_name,
        s.middle_name,
        s.last_name,

        (
          SELECT
            p.first_name||'|'||
            COALESCE(p.phone,'')
          FROM family_members child
          JOIN family_members parent
            ON parent.family_id=child.family_id
          JOIN people p
            ON p.id=parent.person_id
          WHERE
            child.person_id=s.id
            AND p.adult=1
          ORDER BY
            p.last_name,
            p.first_name,
            p.middle_name
          LIMIT 1
        ) contact_1,

        (
          SELECT
            p.first_name||'|'||
            COALESCE(p.phone,'')
          FROM family_members child
          JOIN family_members parent
            ON parent.family_id=child.family_id
          JOIN people p
            ON p.id=parent.person_id
          WHERE
            child.person_id=s.id
            AND p.adult=1
          ORDER BY
            p.last_name,
            p.first_name,
            p.middle_name
          LIMIT 1 OFFSET 1
        ) contact_2

      FROM people s
      WHERE
        s.adult=0
        AND s.archived=0
      ORDER BY
        s.last_name,
        s.first_name,
        s.middle_name
    `)
    .all<any>();

  const scoutName=(x:any)=>{
    return [
      x.first_name,
      x.middle_name?
        String(x.middle_name).trim().charAt(0):
        '',
      x.last_name
    ]
      .map((v:any)=>String(v||'').trim())
      .filter(Boolean)
      .join(' ');
  };

  const splitContact=(value:any)=>{
    const parts=String(
      value||''
    ).split('|');

    return {
      name:String(parts[0]||''),
      phone:String(parts[1]||'')
    };
  };

  const out=[
    'Name,Contact 1,Phone 1,Contact 2,Phone 2'
  ];

  for(const x of (scouts.results??[])){
    const a=splitContact(x.contact_1);
    const b=splitContact(x.contact_2);

    out.push(
      [
        scoutName(x),
        a.name,
        a.phone,
        b.name,
        b.phone
      ]
      .map(v=>
        `"${String(v).replaceAll('"','""')}"`
      )
      .join(',')
    );
  }

  return c.text(
    out.join('\r\n'),
    200,
    {
      'Content-Type':
        'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="troop690-emergency-contacts.csv"'
    }
  );
});

app.post('/api/admin/upload',async c=>{
  const d=admin(c,'DOC');
  if(d)return d;

  const form=await c.req.formData();
  const file=form.get('file');
  const kind=String(
    form.get('kind')||'file'
  );

  if(!(file instanceof File))
    return json(
      c,
      {error:'File required'},
      400
    );

  const key=
    `${kind}/${Date.now()}-${file.name.replace(
      /[^A-Za-z0-9._-]/g,
      '_'
    )}`;

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

  if(!obj)
    return c.notFound();

  return new Response(
    obj.body,
    {
      headers:{
        'Content-Type':
          obj.httpMetadata?.contentType||
          'application/octet-stream',
        'Cache-Control':
          'private, max-age=3600'
      }
    }
  );
});

app.get('/api/admin/event-options',async c=>{
  const d=admin(c,'EVT');
  if(d)return d;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        id,
        first_name,
        middle_name,
        last_name,
        adult,
        adult_leader
      FROM people
      WHERE
        archived=0
        AND (
          adult=0
          OR adult_leader=1
        )
      ORDER BY
        last_name,
        first_name,
        middle_name
    `)
    .all<any>();

  return json(c,{
    leaders:(rows.results??[]).map((x:any)=>({
      id:Number(x.id),
      first_name:String(
        x.first_name||''
      ),
      middle_name:String(
        x.middle_name||''
      ),
      last_name:String(
        x.last_name||''
      ),
      adult:Number(x.adult),
      adult_leader:Number(
        x.adult_leader
      )
    }))
  });
});

app.get('/api/admin/event-location-search',async c=>{
  const d=admin(c,'EVT');
  if(d)return d;

  const q=String(
    c.req.query('q')||''
  ).trim();

  if(q.length<3)
    return json(c,{results:[]});

  if(!c.env.GEOAPIFY_API_KEY)
    return json(c,{results:[]});

  const url=new URL(
    'https://api.geoapify.com/v1/geocode/autocomplete'
  );

  url.searchParams.set('text',q);
  url.searchParams.set('format','json');
  url.searchParams.set('limit','5');
  url.searchParams.set(
    'filter',
    'countrycode:us'
  );
  url.searchParams.set(
    'apiKey',
    c.env.GEOAPIFY_API_KEY
  );

  const response=await fetch(
    url.toString()
  );

  if(!response.ok){
    const body=await response.text();

    return json(
      c,
      {
        error:
          `Geoapify error ${response.status}: `+
          body
      },
      502
    );
  }

  const data=await response.json() as any;

  const results=(data.results||[])
    .map((x:any)=>{
      const name=String(
        x.name||
        x.address_line1||
        (
          [x.housenumber,x.street]
            .filter(Boolean)
            .join(' ')
        )||
        x.formatted||
        ''
      ).trim();

      const address=String(
        x.address_line2||
        [
          x.city,
          x.state_code||x.state,
          x.postcode
        ]
          .filter(Boolean)
          .join(', ')||
        ''
      ).trim();

      if(!name)
        return null;

      return {
        name,
        address
      };
    })
    .filter((x:any)=>x);

  return json(c,{results});
});

app.post('/api/admin/events',async c=>{
  const d=admin(c,'EVT');
  if(d)return d;

  const x=await c.req.json();

  const title=
    String(x.event_name??x.title??'').trim();

  const startAt=
    String(x.start_at??'').trim();

  const endAt=
    String(x.end_at??'').trim();

  if(!title)
    return json(
      c,
      {error:'Event Name is required.'},
      400
    );

  if(!startAt)
    return json(
      c,
      {error:'Start is required.'},
      400
    );

  if(!endAt)
    return json(
      c,
      {error:'End is required.'},
      400
    );

  const eventType=
    String(x.event_type||'Other');

  const locationName=
    String(x.location_name??x.location??'');

  const locationAddress=
    String(x.location_address||'');

  const departureName=
    String(
      x.departure_arrival_location_name||
      x.departure_location||
      ''
    );

  const departureAddress=
    String(
      x.departure_arrival_location_address||''
    );

  const dressCode=
    String(
      x.dress_code??x.uniform??''
    );

  const estimatedCost=
    x.estimated_cost==null?
      '':
      String(x.estimated_cost);

  const serviceHours=
    x.service_hours==null?
      null:
      Number(x.service_hours);

  const campingNights=
    x.camping_nights==null?
      null:
      Number(x.camping_nights);

  const hikingMiles=
    x.hiking_miles==null?
      null:
      Number(x.hiking_miles);

  const allDay=x.all_day?1:0;

  const leader1Id=
    x.leader_1_id==null||
    x.leader_1_id===''?
      null:
      Number(x.leader_1_id);

  const leader2Id=
    x.leader_2_id==null||
    x.leader_2_id===''?
      null:
      Number(x.leader_2_id);

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
        return_location,
        event_type,
        location_name,
        location_address,
        departure_arrival_location_name,
        departure_arrival_location_address,
        dress_code,
        service_hours,
        camping_nights,
        hiking_miles,
        leader_1_id,
        leader_2_id
      )
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `)
    .bind(
      title,
      String(x.description||''),
      startAt,
      endAt,
      allDay,
      leader1Id,
      dressCode,
      estimatedCost,
      locationName+
        (
          locationAddress?
            ` (${locationAddress})`:
            ''
        ),
      departureName+
        (
          departureAddress?
            ` (${departureAddress})`:
            ''
        ),
      '',
      eventType,
      locationName,
      locationAddress,
      departureName,
      departureAddress,
      dressCode,
      serviceHours,
      campingNights,
      hikingMiles,
      leader1Id,
      leader2Id
    )
    .run();

  return json(c,{
    id:r.meta.last_row_id
  });
});

app.put('/api/admin/events/:id',async c=>{
  const d=admin(c,'EVT');
  if(d)return d;

  const id=Number(c.req.param('id'));
  const x=await c.req.json();

  const title=
    String(x.event_name??x.title??'').trim();

  const startAt=
    String(x.start_at??'').trim();

  const endAt=
    String(x.end_at??'').trim();

  if(!title)
    return json(
      c,
      {error:'Event Name is required.'},
      400
    );

  if(!startAt)
    return json(
      c,
      {error:'Start is required.'},
      400
    );

  if(!endAt)
    return json(
      c,
      {error:'End is required.'},
      400
    );

  const eventType=
    String(x.event_type||'Other');

  const locationName=
    String(x.location_name??x.location??'');

  const locationAddress=
    String(x.location_address||'');

  const departureName=
    String(
      x.departure_arrival_location_name||
      x.departure_location||
      ''
    );

  const departureAddress=
    String(
      x.departure_arrival_location_address||''
    );

  const dressCode=
    String(
      x.dress_code??x.uniform??''
    );

  const estimatedCost=
    x.estimated_cost==null?
      '':
      String(x.estimated_cost);

  const serviceHours=
    x.service_hours==null?
      null:
      Number(x.service_hours);

  const campingNights=
    x.camping_nights==null?
      null:
      Number(x.camping_nights);

  const hikingMiles=
    x.hiking_miles==null?
      null:
      Number(x.hiking_miles);

  const allDay=x.all_day?1:0;

  const leader1Id=
    x.leader_1_id==null||
    x.leader_1_id===''?
      null:
      Number(x.leader_1_id);

  const leader2Id=
    x.leader_2_id==null||
    x.leader_2_id===''?
      null:
      Number(x.leader_2_id);

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
        event_type=?,
        location_name=?,
        location_address=?,
        departure_arrival_location_name=?,
        departure_arrival_location_address=?,
        dress_code=?,
        service_hours=?,
        camping_nights=?,
        hiking_miles=?,
        leader_1_id=?,
        leader_2_id=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `)
    .bind(
      title,
      String(x.description||''),
      startAt,
      endAt,
      allDay,
      leader1Id,
      dressCode,
      estimatedCost,
      locationName+
        (
          locationAddress?
            ` (${locationAddress})`:
            ''
        ),
      departureName+
        (
          departureAddress?
            ` (${departureAddress})`:
            ''
        ),
      '',
      eventType,
      locationName,
      locationAddress,
      departureName,
      departureAddress,
      dressCode,
      serviceHours,
      campingNights,
      hikingMiles,
      leader1Id,
      leader2Id,
      id
    )
    .run();

  return json(c,{ok:true});
});
app.delete('/api/admin/events/:id',async c=>{
  const d=admin(c,'EVT');
  if(d)return d;

  await c.env.DB
    .prepare(
      'DELETE FROM events WHERE id=?'
    )
    .bind(Number(c.req.param('id')))
    .run();

  return json(c,{ok:true});
});

app.post('/api/admin/photos',async c=>{
  const d=admin(c,'PHOTO');
  if(d)return d;

  const form=await c.req.formData();
  const eventId=Number(form.get('eventId'));
  const file=form.get('file');
  const caption=String(
    form.get('caption')||''
  );

  if(!(file instanceof File))
    return json(
      c,
      {error:'File required'},
      400
    );

  const key=
    `photos/${eventId}/${Date.now()}-${file.name.replace(
      /[^A-Za-z0-9._-]/g,
      '_'
    )}`;

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
  const d=admin(c,'PHOTO');
  if(d)return d;

  const id=Number(c.req.param('id'));

  const p=await c.env.DB
    .prepare(
      'SELECT storage_key FROM photos WHERE id=?'
    )
    .bind(id)
    .first<any>();

  if(p)
    await c.env.FILES.delete(
      p.storage_key
    );

  await c.env.DB
    .prepare(
      'DELETE FROM photos WHERE id=?'
    )
    .bind(id)
    .run();

  return json(c,{ok:true});
});

app.post('/api/admin/documents',async c=>{
  const d=admin(c,'DOC');
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
      `documents/${Date.now()}-${file.name.replace(
        /[^A-Za-z0-9._-]/g,
        '_'
      )}`;

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
  const d=admin(c,'DOC');
  if(d)return d;

  const id=Number(c.req.param('id'));

  const doc=await c.env.DB
    .prepare(
      'SELECT storage_key FROM documents WHERE id=?'
    )
    .bind(id)
    .first<any>();

  if(doc?.storage_key)
    await c.env.FILES.delete(
      doc.storage_key
    );

  await c.env.DB
    .prepare(
      'DELETE FROM documents WHERE id=?'
    )
    .bind(id)
    .run();

  return json(c,{ok:true});
});

app.put('/api/settings',async c=>{
  const deny=requirePerm('SET')(c);
  if(deny)return deny;

  const u=c.get('user');

  if(!u||!u.personId)
    return json(
      c,
      {error:'Login required'},
      401
    );

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
  const deny=requirePerm('SIGN')(c);
  if(deny)return deny;

  const u=c.get('user');

  if(!u||!u.personId)
    return json(
      c,
      {error:'Login required'},
      401
    );

  const x=await c.req.json();

  const rel=await c.env.DB
    .prepare(`
      SELECT 1
      FROM family_members a
      JOIN family_members b
        ON b.family_id=a.family_id
      JOIN people caller
        ON caller.id=a.person_id
      JOIN people scout
        ON scout.id=b.person_id
      WHERE
        a.person_id=?
        AND b.person_id=?
        AND caller.adult=1
        AND scout.adult=0
    `)
    .bind(
      u.personId,
      x.scoutPersonId
    )
    .first();

  if(!rel)
    return json(
      c,
      {error:'Only a connected parent/guardian can sign'},
      403
    );

  const templateKey=await c.env.DB
    .prepare(
      "SELECT value FROM site_content WHERE key='ahmr_template'"
    )
    .first<any>();

  if(!templateKey?.value)
    return json(
      c,
      {
        error:
          'An administrator must upload the official AHMR PDF template first'
      },
      400
    );

  const tpl=await c.env.FILES.get(
    templateKey.value
  );

  if(!tpl)
    return json(
      c,
      {error:'AHMR template missing'},
      400
    );

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

app.get('/api/admin/permissions',async c=>{
  const d=admin(c,'PMAP');
  if(d)return d;

  const permissions=await c.env.DB
    .prepare(`
      SELECT
        id,
        code,
        name,
        description,
        system
      FROM permission_titles
      WHERE code<>'ADMIN'
      ORDER BY id
    `)
    .all<any>();

  const positions=await c.env.DB
    .prepare(`
      SELECT
        p.id,
        p.name,
        p.category,
        p.code,
        p.system,
        COALESCE(
          (
            SELECT json_group_array(pp.permission_id)
            FROM position_permissions pp
            WHERE pp.position_id=p.id
          ),
          '[]'
        ) permission_ids,
        COALESCE(
          (
            SELECT json_group_array(br.base_position_id)
            FROM position_base_roles br
            WHERE br.position_id=p.id
          ),
          '[]'
        ) base_position_ids
      FROM positions p
      ORDER BY
        CASE p.code
          WHEN 'GUEST' THEN 0
          WHEN 'YOUTH' THEN 1
          WHEN 'ADULT' THEN 2
          WHEN 'ADULTL' THEN 3
          WHEN 'ADMIN' THEN 4
          ELSE 5
        END,
        CASE p.category
          WHEN 'youth' THEN 0
          WHEN 'adult' THEN 1
          ELSE 2
        END,
        p.name
    `)
    .all<any>();

  return json(c,{
    permissions:permissions.results??[],
    positions:(positions.results??[]).map((p:any)=>({
      ...p,
      permission_ids:
        JSON.parse(p.permission_ids||'[]').map(Number),
      base_position_ids:
        JSON.parse(p.base_position_ids||'[]').map(Number)
    }))
  });
});

app.post('/api/admin/permissions',async c=>{
  const d=admin(c,'PERM');
  if(d)return d;

  const x=await c.req.json();

  const name=String(
    x.name||''
  ).trim();

  let code=String(
    x.code||''
  )
    .trim()
    .toUpperCase()
    .replace(
      /[^A-Z0-9]+/g,
      '_'
    )
    .replace(
      /^_+|_+$/g,
      ''
    );

  if(!name)
    return json(
      c,
      {error:'Permission name is required'},
      400
    );

  if(!code)
    code=name
      .toUpperCase()
      .replace(
        /[^A-Z0-9]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      );

  const exists=await c.env.DB
    .prepare(`
      SELECT id
      FROM permission_titles
      WHERE code=? OR name=?
    `)
    .bind(
      code,
      name
    )
    .first<any>();

  if(exists)
    return json(
      c,
      {error:'That permission already exists'},
      409
    );

  const r=await c.env.DB
    .prepare(`
      INSERT INTO permission_titles(
        code,
        name,
        description,
        system
      )
      VALUES(?,?,?,0)
    `)
    .bind(
      code,
      name,
      String(x.description||'')
    )
    .run();

  return json(c,{
    id:r.meta.last_row_id,
    code,
    name
  });
});

app.put('/api/admin/permissions/:id',async c=>{
  const d=admin(c,'PERM');
  if(d)return d;

  const id=Number(c.req.param('id'));
  const x=await c.req.json();

  const row=await c.env.DB
    .prepare(
      'SELECT * FROM permission_titles WHERE id=?'
    )
    .bind(id)
    .first<any>();

  if(!row)
    return json(
      c,
      {error:'Permission not found'},
      404
    );

  const name=String(
    x.name||''
  ).trim();

  if(!name)
    return json(
      c,
      {error:'Permission name is required'},
      400
    );

  await c.env.DB
    .prepare(`
      UPDATE permission_titles
      SET
        name=?,
        description=?
      WHERE id=?
    `)
    .bind(
      name,
      String(x.description||''),
      id
    )
    .run();

  return json(c,{ok:true});
});

app.delete('/api/admin/permissions/:id',async c=>{
  const d=admin(c,'PERM');
  if(d)return d;

  const id=Number(c.req.param('id'));

  const row=await c.env.DB
    .prepare(
      'SELECT system FROM permission_titles WHERE id=?'
    )
    .bind(id)
    .first<any>();

  if(!row)
    return json(
      c,
      {error:'Permission not found'},
      404
    );

  if(Number(row.system))
    return json(
      c,
      {error:'Built-in permissions cannot be deleted'},
      400
    );

  await c.env.DB
    .prepare(
      'DELETE FROM permission_titles WHERE id=?'
    )
    .bind(id)
    .run();

  return json(c,{ok:true});
});

app.put('/api/admin/positions/:id/permissions',async c=>{
  const d=admin(c,'PMAP');
  if(d)return d;

  const id=Number(c.req.param('id'));
  const x=await c.req.json();

  const pos=await c.env.DB.prepare(`
    SELECT id,name,code,system
    FROM positions
    WHERE id=?
  `).bind(id).first<any>();

  if(!pos){
    return json(c,{error:'Position not found'},404);
  }

  const permissionIds=[
    ...new Set(
      (
        Array.isArray(x.permissionIds)?
          x.permissionIds:
          []
      )
      .map(Number)
      .filter(Number.isInteger)
    )
  ];

  const baseIds=[
    ...new Set(
      (
        Array.isArray(x.basePositionIds)?
          x.basePositionIds:
          []
      )
      .map(Number)
      .filter(Number.isInteger)
    )
  ];

  if(String(pos.code)==='ADMIN'){
    await c.env.DB.prepare(`
      DELETE FROM position_base_roles
      WHERE position_id=?
    `).bind(id).run();

    await c.env.DB.prepare(`
      DELETE FROM position_permissions
      WHERE position_id=?
    `).bind(id).run();

    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO position_permissions(
        position_id,permission_id
      )
      SELECT ?,id
      FROM permission_titles
    `).bind(id).run();

    return json(c,{ok:true});
  }

  const baseRows=baseIds.length?
    await c.env.DB.prepare(`
      SELECT id,code
      FROM positions
      WHERE id IN(${baseIds.map(()=>'?').join(',')})
        AND code IN('GUEST','YOUTH','ADULT','ADULTL','ADMIN')
    `).bind(...baseIds).all<any>()
    :
    {results:[]};

  const validBaseCodes=(baseRows.results??[])
    .map((x:any)=>String(x.code));

  const allowedRoleBases:Record<string,string[]> = {
    GUEST:[],
    YOUTH:['GUEST'],
    ADULT:['GUEST','YOUTH'],
    ADULTL:['GUEST','YOUTH','ADULT'],
    ADMIN:[]
  };

  if(
    ['GUEST','YOUTH','ADULT','ADULTL','ADMIN']
      .includes(String(pos.code))
  ){
    const allowed=allowedRoleBases[String(pos.code)];

    if(
      validBaseCodes.some(
        code=>!allowed.includes(code)
      )
    ){
      return json(
        c,
        {
          error:
            'That base role cannot be assigned to this built-in role.'
        },
        400
      );
    }
  }

  const validPermissions=permissionIds.length?
    await c.env.DB.prepare(`
      SELECT id
      FROM permission_titles
      WHERE id IN(
        ${permissionIds.map(()=>'?').join(',')}
      )
      AND code<>'ADMIN'
    `).bind(...permissionIds).all<any>()
    :
    {results:[]};

  const validPermissionIds=(validPermissions.results??[])
    .map((x:any)=>Number(x.id));

  await c.env.DB.prepare(`
    DELETE FROM position_base_roles
    WHERE position_id=?
  `).bind(id).run();

  for(const baseId of baseIds){
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO position_base_roles(
        position_id,
        base_position_id
      )
      VALUES(?,?)
    `).bind(id,baseId).run();
  }

  await c.env.DB.prepare(`
    DELETE FROM position_permissions
    WHERE position_id=?
  `).bind(id).run();

  for(const permissionId of validPermissionIds){
    await c.env.DB.prepare(`
      INSERT INTO position_permissions(
        position_id,
        permission_id
      )
      VALUES(?,?)
    `).bind(id,permissionId).run();
  }

  return json(c,{ok:true});
});

app.get('/api/admin/site-administrator',async c=>{
  const d=admin(c,'ACCT');
  if(d)return d;

  const rows=await c.env.DB
    .prepare(`
      SELECT
        p.id,
        p.first_name,
        p.last_name
      FROM people p
      JOIN person_positions pp
        ON pp.person_id=p.id
      JOIN positions pos
        ON pos.id=pp.position_id
      WHERE pos.code='ADMIN'
        AND p.archived=0
      ORDER BY
        p.last_name,
        p.first_name
    `)
    .all<any>();

  const selected=await c.env.DB
    .prepare(`
      SELECT person_id
      FROM site_administrator
      WHERE id=1
    `)
    .first<any>();

  return json(c,{
    administrators:rows.results??[],
    siteAdministratorId:
      selected?.person_id==null?
        null:
        Number(selected.person_id)
  });
});

app.put('/api/admin/site-administrator',async c=>{
  const d=admin(c,'ACCT');
  if(d)return d;

  const x=await c.req.json();
  const personId=Number(x.personId);

  if(!Number.isInteger(personId)){
    return json(
      c,
      {error:'A Site Administrator must be selected.'},
      400
    );
  }

  const administrator=await c.env.DB
    .prepare(`
      SELECT p.id
      FROM people p
      JOIN person_positions pp
        ON pp.person_id=p.id
      JOIN positions pos
        ON pos.id=pp.position_id
      WHERE p.id=?
        AND p.archived=0
        AND pos.code='ADMIN'
      LIMIT 1
    `)
    .bind(personId)
    .first<any>();

  if(!administrator){
    return json(
      c,
      {
        error:
          'The Site Administrator must already have Administrator checked.'
      },
      400
    );
  }

  await c.env.DB.prepare(`
    INSERT INTO site_administrator(
      id,
      person_id
    )
    VALUES(1,?)
    ON CONFLICT(id)
    DO UPDATE SET person_id=excluded.person_id
  `)
    .bind(personId)
    .run();

  return json(c,{
    ok:true,
    siteAdministratorId:personId
  });
});

app.get('/api/admin/account-logins',async c=>{
  const d=admin(c,'ACCT');
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
  const d=admin(c,'ACCT');
  if(d)return d;

  const id=Number(c.req.param('id'));
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
  const d=admin(c,'ACCT');
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
