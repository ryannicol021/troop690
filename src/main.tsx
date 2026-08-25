import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useNavigate,useLocation} from 'react-router-dom';
import './styles.css';
import {api,post,put} from './lib/api';

const nav=[['/','Home','public'],['/eagles','Eagle Scouts','public'],['/calendar','Calendar','member'],['/photos','Photo Gallery','member'],['/documents','Documents','member'],['/leadership','Leadership','public'],['/advancement','Advancement','public'],['/summer-camp','Summer Camp','public'],['/uniform','Scout Uniform','public'],['/contact','Contact Us','public']];
const adminNav=[['/member-info','Member Info','admin'],['/email','Email','admin'],['/administration','Administration','admin']];
const ranks=['Scout','Tenderfoot','Second Class','First Class','Star','Life','Eagle Scout'];

function App(){
  const [me,setMe]=useState<any>(null);
  const [menu,setMenu]=useState<'account'|'nav'|null>(null);
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
        <span>Troop 690</span>
      </button>

      <div className="header-actions">
        <div className="drop">
          <button
            className="icon-button"
            aria-label="Account"
            onClick={()=>setMenu(menu==='account'?null:'account')}
          >
            <span className="person-icon" aria-hidden="true"></span>
          </button>

          {menu==='account'&&
            <div className="menu account-menu">
              <button onClick={()=>{
                setMenu(null);
                navg(me?'/settings':'/login');
              }}>
                {me?'Settings':'Log In'}
              </button>

              {me&&
                <button onClick={async()=>{
                  await post('/logout',{});
                  setMe(null);
                  setMenu(null);
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
            onClick={()=>setMenu(menu==='nav'?null:'nav')}
          >
            <span className="hamburger-icon" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
          </button>

          {menu==='nav'&&
            <div className="menu nav-menu">
              {visible.map(([p,n])=>
                <button
                  key={p}
                  onClick={()=>{
                    setMenu(null);
                    navg(p);
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
        ? <img src={'/files/'+d.content.troop_photo} alt="Troop 690"/>
        : <div className="image-slot">Troop picture</div>
      }
    </div>

    <section>
      <h2>History</h2>
      {d.content.history
        ? <p>{d.content.history}</p>
        : <EmptyState text="There is no troop history available to view."/>
      }
    </section>

    {me&&
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
            : <EmptyState text="There are no upcoming events."/>
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
            : <EmptyState text="The photo gallery is empty."/>
          }
        </section>
      </div>
    }
  </Page>
}

function EmptyState({text}:{text:string}){
  return <div className="empty-state">{text}</div>
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
          await post('/login',{
            username:u,
            password:p
          });

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

            <button className="primary">Create Account</button>
          </>
      }
    </form>
  </Page>
}

function Settings({me}:{me:any}){
  const [x,setX]=useState(me?.person||{});

  if(!me){
    return <Page title="Settings">
      <p>Please log in first.</p>
    </Page>
  }

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
      : <EmptyState text="There are no Eagle Scout entries available to view."/>
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
      : <EmptyState text="The photo gallery is empty."/>
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
      : <EmptyState text="There are no documents available to view."/>
    }
  </Page>
}

function Leadership(){
  const [d,setD]=useState<any>();

  useEffect(()=>{
    api('/leadership').then(setD)
  },[]);

  if(!d)return <Page title="Leadership"><Loading/></Page>;

  return <Page title="Leadership">
    <div className="grid two">
      {d.positions.map((x:any)=>
        <article className="card" key={x.id}>
          <h2>{x.name}</h2>
          <p>{x.description}</p>
          {x.holder&&<p className="holder">{x.holder}</p>}
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

  if(!d)return <Page title="Advancement"><Loading/></Page>;

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
        Merit badges provide Scouts opportunities to learn about subjects and complete requirements with guidance from counselors.
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

    {d.camp.description
      ? <p>{d.camp.description}</p>
      : <EmptyState text="There is no summer camp information available to view."/>
    }

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

  return <Page title="Scout Uniform">
    <div className="grid two">
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
    </div>

    <section>
      <h2>Insignia Guide</h2>

      <div className="uniform-grid">
        {areas.map(([k,n])=>
          <div className="card" key={k}>
            <h3>{n}</h3>

            <ImgSlot src={d.content[k]}/>

            <div className="small-key">
              {d.key
                .filter((x:any)=>x.image_area===k.replace('uniform_',''))
                .map((x:any)=>
                  <div key={x.id}>
                    <b>{x.number}</b> {x.label}
                  </div>
                )
              }
            </div>
          </div>
        )}
      </div>
    </section>
  </Page>
}

function ImgSlot({src}:{src?:string}){
  return src
    ? <img className="uniform-img" src={'/files/'+src} alt="Uniform guide"/>
    : <div className="image-slot">Owner-supplied image</div>
}

function Contact({me}:{me:any}){
  return <Page title="Contact Us">
    <div className="grid three">
      <section className="card">
        <h2>Join the Troop</h2>
        <p>Contact the troop if you are interested in joining.</p>

        {!me&&
          <a
            className="button"
            href="mailto:committee@troop690.org?cc=scoutmaster@troop690.org"
          >
            Contact the committee
          </a>
        }
      </section>

      <section className="card">
        <h2>Any Questions?</h2>
        <p>Contact the Scoutmaster with questions about the troop.</p>

        <a
          className="button"
          href="mailto:scoutmaster@troop690.org"
        >
          Contact the Scoutmaster
        </a>
      </section>

      <section className="card">
        <h2>Website Feedback</h2>
        <p>Send feedback or report a problem with the website.</p>

        <a
          className="button"
          href="mailto:webmaster@troop690.org"
        >
          Send feedback
        </a>
      </section>
    </div>
  </Page>
}

function MemberInfo(){
  const [rows,setRows]=useState<any[]>([]);
  const [edit,setEdit]=useState<any|null>(null);
  const [loading,setLoading]=useState(true);

  const load=async()=>{
    setLoading(true);

    try{
      setRows((await api('/admin/members')).members)
    }finally{
      setLoading(false)
    }
  };

  useEffect(()=>{
    load()
  },[]);

  const active=rows.filter(x=>!x.archived);
  const archived=rows.filter(x=>x.archived);

  return <Page
    title="Member Info"
    actions={
      <div className="button-row">
        <button
          className="primary"
          onClick={()=>
            setEdit({
              first_name:'',
              last_name:'',
              gender:'Male',
              adult:0,
              adult_leader:0,
              rank:'',
              email:'',
              phone:'',
              _new:true
            })
          }
        >
          Add Member
        </button>

        <a className="button" href="/api/admin/quick-text.csv">
          Quick Text
        </a>

        <a className="button" href="/api/admin/emergency-contacts.csv">
          Emergency Contacts
        </a>
      </div>
    }
  >
    {loading
      ? <Loading/>
      : <>
          <MemberTable
            title="Current Members"
            rows={active}
            onEdit={setEdit}
            onRefresh={load}
          />

          {archived.length>0&&
            <MemberTable
              title="Archive"
              rows={archived}
              onEdit={setEdit}
              onRefresh={load}
              archived
            />
          }
        </>
    }

    {edit&&
      <MemberEditor
        value={edit}
        onClose={()=>setEdit(null)}
        onSaved={async()=>{
          setEdit(null);
          await load();
        }}
      />
    }
  </Page>
}

function MemberTable({
  title,
  rows,
  onEdit,
  onRefresh,
  archived=false
}:{
  title:string,
  rows:any[],
  onEdit:(x:any)=>void,
  onRefresh:()=>void,
  archived?:boolean
}){
  return <section>
    <h2>{title}</h2>

    {rows.length===0
      ? <EmptyState
          text={
            archived
              ? 'The member archive is empty.'
              : 'There are no members to display.'
          }
        />
      : <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Rank</th>
                <th>Username</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {rows.map(x=>
                <tr key={x.id}>
                  <td>
                    <b>{x.last_name}, {x.first_name}</b>
                  </td>

                  <td>
                    {x.adult?'Adult':'Youth'}
                    {x.adult_leader?' / Adult Leader':''}
                  </td>

                  <td>{x.rank||''}</td>

                  <td>
                    {x.username
                      ? x.username
                      : <span className="muted">No login</span>
                    }
                  </td>

                  <td>
                    {x.archived
                      ? 'Archived'
                      : x.active
                        ? 'Active'
                        : x.username
                          ? 'Inactive'
                          : 'No account'
                    }
                  </td>

                  <td>
                    <div className="button-row">
                      <button onClick={()=>onEdit(x)}>
                        Edit
                      </button>

                      {!x.username&&!x.archived&&
                        <button
                          onClick={async()=>{
                            const r=await post('/admin/invite/'+x.id,{});
                            prompt('Send this invitation link',r.inviteUrl);
                            await onRefresh();
                          }}
                        >
                          Invite
                        </button>
                      }

                      {x.archived&&
                        <button
                          onClick={async()=>{
                            await post('/admin/members/'+x.id+'/reactivate',{});
                            await onRefresh();
                          }}
                        >
                          Reactivate
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
    }
  </section>
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
  const [positions,setPositions]=useState<any[]>([]);
  const [selected,setSelected]=useState<number[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const isNew=!!x._new;

  useEffect(()=>{
    api('/admin/positions')
      .then(async d=>{
        setPositions(d.positions);

        if(!isNew){
          const r=await api('/admin/members/'+x.id);
          setSelected((r.positions||[]).map((p:any)=>p.id));
        }
      })
      .catch(e=>setError(e.message));
  },[x.id,isNew]);

  const adult=!!x.adult;

  const allowed=positions.filter(
    p=>
      p.category==='other' ||
      (adult
        ? p.category==='adult'
        : p.category==='youth')
  );

  const save=async(e:React.FormEvent)=>{
    e.preventDefault();
    setBusy(true);
    setError('');

    try{
      let id=x.id;

      if(isNew){
        const r=await post('/admin/members',x);
        id=r.id;
      }else{
        await put('/admin/members/'+id,x);
      }

      await put('/admin/members/'+id+'/positions',{
        positionIds:selected
      });

      await onSaved();
    }catch(e:any){
      setError(e.message);
    }finally{
      setBusy(false);
    }
  };

  const set=(k:string,v:any)=>
    setX((q:any)=>({...q,[k]:v}));

  return <div className="modal">
    <form className="modal-card form" onSubmit={save}>
      <div className="page-head">
        <h2>{isNew?'Add Member':'Edit Member'}</h2>

        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>

      {error&&<p className="error">{error}</p>}

      <section>
        <h3>Basic Information</h3>

        <div className="grid two">
          <label>
            Prefix
            <input
              value={x.prefix||''}
              onChange={e=>set('prefix',e.target.value)}
            />
          </label>

          <label>
            Suffix
            <input
              value={x.suffix||''}
              onChange={e=>set('suffix',e.target.value)}
            />
          </label>

          <label>
            First Name
            <input
              required
              value={x.first_name||''}
              onChange={e=>set('first_name',e.target.value)}
            />
          </label>

          <label>
            Middle Name
            <input
              value={x.middle_name||''}
              onChange={e=>set('middle_name',e.target.value)}
            />
          </label>

          <label>
            Last Name
            <input
              required
              value={x.last_name||''}
              onChange={e=>set('last_name',e.target.value)}
            />
          </label>

          <label>
            Gender
            <select
              value={x.gender||'Male'}
              onChange={e=>set('gender',e.target.value)}
            >
              <option>Male</option>
              <option>Female</option>
            </select>
          </label>

          <label>
            Date of Birth
            <input
              type="date"
              value={x.dob||''}
              onChange={e=>set('dob',e.target.value)}
            />
          </label>

          <label>
            Phone
            <input
              value={x.phone||''}
              onChange={e=>set('phone',e.target.value)}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={x.email||''}
              onChange={e=>set('email',e.target.value)}
            />
          </label>

          <label>
            Street
            <input
              value={x.street||''}
              onChange={e=>set('street',e.target.value)}
            />
          </label>

          <label>
            Town
            <input
              value={x.town||''}
              onChange={e=>set('town',e.target.value)}
            />
          </label>

          <label>
            ZIP Code
            <input
              value={x.zip||''}
              onChange={e=>set('zip',e.target.value)}
            />
          </label>
        </div>
      </section>

      <section>
        <h3>Scouting Information</h3>

        <div className="grid two">
          <label>
            Member Type

            <select
              value={adult?'adult':'youth'}
              onChange={e=>{
                const a=e.target.value==='adult';

                set('adult',a?1:0);

                if(!a)
                  set('adult_leader',0);
              }}
            >
              <option value="youth">Youth</option>
              <option value="adult">Adult</option>
            </select>
          </label>

          {adult&&
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!x.adult_leader}
                onChange={e=>
                  set(
                    'adult_leader',
                    e.target.checked?1:0
                  )
                }
              />
              Adult Leader
            </label>
          }

          {!adult&&
            <label>
              Rank

              <select
                value={x.rank||''}
                onChange={e=>set('rank',e.target.value)}
              >
                <option value="">Select rank</option>

                {ranks.map(r=>
                  <option key={r} value={r}>
                    {r}
                  </option>
                )}
              </select>
            </label>
          }

          {adult&&
            <label>
              Registration Expiration
              <input
                type="date"
                value={x.registration_expiration||''}
                onChange={e=>
                  set(
                    'registration_expiration',
                    e.target.value
                  )
                }
              />
            </label>
          }

          {adult&&x.adult_leader&&
            <label>
              SYT Expiration
              <input
                type="date"
                value={x.syt_expiration||''}
                onChange={e=>
                  set(
                    'syt_expiration',
                    e.target.value
                  )
                }
              />
            </label>
          }

          {!adult&&
            <>
              <label>
                Troop Join Date
                <input
                  type="date"
                  value={x.join_date||''}
                  onChange={e=>set('join_date',e.target.value)}
                />
              </label>

              <label>
                Cub Scout Pack
                <input
                  value={x.cub_scout_pack||''}
                  onChange={e=>set('cub_scout_pack',e.target.value)}
                />
              </label>

              <label>
                Patrol
                <input
                  value={x.patrol||''}
                  onChange={e=>set('patrol',e.target.value)}
                />
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={!!x.oa_member}
                  onChange={e=>
                    set(
                      'oa_member',
                      e.target.checked?1:0
                    )
                  }
                />
                OA Member
              </label>
            </>
          }

          {!isNew&&x.rank==='Eagle Scout'&&
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!x.eagle_scout_archive}
                onChange={e=>
                  set(
                    'eagle_scout_archive',
                    e.target.checked?1:0
                  )
                }
              />
              Eagle Scout Archive
            </label>
          }

          <label>
            Scouting America Membership ID
            <input
              value={x.scouting_membership_id||''}
              onChange={e=>
                set(
                  'scouting_membership_id',
                  e.target.value
                )
              }
            />
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!x.email_default_opt_out}
              onChange={e=>
                set(
                  'email_default_opt_out',
                  e.target.checked?1:0
                )
              }
            />
            Email default opt out
          </label>
        </div>
      </section>

      {!isNew&&
        <section>
          <h3>Leadership Positions</h3>

          <p className="muted">
            Assign positions here. Adult positions are available only to adults and youth positions only to youth.
          </p>

          <div className="check-grid">
            {allowed.map(p=>
              <label className="checkbox-label" key={p.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={e=>
                    setSelected(
                      e.target.checked
                        ? [...selected,p.id]
                        : selected.filter(id=>id!==p.id)
                    )
                  }
                />
                {p.name}
              </label>
            )}
          </div>
        </section>
      }

      {!isNew&&
        <section>
          <h3>Account</h3>

          <p>
            {x.username
              ? <>
                  <b>{x.username}</b>
                  {' · '}
                  {x.active?'Active':'Inactive'}
                </>
              : 'No login account yet.'
            }
          </p>

          {!x.username&&!x.archived&&
            <button
              type="button"
              onClick={async()=>{
                const r=await post('/admin/invite/'+x.id,{});
                prompt('Send this invitation link',r.inviteUrl);
              }}
            >
              Create Invitation
            </button>
          }
        </section>
      }

      <div className="button-row">
        <button
          className="primary"
          disabled={busy}
        >
          {busy?'Saving...':'Save Member'}
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

      setSelected(s);
    })
  },[]);

  const emails=rows
    .filter(x=>selected[x.id]&&x.email&&!x.archived)
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
          {rows
            .filter(x=>!x.archived)
            .map(x=>
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
            )
          }
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
  const [saving,setSaving]=useState<number|null>(null);

  const load=()=>api('/admin/account-logins')
    .then(x=>setRows(x.accounts));

  useEffect(()=>{
    load()
  },[]);

  return <Page title="Administration">
    <div className="admin-grid">
      <section className="card">
        <h2>People & Accounts</h2>

        <p>
          Manage troop members, account invitations, leadership positions, and archived members.
        </p>

        <a className="primary button" href="/member-info">
          Open Member Info
        </a>
      </section>

      <section className="card">
        <h2>Account Logins</h2>

        <p className="muted">
          Passwords are never shown here. Administrators can only manage usernames and whether an account exists.
        </p>

        {rows.length===0
          ? <EmptyState text="There are no account logins."/>
          : rows.map(x=>
              <div className="list-row" key={x.id}>
                <span>
                  <b>{x.first_name} {x.last_name}</b>
                  <small>{x.active?'Active':'Inactive'}</small>
                </span>

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
                  disabled={saving===x.id}
                  onClick={async()=>{
                    setSaving(x.id);

                    try{
                      await put(
                        '/admin/account-logins/'+x.id,
                        {username:x.username}
                      );
                    }finally{
                      setSaving(null);
                    }
                  }}
                >
                  Save
                </button>

                <button
                  onClick={async()=>{
                    if(!confirm(
                      'Delete this login account? The member record will remain.'
                    ))return;

                    await fetch(
                      '/api/admin/account-logins/'+x.id,
                      {
                        method:'DELETE',
                        credentials:'include'
                      }
                    );

                    await load();
                  }}
                >
                  Delete
                </button>
              </div>
            )
        }
      </section>
    </div>

    <section className="card">
      <h2>Owner-supplied assets</h2>

      <p className="muted">
        These uploads are stored in the troop's R2 bucket and can later be managed from the relevant page.
      </p>

      <Upload
        label="AHMR official PDF template"
        kind="site:ahmr_template"
      />
    </section>

    <section className="card">
      <h2>Bootstrap</h2>

      <p className="muted">
        The initial administrator was created through the bootstrap process. Bootstrap is not a normal account-management feature.
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

        setMsg(r.ok?'Uploaded':'Upload failed');
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
