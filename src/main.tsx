import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useNavigate,useLocation} from 'react-router-dom';
import './styles.css';
import {api,post,put} from './lib/api';

const nav=[['/','Home','public'],['/eagles','Eagle Scouts','public'],['/calendar','Calendar','member'],['/photos','Photo Gallery','member'],['/documents','Documents','member'],['/leadership','Leadership','public'],['/advancement','Advancement','public'],['/summer-camp','Summer Camp','public'],['/uniform','Scout Uniform','public'],['/contact','Contact Us','public']];
const adminNav=[['/member-info','Member Info','admin'],['/email','Email','admin'],['/administration','Administration','admin']];

function App(){
  const [me,setMe]=useState<any>(null);
  const [open,setOpen]=useState(false);
  const navg=useNavigate();
  const loc=useLocation();

  useEffect(()=>{
    api('/me').then(x=>setMe(x.user)).catch(()=>{});
  },[]);

  const can=(p:string)=>!!me&&me.permissions?.includes(p);
  const visible=[
    ...nav.filter(x=>x[2]==='public'||(me&&x[2]==='member')),
    ...(can('Admin')?adminNav:[])
  ];

  return <div className="app">
    <header>
      <button className="brand" onClick={()=>navg('/')}>
        <span className="brand-mark">690</span>
        <span>Troop 690</span>
      </button>

      <div className="header-actions">
        <div className="drop">
          <button
            className="icon-button"
            aria-label="Account"
            onClick={()=>setOpen(v=>!v)}
          >
            <span className="person-icon" aria-hidden="true"></span>
          </button>

          {open&&<div className="menu account-menu">
            <button onClick={()=>me?navg('/settings'):navg('/login')}>
              {me?'Settings':'Log In'}
            </button>

            {me&&
              <button onClick={async()=>{
                await post('/logout',{});
                setMe(null);
                navg('/');
              }}>
                Log Out
              </button>
            }
          </div>}
        </div>

        <div className="drop">
          <button
            className="icon-button"
            aria-label="Navigation"
            onClick={()=>setOpen(v=>!v)}
          >
            <span className="hamburger-icon" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
          </button>

          {open&&<div className="menu nav-menu">
            {visible.map(([p,n])=>
              <button
                key={p}
                onClick={()=>{
                  setOpen(false);
                  navg(p);
                }}
                className={loc.pathname===p?'active':''}
              >
                {n}
              </button>
            )}
          </div>}
        </div>
      </div>
    </header>

    <main>
      <RouterPage me={me} setMe={setMe}/>
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

function RouterPage({me,setMe}:{me:any,setMe:(x:any)=>void}){
  const p=useLocation().pathname;

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
  if(p==='/administration')return <Administration/>;

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

  useEffect(()=>{
    api('/home').then(setD)
  },[]);

  if(!d)return <Page title="Troop 690"><Loading/></Page>;

  return <Page title="Troop 690">
    <div className="member-notice">
      <strong>Welcome to Troop 690!</strong> This website is password-protected, and some personal content is hidden.
    </div>

    <div className="hero-image">
      {d.content.troop_photo
        ?<img src={'/files/'+d.content.troop_photo} alt="Troop 690"/>
        :<div className="image-slot">Troop picture</div>
      }
    </div>

    <section>
      <h2>History</h2>
      <p>
        {d.content.history||'History content can be maintained by an administrator.'}
      </p>
    </section>

    {me&&
      <div className="grid two">
        <section className="card">
          <h2>Upcoming Calendar Events</h2>

          {d.events.length
            ?d.events.map((e:any)=>
              <div className="list-row" key={e.id}>
                <b>{e.title}</b>
                <span>{new Date(e.start_at).toLocaleString()}</span>
              </div>
            )
            :<p className="muted">No upcoming events.</p>
          }
        </section>

        <section className="card">
          <h2>Recent Photo Albums</h2>

          {d.recent.length
            ?d.recent.map((e:any)=>
              <div className="list-row" key={e.id}>
                <b>{e.title}</b>
                <span>{new Date(e.start_at).toLocaleDateString()}</span>
              </div>
            )
            :<p className="muted">No photo albums.</p>
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
          await post('/claim',{
            token,
            username,
            password:pw
          });

          setOk(true)
        }catch(e:any){
          setErr(e.message)
        }
      }}
    >
      {ok
        ?<p>Your account has been created. You can now log in.</p>
        :<>
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

  if(!me)return <Login setMe={()=>{}}/>;

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

  if(!d)return <Page title="Calendar"><Loading/></Page>;

  return <Page
    title="Calendar"
    actions={<a className="button" href="/api/calendar.ics">Calendar subscription</a>}
  >
    <p className="muted">
      Copy the subscription link into Apple Calendar or Google Calendar. The feed stays current as the troop calendar changes.
    </p>

    <div className="calendar-list">
      {d.events.map((e:any)=>
        <article className="card" key={e.id}>
          <h2>{e.title}</h2>
          <p>{e.description}</p>

          <dl>
            <dt>When</dt>
            <dd>
              {e.all_day
                ?'All day'
                :`${new Date(e.start_at).toLocaleString()}${e.end_at?' to '+new Date(e.end_at).toLocaleString():''}`
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

  if(!d)return <Page title="Photo Gallery"><Loading/></Page>;

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

  if(!d)return <Page title="Documents"><Loading/></Page>;

  return <Page title="Documents">
    <div className="folder-grid">
      {d.documents.map((x:any)=>
        <article className="card" key={x.id}>
          <h2>{x.name}</h2>
          <p>{x.event_title||'Standalone document'}</p>

          {x.external_url
            ?<a
              className="button"
              target="_blank"
              rel="noreferrer"
              href={x.external_url}
            >
              Open URL
            </a>
            :<a
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

  if(!d)return <Page title="Leadership"><Loading/></Page>;

  return [... ELLIPSIZATION ...]
}

function Email(){
  const [rows,setRows]=useState<any[]>([]);
  const [selected,setSelected]=useState<Record<number,boolean>>({});

  useEffect(()=>{
    api('/admin/members').then(x=>{
      setRows(x.members);

      const s:any={};
      x.members.forEach((m:any)=>s[m.id]=!m.email_default_opt_out);
      setSelected(s)
    })
  },[]);

  const emails=rows
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

function Administration(){
  const [rows,setRows]=useState<any[]>([]);
  const [username,setUsername]=useState('');
  const [secret,setSecret]=useState('');

  useEffect(()=>{
    api('/admin/account-logins').then(x=>setRows(x.accounts))
  },[]);

  return <Page title="Administration">
    <section>
      <h2>Account Logins</h2>

      {rows.map(x=>
        <div className="list-row" key={x.id}>
          <span>{x.first_name} {x.last_name}</span>

          <input
            value={x.username}
            onChange={e=>
              setRows(
                rows.map(r=>
                  r.id===x.id
                    ?{...r,username:e.target.value}
                    :r
                )
              )
            }
          />

          <button
            onClick={()=>
              put('/admin/account-logins/'+x.id,{
                username:x.username
              })
            }
          >
            Save
          </button>

          <button
            onClick={async()=>{
              await fetch(
                '/api/admin/account-logins/'+x.id,
                {method:'DELETE'}
              );
              setRows(rows.filter(r=>r.id!==x.id))
            }}
          >
            Delete login
          </button>
        </div>
      )}
    </section>

    <section>
      <h2>Owner-supplied assets</h2>
      <p className="muted">
        Upload the troop photo, uniform images, and official AHMR template through the admin upload endpoint after deployment.
      </p>

      <Upload
        label="AHMR official PDF template"
        kind="site:ahmr_template"
      />
    </section>

    <section>
      <h2>Bootstrap</h2>
      <p className="muted">
        The first administrator is created once using the BOOTSTRAP_SECRET Worker secret. This UI does not store that secret.
      </p>
    </section>
  </Page>
}

function Upload({label,kind}:{label:string,kind:string}){
  const [file,setFile]=useState<File|null>(null);
  const [msg,setMsg]=useState('');

  return <div className="upload">
    <label>
      {label}
      <input
        type="file"
        onChange={e=>setFile(e.target.files?.[0]||null)}
      />
    </label>

    <button
      onClick={async()=>{
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
      }}
    >
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
