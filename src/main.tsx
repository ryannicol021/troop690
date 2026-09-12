import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useNavigate,useLocation} from 'react-router-dom';
import './styles.css';
import {api,post,put} from './lib/api';

const nav=[['/','Home','public'],['/eagles','Eagle Scouts','public'],['/calendar','Calendar','CAL'],['/photos','Photo Gallery','PHV'],['/documents','Documents','DOCV'],['/leadership','Leadership','public'],['/advancement','Advancement','public'],['/summer-camp','Summer Camp','public'],['/uniform','Scout Uniform','public'],['/contact','Contact Us','public']];
const adminNav=[['/member-info','Member Info','MIV'],['/email','Email','EML'],['/administration','Administration','__ADMIN_ROLE__']];

function App(){
  const [me,setMe]=useState<any>(null);
  const [authReady,setAuthReady]=useState(false);
  const [open,setOpen]=useState<'account'|'nav'|null>(null);
  const navg=useNavigate();
  const loc=useLocation();

  useEffect(()=>{
    api('/me')
      .then(x=>setMe(x.user))
      .catch(()=>{})
      .finally(()=>setAuthReady(true));
  },[]);

    const can=(p:string)=>
    !!me &&
    (
      p==='__ADMIN_ROLE__'?
        !!me.isAdministrator:
        !!me.permissions?.includes(p)
    );
  const visible=[
    ...nav.filter(x=>x[2]==='public'||can(x[2])),
    ...adminNav.filter(x=>can(x[2]))
  ];

  return <div className="app">
    <header>
      <button className="brand" onClick={()=>navg('/')}>Troop 690</button>
      <div className="header-actions">
        <div className="drop">
          <button
            aria-label="Account"
            onClick={()=>setOpen(v=>v==='account'?null:'account')}
          >
            <span className="person-icon" aria-hidden="true"></span>
          </button>
          {open==='account'&&
            <div className="menu account-menu">
              <button onClick={()=>{
                setOpen(null);
                me?navg('/settings'):navg('/login')
              }}>
                {me?'Settings':'Log In'}
              </button>
              {me&&
                <button onClick={async()=>{
                  await post('/logout',{});
                  setMe(null);
                  setOpen(null);
                  navg('/');
                }}>
                  Log Out
                </button>
              }
            </div>
          }
        </div>

        <div className="drop">
          <button
            aria-label="Navigation"
            onClick={()=>setOpen(v=>v==='nav'?null:'nav')}
          >
            <span className="hamburger-icon" aria-hidden="true">
              <i></i><i></i><i></i>
            </span>
          </button>
          {open==='nav'&&
            <div className="menu nav-menu">
              {visible.map(([p,n])=>
                <button
                  key={p}
                  onClick={()=>{
                    setOpen(null);
                    navg(p)
                  }}
                  className={loc.pathname===p?'active':''}
                >
                  {n}
                </button>
              )}
            </div>
          }
        </div>
      </div>
    </header>

    <main>
      <RouterPage me={me} setMe={setMe} authReady={authReady}/>
    </main>

    <footer>
      <div>© {new Date().getFullYear()} Troop 690. All rights reserved.</div>
      <div>
        <a href="https://stwilliam.org" target="_blank" rel="noreferrer">
          St. William the Abbot RC Church
        </a>
      </div>
      <div>
        <a href="https://scoutingli.org" target="_blank" rel="noreferrer">
          Scouting America Long Island
        </a>
      </div>
    </footer>
  </div>
}

function RouterPage({
  me,
  setMe,
  authReady
}:{
  me:any,
  setMe:(x:any)=>void,
  authReady:boolean
}){
  const p=useLocation().pathname;

  const required:Record<string,string>={
    '/settings':'SET',
    '/calendar':'CAL',
    '/photos':'PHV',
    '/documents':'DOCV',
    '/member-info':'MIV',
    '/email':'EML',
    '/administration':'__ADMIN_ROLE__'
  };

  const requiredPermission=
    required[p]??(p.startsWith('/photos/')?'PHV':undefined);

  if(!authReady&&requiredPermission)
    return <Page title=""><Loading/></Page>;

  if(
    requiredPermission&&
    (
      !me||
      (
        requiredPermission==='__ADMIN_ROLE__'?
          !me.isAdministrator:
          !me.permissions?.includes(requiredPermission)
      )
    )
  )
    return <NotFound/>;

  if(p==='/')return <Home me={me}/>;
  if(p==='/login')return <Login setMe={setMe}/>;
  if(p.startsWith('/claim/'))return <Claim/>;
  if(p==='/settings')return <Settings me={me}/>;
  if(p==='/eagles')return <Eagles/>;
  if(p==='/calendar')return <Calendar/>;
  if(p==='/photos')return <Photos/>;
  if(p.startsWith('/photos/'))return <PhotoAlbum id={p.split('/')[2]}/>;
  if(p==='/documents')return <Documents/>;
  if(p==='/leadership')return <Leadership/>;
  if(p==='/advancement')return <Advancement/>;
  if(p==='/summer-camp')return <SummerCamp/>;
  if(p==='/uniform')return <Uniform/>;
  if(p==='/contact')return <Contact me={me}/>;
  if(p==='/member-info')
  return <MemberInfo me={me}/>;
  if(p==='/email')return <Email/>;
  if(p==='/administration')return <Administration me={me}/>;

  return <NotFound/>
}

function Page({
  title,
  children,
  actions
}:{
  title:string,
  children:React.ReactNode,
  actions?:React.ReactNode
}){
  return <section className="page">
    <div className="page-head">
      <h1>{title}</h1>
      {actions}
    </div>
    {children}
  </section>
}

function Loading(){
  return <div className="muted">Loading...</div>
}

function Home({me}:{me:any}){
  const [d,setD]=useState<any>();
  const [error,setError]=useState('');

  useEffect(()=>{
    api('/home')
      .then(setD)
      .catch((e:any)=>setError(e?.message||'Unable to load the homepage.'));
  },[]);

  if(error)
    return <Page title="Troop 690"><p className="error">{error}</p></Page>;

  if(!d)
    return <Page title="Troop 690"><Loading/></Page>;

  return <Page title="Troop 690">
    <div className="hero-image">
      {d.content.troop_photo?
        <img src={'/files/'+d.content.troop_photo} alt="Troop 690"/>:
        <div className="image-slot">Troop picture</div>
      }
    </div>

    <section>
      <h2>History</h2>
      <p>{d.content.history||'History content can be maintained by an administrator.'}</p>
    </section>

    {me&&
      <div className="grid two">
        <section className="card">
          <h2>Upcoming Calendar Events</h2>
          {d.events.length?
            d.events.map((e:any)=>
              <div className="list-row" key={e.id}>
                <b>{e.title}</b>
                <span>{new Date(e.start_at).toLocaleString()}</span>
              </div>
            ):
            <p className="muted">No upcoming events.</p>
          }
        </section>

        <section className="card">
          <h2>Recent Photo Albums</h2>
          {d.recent.length?
            d.recent.map((e:any)=>
              <div className="list-row" key={e.id}>
                <b>{e.title}</b>
                <span>{new Date(e.start_at).toLocaleDateString()}</span>
              </div>
            ):
            <p className="muted">No photo albums.</p>
          }
        </section>
      </div>
    }
  </Page>
}

function Login({setMe}:{setMe:(x:any)=>void}){
  const [u,setU]=useState('');
  const [p,setP]=useState('');
  const [err,setErr]=useState('');
  const nav=useNavigate();

  return <Page title="Log In">
    <form
      className="form narrow"
      onSubmit={async e=>{
        e.preventDefault();
        try{
          await post('/login',{username:u,password:p});
          const x=await api('/me');
          setMe(x.user);
          nav('/');
        }catch(e:any){
          setErr(e.message)
        }
      }}
    >
      <label>
        Username
        <input
          value={u}
          onChange={e=>setU(e.target.value)}
          autoComplete="username"
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={p}
          onChange={e=>setP(e.target.value)}
          autoComplete="current-password"
        />
      </label>

      {err&&<p className="error">{err}</p>}

      <button className="primary">Log In</button>
    </form>
  </Page>
}

function Claim(){
  const token=decodeURIComponent(location.pathname.split('/').pop()||'');
  const [username,setUsername]=useState('');
  const [pw,setPw]=useState('');
  const [ok,setOk]=useState(false);
  const [err,setErr]=useState('');

  return <Page title="Claim Account">
    <form
      className="form narrow"
      onSubmit={async e=>{
        e.preventDefault();

        try{
          await post('/claim',{token,username,password:pw});
          setOk(true)
        }catch(e:any){
          setErr(e.message)
        }
      }}
    >
      {ok?
        <p>Your account has been created. You can now log in.</p>:
        <>
          <label>
            Username
            <input
              value={username}
              onChange={e=>setUsername(e.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={pw}
              onChange={e=>setPw(e.target.value)}
            />
          </label>

          {err&&<p className="error">{err}</p>}

          <button className="primary">Create Account</button>
        </>
      }
    </form>
  </Page>
}

function Settings({me}:{me:any}){
  const [x,setX]=useState(me?.person||{});

  if(!me)
    return <Login setMe={()=>{}}/>;

  const fields=[
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

  return <Page title="Settings">
    <form
      className="form"
      onSubmit={async e=>{
        e.preventDefault();
        await put('/settings',x);
        alert('Saved')
      }}
    >
      <div className="grid two">
        {fields.map(f=>
          <label key={f}>
            {f.replaceAll('_',' ')}
            <input
              value={x[f]||''}
              onChange={e=>setX({...x,[f]:e.target.value})}
            />
          </label>
        )}
      </div>

      <button className="primary">Save</button>
    </form>
  </Page>
}

function Eagles(){
  const [q,setQ]=useState('');
  const [rows,setRows]=useState<any[]>([]);

  useEffect(()=>{
    api('/eagles'+(q?`?q=${encodeURIComponent(q)}`:''))
      .then(x=>setRows(x.eagles))
  },[q]);

  return <Page title="Eagle Scouts">
    <input
      className="search"
      placeholder="Search by name or historical number"
      value={q}
      onChange={e=>setQ(e.target.value)}
    />

    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Number</th>
            <th>Year</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(e=>
            <tr key={e.id}>
              <td>{e.display_name}</td>
              <td>{e.eagle_number}</td>
              <td>{e.eagle_year}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </Page>
}

function Calendar(){
  const [d,setD]=useState<any>();

  useEffect(()=>{
    api('/calendar').then(setD)
  },[]);

  if(!d)
    return <Page title="Calendar"><Loading/></Page>;

  return <Page
    title="Calendar"
    actions={<a className="button" href="/api/calendar.ics">Calendar subscription</a>}
  >
    <p className="muted">
      Copy the subscription link into Apple Calendar or Google Calendar.
      The feed stays current as the troop calendar changes.
    </p>

    <div className="calendar-list">
      {d.events.map((e:any)=>
        <article className="card" key={e.id}>
          <h2>{e.title}</h2>
          <p>{e.description}</p>

          <dl>
            <dt>When</dt>
            <dd>
              {e.all_day?
                'All day':
                `${new Date(e.start_at).toLocaleString()}${e.end_at?' to '+new Date(e.end_at).toLocaleString():''}`
              }
            </dd>

            <dt>Leader</dt>
            <dd>{e.leader_name||''}</dd>

            <dt>Uniform</dt>
            <dd>{e.uniform||''}</dd>

            <dt>Cost</dt>
            <dd>{e.estimated_cost||''}</dd>

            <dt>Location</dt>
            <dd>{e.location||''}</dd>
          </dl>
        </article>
      )}
    </div>
  </Page>
}

function PhotoAlbum({id}:{id:string}){
  const [d,setD]=useState<any>();

  useEffect(()=>{
    api('/photos/'+id).then(setD)
  },[id]);

  if(!d)
    return <Page title="Photo Gallery"><Loading/></Page>;

  return <Page title="Photo Gallery">
    <div className="uniform-grid">
      {d.photos.map((x:any)=>
        <figure className="card" key={x.id}>
          <img
            className="uniform-img"
            src={'/files/'+x.storage_key}
            alt={x.caption||'Troop photo'}
          />
          <figcaption>{x.caption}</figcaption>
          <a
            className="button"
            href={'/files/'+x.storage_key}
            download
          >
            Download
          </a>
        </figure>
      )}
    </div>
  </Page>
}

function Photos(){
  const [a,setA]=useState<any[]>([]);

  useEffect(()=>{
    api('/photos').then(x=>setA(x.albums))
  },[]);

  return <Page title="Photo Gallery">
    <div className="album-grid">
      {a.map(x=>
        <article className="card" key={x.id}>
          <h2>{x.title}</h2>
          <p>{new Date(x.start_at).toLocaleDateString()}</p>
          <p>{x.photo_count} photos</p>
          <a className="button" href={'/photos/'+x.id}>Open</a>
        </article>
      )}
    </div>
  </Page>
}

function Documents(){
  const [d,setD]=useState<any>();

  useEffect(()=>{
    api('/documents').then(setD)
  },[]);

  if(!d)
    return <Page title="Documents"><Loading/></Page>;

  return <Page title="Documents">
    <div className="folder-grid">
      {d.documents.map((x:any)=>
        <article className="card" key={x.id}>
          <h2>{x.name}</h2>
          <p>{x.event_title||'Standalone document'}</p>

          {x.external_url?
            <a
              className="button"
              target="_blank"
              rel="noreferrer"
              href={x.external_url}
            >
              Open URL
            </a>:
            <a
              className="button"
              target="_blank"
              href={'/files/'+x.storage_key}
            >
              Open file
            </a>
          }
        </article>
      )}
    </div>
  </Page>
}

function Leadership(){
  const [d,setD]=useState<any>();

  useEffect(()=>{
    api('/leadership').then(setD)
  },[]);

  if(!d)
    return <Page title="Leadership"><Loading/></Page>;

  return <Page title="Leadership">
    <div className="grid two">
      {d.positions.map((x:any)=>
        <article className="card" key={x.id}>
          <h2>{x.name}</h2>
          <p>{x.description}</p>
          <p className="holder">
            {x.holder||'Current holder information is member-only.'}
          </p>
        </article>
      )}
    </div>

    <section>
      <h2>SPL History</h2>

      {d.history
        .filter((x:any)=>x.type==='SPL'||x.type==='ASPL')
        .map((x:any)=>
          <div className="list-row" key={x.id}>
            <span>{x.type}</span>
            <b>{x.person_name}</b>
            <span>{x.start_year}-{x.end_year}</span>
          </div>
        )
      }
    </section>

    <section>
      <h2>Scoutmaster History</h2>

      {d.history
        .filter((x:any)=>x.type==='Scoutmaster')
        .map((x:any)=>
          <div className="list-row" key={x.id}>
            <b>{x.person_name}</b>
            <span>{x.start_year}-{x.end_year}</span>
          </div>
        )
      }
    </section>
  </Page>
}

function Advancement(){
  const [d,setD]=useState<any>();

  useEffect(()=>{
    api('/advancement').then(setD)
  },[]);

  if(!d)
    return <Page title="Advancement"><Loading/></Page>;

  const ranks=[
    'Scout',
    'Tenderfoot',
    'Second Class',
    'First Class',
    'Star',
    'Life',
    'Eagle Scout'
  ];

  return <Page title="Advancement">
    {ranks.map(r=>
      <section key={r}>
        <h2>{r}</h2>

        <div className="req-grid">
          {d.requirements
            .filter((x:any)=>x.rank===r)
            .map((x:any)=>
              <a
                className={'req '+(!x.video_url?'disabled':'')}
                key={x.id}
                href={x.video_url||undefined}
                target="_blank"
                rel="noreferrer"
              >
                {x.requirement_name}
              </a>
            )
          }
        </div>
      </section>
    )}

    <section>
      <h2>Know Your Knots</h2>

      <div className="button-grid">
        {d.knots.map((k:any)=>
          <a
            className={'button '+(!k.video_url?'disabled':'')}
            key={k.id}
            href={k.video_url||undefined}
            target="_blank"
            rel="noreferrer"
          >
            {k.name}
          </a>
        )}
      </div>
    </section>

    <section>
      <h2>Merit Badges</h2>

      <p>
        Merit badges provide Scouts opportunities to learn about subjects
        and complete requirements with guidance from counselors.
      </p>

      <a
        className="primary button"
        href="https://www.scouting.org/skills/merit-badges/"
        target="_blank"
        rel="noreferrer"
      >
        Start Earning
      </a>
    </section>

    <section>
      <h2>Awards</h2>

      <div className="button-grid">
        {d.awards.map((a:any)=>
          <a
            className={'button '+(!a.url?'disabled':'')}
            key={a.id}
            href={a.url||undefined}
            target="_blank"
            rel="noreferrer"
          >
            {a.name}
          </a>
        )}
      </div>
    </section>
  </Page>
}

function SummerCamp(){
  const [d,setD]=useState<any>();

  useEffect(()=>{
    api('/summer-camp').then(setD)
  },[]);

  if(!d)
    return <Page title="Summer Camp"><Loading/></Page>;

  return <Page title="Summer Camp">
    <h2>Onteora Scout Reservation</h2>
    <p>{d.camp.description}</p>

    <h2>Merit Badges</h2>
    <p>{d.camp.merit_badges}</p>

    <h2>Year-to-Year Information</h2>

    <p>
      <b>Costs:</b> {d.camp.costs}
    </p>

    <p>
      <b>Deadlines:</b> {d.camp.deadlines}
    </p>

    <div className="folder-grid">
      {d.documents.map((x:any)=>
        <article className="card" key={x.id}>
          <h3>{x.name}</h3>

          {x.external_url?
            <a
              className="button"
              target="_blank"
              rel="noreferrer"
              href={x.external_url}
            >
              Open
            </a>:
            <a
              className="button"
              target="_blank"
              href={'/files/'+x.storage_key}
            >
              Open
            </a>
          }
        </article>
      )}
    </div>
  </Page>
}

function Uniform(){
  const [d,setD]=useState<any>();

  useEffect(()=>{
    api('/uniform').then(setD)
  },[]);

  if(!d)
    return <Page title="Scout Uniform"><Loading/></Page>;

  const areas=[
    ['uniform_class_a','Class A'],
    ['uniform_class_b','Class B'],
    ['uniform_right_sleeve','Right sleeve'],
    ['uniform_left_sleeve','Left sleeve'],
    ['uniform_right_pocket','Right pocket'],
    ['uniform_left_pocket','Left pocket']
  ];

  return <Page title="Scout Uniform">
    <section>
      <h2>Class A uniform</h2>
      <p>The Class A uniform is the troop's formal Scout uniform.</p>
      <ImgSlot src={d.content.uniform_class_a}/>
    </section>

    <section>
      <h2>Class B uniform</h2>
      <p>The Class B uniform is the troop's activity uniform.</p>
      <ImgSlot src={d.content.uniform_class_b}/>
    </section>

    <section>
      <h2>Insignia Guide</h2>

      <div className="uniform-grid">
        {areas.slice(2).map(([k,n])=>
          <div className="card" key={k}>
            <h3>{n}</h3>
            <ImgSlot src={d.content[k]}/>
          </div>
        )}
      </div>

      <h3>Key</h3>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>Number</th>
              <th>Insignia</th>
            </tr>
          </thead>

          <tbody>
            {d.key.map((x:any)=>
              <tr key={x.id}>
                <td>{x.image_area}</td>
                <td>{x.number}</td>
                <td>{x.label}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  </Page>
}

function ImgSlot({src}:{src?:string}){
  return src?
    <img
      className="uniform-img"
      src={'/files/'+src}
      alt="Uniform guide"
    />:
    <div className="image-slot">Owner-supplied image</div>
}

function Contact({me}:{me:any}){
  return <Page title="Contact Us">
    <div className="grid three">
      <section className="card public-only">
        <h2>Joining</h2>

        {!me?
          <a
            className="button"
            href="mailto:committee@troop690.org?cc=scoutmaster@troop690.org"
          >
            Contact the committee
          </a>:
          <p className="muted">This section is for non-members.</p>
        }
      </section>

      <section className="card">
        <h2>Questions</h2>

        <a
          className="button"
          href="mailto:scoutmaster@troop690.org"
        >
          Contact the Scoutmaster
        </a>
      </section>

      <section className="card">
        <h2>Website Feedback</h2>

        <a
          className="button"
          href="mailto:webmaster@troop690.org"
        >
          Report an issue or send feedback
        </a>
      </section>
    </div>
  </Page>
}

function MemberInfo({me}:{me:any}){
  const [rows,setRows]=useState<any[]>([]);
  const [edit,setEdit]=useState<any|null>(null);
  const [adding,setAdding]=useState(false);
  const [accountLink,setAccountLink]=useState<any|null>(null);
  const [msg,setMsg]=useState('');
  const [error,setError]=useState('');

  const canEdit=
    !!me?.permissions?.includes('MIE');

  const canInvite=
    !!me?.permissions?.includes('INV');

  const canDelete=
    !!me?.permissions?.includes('MDEL');

  const load=async()=>{
    try{
      const x=await api('/admin/members');
      setRows(x.members||[]);
    }catch(e:any){
      setError(e.message);
    }
  };

  useEffect(()=>{
    load();
  },[]);

  const positionText=(x:any)=>{
    const base=x.adult?
      (x.adult_leader?'Adult Leader':'Adult'):
      'Youth';

    const extra=(x.position_names||[])
      .filter(Boolean);

    return [
      base,
      ...extra
    ].join(', ');
  };

  const accountStatus=(x:any)=>{
    if(x.active)
      return 'Active';

    if(x.invite_expires_at)
      return 'Link Pending';

    return 'No Account';
  };

  const createLink=async(x:any)=>{
    try{
      const r=await post(
        '/admin/invite/'+x.id,
        {}
      );

      setAccountLink({
        name:`${x.first_name} ${x.last_name}`,
        username:r.username,
        url:r.inviteUrl
      });
    }catch(e:any){
      setMsg(e.message);
      setTimeout(()=>setMsg(''),2200);
    }
  };

  return <Page
    title="Member Info"
    actions={
      <div className="button-row">
        {canEdit&&
          <button
            className="primary"
            onClick={()=>{
              setError('');
              setAdding(true);
            }}
          >
            Add Person
          </button>
        }

        <a
          className="button"
          href="/api/admin/quick-text.csv"
        >
          Quick Text
        </a>

        <a
          className="button"
          href="/api/admin/emergency-contacts.csv"
        >
          Emergency Contacts
        </a>
      </div>
    }
  >
    {error&&
      <p className="error">{error}</p>
    }

    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Position</th>
            <th>Rank</th>
            <th>Date of birth</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Address</th>
            <th>Account</th>
            <th>Options</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(x=>
            <tr key={x.id}>
              <td>
                {x.last_name}, {x.first_name}
              </td>

              <td>
                {positionText(x)}
              </td>

              <td>{x.rank||''}</td>

              <td>{x.dob||''}</td>

              <td>{x.phone||''}</td>

              <td>{x.email||''}</td>

              <td>
                {[x.street,x.town,x.zip]
                  .filter(Boolean)
                  .join(', ')}
              </td>

              <td>
                <div>
                  {accountStatus(x)}
                </div>

                {x.username&&
                  <small>
                    {x.username}
                  </small>
                }
              </td>

              <td>
                <div className="admin-action-row">
                  {canEdit&&
                    <button
                      className="admin-action-button"
                      onClick={()=>setEdit(x)}
                    >
                      Edit
                    </button>
                  }

                  {canInvite&&!x.active&&
                    <button
                      className="admin-action-button"
                      onClick={()=>createLink(x)}
                    >
                      {x.invite_expires_at?
                        'Regenerate Link':
                        'Create Account Link'}
                    </button>
                  }

                  {canDelete&&
                    <button
                      className="admin-action-button"
                      onClick={async()=>{
                        if(!confirm(
                          'Are you sure you want to delete this member? This will also delete the associated account and cannot be undone.'
                        ))
                          return;

                        try{
                          await api(
                            '/admin/members/'+x.id,
                            {method:'DELETE'}
                          );

                          await load();

                          setMsg('Deleted');
                          setTimeout(
                            ()=>setMsg(''),
                            1800
                          );
                        }catch(e:any){
                          setMsg(e.message);
                          setTimeout(
                            ()=>setMsg(''),
                            2200
                          );
                        }
                      }}
                    >
                      Delete
                    </button>
                  }
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    {(edit||adding)&&
      <MemberEditor
        value={adding?null:edit}
        onClose={()=>{
          setEdit(null);
          setAdding(false);
        }}
        onSaved={async()=>{
          setEdit(null);
          setAdding(false);
          await load();

          setMsg('Saved');
          setTimeout(
            ()=>setMsg(''),
            1800
          );
        }}
      />
    }

    {accountLink&&
      <div className="modal">
        <div className="modal-card">
          <h2>Account Link</h2>

          <p>
            This does not send an email or text message.
            Copy the link below and give it to the member
            manually.
          </p>

          <label className="form">
            Username
            <input
              value={accountLink.username}
              readOnly
            />
          </label>

          <label className="form">
            Account Link
            <input
              value={accountLink.url}
              readOnly
            />
          </label>

          <div className="button-row">
            <button
              className="primary"
              onClick={async()=>{
                try{
                  await navigator.clipboard.writeText(
                    accountLink.url
                  );

                  setMsg('Link copied');
                  setTimeout(
                    ()=>setMsg(''),
                    1800
                  );
                }catch{
                  setMsg(
                    'Unable to copy the link. You can select it manually.'
                  );

                  setTimeout(
                    ()=>setMsg(''),
                    2200
                  );
                }
              }}
            >
              Copy Link
            </button>

            <button
              onClick={()=>
                setAccountLink(null)
              }
            >
              Close
            </button>
          </div>
        </div>
      </div>
    }

    {msg&&
      <div className="toast">
        {msg}
      </div>
    }
  </Page>
}

function MemberEditor({
  value,
  onClose,
  onSaved
}:{
  value:any|null,
  onClose:()=>void,
  onSaved:()=>void
}){
  const isNew=!value?.id;

  const empty={
    prefix:'',
    first_name:'',
    middle_name:'',
    last_name:'',
    suffix:'',
    gender:'Male',
    adult:false,
    adult_leader:false,
    rank:'',
    dob:'',
    phone:'',
    email:'',
    street:'',
    town:'',
    zip:'',
    join_date:'',
    cub_scout_pack:'',
    patrol:'',
    scouting_membership_id:'',
    registration_expiration:'',
    syt_expiration:'',
    email_default_opt_out:false,
    oa_member:false,
    eagle_scout_archive:false,
    archived:false,
    position_ids:[]
  };

  const [x,setX]=useState({
    ...empty,
    ...(value||{})
  });

  const [positions,setPositions]=useState<any[]>([]);
  const [familyPeople,setFamilyPeople]=useState<any[]>([]);
  const [family,setFamily]=useState<any>({
    parents:[],
    siblings:[]
  });

  const [familyTarget,setFamilyTarget]=useState('');
  const [familyRole,setFamilyRole]=useState('Parent');
  const [err,setErr]=useState('');

  useEffect(()=>{
    api('/admin/member-positions')
      .then(r=>setPositions(r.positions||[]))
      .catch((e:any)=>setErr(e.message));
  },[]);

  useEffect(()=>{
    api('/admin/members')
      .then(r=>{
        setFamilyPeople(
          (r.members||[])
            .filter(
              (p:any)=>
                Number(p.id)!==
                Number(value?.id)
            )
        );
      })
      .catch((e:any)=>setErr(e.message));
  },[value?.id]);

  useEffect(()=>{
    if(!value?.id)
      return;

    api('/admin/family-relationships/'+value.id)
      .then(r=>setFamily(r))
      .catch((e:any)=>setErr(e.message));
  },[value?.id]);

  const togglePosition=(id:number)=>{
    setX((v:any)=>({
      ...v,
      position_ids:
        v.position_ids.includes(id)?
          v.position_ids.filter(
            (x:number)=>x!==id
          ):
          [...v.position_ids,id]
    }));
  };

  return <div className="modal">
    <form
      className="modal-card form member-editor"
      onSubmit={async e=>{
        e.preventDefault();

        if(
          !String(x.first_name||'').trim()||
          !String(x.last_name||'').trim()
        ){
          setErr(
            'First name and last name are required.'
          );
          return;
        }

        if(x.adult_leader&&!x.adult){
          setErr(
            'Adult Leader requires Adult.'
          );
          return;
        }

        try{
          if(isNew){
            await post(
              '/admin/members',
              x
            );
          }else{
            await put(
              '/admin/members/'+x.id,
              x
            );
          }

          onSaved();
        }catch(e:any){
          setErr(e.message)
        }
      }}
    >
      <h2>
        {isNew?'Add Person':'Edit Member'}
      </h2>

      <div className="member-form-card">
        <div className="member-name-grid">
          <label>
            Prefix
            <select
              value={x.prefix||''}
              onChange={e=>
                setX({
                  ...x,
                  prefix:e.target.value
                })
              }
            >
              <option value=""></option>
              <option value="Rev.">Rev.</option>
              <option value="Rev. Msgr.">Rev. Msgr.</option>
            </select>
          </label>

          <label>
            First Name
            <input
              value={x.first_name||''}
              onChange={e=>
                setX({
                  ...x,
                  first_name:e.target.value
                })
              }
              required
            />
          </label>

          <label>
            Middle Name
            <input
              value={x.middle_name||''}
              onChange={e=>
                setX({
                  ...x,
                  middle_name:e.target.value
                })
              }
            />
          </label>

          <label>
            Last Name
            <input
              value={x.last_name||''}
              onChange={e=>
                setX({
                  ...x,
                  last_name:e.target.value
                })
              }
              required
            />
          </label>

          <label>
            Suffix
            <select
              value={x.suffix||''}
              onChange={e=>
                setX({
                  ...x,
                  suffix:e.target.value
                })
              }
            >
              <option value=""></option>
              <option value="Jr.">Jr.</option>
              <option value="Sr.">Sr.</option>
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
              <option value="V">V</option>
              <option value="VI">VI</option>
              <option value="VII">VII</option>
              <option value="VIII">VIII</option>
              <option value="IX">IX</option>
              <option value="X">X</option>
            </select>
          </label>
        </div>
      </div>

      <div className="member-form-card">
        <div className="member-info-grid">
          <label>
            Gender
            <select
              value={x.gender||'Male'}
              onChange={e=>
                setX({
                  ...x,
                  gender:e.target.value
                })
              }
            >
              <option value=""></option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>

          <label>
            Date of Birth
            <input
              type="date"
              value={x.dob||''}
              onChange={e=>
                setX({
                  ...x,
                  dob:e.target.value
                })
              }
            />
          </label>

          <label>
            Phone
            <input
              type="tel"
              value={x.phone||''}
              onChange={e=>
                setX({
                  ...x,
                  phone:e.target.value
                })
              }
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={x.email||''}
              onChange={e=>
                setX({
                  ...x,
                  email:e.target.value
                })
              }
            />
          </label>
        </div>
      </div>

      <div className="member-form-card">
        <div className="member-address-grid">
          <label>
            Street Address
            <input
              value={x.street||''}
              onChange={e=>
                setX({
                  ...x,
                  street:e.target.value
                })
              }
            />
          </label>

          <label>
            Town
            <input
              value={x.town||''}
              onChange={e=>
                setX({
                  ...x,
                  town:e.target.value
                })
              }
            />
          </label>

          <label>
            ZIP Code
            <input
              value={x.zip||''}
              onChange={e=>
                setX({
                  ...x,
                  zip:e.target.value
                })
              }
            />
          </label>
        </div>
      </div>

      <div className="member-form-card">
        <div className="member-scouting-grid">
          <label>
            Rank
            <input
              value={x.rank||''}
              onChange={e=>
                setX({
                  ...x,
                  rank:e.target.value
                })
              }
            />
          </label>

          <label>
            Join Date
            <input
              type="date"
              value={x.join_date||''}
              onChange={e=>
                setX({
                  ...x,
                  join_date:e.target.value
                })
              }
            />
          </label>

          <label>
            Cub Scout Pack
            <input
              value={x.cub_scout_pack||''}
              onChange={e=>
                setX({
                  ...x,
                  cub_scout_pack:e.target.value
                })
              }
            />
          </label>

          <label>
            Patrol
            <input
              value={x.patrol||''}
              onChange={e=>
                setX({
                  ...x,
                  patrol:e.target.value
                })
              }
            />
          </label>

          <label>
            Scouting Membership ID
            <input
              value={x.scouting_membership_id||''}
              onChange={e=>
                setX({
                  ...x,
                  scouting_membership_id:
                    e.target.value
                })
              }
            />
          </label>

          <label>
            Registration Expiration
            <input
              type="date"
              value={x.registration_expiration||''}
              onChange={e=>
                setX({
                  ...x,
                  registration_expiration:
                    e.target.value
                })
              }
            />
          </label>

          <label>
            SYT Expiration
            <input
              type="date"
              value={x.syt_expiration||''}
              onChange={e=>
                setX({
                  ...x,
                  syt_expiration:
                    e.target.value
                })
              }
            />
          </label>
        </div>
      </div>

      <div className="member-form-card">
        <div className="member-check-grid">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!x.adult}
              onChange={e=>
                setX({
                  ...x,
                  adult:e.target.checked,
                  adult_leader:
                    e.target.checked?
                      x.adult_leader:
                      false
                })
              }
            />
            Adult
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!x.adult_leader}
              disabled={!x.adult}
              onChange={e=>
                setX({
                  ...x,
                  adult_leader:e.target.checked
                })
              }
            />
            Adult Leader
          </label>
        </div>
      </div>

      <div className="member-form-card">
        <div className="member-position-list">
          {positions.map(p=>
            <label
              key={p.id}
              className="checkbox-label"
            >
              <input
                type="checkbox"
                checked={x.position_ids.includes(
                  Number(p.id)
                )}
                onChange={()=>
                  togglePosition(
                    Number(p.id)
                  )
                }
              />
              {p.name}
            </label>
          )}
        </div>
      </div>

            {(
        x.adult||
        !x.adult
      )&&
        <div className="member-form-card">
          <div className="member-family-add">
            <div className="member-family-add-row">
              <select
                value={familyRole}
                onChange={e=>
                  setFamilyRole(e.target.value)
                }
              >
                <option value="Parent">
                  Parent
                </option>
                <option value="Guardian">
                  Guardian
                </option>
                <option value="Sibling">
                  Sibling
                </option>
              </select>

              <select
                value={familyTarget}
                onChange={e=>
                  setFamilyTarget(e.target.value)
                }
              >
                <option value="">
                  Select family member
                </option>

                {familyPeople
                  .filter((p:any)=>{
                    if(familyRole==='Sibling')
                      return true;

                    return x.adult?
                      !p.adult:
                      p.adult;
                  })
                  .map((p:any)=>
                    <option
                      key={p.id}
                      value={p.id}
                    >
                      {p.last_name}, {p.first_name}
                    </option>
                  )
                }
              </select>

              {!isNew&&
                <button
                  type="button"
                  className="admin-action-button"
                  onClick={async()=>{
                    if(!familyTarget)
                      return;

                    try{
                      await post(
                        '/admin/family-relationships',
                        {
                          personId:
                            x.adult?
                              x.id:
                              Number(familyTarget),
                          relatedPersonId:
                            x.adult?
                              Number(familyTarget):
                              x.id,
                          role:familyRole
                        }
                      );

                      const r=
                        await api(
                          '/admin/family-relationships/'+
                          x.id
                        );

                      setFamily(r);
                      setFamilyTarget('');

                      setErr('');
                    }catch(e:any){
                      setErr(e.message)
                    }
                  }}
                >
                  Add
                </button>
              }
            </div>

            {isNew&&
              <p className="muted">
                Save this person first, then family
                relationships can be added.
              </p>
            }

            {family.parents.length>0&&
              <div className="member-family-list">
                <strong>Parents / Guardians</strong>

                {family.parents.map((p:any)=>
                  <div
                    className="member-family-row"
                    key={p.id}
                  >
                    <span>
                      {p.last_name}, {p.first_name}
                    </span>

                    <button
                      type="button"
                      className="admin-action-button"
                      onClick={async()=>{
                        await fetch(
                          '/api/admin/family-relationships',
                          {
                            method:'DELETE',
                            credentials:'include',
                            headers:{
                              'Content-Type':
                                'application/json'
                            },
                            body:JSON.stringify({
                              personId:p.id,
                              relatedPersonId:x.id,
                              role:'Parent'
                            })
                          }
                        );

                        const r=
                          await api(
                            '/admin/family-relationships/'+
                            x.id
                          );

                        setFamily(r);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            }

            {family.siblings.length>0&&
              <div className="member-family-list">
                <strong>Siblings</strong>

                {family.siblings.map((p:any)=>
                  <div
                    className="member-family-row"
                    key={p.id}
                  >
                    <span>
                      {p.last_name}, {p.first_name}
                    </span>

                    <button
                      type="button"
                      className="admin-action-button"
                      onClick={async()=>{
                        await fetch(
                          '/api/admin/family-relationships',
                          {
                            method:'DELETE',
                            credentials:'include',
                            headers:{
                              'Content-Type':
                                'application/json'
                            },
                            body:JSON.stringify({
                              personId:x.id,
                              relatedPersonId:p.id,
                              role:'Sibling'
                            })
                          }
                        );

                        const r=
                          await api(
                            '/admin/family-relationships/'+
                            x.id
                          );

                        setFamily(r);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            }
          </div>
        </div>
      }
      
      <div className="member-form-card">
        <div className="member-check-grid">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!x.email_default_opt_out}
              onChange={e=>
                setX({
                  ...x,
                  email_default_opt_out:
                    e.target.checked
                })
              }
            />
            Email Default Opt-Out
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!x.oa_member}
              onChange={e=>
                setX({
                  ...x,
                  oa_member:e.target.checked
                })
              }
            />
            Order of the Arrow Member
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!x.eagle_scout_archive}
              onChange={e=>
                setX({
                  ...x,
                  eagle_scout_archive:
                    e.target.checked
                })
              }
            />
            Eagle Scout Archive
          </label>
        </div>
      </div>

      {err&&
        <p className="error">{err}</p>
      }

      <div className="button-row">
        <button className="primary">
          {isNew?'Add Person':'Save'}
        </button>

        <button
          type="button"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
}
function Email(){
  const [rows,setRows]=useState<any[]>([]);
  const [selected,setSelected]=useState<Record<number,boolean>>({});

  useEffect(()=>{
    api('/admin/members').then(x=>{
      setRows(x.members);

      const s:any={};

      x.members.forEach((m:any)=>
        s[m.id]=!m.email_default_opt_out
      );

      setSelected(s)
    })
  },[]);

  const emails=
    rows
      .filter(x=>selected[x.id]&&x.email)
      .map(x=>x.email);

  return <Page title="Email">
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Send</th>
            <th>Name</th>
            <th>Email</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(x=>
            <tr key={x.id}>
              <td>
                <input
                  type="checkbox"
                  checked={!!selected[x.id]}
                  onChange={e=>
                    setSelected({
                      ...selected,
                      [x.id]:e.target.checked
                    })
                  }
                />
              </td>

              <td>{x.last_name}, {x.first_name}</td>
              <td>{x.email}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <a
      className="primary button"
      href={'mailto:?bcc='+encodeURIComponent(emails.join(','))}
    >
      Create BCC mail
    </a>
  </Page>
}

function Administration({me}:{me:any}){
  const [accounts,setAccounts]=useState<any[]>([]);
  const [config,setConfig]=useState<any>({
    permissions:[],
    positions:[]
  });
  const [editingAccount,setEditingAccount]=useState<number|null>(null);
  const [editingPermission,setEditingPermission]=useState<number|null>(null);
  const [editingPosition,setEditingPosition]=useState<number|null>(null);
  const [newPosition,setNewPosition]=useState({
    name:'',
    category:'adult'
  });
  const [newPermission,setNewPermission]=useState({
    name:'',
    code:'',
    description:''
  });
    const [msg,setMsg]=useState('');
  const [permissionTip,setPermissionTip]=useState<{
    text:string;
    x:number;
    y:number;
  }|null>(null);

  const showPermissionTip=(
  e:React.SyntheticEvent<HTMLButtonElement>,
  text:string
)=>{
    const r=e.currentTarget.getBoundingClientRect();

    setPermissionTip({
      text,
      x:r.left+(r.width/2),
      y:r.top-10
    });
  };

  const hidePermissionTip=()=>{
    setPermissionTip(null);
  };

  const can=(p:string)=>!!me&&me.permissions?.includes(p);

  const load=async()=>{
    const p=await api('/admin/permissions');
    setConfig(p);

    if(can('ACCT')){
      const a=await api('/admin/account-logins');

      setAccounts(
        (a.accounts||[]).sort((x:any,y:any)=>
          `${x.first_name} ${x.last_name}`.localeCompare(
            `${y.first_name} ${y.last_name}`
          )
        )
      );
    }
  };

  useEffect(()=>{
    load().catch(e=>setMsg(e.message))
  },[]);

  const savePosition=async(position:any)=>{
    await put(
      '/admin/positions/'+position.id+'/permissions',
      {
        permissionIds:position.permission_ids,
        basePositionIds:position.base_position_ids||[]
      }
    );

    setMsg('Saved');
    setTimeout(()=>setMsg(''),1800)
  };

  const togglePermission=(
    positionId:number,
    permissionId:number
  )=>{
    setConfig((d:any)=>({
      ...d,
      positions:d.positions.map((p:any)=>
        p.id===positionId?
          {
            ...p,
            permission_ids:p.permission_ids.includes(permissionId)?
              p.permission_ids.filter((id:number)=>id!==permissionId):
              [...p.permission_ids,permissionId]
          }:
          p
      )
    }))
  };

  const createPermission=async(e:React.FormEvent)=>{
    e.preventDefault();

    try{
      const r=await post('/admin/permissions',newPermission);

      setNewPermission({
        name:'',
        code:'',
        description:''
      });

      await load();

      setMsg(`Created ${r.name}`);
      setTimeout(()=>setMsg(''),1800)
    }catch(e:any){
      setMsg(e.message)
    }
  };

  const createPosition=async(e:React.FormEvent)=>{
    e.preventDefault();

    try{
      const r=await post(
        '/admin/positions',
        newPosition
      );

      setNewPosition({
        name:'',
        category:'adult'
      });

      await load();

      setMsg(`Created ${r.name}`);
      setTimeout(()=>setMsg(''),1800)
    }catch(e:any){
      setMsg(e.message);
      setTimeout(()=>setMsg(''),2200)
    }
  };

  const saveAvailablePosition=async(position:any)=>{
    try{
      await put(
        '/admin/positions/'+position.id,
        {
          name:position.name,
          category:position.category
        }
      );

      setEditingPosition(null);
      await load();

      setMsg('Saved');
      setTimeout(()=>setMsg(''),1800)
    }catch(e:any){
      setMsg(e.message);
      setTimeout(()=>setMsg(''),2200)
    }
  };

  const deleteAvailablePosition=async(id:number)=>{
    if(!confirm(
      'Are you sure you want to delete this position? This action cannot be undone.'
    ))
      return;

    try{
      const r=await fetch(
        '/api/admin/positions/'+id,
        {
          method:'DELETE',
          credentials:'include'
        }
      );

      if(!r.ok){
        const x=await r.json().catch(()=>({}));
        setMsg(x.error||'Delete failed');
        setTimeout(()=>setMsg(''),2200);
        return;
      }

      await load();

      setMsg('Deleted');
      setTimeout(()=>setMsg(''),1800)
    }catch(e:any){
      setMsg(e.message);
      setTimeout(()=>setMsg(''),2200)
    }
  };
  
  const deletePermission=async(id:number)=>{
    if(!confirm('Delete this permission?'))
      return;

    const r=await fetch(
      '/api/admin/permissions/'+id,
      {
        method:'DELETE',
        credentials:'include'
      }
    );

    if(!r.ok){
      const x=await r.json().catch(()=>({}));
      setMsg(x.error||'Delete failed');
      return
    }

    await load();

    setMsg('Deleted');
    setTimeout(()=>setMsg(''),1800)
  };

  const savePermission=async(p:any)=>{
    try{
      await put(
        '/admin/permissions/'+p.id,
        {
          name:p.name,
          description:p.description
        }
      );

      setEditingPermission(null);
      await load();

      setMsg('Saved');
      setTimeout(()=>setMsg(''),1800)
    }catch(e:any){
      setMsg(e.message)
    }
  };

  return <Page title="Administration">

        {can('ACCT')&&
      <section>
        <h2>Account Logins</h2>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Options</th>
              </tr>
            </thead>

            <tbody>
              {accounts.map(x=>
                <tr key={x.id}>
                  <td>
                    <b>{x.first_name} {x.last_name}</b>
                  </td>

                  <td>
                    {editingAccount===x.id?
                      <div className="admin-inline-edit">
                        <input
                          value={x.username}
                          onChange={e=>
                            setAccounts(
                              accounts.map(a=>
                                a.id===x.id?
                                  {...a,username:e.target.value}:
                                  a
                              )
                            )
                          }
                        />

                        <button
                          className="primary admin-action-button"
                          onClick={async()=>{
                            try{
                              await put(
                                '/admin/account-logins/'+x.id,
                                {username:x.username}
                              );

                              setEditingAccount(null);
                              await load();

                              setMsg('Saved');
                              setTimeout(()=>setMsg(''),1800)
                            }catch(e:any){
                              setMsg(e.message)
                            }
                          }}
                        >
                          Save
                        </button>
                      </div>
                    :
                      x.username
                    }
                  </td>

                  <td>
                    <div className="admin-action-row">
                      <button
                        className="admin-action-button"
                        onClick={()=>
                          setEditingAccount(
                            editingAccount===x.id?null:x.id
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="admin-action-button"
                        onClick={async()=>{
                          if(!confirm(
                            'Are you sure you want to delete this login? This action cannot be undone.'
                          ))
                            return;

                          try{
                            const r=await fetch(
                              '/api/admin/account-logins/'+x.id,
                              {
                                method:'DELETE',
                                credentials:'include'
                              }
                            );

                            if(!r.ok){
                              const data=await r.json().catch(()=>({}));
                              setMsg(data.error||'Delete failed');
                              setTimeout(()=>setMsg(''),2200);
                              return;
                            }

                            await load();

                            setMsg('Deleted');
                            setTimeout(()=>setMsg(''),1800)
                          }catch(e:any){
                            setMsg(e.message);
                            setTimeout(()=>setMsg(''),2200)
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    }

      {can('PMAP')&&
      <section>
        <h2>Position-to-Permission Mapping</h2>

        <div className="permission-grid-wrap">
          <table className="permission-grid">
            <thead>
              <tr>
                <th>Position</th>

                {['GUEST','YOUTH','ADULT','ADULTL','ADMIN'].map(code=>{
                  const role=config.positions.find(
                    (p:any)=>p.code===code
                  );

                  return <th key={code}>
                    <button
                      type="button"
                      className="permission-code"
                      title={
                        role?.name||
                        code
                      }
                    >
                      {code}
                    </button>
                  </th>
                })}

                {config.permissions.map((p:any)=>
                  <th key={p.id}>
                    <button
                      type="button"
                      className="permission-code"
                      onMouseEnter={e=>{
                        const r=e.currentTarget.getBoundingClientRect();

                        setPermissionTip({
                          text:p.description||p.name,
                          x:r.left+r.width/2,
                          y:r.top-10
                        });
                      }}
                      onMouseLeave={()=>
                        setPermissionTip(null)
                      }
                      onFocus={e=>{
                        const r=e.currentTarget.getBoundingClientRect();

                        setPermissionTip({
                          text:p.description||p.name,
                          x:r.left+r.width/2,
                          y:r.top-10
                        });
                      }}
                      onBlur={()=>
                        setPermissionTip(null)
                      }
                    >
                      {p.code}
                    </button>
                  </th>
                )}

                <th>Options</th>
              </tr>
            </thead>

            <tbody>
              {config.positions.map((p:any)=>{
                const roleCodes=['GUEST','YOUTH','ADULT','ADULTL','ADMIN'];

                const selectedBases=(
                  p.base_position_ids||[]
                );

                const inherited=new Set<number>();

                const addInherited=(roleId:number)=>{
                  const role=config.positions.find(
                    (x:any)=>x.id===roleId
                  );

                  if(!role)return;

                  for(const id of role.permission_ids||[]){
                    inherited.add(Number(id));
                  }

                  for(const baseId of role.base_position_ids||[]){
                    addInherited(Number(baseId));
                  }
                };

                for(const baseId of selectedBases){
                  addInherited(Number(baseId));
                }

                const administratorSelected=
                  p.base_position_ids?.some((id:number)=>
                    config.positions.find(
                      (x:any)=>x.id===id
                    )?.code==='ADMIN'
                  );

                const effective=new Set<number>(
                  administratorSelected?
                    config.permissions.map((x:any)=>Number(x.id)):
                    [
                      ...(p.permission_ids||[]),
                      ...Array.from(inherited)
                    ]
                );

                const updateBase=(roleId:number)=>{
                  const current=[
                    ...(p.base_position_ids||[])
                  ];

                  const exists=current.includes(roleId);

                  const next=exists?
                    current.filter(
                      (id:number)=>id!==roleId
                    ):
                    [...current,roleId];

                  setConfig((d:any)=>({
                    ...d,
                    positions:d.positions.map((x:any)=>
                      x.id===p.id?
                        {
                          ...x,
                          base_position_ids:next
                        }:
                        x
                    )
                  }));
                };

                const toggleDirect=(permissionId:number)=>{
                  if(inherited.has(permissionId)||
                     administratorSelected)
                    return;

                  setConfig((d:any)=>({
                    ...d,
                    positions:d.positions.map((x:any)=>
                      x.id===p.id?
                        {
                          ...x,
                          permission_ids:
                            x.permission_ids.includes(permissionId)?
                              x.permission_ids.filter(
                                (id:number)=>id!==permissionId
                              ):
                              [
                                ...x.permission_ids,
                                permissionId
                              ]
                        }:
                        x
                    )
                  }));
                };

                const roleDisabled=(code:string)=>{
                  if(p.code==='ADMIN')
                    return true;

                  if(p.code==='GUEST')
                    return true;

                  if(p.code==='YOUTH')
                    return ['YOUTH','ADULT','ADULTL','ADMIN'].includes(code);

                  if(p.code==='ADULT')
                    return ['ADULT','ADULTL','ADMIN'].includes(code);

                  if(p.code==='ADULTL')
                    return ['ADULTL','ADMIN'].includes(code);

                  return false;
                };

                const roleChecked=(code:string)=>{
                  if(p.code===code)
                    return true;

                  if(p.code==='ADMIN')
                    return code==='ADMIN';

                  return selectedBases.some(
                    (id:number)=>
                      config.positions.find(
                        (x:any)=>x.id===id
                      )?.code===code
                  );
                };

                return <tr key={p.id}>
                  <th>{p.name}</th>

                  {roleCodes.map(code=>{
                    const role=config.positions.find(
                      (x:any)=>x.code===code
                    );

                    const disabled=roleDisabled(code);

                    return <td
                      key={code}
                      className={
                        disabled?
                          'permission-locked':
                          ''
                      }
                    >
                      <input
                        type="checkbox"
                        checked={roleChecked(code)}
                        disabled={disabled}
                        aria-label={`${p.name}: ${role?.name||code}`}
                        onChange={()=>{
                          if(role)
                            updateBase(role.id)
                        }}
                      />
                    </td>
                  })}

                  {config.permissions.map((perm:any)=>{
                    const locked=
                      inherited.has(Number(perm.id))||
                      administratorSelected||
                      p.code==='ADMIN';

                    return <td
                      key={perm.id}
                      className={
                        locked?
                          'permission-locked':
                          ''
                      }
                    >
                      <input
                        type="checkbox"
                        checked={effective.has(Number(perm.id))}
                        disabled={locked}
                        aria-label={`${p.name}: ${perm.name}`}
                        onChange={()=>
                          toggleDirect(Number(perm.id))
                        }
                      />
                    </td>
                  })}

                  <td>
                    <button
                      className="admin-action-button"
                      onClick={async()=>{
                        await savePosition({
                          ...p,
                          permission_ids:p.permission_ids,
                          base_position_ids:
                            p.base_position_ids||[]
                        })
                      }}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              })}
            </tbody>
          </table>
        </div>

        {permissionTip&&
          <div
            className="permission-tooltip-popup"
            style={{
              left:permissionTip.x,
              top:permissionTip.y
            }}
          >
            <span className="permission-tooltip-arrow"/>
            {permissionTip.text}
          </div>
        }
      </section>
    }

    {can('POS')&&
      <section>
        <h2>Available Positions</h2>

        <form
          className="form"
          onSubmit={createPosition}
          style={{
            marginBottom:'16px'
          }}
        >
          <div className="admin-inline-edit">
            <input
              value={newPosition.name}
              placeholder="Position name"
              onChange={e=>
                setNewPosition({
                  ...newPosition,
                  name:e.target.value
                })
              }
              required
            />

            <select
              value={newPosition.category}
              onChange={e=>
                setNewPosition({
                  ...newPosition,
                  category:e.target.value
                })
              }
            >
              <option value="adult">Adult</option>
              <option value="youth">Youth</option>
            </select>

            <button
              className="primary admin-action-button"
              type="submit"
            >
              Add Position
            </button>
          </div>
        </form>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Options</th>
              </tr>
            </thead>

            <tbody>
              {config.positions.map((p:any)=>
                <tr key={p.id}>
                  <td>
                    {editingPosition===p.id?
                      <input
                        value={p.name}
                        onChange={e=>
                          setConfig((d:any)=>({
                            ...d,
                            positions:d.positions.map((x:any)=>
                              x.id===p.id?
                                {
                                  ...x,
                                  name:e.target.value
                                }:
                                x
                            )
                          }))
                        }
                      />
                      :
                      <b>{p.name}</b>
                    }
                  </td>

                  <td>
                    {editingPosition===p.id?
                      <select
                        value={p.category}
                        onChange={e=>
                          setConfig((d:any)=>({
                            ...d,
                            positions:d.positions.map((x:any)=>
                              x.id===p.id?
                                {
                                  ...x,
                                  category:e.target.value
                                }:
                                x
                            )
                          }))
                        }
                      >
                        <option value="adult">Adult</option>
                        <option value="youth">Youth</option>
                      </select>
                      :
                      (
                        p.category==='youth'?
                          'Youth':
                          p.category==='adult'?
                            'Adult':
                            'Other'
                      )
                    }
                  </td>

                  <td>
                    {Number(p.system)?
                      <span className="muted">
                        Built-in
                      </span>
                      :
                      <div className="admin-action-row">
                        {editingPosition===p.id?
                          <>
                            <button
                              className="primary admin-action-button"
                              onClick={()=>
                                saveAvailablePosition(p)
                              }
                            >
                              Save
                            </button>

                            <button
                              className="admin-action-button"
                              onClick={()=>{
                                setEditingPosition(null);
                                load().catch(e=>
                                  setMsg(e.message)
                                );
                              }}
                            >
                              Cancel
                            </button>
                          </>
                          :
                          <>
                            <button
                              className="admin-action-button"
                              onClick={()=>
                                setEditingPosition(p.id)
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="admin-action-button"
                              onClick={()=>
                                deleteAvailablePosition(p.id)
                              }
                            >
                              Delete
                            </button>
                          </>
                        }
                      </div>
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    }
    
    {msg&&<div className="toast">{msg}</div>}

  </Page>
}

function Upload({
  label,
  kind
}:{
  label:string,
  kind:string
}){
  const [file,setFile]=useState<File|null>(null);
  const [msg,setMsg]=useState('');

  return <div className="upload">
    <label>
      {label}

      <input
        type="file"
        onChange={e=>
          setFile(e.target.files?.[0]||null)
        }
      />
    </label>

    <button onClick={async()=>{
      if(!file)return;

      const f=new FormData();
      f.append('file',file);
      f.append('kind',kind);

      const r=await fetch(
        '/api/admin/upload',
        {
          method:'POST',
          body:f,
          credentials:'include'
        }
      );

      setMsg(r.ok?'Uploaded':'Upload failed')
    }}>
      Upload
    </button>

    <span>{msg}</span>
  </div>
}

function NotFound(){
  return <Page title="Page not found">
    <p>The requested page does not exist.</p>
  </Page>
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App/>
    </BrowserRouter>
  </React.StrictMode>
);
