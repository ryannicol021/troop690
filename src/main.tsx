import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useNavigate,useLocation} from 'react-router-dom';
import './styles.css';
import {api,post,put} from './lib/api';

const nav=[['/','Home','public'],['/eagles','Eagle Scouts','public'],['/calendar','Calendar','CAL'],['/photos','Photo Gallery','PHV'],['/documents','Documents','DOCV'],['/leadership','Leadership','public'],['/advancement','Advancement','public'],['/summer-camp','Summer Camp','public'],['/uniform','Scout Uniform','public'],['/contact','Contact Us','public']];
const adminNav=[['/member-info','Member Info','MIV'],['/email','Email','EML'],['/administration','Administration','__ADMIN_ROLE__']];

function App(){
  const [actualMe,setActualMe]=useState<any>(null);
  const [viewAs,setViewAs]=useState('Administrator');
  const [viewAsPermissions,setViewAsPermissions]=
    useState<Record<string,string[]>>({});
  const [authReady,setAuthReady]=useState(false);
  const [open,setOpen]=useState<'account'|'nav'|null>(null);
  const navg=useNavigate();
  const loc=useLocation();

useEffect(()=>{
  api('/me')
    .then(async x=>{
      setActualMe(x.user);

      if(x.user?.isAdministrator){
        try{
          const options=
            await api('/admin/view-as-options');

          setViewAsPermissions(
            options.roles||{}
          );
        }catch{}
      }
    })
    .catch(()=>{})
    .finally(()=>setAuthReady(true));
},[]);

const me=
  actualMe?.isAdministrator&&
  viewAs!=='Administrator'?
    {
      ...actualMe,
      isAdministrator:false,
      permissions:
        viewAsPermissions[
          viewAs==='Adult Leader'?
            'ADULTL':
          viewAs.toUpperCase()
        ]||[],
      person:
        viewAs==='Guest'?
          null:
          actualMe.person
    }:
    actualMe;

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
      actualMe?navg('/settings'):navg('/login')
    }}>
      {actualMe?'Settings':'Log In'}
    </button>

    {actualMe?.isAdministrator&&
      <div className="view-as-section">
        <div className="view-as-label">
          View As
        </div>

        {[
          'Administrator',
          'Guest',
          'Youth',
          'Adult',
          'Adult Leader'
        ].map(role=>
          <button
            key={role}
            className={
              viewAs===role?
                'active':
                ''
            }
            onClick={()=>{
              setViewAs(role);
            }}
          >
            {role}
          </button>
        )}
      </div>
    }

    {actualMe&&
      <button onClick={async()=>{
        await post('/logout',{});
        setActualMe(null);
        setViewAs('Administrator');
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
  required[p]??
  (
    p.startsWith('/calendar/')?
      'CAL':
      p.startsWith('/photos/')?
        'PHV':
        undefined
  );

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
  if(p==='/calendar')return <Calendar me={me}/>;
  if(p.startsWith('/calendar/'))
    return <CalendarEvent
      id={p.split('/')[2]}
      me={me}
      edit={p.split('/')[3]==='edit'}
    />;
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
  const [rememberMe,setRememberMe]=useState(true);
  const [err,setErr]=useState('');
  const nav=useNavigate();

  return <Page title="Log In">
    <form
      className="form narrow"
      onSubmit={async e=>{
        e.preventDefault();
        try{
          await post(
            '/login',
            {
              username:u,
              password:p,
              rememberMe
            }
          );
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

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={e=>
            setRememberMe(e.target.checked)
          }
        />
        Remember Me
      </label>
      
      {err&&<p className="error">{err}</p>}

      <button className="primary">Log In</button>
    </form>
  </Page>
}

function Claim(){
  const token=decodeURIComponent(
    location.pathname.split('/').pop()||''
  );

  const [mode,setMode]=useState<
    'create'|'reset'|null
  >(null);

  const [username,setUsername]=useState('');
  const [pw,setPw]=useState('');
  const [ok,setOk]=useState(false);
  const [err,setErr]=useState('');

  useEffect(()=>{
    api(
      '/claim?token='+
      encodeURIComponent(token)
    )
      .then((x:any)=>{
        setMode(x.mode);

        if(x.username)
          setUsername(x.username);
      })
      .catch((e:any)=>
        setErr(e.message)
      );
  },[]);

  return <Page
    title={
      mode==='reset'?
        'Reset Password':
        'Claim Account'
    }
  >
    <form
      className="form narrow"
      onSubmit={async e=>{
        e.preventDefault();

        try{
          const r=await post(
            '/claim',
            {
              token,
              username,
              password:pw
            }
          );

          setMode(r.mode);
          setOk(true);
        }catch(e:any){
          setErr(e.message);
        }
      }}
    >
      {ok?
        <p>
          {mode==='reset'?
            'Your password has been reset. You can now log in.':
            'Your account has been created. You can now log in.'
          }
        </p>:
        <>
          {mode!=='reset'&&
            <label>
              Username
              <input
                value={username}
                onChange={e=>
                  setUsername(e.target.value)
                }
                autoComplete="username"
              />
            </label>
          }

          {mode==='reset'&&
            <label>
              Username
              <input
                value={username}
                readOnly
              />
            </label>
          }

          <label>
            {mode==='reset'?
              'New Password':
              'Password'
            }
            <input
              type="password"
              value={pw}
              onChange={e=>
                setPw(e.target.value)
              }
              autoComplete={
                mode==='reset'?
                  'new-password':
                  'new-password'
              }
            />
          </label>

          {err&&
            <p className="error">
              {err}
            </p>
          }

          <button className="primary">
            {mode==='reset'?
              'Reset Password':
              'Create Account'
            }
          </button>
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

function Calendar({me}:{me:any}){
  const [d,setD]=useState<any>();
  const [viewDate,setViewDate]=useState(
    ()=>{
      const now=new Date();

      return new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );
    }
  );

  const [showAddEvent,setShowAddEvent]=useState(false);

  const canEdit=
    !!me?.isAdministrator||
    !!me?.permissions?.includes('EVT');

  const load=async()=>{
    try{
      const x=await api('/calendar');
      setD(x);
    }catch(e:any){
      setD({
        events:[],
        error:e?.message||
          'Unable to load the calendar.'
      });
    }
  };

  useEffect(()=>{
    load();
  },[]);

  if(!d)
    return <Page title="Calendar"><Loading/></Page>;

  if(d.error)
    return (
      <Page title="Calendar">
        <p className="error">{d.error}</p>
      </Page>
    );

  const year=viewDate.getFullYear();
  const month=viewDate.getMonth();

  const minimumDate=
    new Date(2020,0,1);

  const canGoPrevious=
    new Date(year,month-1,1)>=
    minimumDate;

  const firstDay=
    new Date(year,month,1).getDay();

  const daysInMonth=
    new Date(year,month+1,0).getDate();

  const weekCount=
    Math.ceil(
      (firstDay+daysInMonth)/7
    );

  const cellCount=
    weekCount*7;

  const previousMonthDays=
    new Date(year,month,0).getDate();

  const cells:any[]=[];

  for(let i=0;i<firstDay;i++){
    cells.push({
      day:
        previousMonthDays-firstDay+i+1,
      current:false,
      date:new Date(
        year,
        month-1,
        previousMonthDays-firstDay+i+1
      )
    });
  }

  for(let day=1;day<=daysInMonth;day++){
    cells.push({
      day,
      current:true,
      date:new Date(year,month,day)
    });
  }

  let nextDay=1;

  while(cells.length<cellCount){
    cells.push({
      day:nextDay,
      current:false,
      date:new Date(
        year,
        month+1,
        nextDay
      )
    });

    nextDay++;
  }

  const pad=(n:number)=>
    String(n).padStart(2,'0');

  const dateKey=(value:Date)=>{
    const d=new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    );

    return `${d.getFullYear()}-${
      pad(d.getMonth()+1)
    }-${pad(d.getDate())}`;
  };

  const dateOnly=(value:string|Date)=>{
    const date=
      value instanceof Date?
        value:
        new Date(value);

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  };

  const formatTime=(value:string)=>{
    const date=new Date(value);

    return date.toLocaleTimeString(
      'en-US',
      {
        hour:'numeric',
        minute:'2-digit'
      }
    );
  };

  const eventTypeClass=(type:string)=>{
    return (
      'calendar-event calendar-event-' +
      String(type||'Other')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g,'-')
    );
  };

  const eventInfo=(e:any,date:Date)=>{
    const start=dateOnly(e.start_at);
    const end=
      e.end_at?
        dateOnly(e.end_at):
        start;

    const current=dateOnly(date);

    const startsToday=
      current.getTime()===start.getTime();

    const endsToday=
      current.getTime()===end.getTime();

    const multiDay=
      start.getTime()!==end.getTime();

    if(Number(e.all_day)){
      return {
        bar:true,
        text:'All Day'
      };
    }

    if(!multiDay){
      return {
        bar:false,
        text:
          `${formatTime(e.start_at)} – `+
          `${formatTime(e.end_at)}`
      };
    }

    if(startsToday){
      return {
        bar:true,
        text:formatTime(e.start_at)
      };
    }

    if(endsToday){
      return {
        bar:true,
        text:formatTime(e.end_at)
      };
    }

    return {
      bar:true,
      text:'All Day'
    };
  };

  const eventsForDay=(date:Date)=>
    (d.events||[])
      .filter((e:any)=>{
        const start=
          dateOnly(e.start_at);

        const end=
          e.end_at?
            dateOnly(e.end_at):
            start;

        const current=
          dateOnly(date);

        return (
          current.getTime()>=start.getTime()&&
          current.getTime()<=end.getTime()
        );
      })
      .sort((a:any,b:any)=>{
        const aInfo=
          eventInfo(a,date);

        const bInfo=
          eventInfo(b,date);

        if(aInfo.bar!==bInfo.bar)
          return aInfo.bar?
            -1:
            1;

        const startA=
          new Date(a.start_at).getTime();

        const startB=
          new Date(b.start_at).getTime();

        if(startA!==startB)
          return startA-startB;

        const endA=
          a.end_at?
            new Date(a.end_at).getTime():
            Number.MAX_SAFE_INTEGER;

        const endB=
          b.end_at?
            new Date(b.end_at).getTime():
            Number.MAX_SAFE_INTEGER;

        if(endA!==endB)
          return endA-endB;

        return String(a.title||'')
          .localeCompare(
            String(b.title||'')
          );
      });

  const monthName=
    viewDate.toLocaleString(
      'en-US',
      {month:'long'}
    );

  const goMonth=(delta:number)=>{
    const next=
      new Date(year,month+delta,1);

    if(next<minimumDate)
      return;

    setViewDate(next);
  };

  const goYear=(delta:number)=>{
    const next=
      new Date(year+delta,month,1);

    if(next<minimumDate)
      return;

    setViewDate(next);
  };

  return <Page
    title="Calendar"
  >

    <div className="calendar-top-actions">
      {canEdit?
        <button
          type="button"
          className="button"
          onClick={()=>{
            setShowAddEvent(true);
          }}
        >
          Add Event
        </button>:
        <span />
      }

      <button
        type="button"
        className="button"
        disabled
      >
        Subscribe
      </button>
    </div>

    <div className="calendar-navigation">
      <button
        type="button"
        className="button secondary"
        disabled={!canGoPrevious}
        onClick={()=>{
          goYear(-1);
        }}
        title="Previous year"
      >
        «
      </button>

      <button
        type="button"
        className="button secondary"
        disabled={!canGoPrevious}
        onClick={()=>{
          goMonth(-1);
        }}
        title="Previous month"
      >
        ‹
      </button>

      <div className="calendar-month-title">
        {monthName} {year}
      </div>

      <button
        type="button"
        className="button secondary"
        onClick={()=>{
          goMonth(1);
        }}
        title="Next month"
      >
        ›
      </button>

      <button
        type="button"
        className="button secondary"
        onClick={()=>{
          goYear(1);
        }}
        title="Next year"
      >
        »
      </button>
    </div>

    <div className="calendar-grid-wrap">
      <div className="calendar-grid">

        {[
          'Sun',
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat'
        ].map(day=>
          <div
            className="calendar-weekday"
            key={day}
          >
            {day}
          </div>
        )}

        {cells.map((cell:any,i:number)=>{
          const events=
            cell.current?
              eventsForDay(cell.date):
              [];

          return <div
            className={
              'calendar-day '+
              (
                cell.current?
                  'calendar-day-current':
                  'calendar-day-adjacent'
              )
            }
            key={i}
          >
            <div className="calendar-day-number">
              {cell.day}
            </div>

            {cell.current&&
              <div className="calendar-day-events">
                {events.map((e:any)=>{
                  const info=
                    eventInfo(
                      e,
                      cell.date
                    );

                  return <a
                    href={
                      '/calendar/'+e.id
                    }
                    className={
                      eventTypeClass(
                        e.event_type
                      )+
                      (
                        info.bar?
                          ' calendar-event-bar':
                          ' calendar-event-timed'
                      )
                    }
                    key={e.id}
                  >
                    <div className="calendar-event-title">
                      {e.title}
                    </div>

                    <div className="calendar-event-time">
                      {info.text}
                    </div>
                  </a>;
                })}
              </div>
            }
          </div>;
        })}
      </div>
    </div>

    {showAddEvent&&
      <div
        className="modal-backdrop"
        onMouseDown={e=>{
          if(
            e.target===
            e.currentTarget
          )
            setShowAddEvent(false);
        }}
      >
        <div
          className="modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-event-title"
        >
          <div className="modal-header">
            <h2 id="add-event-title">
              Add Event
            </h2>

            <button
              type="button"
              className="modal-close"
              onClick={()=>{
                setShowAddEvent(false);
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <EventForm
            me={me}
            onSaved={()=>{
              setShowAddEvent(false);
              load();
            }}
            onCancel={()=>{
              setShowAddEvent(false);
            }}
          />
        </div>
      </div>
    }
  </Page>
}

function CalendarEvent({
  id,
  me,
  edit
}:{
  id:string,
  me:any,
  edit?:boolean
}){
  const [d,setD]=useState<any>();
  const nav=useNavigate();

  const canEdit=
    !!me?.isAdministrator||
    !!me?.permissions?.includes('EVT');

  const load=async()=>{
    try{
      setD(
        await api(
          '/events/'+id
        )
      );
    }catch{
      setD({
        event:null
      });
    }
  };

  useEffect(()=>{
    load();
  },[id]);

  if(!d)
    return (
      <Page title="Event">
        <Loading/>
      </Page>
    );

  if(!d.event)
    return (
      <Page title="Event">
        <p className="error">
          Event not found.
        </p>
      </Page>
    );

  const e=d.event;

  const formatDate=(value:string)=>{
    return new Date(value)
      .toLocaleDateString(
        'en-US',
        {
          month:'numeric',
          day:'numeric',
          year:'numeric'
        }
      );
  };

  const formatTime=(value:string)=>{
    return new Date(value)
      .toLocaleTimeString(
        'en-US',
        {
          hour:'numeric',
          minute:'2-digit'
        }
      );
  };

  const when=
    Number(e.all_day)?
      (
        formatDate(e.start_at)===
        formatDate(e.end_at)?
          formatDate(e.start_at):
          `${formatDate(e.start_at)} – `+
          `${formatDate(e.end_at)}`
      ):
      (
        formatDate(e.start_at)===
        formatDate(e.end_at)?
          `${formatDate(e.start_at)}, `+
          `${formatTime(e.start_at)} – `+
          `${formatTime(e.end_at)}`:
          `${formatDate(e.start_at)}, `+
          `${formatTime(e.start_at)} – `+
          `${formatDate(e.end_at)}, `+
          `${formatTime(e.end_at)}`
      );

  if(edit&&canEdit){
    return (
      <Page
        title="Edit Event"
      >
        <div className="event-editor-page">
          <EventForm
            me={me}
            initialEvent={e}
            onSaved={()=>{
              nav(
                '/calendar/'+id
              );
            }}
            onCancel={()=>{
              nav(
                '/calendar/'+id
              );
            }}
          />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title={e.title}
actions={
  <>
    <button
      type="button"
      className="button secondary"
      onClick={()=>{
        nav('/calendar');
      }}
    >
      ← Back to Calendar
    </button>

    {canEdit&&
      <>
        <button
          type="button"
          className="button"
          onClick={()=>{
            nav(
              '/calendar/'+id+'/edit'
            );
          }}
        >
          Edit Event
        </button>

        <button
          type="button"
          className="button secondary"
          onClick={async()=>{
            if(!confirm(
              'Delete this event?'
            ))
              return;

            try{
              await api(
                '/admin/events/'+id,
                {
                  method:'DELETE'
                }
              );

              nav('/calendar');
            }catch(err:any){
              alert(
                err?.message||
                'Unable to delete event.'
              );
            }
          }}
        >
          Delete Event
        </button>
      </>
    }
  </>
}
    >
      <article className="event-details card">

        <div className="event-detail-type">
          {e.event_type||'Other'}
        </div>

        <dl>
          <dt>When</dt>
          <dd>{when}</dd>

          {e.location_name&&
            <>
              <dt>Location</dt>
              <dd>
                <strong>
                  {e.location_name}
                </strong>

                {e.location_address&&
                  <>
                    <br/>
                    {e.location_address}
                  </>
                }
              </dd>
            </>
          }

          {e.departure_arrival_location_name&&
            <>
              <dt>
                Departure / Arrival Location
              </dt>
              <dd>
                <strong>
                  {
                    e
                      .departure_arrival_location_name
                  }
                </strong>

                {e
                  .departure_arrival_location_address&&
                  <>
                    <br/>
                    {
                      e
                        .departure_arrival_location_address
                    }
                  </>
                }
              </dd>
            </>
          }

          {e.dress_code&&
            <>
              <dt>Dress Code</dt>
              <dd>{e.dress_code}</dd>
            </>
          }

          {e.estimated_cost!==''&&
            e.estimated_cost!=null&&
            <>
              <dt>Estimated Cost</dt>
              <dd>
                ${
                  Number(e.estimated_cost)
                    .toFixed(2)
                }
              </dd>
            </>
          }

          {e.service_hours!=null&&
            <>
              <dt>Service Hours</dt>
              <dd>{e.service_hours}</dd>
            </>
          }

          {e.camping_nights!=null&&
            <>
              <dt>Camping Nights</dt>
              <dd>{e.camping_nights}</dd>
            </>
          }

          {e.hiking_miles!=null&&
            <>
              <dt>Hiking Miles</dt>
              <dd>{e.hiking_miles}</dd>
            </>
          }

          {(e.leader_1_name||
            e.leader_2_name)&&
            <>
              <dt>Leaders</dt>
              <dd>
                {e.leader_1_name||''}

                {e.leader_1_name&&
                  e.leader_2_name&&
                  <br/>
                }

                {e.leader_2_name||''}
              </dd>
            </>
          }

          {e.description&&
            <>
              <dt>Description</dt>
              <dd>
                {e.description}
              </dd>
            </>
          }
        </dl>
      </article>
    </Page>
  );
}

function PlaceSearch({
  label,
  value,
  address,
  onChange,
  optional
}:{
  label:string,
  value:string,
  address:string,
  onChange:(name:string,address:string)=>void,
  optional?:boolean
}){
  const [query,setQuery]=useState(value||'');
  const [results,setResults]=useState<any[]>([]);
  const [open,setOpen]=useState(false);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    setQuery(value||'');
  },[value]);

  useEffect(()=>{
    const text=query.trim();

    if(text.length<3){
      setResults([]);
      setOpen(false);
      return;
    }

    const timer=setTimeout(async()=>{
      setLoading(true);

      try{
        const r=await api(
          '/admin/event-location-search?q='+
          encodeURIComponent(text)
        );

        setResults(r.results||[]);
        setOpen(true);
}catch(err:any){
  setResults([]);

  console.error(
    'Event location search failed:',
    err
  );
}finally{
        setLoading(false);
      }
    },1000);

    return()=>{
      clearTimeout(timer);
    };
  },[query]);

  const manual=()=>{
    setOpen(false);
    onChange(query,'');
  };

  return <div className="place-search">

    <label>
      {label}
      {optional&&
        <span className="event-optional">
          Optional
        </span>
      }

      <input
        value={query}
        placeholder={
          optional?
            'Search for a place or address':
            'Search for a place or address'
        }
        onFocus={()=>{
          if(results.length)
            setOpen(true);
        }}
        onBlur={()=>{
          setTimeout(()=>{
            setOpen(false);
          },150);
        }}
        onChange={e=>{
          setQuery(e.target.value);

          if(!e.target.value)
            onChange('','');
        }}
      />
    </label>

    {address&&
      <div className="place-selected-address">
        {address}
      </div>
    }

    {open&&
      <div className="place-results">

        <button
          type="button"
          className="place-result place-manual"
          onMouseDown={e=>{
            e.preventDefault();
            manual();
          }}
        >
          <strong>
            Use “{query}”
          </strong>
          <span>Manual entry</span>
        </button>

        {results.map((x:any,i:number)=>
          <button
            type="button"
            className="place-result"
            key={
              x.place_id||
              i
            }
            onMouseDown={e=>{
              e.preventDefault();

              setQuery(x.name||'');
              setOpen(false);

              onChange(
                x.name||'',
                x.address||''
              );
            }}
          >
            <strong>
              {x.name}
            </strong>

            {x.address&&
              <span>
                {x.address}
              </span>
            }
          </button>
        )}

        {loading&&
          <div className="place-loading">
            Searching…
          </div>
        }

        <div className="place-attribution">
          Powered by Geoapify
        </div>
      </div>
    }
  </div>;
}

function EventForm({
  me,
  initialEvent,
  onSaved,
  onCancel
}:{
  me:any,
  initialEvent?:any,
  onSaved:()=>void,
  onCancel:()=>void
}){
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [leaders,setLeaders]=useState<any[]>([]);

  const isEdit=
    initialEvent!=null;

  const [form,setForm]=useState<any>({
    title:'',
    event_type:'Ceremony',
    location_name:'',
    location_address:'',
    departure_arrival_location_name:'',
    departure_arrival_location_address:'',
    start_date:'',
    start_time:'',
    start_ampm:'p.m.',
    end_date:'',
    end_time:'',
    end_ampm:'p.m.',
    all_day:false,
    dress_code:'',
    estimated_cost:'',
    service_hours:'',
    camping_nights:'',
    hiking_miles:'',
    leader_1_id:'',
    leader_2_id:'',
    description:''
  });

  useEffect(()=>{
    api('/admin/event-options')
      .then((x:any)=>{
        setLeaders(x.leaders||[]);
      })
      .catch(()=>{});
  },[]);

  useEffect(()=>{
    if(!initialEvent)
      return;

    const parseDate=(value:any)=>{
      return value?
        String(value).slice(0,10):
        '';
    };

    const parseTime=(value:any)=>{
      if(!value)
        return {
          time:'',
          ampm:'p.m.'
        };

      const d=new Date(value);
      let hour=d.getHours();

      const ampm=
        hour>=12?
          'p.m.':
          'a.m.';

      hour=hour%12;

      if(hour===0)
        hour=12;

      return {
        time:
          `${hour}:${
            String(d.getMinutes())
              .padStart(2,'0')
          }`,
        ampm
      };
    };

    const start=
      parseTime(initialEvent.start_at);

    const end=
      parseTime(initialEvent.end_at);

    setForm({
      title:String(
        initialEvent.title||''
      ),
      event_type:String(
        initialEvent.event_type||'Other'
      ),
      location_name:String(
        initialEvent.location_name||''
      ),
      location_address:String(
        initialEvent.location_address||''
      ),
      departure_arrival_location_name:
        String(
          initialEvent
            .departure_arrival_location_name||''
        ),
      departure_arrival_location_address:
        String(
          initialEvent
            .departure_arrival_location_address||''
        ),
      start_date:
        parseDate(initialEvent.start_at),
      start_time:start.time,
      start_ampm:start.ampm,
      end_date:
        parseDate(initialEvent.end_at),
      end_time:end.time,
      end_ampm:end.ampm,
      all_day:
        Number(initialEvent.all_day)===1,
      dress_code:
        String(initialEvent.dress_code||''),
      estimated_cost:
        initialEvent.estimated_cost==null?
          '':
          String(initialEvent.estimated_cost),
      service_hours:
        initialEvent.service_hours==null?
          '':
          String(initialEvent.service_hours),
      camping_nights:
        initialEvent.camping_nights==null?
          '':
          String(initialEvent.camping_nights),
      hiking_miles:
        initialEvent.hiking_miles==null?
          '':
          String(initialEvent.hiking_miles),
      leader_1_id:
        initialEvent.leader_1_id==null?
          '':
          String(initialEvent.leader_1_id),
      leader_2_id:
        initialEvent.leader_2_id==null?
          '':
          String(initialEvent.leader_2_id),
      description:
        String(initialEvent.description||'')
    });
  },[initialEvent]);

  const set=(name:string,value:any)=>{
    setForm((x:any)=>({
      ...x,
      [name]:value
    }));
  };

  const formatTimeInput=(value:string)=>{
    const digits=
      String(value||'')
        .replace(/\D/g,'')
        .slice(0,4);

    if(digits.length<=2)
      return digits;

    return (
      digits.slice(0,-2)+
      ':'+
      digits.slice(-2)
    );
  };

  const validTime=(value:string)=>{
    return /^(1[0-2]|[1-9]):[0-5][0-9]$/
      .test(value);
  };

  const convertTime=(
    date:string,
    time:string,
    ampm:string
  )=>{
    let [hour,minute]=
      time.split(':').map(Number);

    if(ampm==='a.m.'){
      if(hour===12)
        hour=0;
    }else{
      if(hour!==12)
        hour+=12;
    }

    return `${date}T${
      String(hour).padStart(2,'0')
    }:${
      String(minute).padStart(2,'0')
    }:00`;
  };

  const save=async()=>{
    setError('');

    if(!form.title.trim()){
      setError(
        'Event Name is required.'
      );
      return;
    }

    if(
      !form.start_date||
      !form.end_date
    ){
      setError(
        'Start and End dates are required.'
      );
      return;
    }

    if(
      !form.all_day&&
      (
        !form.start_time||
        !form.end_time
      )
    ){
      setError(
        'Start and End times are required.'
      );
      return;
    }

    if(
      !form.all_day&&
      (
        !validTime(form.start_time)||
        !validTime(form.end_time)
      )
    ){
      setError(
        'Times must be entered as h:mm or hh:mm.'
      );
      return;
    }

    setSaving(true);

    try{
      const payload={
        title:form.title.trim(),
        description:
          form.description.trim(),
        event_type:
          form.event_type,

        location_name:
          form.location_name.trim(),
        location_address:
          form.location_address.trim(),

        departure_arrival_location_name:
          form
            .departure_arrival_location_name
            .trim(),

        departure_arrival_location_address:
          form
            .departure_arrival_location_address
            .trim(),

        start_at:
          form.all_day?
            `${form.start_date}T00:00:00`:
            convertTime(
              form.start_date,
              form.start_time,
              form.start_ampm
            ),

        end_at:
          form.all_day?
            `${form.end_date}T23:59:59`:
            convertTime(
              form.end_date,
              form.end_time,
              form.end_ampm
            ),

        all_day:
          form.all_day?1:0,

        dress_code:
          form.dress_code,

        estimated_cost:
          form.estimated_cost===''?
            '':
            Number(
              form.estimated_cost
            ).toFixed(2),

        service_hours:
          form.service_hours===''?
            null:
            Number(form.service_hours),

        camping_nights:
          form.camping_nights===''?
            null:
            Number(form.camping_nights),

        hiking_miles:
          form.hiking_miles===''?
            null:
            Number(form.hiking_miles),

        leader_1_id:
          form.leader_1_id||null,

        leader_2_id:
          form.leader_2_id||null
      };

      if(isEdit){
        await put(
          '/admin/events/'+
          initialEvent.id,
          payload
        );
      }else{
        await post(
          '/admin/events',
          payload
        );
      }

      onSaved();

    }catch(err:any){
      setError(
        err?.message||
        (
          isEdit?
            'Unable to update event.':
            'Unable to add event.'
        )
      );
    }finally{
      setSaving(false);
    }
  };

  const peopleOptions=leaders.map(
    (x:any)=>(
      <option
        key={x.id}
        value={x.id}
      >
        {x.last_name}, {x.first_name}
        {x.middle_name?
          ` ${x.middle_name}`:
          ''}
      </option>
    )
  );

  return <div className="event-form">

    {error&&
      <div className="error">
        {error}
      </div>
    }

    <label>
      Event Name
      <input
        value={form.title}
        onChange={e=>{
          set(
            'title',
            e.target.value
          );
        }}
        autoFocus={!isEdit}
      />
    </label>

    <label>
      Event Type
      <select
        value={form.event_type}
        onChange={e=>{
          set(
            'event_type',
            e.target.value
          );
        }}
      >
        <option>Ceremony</option>
        <option>Court of Honor</option>
        <option>Fundraiser</option>
        <option>Mass</option>
        <option>Meeting</option>
        <option>Service</option>
        <option>Summer Camp</option>
        <option>Trip</option>
        <option>Other</option>
      </select>
    </label>

    <PlaceSearch
      label="Location"
      value={form.location_name}
      address={form.location_address}
      onChange={(name,address)=>{
        set(
          'location_name',
          name
        );
        set(
          'location_address',
          address
        );
      }}
    />

    <PlaceSearch
      label="Departure / Arrival Location"
      value={
        form
          .departure_arrival_location_name
      }
      address={
        form
          .departure_arrival_location_address
      }
      onChange={(name,address)=>{
        set(
          'departure_arrival_location_name',
          name
        );
        set(
          'departure_arrival_location_address',
          address
        );
      }}
      optional
    />

    <label className="checkbox-label">
      <input
        type="checkbox"
        checked={form.all_day}
        onChange={e=>{
          set(
            'all_day',
            e.target.checked
          );
        }}
      />
      All Day
    </label>

    <div className="event-form-row">
      <label>
        Start
        <input
          type="date"
          value={form.start_date}
          onChange={e=>{
            set(
              'start_date',
              e.target.value
            );
          }}
        />
      </label>

      {!form.all_day&&
        <label>
          Time
          <div className="event-time">
            <input
              type="text"
              inputMode="numeric"
              placeholder="5:00"
              maxLength={5}
              value={form.start_time}
              onChange={e=>{
                set(
                  'start_time',
                  formatTimeInput(
                    e.target.value
                  )
                );
              }}
            />

            <select
              value={form.start_ampm}
              onChange={e=>{
                set(
                  'start_ampm',
                  e.target.value
                );
              }}
            >
              <option>a.m.</option>
              <option>p.m.</option>
            </select>
          </div>
        </label>
      }
    </div>

    <div className="event-form-row">
      <label>
        End
        <input
          type="date"
          value={form.end_date}
          onChange={e=>{
            set(
              'end_date',
              e.target.value
            );
          }}
        />
      </label>

      {!form.all_day&&
        <label>
          Time
          <div className="event-time">
            <input
              type="text"
              inputMode="numeric"
              placeholder="9:00"
              maxLength={5}
              value={form.end_time}
              onChange={e=>{
                set(
                  'end_time',
                  formatTimeInput(
                    e.target.value
                  )
                );
              }}
            />

            <select
              value={form.end_ampm}
              onChange={e=>{
                set(
                  'end_ampm',
                  e.target.value
                );
              }}
            >
              <option>a.m.</option>
              <option>p.m.</option>
            </select>
          </div>
        </label>
      }
    </div>

    <label>
      Dress Code
      <select
        value={form.dress_code}
        onChange={e=>{
          set(
            'dress_code',
            e.target.value
          );
        }}
      >
        <option value=""></option>
        <option>Class A</option>
        <option>Class B</option>
        <option>Casual</option>
        <option>Other</option>
      </select>
    </label>

    <label>
      Estimated Cost
      <div className="event-money-input">
        <span>$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.estimated_cost}
          onChange={e=>{
            set(
              'estimated_cost',
              e.target.value
            );
          }}
          onBlur={()=>{
            if(
              form.estimated_cost!==''
            ){
              set(
                'estimated_cost',
                Number(
                  form.estimated_cost
                ).toFixed(2)
              );
            }
          }}
        />
      </div>
    </label>

    <label>
      Service Hours
      <input
        type="number"
        min="0"
        step="0.1"
        value={form.service_hours}
        onChange={e=>{
          set(
            'service_hours',
            e.target.value
          );
        }}
      />
    </label>

    <label>
      Camping Nights
      <input
        type="number"
        min="0"
        step="1"
        value={form.camping_nights}
        onChange={e=>{
          set(
            'camping_nights',
            e.target.value
          );
        }}
      />
    </label>

    <label>
      Hiking Miles
      <input
        type="number"
        min="0"
        step="0.1"
        value={form.hiking_miles}
        onChange={e=>{
          set(
            'hiking_miles',
            e.target.value
          );
        }}
      />
    </label>

    <label>
      Leader 1
      <select
        value={form.leader_1_id}
        onChange={e=>{
          set(
            'leader_1_id',
            e.target.value
          );
        }}
      >
        <option value="">None</option>
        {peopleOptions}
      </select>
    </label>

    <label>
      Leader 2
      <select
        value={form.leader_2_id}
        onChange={e=>{
          set(
            'leader_2_id',
            e.target.value
          );
        }}
      >
        <option value="">None</option>
        {peopleOptions}
      </select>
    </label>

    <label>
      Description
      <textarea
        value={form.description}
        onChange={e=>{
          set(
            'description',
            e.target.value
          );
        }}
      />
    </label>

    <div className="event-form-actions">
      <button
        type="button"
        className="button secondary"
        onClick={onCancel}
        disabled={saving}
      >
        Cancel
      </button>

      <button
        type="button"
        className="button"
        onClick={save}
        disabled={saving}
      >
        {saving?
          'Saving…':
          isEdit?
            'Save Changes':
            'Add Event'
        }
      </button>
    </div>
  </div>;
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
  const [memberTab,setMemberTab]=useState<'members'|'families'|'patrols'>('members');

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

  const accountStatus=(x:any)=>{
    if(x.archived)
      return 'Archived';

    if(x.active)
      return 'Active';

    if(x.invite_expires_at)
      return 'Link Pending';

    return 'No Account';
  };

  const address=(x:any)=>{
    const street=
      String(x.street||'').trim();

    const town=
      String(x.town||'').trim();

    const zip=
      String(x.zip||'').trim();

    const line1=
      street?
        `${street},`:
        '';

    const line2=[
      town?
        `${town},`:
        '',
      zip
    ]
      .filter(Boolean)
      .join(' NY ');

    return <>
      {line1&&
        <div>{line1}</div>
      }

      {line2&&
        <div>
          {town?`${town}, NY`:''}
          {town&&zip?' ':''}
          {zip}
        </div>
      }
    </>;
  };

  const today=new Date();
  const todayString=
    `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  
  const thirtyDays=new Date(today);
  thirtyDays.setDate(thirtyDays.getDate()+30);
  
  const thirtyDaysString=
    `${thirtyDays.getFullYear()}-${String(thirtyDays.getMonth()+1).padStart(2,'0')}-${String(thirtyDays.getDate()).padStart(2,'0')}`;
  
  const expirationStyle=(date:any)=>{
    if(!date)
      return undefined;
  
    return date<=todayString?
      {color:'#CE1126'}:
      undefined;
  };
  
  const sytExpirationStyle=(date:any)=>{
    if(!date)
      return undefined;
  
    if(date<=todayString)
      return {color:'#CE1126'};
  
    if(date<=thirtyDaysString)
      return {color:'#C49A00'};
  
    return undefined;
  };

  const dobStyle=(dob:any)=>{
    if(!dob)
      return undefined;
  
    const birth=new Date(dob+'T00:00:00');
    const today=new Date();
  
    let age=today.getFullYear()-birth.getFullYear();
  
    const birthdayPassed=
      today.getMonth()>birth.getMonth()||
      (
        today.getMonth()===birth.getMonth()&&
        today.getDate()>=birth.getDate()
      );
  
    if(!birthdayPassed)
      age--;
  
    if(age>=20)
      return {color:'#CE1126'};
  
    if(age>=18)
      return {color:'#C49A00'};
  
    return undefined;
  };
  
  const nameCell=(x:any)=>{
    return <>
      <div>{x.first_name||''}</div>
      <div>{x.middle_name||''}</div>
      <div>{x.last_name||''}</div>
    </>;
  };

  const positions=(x:any)=>{
    return (
      x.position_names||[]
    ).join(', ');
  };

  const emergencyContacts=(x:any)=>{
    const contacts=
      x.emergency_contacts||[];

    return <div className="emergency-contact-cell">
      {contacts.map((p:any,i:number)=>
        <div
          className="emergency-contact"
          key={p.id||i}
        >
          <div>{p.first_name}</div>
          <small>
            {p.phone||''}
          </small>
        </div>
      )}

      {contacts.length===1&&
        <div className="emergency-contact empty"/>
      }
    </div>;
  };

const createLink=async(x:any)=>{
  try{
    const r=await post(
      '/admin/invite/'+x.id,
      {}
    );

    setAccountLink({
      username:r.username,
      url:
        window.location.origin+
        '/claim/'+
        encodeURIComponent(r.token),
      mode:r.mode,
      person:x
    });
  }catch(e:any){
    setMsg(e.message);
    setTimeout(
      ()=>setMsg(''),
      2200
    );
  }
};

const sendAccountLinkEmail=()=>{
  if(!accountLink)
    return;

  const person=
    accountLink.person||{};

  const first=String(
    person.first_name||''
  ).trim();

  const last=String(
    person.last_name||''
  ).trim();

  const creatorFirst=String(
    me?.person?.first_name||''
  ).trim();

  const creatorLast=String(
    me?.person?.last_name||''
  ).trim();

  const action=
    accountLink.mode==='reset'?
      'reset your password':
      'create your account';

  const subject=
    accountLink.mode==='reset'?
      '[Troop 690] Reset Password':
      '[Troop 690] Create Account';

  const body=
    `${first} ${last},

Please see the following link to ${action} on troop690.org:

${accountLink.url}

Yours in Scouting,
${creatorFirst} ${creatorLast}
Troop 690`;

  const youthCC=
    !person.adult?
      (person.emergency_contacts||[])
        .map((p:any)=>
          String(p.email||'').trim()
        )
        .filter(Boolean):
      [];

  const to=String(
    person.email||''
  ).trim();

  const params=[
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body)}`
  ];

  if(youthCC.length){
    params.unshift(
      `cc=${encodeURIComponent(
        youthCC.join(',')
      )}`
    );
  }

  window.location.href=
    `mailto:${encodeURIComponent(to)}?`+
    params.join('&');
};

  const renderAccount=(x:any)=>{
    return <>
      <div>{accountStatus(x)}</div>

      {x.username&&
        !x.archived&&
        <small>
          {x.username}
        </small>
      }
    </>;
  };

  const renderOptions=(x:any)=>{
    return <div className="admin-action-row">
      {canEdit&&
        <button
          className="admin-action-button"
          onClick={()=>setEdit(x)}
        >
          Edit
        </button>
      }

      {canInvite&&
       !x.archived&&
       <button
          className="admin-action-button"
          onClick={()=>
            createLink(x)
          }
        >
          {x.active?
            'Link':
            'Link'
          }
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
    </div>;
  };

  const youth=
    rows.filter(
      x=>!Number(x.archived)&&!Number(x.adult)
    );

  const adults=
    rows.filter(
      x=>
        !Number(x.archived)&&
        Number(x.adult)&&
        !Number(x.adult_leader)
    );

  const leaders=
    rows.filter(
      x=>
        !Number(x.archived)&&
        Number(x.adult)&&
        Number(x.adult_leader)
    );

  const archived=
    rows.filter(
      x=>
        Number(x.archived)&&
        Number(x.eagle_scout_archive)
    );

  const youthTable=(
    <div className="member-table-wrap">
      <table className="member-table">
        <thead>
          <tr>
            <th>First</th>
            <th>Middle</th>
            <th>Last</th>
            <th>Suffix</th>
            <th>Gender</th>
            <th>DOB</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Address</th>
            <th>Rank</th>
            <th>Join</th>
            <th>Pack</th>
            <th>Patrol</th>
            <th>ID</th>
            <th>Registration</th>
            <th>Position</th>
            <th>OA</th>
            <th>Emergency Contacts</th>
            <th>Account</th>
            <th>Options</th>
          </tr>
        </thead>

        <tbody>
          {youth.map(x=>
            <tr key={x.id}>
              <td>{x.first_name||''}</td>
              <td>{x.middle_name||''}</td>
              <td>{x.last_name||''}</td>
              <td>{x.suffix||''}</td>
              <td>{x.gender||''}</td>
              <td style={dobStyle(x.dob)}>
                {x.dob||''}
              </td>
              <td>{x.phone||''}</td>
              <td>{x.email||''}</td>
              <td className="member-address-cell">
                {address(x)}
              </td>
              <td>{x.rank||''}</td>
              <td>{x.join_date||''}</td>
              <td>{x.cub_scout_pack||''}</td>
              <td>{x.patrol||''}</td>
              <td>{x.scouting_membership_id||''}</td>
              <td style={expirationStyle(x.registration_expiration)}>
                {x.registration_expiration||''}
              </td>
              <td className="member-position-cell">
                <div className="member-position-content">
                  {positions(x)}
                </div>
              </td>
              <td>
                {x.oa_member?'Yes':''}
              </td>
              <td>
                {emergencyContacts(x)}
              </td>
              <td>
                {renderAccount(x)}
              </td>
              <td>
                {renderOptions(x)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>);

  const adultTable=(
    <div className="member-table-wrap">
      <table className="member-table">
        <thead>
          <tr>
            <th>First</th>
            <th>Middle</th>
            <th>Last</th>
            <th>Suffix</th>
            <th>Gender</th>
            <th>DOB</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Address</th>
            <th>Account</th>
            <th>Options</th>
          </tr>
        </thead>

        <tbody>
          {adults.map(x=>
            <tr key={x.id}>
              <td>{x.first_name||''}</td>
              <td>{x.middle_name||''}</td>
              <td>{x.last_name||''}</td>
              <td>{x.suffix||''}</td>
              <td>{x.gender||''}</td>
              <td>{x.dob||''}</td>
              <td>{x.phone||''}</td>
              <td>{x.email||''}</td>
              <td className="member-address-cell">
                {address(x)}
              </td>
              <td>{renderAccount(x)}</td>
              <td>{renderOptions(x)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>);

  const leaderTable=(
    <div className="member-table-wrap">
      <table className="member-table">
        <thead>
          <tr>
            <th>Prefix</th>
            <th>First</th>
            <th>Middle</th>
            <th>Last</th>
            <th>Suffix</th>
            <th>Gender</th>
            <th>DOB</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Address</th>
            <th>Rank</th>
            <th>Join</th>
            <th>ID</th>
            <th>Registration</th>
            <th>SYT</th>
            <th>Position</th>
            <th>OA</th>
            <th>Account</th>
            <th>Options</th>
          </tr>
        </thead>

        <tbody>
          {leaders.map(x=>
            <tr key={x.id}>
              <td>{x.prefix||''}</td>
              <td>{x.first_name||''}</td>
              <td>{x.middle_name||''}</td>
              <td>{x.last_name||''}</td>
              <td>{x.suffix||''}</td>
              <td>{x.gender||''}</td>
              <td>{x.dob||''}</td>
              <td>{x.phone||''}</td>
              <td>{x.email||''}</td>
              <td className="member-address-cell">
                {address(x)}
              </td>
              <td>{x.rank||''}</td>
              <td>{x.join_date||''}</td>
              <td>{x.scouting_membership_id||''}</td>
              <td style={expirationStyle(x.registration_expiration)}>
                {x.registration_expiration||''}
              </td>
              
              <td style={sytExpirationStyle(x.syt_expiration)}>
                {x.syt_expiration||''}
              </td>
              <td className="member-position-cell">
                <div className="member-position-content">
                  {positions(x)}
                </div>
              </td>
              <td>
                {x.oa_member?'Yes':''}
              </td>
              <td>{renderAccount(x)}</td>
              <td>{renderOptions(x)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>);

  const archiveTable=(
    <div className="member-table-wrap">
      <table className="member-table">
        <thead>
          <tr>
            <th>First</th>
            <th>Middle</th>
            <th>Last</th>
            <th>Suffix</th>
            <th>Gender</th>
            <th>DOB</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Address</th>
            <th>Rank</th>
            <th>Join</th>
            <th>OA</th>
            <th>Options</th>
          </tr>
        </thead>

        <tbody>
          {archived.map(x=>
            <tr key={x.id}>
              <td>{x.first_name||''}</td>
              <td>{x.middle_name||''}</td>
              <td>{x.last_name||''}</td>
              <td>{x.suffix||''}</td>
              <td>{x.gender||''}</td>
              <td>{x.dob||''}</td>
              <td>{x.phone||''}</td>
              <td>{x.email||''}</td>
              <td className="member-address-cell">
                {address(x)}
              </td>
              <td>{x.rank||''}</td>
              <td>{x.join_date||''}</td>
              <td>
                {x.oa_member?'Yes':''}
              </td>
              <td>{renderOptions(x)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>);

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

        <button
          type="button"
          className="button"
          onClick={async()=>{
            try{
              const r=await fetch(
                '/api/admin/quick-text.csv',
                {credentials:'include'}
              );

              if(!r.ok){
                const text=await r.text();
                throw new Error(
                  text||`HTTP ${r.status}`
                );
              }

              const blob=await r.blob();
              const url=URL.createObjectURL(blob);
              const a=document.createElement('a');

              a.href=url;
              a.download='troop690-quick-text.csv';
              document.body.appendChild(a);
              a.click();
              a.remove();

              URL.revokeObjectURL(url);
            }catch(e:any){
              setMsg(e.message);
              setTimeout(
                ()=>setMsg(''),
                2200
              );
            }
          }}
        >
          Quick Text
        </button>

        <button
          type="button"
          className="button"
          onClick={async()=>{
            try{
              const r=await fetch(
                '/api/admin/emergency-contacts.csv',
                {credentials:'include'}
              );

              if(!r.ok){
                const text=await r.text();
                throw new Error(
                  text||`HTTP ${r.status}`
                );
              }

              const blob=await r.blob();
              const url=URL.createObjectURL(blob);
              const a=document.createElement('a');

              a.href=url;
              a.download=
                'troop690-emergency-contacts.csv';

              document.body.appendChild(a);
              a.click();
              a.remove();

              URL.revokeObjectURL(url);
            }catch(e:any){
              setMsg(e.message);
              setTimeout(
                ()=>setMsg(''),
                2200
              );
            }
          }}
        >
          Emergency Contacts
        </button>
      </div>
    }
  >
    {error&&
      <p className="error">{error}</p>
    }

    <div className="member-info-tabs">
      <button
        type="button"
        className={memberTab==='members'?'active':''}
        onClick={()=>setMemberTab('members')}
      >
        Members
      </button>

      <button
        type="button"
        className={memberTab==='families'?'active':''}
        onClick={()=>setMemberTab('families')}
      >
        Families
      </button>

      <button
        type="button"
        className={memberTab==='patrols'?'active':''}
        onClick={()=>setMemberTab('patrols')}
      >
        Patrols
      </button>
    </div>

    {memberTab==='members'?
      <>
        <section>
          <h2>Youth</h2>
          {youthTable}
        </section>

        <section>
          <h2>Adults</h2>
          {adultTable}
        </section>

        <section>
          <h2>Adult Leaders</h2>
          {leaderTable}
        </section>

        <section>
          <h2>Archived Eagle Scouts</h2>
          {archiveTable}
        </section>
      </>:
      memberTab==='families'?
        <Families canEdit={canEdit}/>:
        <Patrols canEdit={canEdit}/>
    }

    {(edit||adding)&&
      <MemberEditor
        value={adding?null:edit}
        onClose={()=>{
          setEdit(null);
          setAdding(false);
        }}
        onSaved={()=>{
          setEdit(null);
          setAdding(false);

          setMsg('Saved');
          setTimeout(
            ()=>setMsg(''),
            1800
          );

          load();
        }}
      />
    }

    {accountLink&&
      <div className="modal">
        <div className="modal-card">
          <h2>
            {accountLink.mode==='reset'?
              'Reset Password':
              'Account Link'
            }
          </h2>

          <p>
            {accountLink.mode==='reset'?
              'Use this link to let the member reset password.':
              'Use this link to let the member create account.'
            }
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
              type="button"
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
              type="button"
              onClick={sendAccountLinkEmail}
            >
              Send
            </button>

            <button
              type="button"
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

function Families({canEdit}:{canEdit:boolean}){
  const [data,setData]=useState<any>({
    unassigned:[],
    individuals:[],
    families:[]
  });

  const [dragged,setDragged]=useState<number|null>(null);
  const [error,setError]=useState('');

  const load=async()=>{
    try{
      const r=await api('/admin/families');
      setData(r);
    }catch(e:any){
      setError(e.message);
    }
  };

  useEffect(()=>{
    load();
  },[]);

  const assign=async(
    personId:number,
    familyId:number|null,
    individual:boolean
  )=>{
    try{
      const r=await post(
        '/admin/families/assign',
        {
          personId,
          familyId,
          individual
        }
      );

      setData(r);
      setDragged(null);
      setError('');
    }catch(e:any){
      setError(e.message);
    }
  };

  const newFamily=async()=>{
    try{
      const r=await post(
        '/admin/families',
        {}
      );

      setData(r);
      setError('');
    }catch(e:any){
      setError(e.message);
    }
  };

  const renameFamily=async(family:any)=>{
    const next=prompt(
      'Family name',
      family.name||''
    );

    if(next===null)
      return;

    const name=next.trim();

    if(!name||name===family.name)
      return;

    try{
      const r=await put(
        '/admin/families/'+family.id,
        {name}
      );

      setData(r);
      setError('');
    }catch(e:any){
      setError(e.message);
    }
  };

  const beginDrag=(e:any,id:number)=>{
    if(!canEdit)
      return;

    e.dataTransfer.effectAllowed='move';

    e.dataTransfer.setData(
      'text/plain',
      String(id)
    );

    setDragged(id);
  };

  const dropPerson=async(
    e:any,
    familyId:number|null,
    individual:boolean
  )=>{
    e.preventDefault();

    if(!canEdit)
      return;

    const id=Number(
      e.dataTransfer.getData('text/plain')
    );

    if(!Number.isInteger(id))
      return;

    await assign(
      id,
      familyId,
      individual
    );
  };

  const memberType=(p:any)=>
    Number(p.adult_leader)?
      'LEADER':
      Number(p.adult)?
        'ADULT':
        'YOUTH';

  const memberRow=(p:any)=>
    <tr key={p.id}>
      <td>
        <span
          className={
            canEdit?
              'family-drag-handle':
              'family-drag-handle disabled'
          }
          draggable={canEdit}
          onDragStart={e=>
            beginDrag(
              e,
              Number(p.id)
            )
          }
          onDragEnd={()=>
            setDragged(null)
          }
        >
          ☰
        </span>
        {p.first_name||''}
      </td>

      <td>{p.middle_name||''}</td>
      <td>{p.last_name||''}</td>
      <td>{memberType(p)}</td>
    </tr>;

  const memberTable=(
    people:any[],
    familyId:number|null,
    individual:boolean
  )=>
    <div
      className="family-table-wrap"
      onDragOver={e=>{
        if(canEdit)
          e.preventDefault();
      }}
      onDrop={e=>
        dropPerson(
          e,
          familyId,
          individual
        )
      }
    >
      <table className="family-member-table">
        <thead>
          <tr>
            <th>First</th>
            <th>Middle</th>
            <th>Last</th>
            <th>Type</th>
          </tr>
        </thead>

        <tbody>
          {people.map(memberRow)}
        </tbody>
      </table>
    </div>;

  return <div
    className={
      dragged!==null?
        'families-page is-dragging':
        'families-page'
    }
  >
    {error&&
      <p className="error">{error}</p>
    }

    <section className="family-section family-drop-section">
      <h2>Unassigned Members</h2>

      {memberTable(
        data.unassigned||[],
        null,
        false
      )}
    </section>

    <section className="family-section family-drop-section">
      <h2>Individual Members</h2>

      {memberTable(
        data.individuals||[],
        null,
        true
      )}
    </section>

    {canEdit&&
      <button
        type="button"
        className="new-family-placeholder"
        onClick={newFamily}
      >
        + New Family
      </button>
    }

    {(data.families||[]).map((family:any)=>
      <section
        className="family-section family-drop-section"
        key={family.id}
      >
        <div className="family-section-head">
          <h2>
            {family.name||'New Family'}
          </h2>

          {canEdit&&
            <button
              type="button"
              className="family-edit-button"
              title="Rename family"
              onClick={()=>
                renameFamily(family)
              }
            >
              ✎
            </button>
          }
        </div>

        {memberTable(
          family.members||[],
          Number(family.id),
          false
        )}
      </section>
    )}
  </div>;
}

const patrolPosition=(x:any)=>{
  const names=x.position_names||[];

  return names.filter(
    (p:string)=>
      p==='Senior Patrol Leader'||
      p==='Assistant Senior Patrol Leader'||
      p==='Patrol Leader'||
      p==='Assistant Patrol Leader'
  ).join(', ');
};

const patrolPriority=(x:any)=>{
  const names=x.position_names||[];

  if(names.includes('Patrol Leader'))
    return 0;

  if(names.includes('Assistant Patrol Leader'))
    return 1;

  return 2;
};

function patrolSort(a:any,b:any){
  return patrolPriority(a)-patrolPriority(b)||
    String(a.last_name||'').localeCompare(
      String(b.last_name||'')
    )||
    String(a.first_name||'').localeCompare(
      String(b.first_name||'')
    )||
    String(a.middle_name||'').localeCompare(
      String(b.middle_name||'')
    );
}

function Patrols({canEdit}:{canEdit:boolean}){
  const [data,setData]=useState<any>({
    unassigned:[],
    individuals:[],
    patrols:[]
  });

  const [dragged,setDragged]=useState<number|null>(null);
  const [error,setError]=useState('');
  const [renameId,setRenameId]=useState<number|null>(null);
  const [renameValue,setRenameValue]=useState('');

  const load=async()=>{
    try{
      const r=await api('/admin/patrols');

      setData(r);
      setError('');
    }catch(e:any){
      setError(e.message);
    }
  };

  useEffect(()=>{
    load();
  },[]);

  const move=async(
    personId:number,
    target:string
  )=>{
    try{
      const r=await post(
        '/admin/patrols/move',
        {
          personId,
          target
        }
      );

      setData(r);
      setDragged(null);
      setError('');
    }catch(e:any){
      setError(e.message);
      setDragged(null);
    }
  };

  const createPatrol=async()=>{
    try{
      const r=await post(
        '/admin/patrols',
        {}
      );

      setData(r);
      setError('');
    }catch(e:any){
      setError(e.message);
    }
  };

  const beginDrag=(e:any,id:number)=>{
    if(!canEdit)
      return;

    e.dataTransfer.effectAllowed='move';

    e.dataTransfer.setData(
      'text/plain',
      String(id)
    );

    setDragged(id);
  };

  const drop=async(
    e:any,
    target:string
  )=>{
    e.preventDefault();

    if(!canEdit)
      return;

    const id=Number(
      e.dataTransfer.getData(
        'text/plain'
      )
    );

    if(!Number.isInteger(id))
      return;

    await move(id,target);
  };

  const startRename=(p:any)=>{
    setRenameId(Number(p.id));
    setRenameValue(String(p.name||''));
  };

  const saveRename=async(id:number)=>{
    const name=renameValue.trim();

    if(!name)
      return;

    try{
      const r=await put(
        '/admin/patrols/'+id,
        {name}
      );

      setData(r);
      setRenameId(null);
      setRenameValue('');
      setError('');
    }catch(e:any){
      setError(e.message);
    }
  };

  const table=(
    members:any[],
    target:string
  )=>{
    const sortedMembers=[
      ...members
    ].sort(patrolSort);

    return (
      <div
        className="family-table-wrap"
        onDragOver={e=>{
          if(canEdit&&dragged!==null)
            e.preventDefault();
        }}
        onDrop={e=>
          drop(
            e,
            target
          )
        }
      >
        <table className="family-member-table patrol-member-table">
          <thead>
            <tr>
              <th>First</th>
              <th>Middle</th>
              <th>Last</th>
              <th>Rank</th>
              <th>Position</th>
            </tr>
          </thead>

          <tbody>
            {sortedMembers.map((p:any)=>
              <tr key={p.id}>
                <td>
                  <span
                    className={
                      canEdit?
                        'family-drag-handle':
                        'family-drag-handle disabled'
                    }
                    draggable={canEdit}
                    onDragStart={e=>
                      beginDrag(
                        e,
                        Number(p.id)
                      )
                    }
                    onDragEnd={()=>
                      setDragged(null)
                    }
                  >
                    ☰
                  </span>

                  {p.first_name||''}
                </td>

                <td>{p.middle_name||''}</td>
                <td>{p.last_name||''}</td>
                <td>{p.rank||''}</td>
                <td>{patrolPosition(p)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      className={
        dragged!==null?
          'families-page is-dragging':
          'families-page'
      }
    >
      {error&&
        <p className="error">{error}</p>
      }

      <section className="family-section family-drop-section">
        <h2>Unassigned Youth</h2>

        {table(
          data.unassigned||[],
          'unassigned'
        )}
      </section>

      <section className="family-section family-drop-section">
        <h2>Individual Youth</h2>

        {table(
          data.individuals||[],
          'individual'
        )}
      </section>

      {canEdit&&
        <button
          type="button"
          className="new-family-placeholder"
          onClick={createPatrol}
        >
          + New Patrol
        </button>
      }

      {(data.patrols||[]).map((p:any)=>
        <section
          className="family-section family-drop-section"
          key={p.id}
        >
          <div className="family-section-head">
            {renameId===Number(p.id)?
              <>
                <input
                  value={renameValue}
                  onChange={e=>
                    setRenameValue(
                      e.target.value
                    )
                  }
                  onKeyDown={e=>{
                    if(e.key==='Enter')
                      saveRename(
                        Number(p.id)
                      );

                    if(e.key==='Escape'){
                      setRenameId(null);
                      setRenameValue('');
                    }
                  }}
                  autoFocus
                />

                <button
                  type="button"
                  className="family-edit-button"
                  onClick={()=>
                    saveRename(
                      Number(p.id)
                    )
                  }
                >
                  Save
                </button>
              </>:
              <>
                <h2>{p.name}</h2>

                {canEdit&&
                  <button
                    type="button"
                    className="family-edit-button"
                    title="Rename patrol"
                    onClick={()=>
                      startRename(p)
                    }
                  >
                    ✎
                  </button>
                }
              </>
            }
          </div>

          {table(
            p.members||[],
            String(p.id)
          )}
        </section>
      )}
    </div>
  );
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

  const isArchivedEagle=
    !!value?.eagle_scout_archive&&
    !!value?.archived;

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
  const [err,setErr]=useState('');

  useEffect(()=>{
    api('/admin/member-positions')
      .then(r=>setPositions(r.positions||[]))
      .catch((e:any)=>setErr(e.message));
  },[]);

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

  const setAdult=(checked:boolean)=>{
    if(!checked){
      setX((v:any)=>({
        ...v,
        adult:false,
        adult_leader:false,
        rank:'',
        cub_scout_pack:'',
        patrol:'',
        position_ids:[]
      }));

      return;
    }

    setX((v:any)=>({
      ...v,
      adult:true,
      adult_leader:false,
      rank:
        v.rank==='Eagle Scout'?
          v.rank:
          '',
      cub_scout_pack:'',
      patrol:'',
      position_ids:[]
    }));
  };

  const setAdultLeader=(checked:boolean)=>{
    setX((v:any)=>({
      ...v,
      adult_leader:checked,
      position_ids:[]
    }));
  };

  const youthRanks=[
    'Scout',
    'Tenderfoot',
    'Second Class',
    'First Class',
    'Star',
    'Life',
    'Eagle Scout'
  ];

  const adultRanks=[
    'Eagle Scout'
  ];

  const availablePositions=positions.filter(
    (p:any)=>
      x.adult?
        x.adult_leader?
          p.category==='adult':
          false:
        p.category==='youth'
  );

  const formatPhone=(value:string)=>{
    const digits=value.replace(/\D/g,'').slice(0,10);
  
    if(!digits)
      return '';
  
    if(digits.length<=3)
      return `(${digits}`;
  
    if(digits.length<=6)
      return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
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

        if(
          x.adult &&
          x.rank &&
          x.rank!=='Eagle Scout'
        ){
          setErr(
            'Adults may only have Eagle Scout as a rank.'
          );
          return;
        }

        if(
          !isNew &&
          x.eagle_scout_archive &&
          !value?.eagle_scout_archive
        ){
          const confirmed=confirm(
            'Are you sure you want to move this member to the Eagle Scout Archive?'
          );

          if(!confirmed)
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

      {!isArchivedEagle&&
      <div className="member-form-card">
        <div className="member-check-grid">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!x.adult}
                onChange={e=>
                  setAdult(
                    e.target.checked
                  )
                }
              />
              Adult
            </label>

          {!!x.adult&&!isArchivedEagle&&
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!x.adult_leader}
                onChange={e=>
                  setAdultLeader(
                    e.target.checked
                  )
                }
              />
              Adult Leader
            </label>
          }
        </div>
      </div>
      }

      <div className="member-form-card">
        <div className="member-name-grid">
          {!!x.adult && !!x.adult_leader &&
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
                <option value="Msgr.">Msgr.</option>
              </select>
            </label>
          }

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
              value={x.gender||''}
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
              inputMode="numeric"
              maxLength={14}
              value={formatPhone(x.phone||'')}
              onChange={e=>
                setX({
                  ...x,
                  phone:formatPhone(e.target.value)
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

      {!x.adult || x.adult_leader || isArchivedEagle ? (
      <div className="member-form-card">
        <div className="member-scouting-grid">
          <label>
            Rank
            <select
              value={x.rank||''}
              onChange={e=>
                setX({
                  ...x,
                  rank:e.target.value
                })
              }
            >
              <option value=""></option>

              {(x.adult?
                adultRanks:
                youthRanks
              ).map(r=>
                <option
                  key={r}
                  value={r}
                >
                  {r}
                </option>
              )}
            </select>
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

          {(!x.adult || isArchivedEagle)&&
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
          }

          {!isArchivedEagle&&
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
          }

          {!isArchivedEagle&&
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
          }

          {!!x.adult && !!x.adult_leader &&
  <label>
    SYT Expiration
    <input
      type="date"
      value={x.syt_expiration||''}
      onChange={e=>
        setX({
          ...x,
          syt_expiration:e.target.value
        })
      }
    />
  </label>
}
        </div>
      </div>
      ) : null}

      {availablePositions.length>0&&
        <div className="member-form-card">
          <div className="member-position-list">
            {availablePositions.map(p=>
              <label
                key={p.id}
                className="checkbox-label"
              >
                <input
                  type="checkbox"
                  checked={x.position_ids.includes(
                    Number(p.id)
                  )}
                  disabled={
                    p.code==='ADMIN'&&
                    Number(x.id)===Number(x.site_administrator_id)
                  }
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
      }

      <div className="member-form-card">
        <div className="member-check-grid">
          {!isArchivedEagle&&
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
          }

          {(!x.adult || x.adult_leader || isArchivedEagle) &&
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
          }
          {(!isNew&&
            (!x.adult || x.adult_leader || isArchivedEagle)
          )&&
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
        }
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
  const [siteAdministrators,setSiteAdministrators]=useState<any[]>([]);
  const [siteAdministratorId,setSiteAdministratorId]=useState<number|null>(null);
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
      const [sa,a]=await Promise.all([
        api('/admin/site-administrator'),
        api('/admin/account-logins')
      ]);

      setSiteAdministrators(
        (sa.administrators||[]).sort((x:any,y:any)=>
          `${x.first_name} ${x.last_name}`.localeCompare(
            `${y.first_name} ${y.last_name}`
          )
        )
      );

      setSiteAdministratorId(
        sa.siteAdministratorId==null?
          null:
          Number(sa.siteAdministratorId)
      );

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
        <h2>Site Administrator</h2>

        <div className="site-admin-card">
          <label>
            Site Administrator
            <select
              value={siteAdministratorId??''}
              onChange={async e=>{
                try{
                  const personId=Number(e.target.value);

                  await put(
                    '/admin/site-administrator',
                    {personId}
                  );

                  setSiteAdministratorId(personId);

                  setMsg('Saved');
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
              {siteAdministrators.map(x=>
                <option
                  key={x.id}
                  value={x.id}
                >
                  {x.first_name} {x.last_name}
                </option>
              )}
            </select>
          </label>
        </div>
      </section>
    }

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
