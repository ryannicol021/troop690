import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useNavigate,useLocation} from 'react-router-dom';
import './styles.css';
import {api,post,put} from './lib/api';

const nav=[['/','Home','public'],['/eagles','Eagle Scouts','public'],['/calendar','Calendar','member'],['/photos','Photo Gallery','member'],['/documents','Documents','member'],['/leadership','Leadership','public'],['/advancement','Advancement','public'],['/summer-camp','Summer Camp','public'],['/uniform','Scout Uniform','public'],['/contact','Contact Us','public']];
const adminNav=[['/member-info','Member Info','admin'],['/email','Email','admin'],['/administration','Administration','admin']];

function App(){
  const [me,setMe]=useState<any>(null);
  const [open,setOpen]=useState<'account'|'nav'|null>(null);
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
      <button className="brand" onClick={()=>navg('/')}>Troop 690</button>

      <div className="header-actions">
        <div className="drop">
          <button
            className="icon-button"
            aria-label="Account"
            aria-expanded={open==='account'}
            onClick={()=>setOpen(open==='account'?null:'account')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 12 11Zm-5.2 7.1c.8-2.45 2.65-3.6 5.2-3.6s4.4 1.15 5.2 3.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {open==='account'&&
            <div className="menu account-menu">
              <button onClick={()=>{
                setOpen(null);
                navg(me?'/settings':'/login');
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
            className="icon-button"
            aria-label="Navigation"
            aria-expanded={open==='nav'}
            onClick={()=>setOpen(open==='nav'?null:'nav')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {open==='nav'&&
            <div className="menu nav-menu">
              {visible.map(([path,name])=>
                <button
                  key={path}
                  onClick={()=>{
                    setOpen(null);
                    navg(path);
                  }}
                  className={loc.pathname===path?'active':''}
                >
                  {name}
                </button>
              )}
            </div>
          }
        </div>
      </div>
    </header>

    <main>
      <RouterPage me={me} setMe={setMe}/>
    </main>

    <footer>
      <div>© {new Date().getFullYear()} Troop 690. All rights reserved.</div>
      <a
        href="https://stwilliam.org"
        target="_blank"
        rel="noreferrer"
      >
        St. William the Abbot RC Church
      </a>
      <a
        href="https://scoutingli.org"
        target="_blank"
        rel="noreferrer"
      >
        Scouting America Long Island
      </a>
    </footer>
  </div>
}

function RouterPage({
  me,
  setMe
}:{
  me:any,
  setMe:(x:any)=>void
}){
  const p=useLocation().pathname;

  if(p==='/')return <Home me={me}/>;
  if(p==='/login')return <Login setMe={setMe}/>;
  if(p==='/bootstrap')return <Bootstrap/>;
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

function EmptyState({
  children
}:{
  children:React.ReactNode
}){
  return <div className="empty-state">{children}</div>
}

function Home({me}:{me:any}){
  const [d,setD]=useState<any>();

  useEffect(()=>{
    api('/home').then(setD)
  },[]);

  if(!d)return <Page title="Troop 690"><Loading/></Page>;

  return <Page title="Troop 690">
    <div className="hero-image">
      {d.content.troop_photo
        ? <img src={'/files/'+d.content.troop_photo} alt="Troop 690"/>
        : <div className="image-slot">Troop picture</div>
      }
    </div>

    <section className="home-intro">
      <h2>History</h2>
      <p>
        {d.content.history||'There is no troop history available to view.'}
      </p>
    </section>

    {me&&
      <>
        <div className="member-welcome">
          Welcome to Troop 690! This website is password-protected, and some personal content is hidden.
        </div>

        <div className="grid two">
          <section className="card">
            <h2>Upcoming Calendar Events</h2>

            {d.events.length
              ? d.events.map((e:any)=>
                <div className="list-row" key={e.id}>
                  <b>{e.title}</b>
                  <span>{new Date(e.start_at).toLocaleString()}</span>
                </div>
              )
              : <EmptyState>There are no upcoming events.</EmptyState>
            }
          </section>

          <section className="card">
            <h2>Recent Photo Albums</h2>

            {d.recent.length
              ? d.recent.map((e:any)=>
                <div className="list-row" key={e.id}>
                  <b>{e.title}</b>
                  <span>{new Date(e.start_at).toLocaleDateString()}</span>
                </div>
              )
              : <EmptyState>The photo gallery is empty.</EmptyState>
            }
          </section>
        </div>
      </>
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
          setErr(e.message);
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

function Bootstrap(){
  const [secret,setSecret]=useState('');
  const [username,setUsername]=useState('admin');
  const [password,setPassword]=useState('');
  const [firstName,setFirstName]=useState('Administrator');
  const [lastName,setLastName]=useState('Troop 690');
  const [msg,setMsg]=useState('');
  const [err,setErr]=useState('');
  const nav=useNavigate();

  return <Page title="Set Up Administrator">
    <p className="muted">
      This one-time setup creates the first administrator account.
      It stops working after an active account exists.
    </p>

    <form
      className="form narrow"
      onSubmit={async e=>{
        e.preventDefault();
        setErr('');
        setMsg('');

        try{
          await post('/bootstrap',{
            secret,
            username,
            password,
            firstName,
            lastName
          });

          setMsg('Administrator created. You can now log in.');
          setTimeout(()=>nav('/login'),800);
        }catch(e:any){
          setErr(e.message);
        }
      }}
    >
      <label>
        Bootstrap secret
        <input
          type="password"
          value={secret}
          onChange={e=>setSecret(e.target.value)}
          autoComplete="off"
          required
        />
      </label>

      <label>
        Username
        <input
          value={username}
          onChange={e=>setUsername(e.target.value)}
          autoComplete="username"
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </label>

      <label>
        First name
        <input
          value={firstName}
          onChange={e=>setFirstName(e.target.value)}
          required
        />
      </label>

      <label>
        Last name
        <input
          value={lastName}
          onChange={e=>setLastName(e.target.value)}
          required
        />
      </label>

      {err&&<p className="error">{err}</p>}
      {msg&&<p className="muted">{msg}</p>}

      <button className="primary">
        Create Administrator
      </button>
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

          setOk(true);
        }catch(e:any){
          setErr(e.message);
        }
      }}
    >
      {ok
        ? <p>Your account has been created. You can now log in.</p>
        : <>
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

            <button className="primary">
              Create Account
            </button>
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

    {rows.length
      ? <div className="table-wrap">
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
      : <EmptyState>
          There are no Eagle Scouts available to view.
        </EmptyState>
    }
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
              {e.all_day
                ? 'All day'
                : `${new Date(e.start_at).toLocaleString()}${e.end_at?' to '+new Date(e.end_at).toLocaleString():''}`
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
    {a.length
      ? <div className="album-grid">
          {a.map(x=>
            <article className="card" key={x.id}>
              <h2>{x.title}</h2>
              <p>{new Date(x.start_at).toLocaleDateString()}</p>
              <p>{x.photo_count} photos</p>
              <a className="button" href={'/photos/'+x.id}>Open</a>
            </article>
          )}
        </div>
      : <EmptyState>The photo gallery is empty.</EmptyState>
    }
  </Page>
}

function Documents(){
  const [d,setD]=useState<any>();

  useEffect(()=>{
    api('/documents').then(setD)
  },[]);

  if(!d)return <Page title="Documents"><Loading/></Page>;

  return <Page title="Documents">
    {d.documents.length
      ? <div className="folder-grid">
          {d.documents.map((x:any)=>
            <article className="card" key={x.id}>
              <h2>{x.name}</h2>
              <p>{x.event_title||'Standalone document'}</p>

              {x.external_url
                ? <a
                    className="button"
                    target="_blank"
                    rel="noreferrer"
                    href={x.external_url}
                  >
                    Open URL
                  </a>
                : <a
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
      : <EmptyState>
          There are no documents available to view.
        </EmptyState>
    }
  </Page>
}

function Leadership(){
  const [d,setD]=useState<any>();

  useEffect(()=>{
    api('/leadership').then(setD)
  },[]);

  if(!d)return <Page title="Leadership"><Loading/></Page>;

  const youth=d.positions.filter(
    (x:any)=>
      x.name!=='Scoutmaster' &&
      !['Assistant Scoutmaster','Committee Chair','Committee Member'].includes(x.name)
  );

  const adult=d.positions.filter(
    (x:any)=>
      ['Scoutmaster','Assistant Scoutmaster','Committee Chair','Committee Member'].includes(x.name)
  );

  const renderPosition=(x:any)=>
    <article className="card leadership-position" key={x.id}>
      <details>
        <summary>
          <span className="position-title">{x.name}</span>
          {x.holder&&
            <span className="holder">{x.holder}</span>
          }
        </summary>

        <p>{x.description||''}</p>
      </details>
    </article>;

  const historySection=(title:string,rows:any[])=>
    <section className="card leadership-history">
      <h2>{title}</h2>

      {rows.length
        ? rows.map((x:any)=>
            <div className="list-row" key={x.id}>
              <b>{x.person_name}</b>
              <span>{x.start_year}-{x.end_year}</span>
            </div>
          )
        : <EmptyState>No history is available to view.</EmptyState>
      }
    </section>;

  return <Page title="Leadership">
    <div className="leadership-grid">
      <section className="card">
        <h2>Youth Leaders</h2>

        {youth.length
          ? youth.map(renderPosition)
          : <EmptyState>
              There are no youth leadership positions available to view.
            </EmptyState>
        }
      </section>

      <section className="card">
        <h2>Adult Volunteers</h2>

        {adult.length
          ? adult.map(renderPosition)
          : <EmptyState>
              There are no adult volunteer positions available to view.
            </EmptyState>
        }
      </section>

      {d.history&&d.history.length>0&&
        <>
          {historySection(
            'Senior Patrol Leader History',
            d.history.filter((x:any)=>x.type==='SPL'||x.type==='ASPL')
          )}

          {historySection(
            'Scoutmaster History',
            d.history.filter((x:any)=>x.type==='Scoutmaster')
          )}
        </>
      }
    </div>
  </Page>
}

function Advancement(){
  const [d,setD]=useState<any>();

  useEffect(()=>{
    api('/advancement').then(setD)
  },[]);

  if(!d)return <Page title="Advancement"><Loading/></Page>;

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

  if(!d)return <Page title="Summer Camp"><Loading/></Page>;

  return <Page title="Summer Camp">
    <h2>Onteora Scout Reservation</h2>
    <p>{d.camp.description}</p>

    <h2>Merit Badges</h2>
    <p>{d.camp.merit_badges}</p>

    <h2>Year-to-Year Information</h2>
    <p><b>Costs:</b> {d.camp.costs}</p>
    <p><b>Deadlines:</b> {d.camp.deadlines}</p>

    <div className="folder-grid">
      {d.documents.map((x:any)=>
        <article className="card" key={x.id}>
          <h3>{x.name}</h3>

          {x.external_url
            ? <a
                className="button"
                target="_blank"
                rel="noreferrer"
                href={x.external_url}
              >
                Open
              </a>
            : <a
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

  if(!d)return <Page title="Scout Uniform"><Loading/></Page>;

  const areas=[
    ['uniform_right_sleeve','Right sleeve'],
    ['uniform_left_sleeve','Left sleeve'],
    ['uniform_right_pocket','Right pocket'],
    ['uniform_left_pocket','Left pocket']
  ];

  const keyFor=(area:string)=>
    d.key.filter((x:any)=>x.image_area===area);

  return <Page title="Scout Uniform">
    <div className="uniform-class-grid">
      <section className="card uniform-class">
        <h2>Class A uniform</h2>
        <p>The Class A uniform is the troop's formal Scout uniform.</p>
        <ImgSlot src={d.content.uniform_class_a}/>
      </section>

      <section className="card uniform-class">
        <h2>Class B uniform</h2>
        <p>The Class B uniform is the troop's activity uniform.</p>
        <ImgSlot src={d.content.uniform_class_b}/>
      </section>
    </div>

    <section>
      <h2>Insignia Guide</h2>

      <div className="insignia-grid">
        {areas.map(([k,n])=>
          <div className="card insignia-card" key={k}>
            <h3>{n}</h3>

            <ImgSlot src={d.content[k]}/>

            {keyFor(n).length?
              <div className="insignia-key">
                {keyFor(n).map((x:any)=>
                  <div key={x.id}>
                    <b>{x.number}.</b> {x.label}
                  </div>
                )}
              </div>
              : null
            }
          </div>
        )}
      </div>
    </section>
  </Page>
}

function ImgSlot({src}:{src?:string}){
  return src
    ? <img
        className="uniform-img"
        src={'/files/'+src}
        alt="Uniform guide"
      />
    : <div className="image-slot">Owner-supplied image</div>
}

function Contact({me}:{me:any}){
  return <Page title="Contact Us">
    <div className="grid three">
      <section className="card contact-card">
        <h2>Join the Troop</h2>
        <p>
          For information about joining Troop 690, contact the troop committee.
        </p>

        {!me
          ? <a
              className="button"
              href="mailto:committee@troop690.org?cc=scoutmaster@troop690.org"
            >
              Contact the committee
            </a>
          : <span className="muted">
              Available to non-members.
            </span>
        }
      </section>

      <section className="card contact-card">
        <h2>Any Questions?</h2>
        <p>
          For questions about Troop 690, activities, or scouting,
          contact the Scoutmaster.
        </p>

        <a
          className="button"
          href="mailto:scoutmaster@troop690.org"
        >
          Contact the Scoutmaster
        </a>
      </section>

      <section className="card contact-card">
        <h2>Website Feedback</h2>
        <p>
          Have a suggestion, found an issue, or need help with the website?
          Let us know.
        </p>

        <a
          className="button"
          href="mailto:webmaster@troop690.org"
        >
          Send website feedback
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
        <a className="button" href="/api/admin/quick-text.csv">
          Quick Text
        </a>
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
              <td>{[x.street,x.town,x.zip].filter(Boolean).join(', ')}</td>
              <td>{x.username||''}</td>
              <td>
                <button onClick={()=>setEdit(x)}>Edit</button>

                {!x.username&&
                  <button
                    onClick={async()=>{
                      const r=await post('/admin/invite/'+x.id,{});
                      prompt('Send this invitation link',r.inviteUrl)
                    }}
                  >
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
      x.members.forEach((m:any)=>{
        s[m.id]=!m.email_default_opt_out
      });

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
                    ? {...r,username:e.target.value}
                    : r
                )
              )
            }
          />

          <button
            onClick={()=>
              put(
                '/admin/account-logins/'+x.id,
                {username:x.username}
              )
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
        Upload the troop photo, uniform images, and official AHMR
        template through the admin upload endpoint after deployment.
      </p>

      <Upload
        label="AHMR official PDF template"
        kind="site:ahmr_template"
      />
    </section>

    <section>
      <h2>Bootstrap</h2>

      <p className="muted">
        The first administrator is created once using the BOOTSTRAP_SECRET
        Worker secret. This UI does not store that secret.
      </p>
    </section>
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
