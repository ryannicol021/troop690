import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useNavigate,useLocation} from 'react-router-dom';
import './styles.css';
import {api,post,put} from './lib/api';

const nav=[['/','Home','public'],['/eagles','Eagle Scouts','public'],['/calendar','Calendar','CAL'],['/photos','Photo Gallery','PHV'],['/documents','Documents','DOCV'],['/leadership','Leadership','public'],['/advancement','Advancement','public'],['/summer-camp','Summer Camp','public'],['/uniform','Scout Uniform','public'],['/contact','Contact Us','public']];
const adminNav=[['/member-info','Member Info','MIV'],['/email','Email','EML'],['/administration','Administration','ADMIN']];

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

  const can=(p:string)=>!!me&&me.permissions?.includes(p);
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
    '/administration':'ADMIN'
  };

  const requiredPermission=
    required[p]??(p.startsWith('/photos/')?'PHV':undefined);

  if(!authReady&&requiredPermission)
    return <Page title=""><Loading/></Page>;

  if(
    requiredPermission&&
    (!me||!me.permissions?.includes(requiredPermission))
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
  if(p==='/member-info')return <MemberInfo/>;
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

function MemberInfo(){
  const [rows,setRows]=useState<any[]>([]);
  const [edit,setEdit]=useState<any|null>(null);

  useEffect(()=>{
    api('/admin/members').then(x=>setRows(x.members))
  },[]);

  return <Page
    title="Member Info"
    actions={
      <div className="button-row">
        <a className="button" href="/api/admin/quick-text.csv">Quick Text</a>
        <a className="button" href="/api/admin/emergency-contacts.csv">
          Emergency Contacts
        </a>
      </div>
    }
  >
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
            <th>Username</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {rows.map(x=>
            <tr key={x.id}>
              <td>{x.last_name}, {x.first_name}</td>
              <td></td>
              <td>{x.rank}</td>
              <td>{x.dob||''}</td>
              <td>{x.phone}</td>
              <td>{x.email}</td>
              <td>
                {[x.street,x.town,x.zip].filter(Boolean).join(', ')}
              </td>
              <td>{x.username||''}</td>

              <td>
                <button onClick={()=>setEdit(x)}>Edit</button>

                {!x.username&&
                  <button onClick={async()=>{
                    const r=await post('/admin/invite/'+x.id,{});
                    prompt('Send this invitation link',r.inviteUrl)
                  }}>
                    Invite
                  </button>
                }
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    {edit&&
      <MemberEditor
        value={edit}
        onClose={()=>setEdit(null)}
        onSaved={async()=>{
          setEdit(null);
          setRows((await api('/admin/members')).members)
        }}
      />
    }
  </Page>
}

function MemberEditor({
  value,
  onClose,
  onSaved
}:{
  value:any,
  onClose:()=>void,
  onSaved:()=>void
}){
  const [x,setX]=useState({...value});

  const fields=[
    'prefix',
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'gender',
    'dob',
    'phone',
    'email',
    'street',
    'town',
    'zip',
    'rank',
    'join_date',
    'cub_scout_pack',
    'patrol',
    'scouting_membership_id',
    'registration_expiration',
    'syt_expiration'
  ];

  return <div className="modal">
    <form
      className="modal-card form"
      onSubmit={async e=>{
        e.preventDefault();
        await put('/admin/members/'+x.id,x);
        onSaved()
      }}
    >
      <h2>Edit Member</h2>

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

      <div className="button-row">
        <button className="primary">Save</button>
        <button type="button" onClick={onClose}>Cancel</button>
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
  const [newPermission,setNewPermission]=useState({
    name:'',
    code:'',
    description:''
  });
  const [msg,setMsg]=useState('');

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
      {permissionIds:position.permission_ids}
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

        {accounts.map(x=>
          <div className="admin-row" key={x.id}>
            <div>
              <b>{x.first_name} {x.last_name}</b>
              <small>{x.username}</small>
            </div>

            <div className="button-row">
              <button
                onClick={()=>
                  setEditingAccount(
                    editingAccount===x.id?null:x.id
                  )
                }
              >
                Edit
              </button>

              <button onClick={async()=>{
                if(!confirm('Delete this login?'))
                  return;

                await fetch(
                  '/api/admin/account-logins/'+x.id,
                  {
                    method:'DELETE',
                    credentials:'include'
                  }
                );

                await load()
              }}>
                Delete
              </button>
            </div>

            {editingAccount===x.id&&
              <div className="inline-edit">
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
                  className="primary"
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
            }
          </div>
        )}
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

                {config.permissions.map((p:any)=>
                  <th key={p.id} title={p.name}>
                    {p.code}
                  </th>
                )}

                <th></th>
              </tr>
            </thead>

            <tbody>
              {config.positions.map((p:any)=>
                <tr key={p.id}>
                  <th>{p.name}</th>

                  {config.permissions.map((perm:any)=>
                    <td key={perm.id}>
                      <input
                        type="checkbox"
                        aria-label={`${p.name}: ${perm.name}`}
                        checked={p.permission_ids.includes(perm.id)}
                        onChange={()=>
                          togglePermission(p.id,perm.id)
                        }
                      />
                    </td>
                  )}

                  <td>
                    <button onClick={()=>savePosition(p)}>
                      Save
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    }

    {can('PERM')&&
      <section>
        <h2>Permission Editor</h2>

        {config.permissions.map((p:any)=>
          editingPermission===p.id?
            <div className="admin-row" key={p.id}>
              <div className="permission-edit">
                <input
                  value={p.name}
                  onChange={e=>
                    setConfig((d:any)=>({
                      ...d,
                      permissions:d.permissions.map((x:any)=>
                        x.id===p.id?
                          {...x,name:e.target.value}:
                          x
                      )
                    }))
                  }
                />

                <input
                  value={p.description||''}
                  onChange={e=>
                    setConfig((d:any)=>({
                      ...d,
                      permissions:d.permissions.map((x:any)=>
                        x.id===p.id?
                          {...x,description:e.target.value}:
                          x
                      )
                    }))
                  }
                />
              </div>

              <div className="button-row">
                <button
                  className="primary"
                  onClick={()=>savePermission(p)}
                >
                  Save
                </button>

                <button
                  onClick={()=>setEditingPermission(null)}
                >
                  Cancel
                </button>
              </div>
            </div>:
            <div className="admin-row" key={p.id}>
              <div>
                <b>{p.code}</b>
                <span>{p.name}</span>
              </div>

              <div className="button-row">
                <button
                  onClick={()=>setEditingPermission(p.id)}
                >
                  Edit
                </button>

                {!p.system&&
                  <button onClick={()=>deletePermission(p.id)}>
                    Delete
                  </button>
                }
              </div>
            </div>
        )}

        <form
          className="permission-create"
          onSubmit={createPermission}
        >
          <input
            placeholder="Permission name"
            value={newPermission.name}
            onChange={e=>
              setNewPermission({
                ...newPermission,
                name:e.target.value
              })
            }
          />

          <input
            placeholder="Code"
            value={newPermission.code}
            onChange={e=>
              setNewPermission({
                ...newPermission,
                code:e.target.value
              })
            }
          />

          <input
            placeholder="Description"
            value={newPermission.description}
            onChange={e=>
              setNewPermission({
                ...newPermission,
                description:e.target.value
              })
            }
          />

          <button className="primary">
            Add Permission
          </button>
        </form>
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
