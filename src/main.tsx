import React,{
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useNavigate,useLocation} from 'react-router-dom';
import './styles.css';
import {api,post,put} from './lib/api';

const nav=[['/','Home','public'],['/eagles','Eagle Scouts','public'],['/calendar','Calendar','CAL'],['/photos','Photos','PHV'],['/leadership','Leadership','public'],['/advancement','Advancement','public'],['/summer-camp','Summer Camp','public'],['/uniform','Scout Uniform','public']];
const adminNav=[['/email','Email','EML'],['/member-info','Member Info','MIV'],['/administration','Administration','__ADMIN_ROLE__']];

function App(){
  const [actualMe,setActualMe]=useState<any>(null);
  const [viewAs,setViewAs]=useState('Administrator');
  const [viewAsPermissions,setViewAsPermissions]=
    useState<Record<string,string[]>>({});
  const [authReady,setAuthReady]=useState(false);
  const [open,setOpen]=useState<'account'|'nav'|null>(null);
  const [viewAsOpen,setViewAsOpen]=useState(false);
  const [viewAsChoice,setViewAsChoice]=useState('Administrator');
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
    viewAs==='Guest'?
      null:
      {
        ...actualMe,
        isAdministrator:false,
        permissions:
          viewAsPermissions[
            viewAs==='Adult Leader'?
              'ADULTL':
            viewAs.toUpperCase()
          ]||[],
        person:actualMe.person
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
      actualMe?navg('/update-info'):navg('/login')
    }}>
      {actualMe?'Update Info':'Log In'}
    </button>

{actualMe?.isAdministrator&&
  <button
    onClick={()=>{
      setOpen(null);
      setViewAsChoice(viewAs);
      setViewAsOpen(true);
    }}
  >
    View As
  </button>
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

{viewAsOpen&&
  <div
    className="modal-backdrop"
    onMouseDown={e=>{
      if(e.target===e.currentTarget)
        setViewAsOpen(false);
    }}
  >
    <div className="modal-card">
      <div className="modal-header">
        <h2>View As</h2>

        <button
          type="button"
          className="modal-close"
          aria-label="Close"
          onClick={()=>{
            setViewAsChoice(viewAs);
            setViewAsOpen(false);
          }}
        >
          ×
        </button>
      </div>

      <form
        className="form"
        onSubmit={e=>{
          e.preventDefault();
          setViewAs(viewAsChoice);
          setViewAsOpen(false);
        }}
      >
        <label>
          View as
          <select
            value={viewAsChoice}
            onChange={e=>
              setViewAsChoice(e.target.value)
            }
          >
            <option value="Guest">Guest</option>
            <option value="Youth">Youth</option>
            <option value="Adult">Adult</option>
            <option value="Adult Leader">Adult Leader</option>
            <option value="Administrator">Administrator</option>
          </select>
        </label>

        <div className="button-row">
          <button className="primary">
            Apply
          </button>

          <button
            type="button"
            onClick={()=>{
              setViewAsChoice(viewAs);
              setViewAsOpen(false);
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
}
    
    <main>
      <RouterPage me={me} setMe={setActualMe} authReady={authReady}/>
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
    '/update-info':'SET',
    '/calendar':'CAL',
    '/photos':'PHV',
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
  if(p==='/update-info')return <UpdateInfo me={me}/>;
  if(p==='/eagles')return <Eagles me={me}/>;
  if(p==='/calendar')return <Calendar me={me}/>;
  if(p.startsWith('/calendar/'))
    return <CalendarEvent
      id={p.split('/')[2]}
      me={me}
      edit={p.split('/')[3]==='edit'}
    />;
  if(p==='/photos')return <Photos me={me}/>;
  if(p.startsWith('/photos/'))
    return <PhotoAlbum
      id={p.split('/')[2]}
      me={me}
    />;
  if(p==='/leadership')return <Leadership me={me}/>;
  if(p==='/advancement')return <Advancement/>;
  if(p==='/summer-camp')return <SummerCamp/>;
  if(p==='/uniform')return <Uniform/>;
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
  title?:string,
  children:React.ReactNode,
  actions?:React.ReactNode
}){
  return <section className="page">
    {(title||actions)&&
      <div className="page-head">
        {title&&<h1>{title}</h1>}
        {actions}
      </div>
    }
    {children}
  </section>
}

function Loading(){
  return <div className="muted"></div>
}

function Home({me}:{me:any}){
  const eventTypeClass=(type:string)=>{
    return (
      'calendar-event calendar-event-' +
      String(type||'Other')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g,'-')
    );
  };

  const [d,setD]=useState<any>();
  const [error,setError]=useState('');
  const [showAnnouncementModal,setShowAnnouncementModal]=useState(false);
  const [announcementTitle,setAnnouncementTitle]=useState('');
  const [announcementBody,setAnnouncementBody]=useState('');
  const [announcementError,setAnnouncementError]=useState('');
  const [editingAnnouncement,setEditingAnnouncement]=useState<any>(null);
  const [editingHistory,setEditingHistory]=useState(false);
  const [showHistoryModal,setShowHistoryModal]=useState(false);
  const [historyYear,setHistoryYear]=useState('');
  const [historyStatement,setHistoryStatement]=useState('');
  const [historyPriority,setHistoryPriority]=useState('');
  const [historyError,setHistoryError]=useState('');

  useEffect(()=>{
    api('/home')
      .then(setD)
      .catch((e:any)=>setError(e?.message||'Unable to load the homepage.'));
  },[]);

  if(error)
    return <Page><p className="error">{error}</p></Page>;

  if(!d)
    return <Page><Loading/></Page>;

  return <Page>
    <div className="hero-image">
      <img
        src="/images/home/troop-690.png"
        alt="Troop 690"
      />
    </div>

        <section className="card home-contact-card">
      <h2>Contact</h2>

      {!me?
        <>
          <div className="home-contact-option">
            <div>
              <h3>Interested in Joining?</h3>
            </div>
            <a
              className="button"
              href="mailto:committee@troop690.org?cc=scoutmaster@troop690.org"
            >
              committee@troop690.org
            </a>
          </div>

          <div className="home-contact-option">
            <div>
              <h3>Any Questions?</h3>
            </div>
            <a
              className="button"
              href="mailto:scoutmaster@troop690.org?cc=committee@troop690.org"
            >
              scoutmaster@troop690.org
            </a>
          </div>

          <div className="home-contact-option">
            <div>
              <h3>Website Help</h3>
            </div>
            <a
              className="button"
              href="mailto:website@troop690.org?cc=scoutmaster@troop690.org"
            >
              website@troop690.org
            </a>
          </div>
        </>:
        <>
          <div className="home-contact-option">
            <div>
              <h3>Any Questions?</h3>
            </div>
            <a
              className="button"
              href="mailto:scoutmaster@troop690.org?cc=committee@troop690.org"
            >
              scoutmaster@troop690.org
            </a>
          </div>

          <div className="home-contact-option">
            <div>
              <h3>Website Feedback</h3>
            </div>
            <a
              className="button"
              href="mailto:website@troop690.org?cc=scoutmaster@troop690.org"
            >
              website@troop690.org
            </a>
          </div>
        </>
      }
    </section>
    
    {me&&
    <section className="card home-announcements-card">
      <div className="home-section-head">
        <h2>Announcements</h2>

        {me?.permissions?.includes('HOME')&&
          <button
            type="button"
            className="home-add-button"
            aria-label="Add announcement"
            onClick={()=>{
setEditingAnnouncement(null);
setAnnouncementTitle('');
setAnnouncementBody('');
setAnnouncementError('');
setShowAnnouncementModal(true);
            }}
          >
            +
          </button>
        }
      </div>

      {d.announcements?.length?
        d.announcements.map((a:any)=>
<div className="home-announcement" key={a.id}>
  <div className="home-announcement-head">
    <h3>{a.title}</h3>

    {me?.permissions?.includes('HOME')&&
      <div className="home-announcement-actions">
        <button
          type="button"
          className="button"
          onClick={()=>{
            setEditingAnnouncement(a);
            setAnnouncementTitle(a.title);
            setAnnouncementBody(a.body);
            setAnnouncementError('');
            setShowAnnouncementModal(true);
          }}
        >
          Edit
        </button>

        <button
          type="button"
          className="button"
          onClick={async()=>{
            if(!window.confirm(
              `Delete the announcement "${a.title}"?`
            ))
              return;

            try{
              await api(
                `/admin/announcements/${a.id}`,
                {method:'DELETE'}
              );

              const fresh=await api('/home');
              setD(fresh);
            }catch(e:any){
              setAnnouncementError(
                e?.message||
                'Unable to delete the announcement.'
              );
            }
          }}
        >
          Delete
        </button>
      </div>
    }
  </div>

  <p>{a.body}</p>
</div>
        ):
        <p className="muted">There are no current announcements.</p>
      }
    </section>
    }
        
    {me&&
      <>
        <section className="card">
          <h2>Upcoming Events</h2>

          {(()=>{
            const pad=(n:number)=>
              String(n).padStart(2,'0');

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

            const dateKey=(value:Date)=>{
              return `${value.getFullYear()}-${
                pad(value.getMonth()+1)
              }-${pad(value.getDate())}`;
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

            const today=dateOnly(new Date());

            const days=
              Array.from(
                {length:7},
                (_,i)=>
                  new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()+i
                  )
              );

            const eventsForDay=(date:Date)=>
              (d.events||[])
                .filter((e:any)=>{
                  const start=
                    dateOnly(e.start_at);

                  const end=
                    e.end_at?
                      dateOnly(e.end_at):
                      start;

                  return (
                    date.getTime()>=start.getTime()&&
                    date.getTime()<=end.getTime()
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

            const cutoff=
              new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()+7
              );

            const laterEvents=
              (d.events||[])
                .filter((e:any)=>{
                  const start=
                    dateOnly(e.start_at);

                  return start.getTime()>=cutoff.getTime();
                })
                .sort((a:any,b:any)=>{
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
                })
                .slice(0,3);

            return <>
              <div className="calendar-grid-wrap">
                <div className="calendar-grid">
                
                  {days.map(day=>
                    <div
                      className="calendar-weekday"
                      key={'weekday-'+dateKey(day)}
                    >
                      {day.toLocaleDateString(
                        'en-US',
                        {
                          weekday:'short'
                        }
                      )}
                    </div>
                  )}
                
                  {days.map(day=>{
                    const events=
                      eventsForDay(day);
                
                    return <div
                      className="calendar-day calendar-day-current"
                      key={dateKey(day)}
                    >
                      <div className="calendar-day-number">
                        {day.getDate()}
                      </div>
                
                      <div className="calendar-day-events">
                        {events.map((e:any)=>{
                          const info=
                            eventInfo(
                              e,
                              day
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
                    </div>;
                  })}
                
                </div>
              </div>

              {laterEvents.length>0&&
                <div className="home-later-events">
                  {laterEvents.map((e:any)=>
                    <a
                      href={'/calendar/'+e.id}
                      className={
                        eventTypeClass(
                          e.event_type
                        )+
                        ' home-later-event'
                      }
                      key={e.id}
                    >
                      <b>{e.title}</b>

                      <span>
                        {Number(e.all_day)?
                          'All Day':
                          `${new Date(e.start_at).toLocaleDateString(
                            'en-US',
                            {
                              month:'numeric',
                              day:'numeric'
                            }
                          )} · ${formatTime(e.start_at)}`
                        }
                      </span>
                    </a>
                  )}
                </div>
              }
            </>;
          })()}
        </section>

        <section className="card">
          <h2>Recent Photos</h2>
          {d.recent.length?
            <div className="home-photo-grid">
              {d.recent.map((e:any)=>
                <a
                  className="home-photo-card"
                  key={e.id}
                  href={'/photos/'+e.id}
                >
                  {e.photo&&
                    <img
                      className="home-photo-card-image"
                      src={'/files/'+e.photo}
                      alt=""
                    />
                  }

                  <div className="home-photo-card-date">
                    {new Date(
                      e.start_at
                    ).toLocaleDateString(
                      'en-US',
                      {
                        month:'numeric',
                        day:'numeric',
                        year:'numeric'
                      }
                    )}
                  </div>

                  <div
                    className={
                      'home-photo-card-title '+
                      eventTypeClass(
                        e.event_type
                      )
                    }
                  >
                    {e.title}
                  </div>
                </a>
              )}
            </div>:
            <p className="muted">No photos.</p>
          }
        </section>
      </>
    }

{me&&
  <section className="card home-history-card">
    <div className="home-section-head">
      <h2>History</h2>

      {me?.permissions?.includes('HOME')&&
        <div className="home-history-controls">
          {editingHistory&&
            <button
              type="button"
              className="home-add-button"
              aria-label="Add history entry"
              onClick={()=>{
                setHistoryYear('');
                setHistoryStatement('');
                setHistoryPriority('');
                setHistoryError('');
                setShowHistoryModal(true);
              }}
            >
              +
            </button>
          }

          <button
            type="button"
            className="home-edit-button"
            aria-label={
              editingHistory?
                'Done editing history':
                'Edit history'
            }
            onClick={()=>{
              setEditingHistory(
                !editingHistory
              );
            }}
          >
            {editingHistory?'✓':'✎'}
          </button>
        </div>
      }
    </div>

    {d.history?.length?
      (()=>{

        const groups:any[]=[];

        for(const entry of d.history){
          const year=Number(entry.year);

          let group=
            groups.find(
              x=>x.year===year
            );

          if(!group){
            group={
              year,
              entries:[]
            };

            groups.push(group);
          }

          group.entries.push(entry);
        }

        return groups.map(group=>
          <div
            className="home-history-year"
            key={group.year}
          >
            <h3>{group.year}</h3>

            {group.entries.map((entry:any)=>
              <div
                className="home-history-entry"
                key={entry.id}
              >
                <p>{entry.statement}</p>

                {editingHistory&&
                  <button
                    type="button"
                    className="home-history-delete-button"
                    aria-label={
                      `Delete history entry: ${entry.statement}`
                    }
                    onClick={async()=>{
                      if(!window.confirm(
                        'Delete this history entry?'
                      ))
                        return;

                      try{
                        await api(
                          `/admin/history/${entry.id}`,
                          {method:'DELETE'}
                        );

                        const fresh=
                          await api('/home');

                        setD(fresh);
                      }catch(e:any){
                        setHistoryError(
                          e?.message||
                          'Unable to delete the history entry.'
                        );
                      }
                    }}
                  >
                    −
                  </button>
                }
              </div>
            )}
          </div>
        );

      })():
      <p className="muted">
        There is no troop history currently listed.
      </p>
    }

    {historyError&&
      <p className="error">
        {historyError}
      </p>
    }
  </section>
}
      
        {showAnnouncementModal&&
      <div
        className="modal-backdrop"
        onMouseDown={e=>{
          if(e.target===e.currentTarget)
            setShowAnnouncementModal(false);
        }}
      >
        <div
          className="modal-card announcement-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-modal-title"
        >
          <div className="modal-header">
<h2 id="announcement-modal-title">
  {editingAnnouncement?'Edit Announcement':'Add Announcement'}
</h2>

            <button
              type="button"
              className="modal-close"
              aria-label="Close"
onClick={()=>{
  setEditingAnnouncement(null);
  setAnnouncementTitle('');
  setAnnouncementBody('');
  setAnnouncementError('');
  setShowAnnouncementModal(false);
}}
            >
              ×
            </button>
          </div>

          <form
            className="form"
            onSubmit={async e=>{
              e.preventDefault();
              setAnnouncementError('');

              try{
if(editingAnnouncement){
  await api(
    `/admin/announcements/${editingAnnouncement.id}`,
    {
      method:'PUT',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        title:announcementTitle,
        body:announcementBody
      })
    }
  );
}else{
  await post(
    '/admin/announcements',
    {
      title:announcementTitle,
      body:announcementBody
    }
  );
}

                const fresh=await api('/home');
                setD(fresh);

                setShowAnnouncementModal(false);
                setEditingAnnouncement(null);
                setAnnouncementTitle('');
                setAnnouncementBody('');
              }catch(e:any){
                setAnnouncementError(
                  e?.message||
                  'Unable to add the announcement.'
                );
              }
            }}
          >
            <label>
              Title
              <input
                value={announcementTitle}
                onChange={e=>
                  setAnnouncementTitle(e.target.value)
                }
                required
              />
            </label>

            <label>
              Body
              <textarea
                value={announcementBody}
                onChange={e=>
                  setAnnouncementBody(e.target.value)
                }
                rows={8}
                required
              />
            </label>

            {announcementError&&
              <p className="error">
                {announcementError}
              </p>
            }

            <div className="button-row">
              <button
                type="submit"
                className="primary"
              >
                Add Announcement
              </button>

<button
  type="button"
  onClick={()=>{
    setEditingAnnouncement(null);
    setAnnouncementTitle('');
    setAnnouncementBody('');
    setAnnouncementError('');
    setShowAnnouncementModal(false);
  }}
>
  Cancel
</button>
            </div>
          </form>
        </div>
      </div>
    }

    {showHistoryModal&&
  <div
    className="modal-backdrop"
    onMouseDown={e=>{
      if(e.target===e.currentTarget)
        setShowHistoryModal(false);
    }}
  >
    <div
      className="modal-card announcement-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div className="modal-header">
        <h2 id="history-modal-title">
          Add History Entry
        </h2>

        <button
          type="button"
          className="modal-close"
          aria-label="Close"
          onClick={()=>{
            setHistoryError('');
            setShowHistoryModal(false);
          }}
        >
          ×
        </button>
      </div>

      <form
        className="form"
        onSubmit={async e=>{
          e.preventDefault();
          setHistoryError('');

          try{
            await post(
              '/admin/history',
              {
                year:Number(historyYear),
                statement:historyStatement,
                priority:Number(historyPriority)
              }
            );

            const fresh=await api('/home');
            setD(fresh);

            setHistoryYear('');
            setHistoryStatement('');
            setHistoryPriority('');
            setShowHistoryModal(false);
          }catch(e:any){
            setHistoryError(
              e?.message||
              'Unable to add the history entry.'
            );
          }
        }}
      >
        <label>
          Year
          <input
            type="number"
            min="1"
            step="1"
            value={historyYear}
            onChange={e=>
              setHistoryYear(e.target.value)
            }
            required
          />
        </label>

        <label>
          Event
          <textarea
            value={historyStatement}
            onChange={e=>
              setHistoryStatement(e.target.value)
            }
            rows={5}
            required
          />
        </label>

        <label>
          Priority
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={historyPriority}
            onChange={e=>
              setHistoryPriority(e.target.value)
            }
            required
          />
        </label>

        {historyError&&
          <p className="error">
            {historyError}
          </p>
        }

        <div className="button-row">
          <button
            type="submit"
            className="primary"
          >
            Add History Entry
          </button>

          <button
            type="button"
            onClick={()=>{
              setHistoryError('');
              setShowHistoryModal(false);
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
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

function UpdateInfo({me}:{me:any}){
  const [rows,setRows]=useState<any[]>([]);
  const [values,setValues]=useState<Record<number,any>>({});
  const [error,setError]=useState('');
  const [saved,setSaved]=useState(false);

  const load=async()=>{
    try{
      const x=await api('/update-info');

      const members=x.members||[];

      setRows(members);

      const next:any={};

      members.forEach((m:any)=>{
        next[m.id]={
          phone:m.phone||'',
          email:m.email||'',
          street:m.street||'',
          town:m.town||'',
          zip:m.zip||''
        };
      });

      setValues(next);
    }catch(e:any){
      setError(e.message);
    }
  };

  useEffect(()=>{
    if(me)
      load();
  },[me]);

  const formatPhone=(value:string)=>{
    const digits=
      value
        .replace(/\D/g,'')
        .slice(0,10);

    if(!digits)
      return '';

    if(digits.length<=3)
      return `(${digits}`;

    if(digits.length<=6)
      return `(${digits.slice(0,3)}) ${digits.slice(3)}`;

    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  };

  const suffixRank=(suffix:string)=>{
    const value=
      String(suffix||'')
        .trim()
        .toUpperCase();

    if(value==='SR.')
      return 0;

    if(value==='JR.')
      return 1;

    const roman:any={
      I:2,
      II:3,
      III:4,
      IV:5,
      V:6,
      VI:7,
      VII:8,
      VIII:9,
      IX:10,
      X:11
    };

    if(value in roman)
      return roman[value];

    return 100;
  };

  const displayName=(m:any)=>{
    return [
      m.prefix,
      m.first_name,
      m.middle_name,
      m.last_name,
      m.suffix
    ]
      .map((x:any)=>String(x||'').trim())
      .filter(Boolean)
      .join(' ');
  };

  const sortedRows=
    [...rows].sort((a:any,b:any)=>
      String(a.last_name||'').localeCompare(
        String(b.last_name||'')
      )||
      String(a.first_name||'').localeCompare(
        String(b.first_name||'')
      )||
      String(a.middle_name||'').localeCompare(
        String(b.middle_name||'')
      )||
      suffixRank(a.suffix)-
      suffixRank(b.suffix)
    );

  if(!me)
    return <Login setMe={()=>{}}/>;

  return <Page title="Update Info">

    {error&&
      <p className="error">{error}</p>
    }

    {sortedRows.map((member:any)=>
      <section
        className="update-info-member"
        key={member.id}
      >
        <h2>{displayName(member)}</h2>

        <div className="member-form-card">
          <div className="member-info-grid">
            <label>
              Phone
              <input
                type="tel"
                inputMode="numeric"
                maxLength={14}
                value={formatPhone(
                  values[member.id]?.phone||''
                )}
                onChange={e=>
                  setValues({
                    ...values,
                    [member.id]:{
                      ...values[member.id],
                      phone:formatPhone(
                        e.target.value
                      )
                    }
                  })
                }
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={
                  values[member.id]?.email||''
                }
                onChange={e=>
                  setValues({
                    ...values,
                    [member.id]:{
                      ...values[member.id],
                      email:e.target.value
                    }
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
                value={
                  values[member.id]?.street||''
                }
                onChange={e=>
                  setValues({
                    ...values,
                    [member.id]:{
                      ...values[member.id],
                      street:e.target.value
                    }
                  })
                }
              />
            </label>

            <label>
              Town
              <input
                value={
                  values[member.id]?.town||''
                }
                onChange={e=>
                  setValues({
                    ...values,
                    [member.id]:{
                      ...values[member.id],
                      town:e.target.value
                    }
                  })
                }
              />
            </label>

            <label>
              ZIP Code
              <input
                value={
                  values[member.id]?.zip||''
                }
                onChange={e=>
                  setValues({
                    ...values,
                    [member.id]:{
                      ...values[member.id],
                      zip:e.target.value
                    }
                  })
                }
              />
            </label>
          </div>
        </div>
      </section>
    )}

    <div className="button-row">
      <button
        className="primary"
        onClick={async()=>{
          setError('');

          try{
            await put(
              '/update-info',
              {
                members:sortedRows.map(
                  (member:any)=>({
                    id:member.id,
                    ...(values[member.id]||{})
                  })
                )
              }
            );

            setSaved(true);

            window.setTimeout(()=>{
              setSaved(false);
            },2000);
          }catch(e:any){
            setError(e.message);
          }
        }}
      >
        Save
      </button>
    </div>

    {saved&&
      <div className="toast">
        Saved
      </div>
    }

  </Page>
}

function Eagles({me}:{me:any}){
  const [q,setQ]=useState('');
  const [rows,setRows]=useState<any[]>([]);
  const [error,setError]=useState('');
  const [loaded,setLoaded]=useState(false);

  const [editing,setEditing]=useState(false);
  const [showAdd,setShowAdd]=useState(false);

  const [eagleYear,setEagleYear]=useState('');
  const [firstName,setFirstName]=useState('');
  const [middleName,setMiddleName]=useState('');
  const [lastName,setLastName]=useState('');
  const [suffix,setSuffix]=useState('');
  const [modalError,setModalError]=useState('');

  const [draggedId,setDraggedId]=
    useState<number|null>(null);

  const eagleGridRef=
  useRef<HTMLDivElement|null>(null);

const [
  eagleCardMinWidth,
  setEagleCardMinWidth
]=useState(210);

const [
  eagleCardMeasured,
  setEagleCardMeasured
]=useState(false);

  const canEdit=
    !!me?.isAdministrator||
    !!me?.permissions?.includes('EAGLE');

  useEffect(()=>{
    const grid=
      eagleGridRef.current;
  
    if(!grid)
      return;
  
    const measure=()=>{
if(
  window.matchMedia(
    '(max-width:800px)'
  ).matches
){
  setEagleCardMinWidth(0);
  setEagleCardMeasured(true);
  return;
}
  
      const cards=
        Array.from(
          grid.querySelectorAll(
            '.eagle-year-card'
          )
        ) as HTMLElement[];
  
      if(!cards.length)
        return;
  
        const measurements=
          cards.map(card=>{
            const clone =
              card.cloneNode(true) as HTMLElement;
  
          clone.style.position=
            'absolute';
  
          clone.style.visibility=
            'hidden';
  
          clone.style.width=
            'max-content';
  
          clone.style.minWidth=
            'max-content';
  
          clone.style.maxWidth=
            'none';
  
          clone.style.left=
            '-100000px';
  
          clone.style.top=
            '0';
  
          clone.style.boxSizing=
            'border-box';
  
          clone.style.whiteSpace=
            'nowrap';
  
          clone.querySelectorAll(
            '.eagle-entry-name'
          ).forEach(
            node=>{
              const el=
                node as HTMLElement;
  
              el.style.whiteSpace=
                'nowrap';
  
              el.style.overflowWrap=
                'normal';
            }
          );
  
          document.body.appendChild(
            clone
          );
  
          const width=
            Math.ceil(
              clone.getBoundingClientRect()
                .width
            );
  
          clone.remove();
  
          return width;
        });
  
      const widest=
        Math.max(
          210,
          ...measurements
        );
  
      setEagleCardMinWidth(
        widest
      );
      
      setEagleCardMeasured(true);
    };
  
    measure();
  
    const observer=
      new ResizeObserver(
        measure
      );
  
    observer.observe(grid);
  
    window.addEventListener(
      'resize',
      measure
    );
  
    return()=>{
      observer.disconnect();
  
      window.removeEventListener(
        'resize',
        measure
      );
    };
  },[
    rows,
    editing,
    q
  ]);

  const load=async()=>{
    try{
      setLoaded(false);
      setError('');

      const x=await api(
        '/eagles'+
        (
          q?
            `?q=${encodeURIComponent(q)}`:
            ''
        )
      );

      setRows(x.eagles??[]);
      setLoaded(true);
    }catch(e:any){
      setError(
        e?.message||
        'Unable to load Eagle Scouts.'
      );
    }
  };

  useEffect(()=>{
    load();
  },[q]);

  const formatName=(e:any)=>{
    return [
      e.first_name,
      e.middle_name,
      e.last_name,
      e.suffix
    ]
      .map(
        (x:any)=>
          String(x||'').trim()
      )
      .filter(Boolean)
      .join(' ');
  };

  const groups=new Map<number,any[]>();

  for(const eagle of rows){
    const year=
      Number(eagle.eagle_year);

    if(!groups.has(year))
      groups.set(year,[]);

    groups.get(year)!.push(eagle);
  }

  for(const list of groups.values()){
    list.sort(
      (a:any,b:any)=>
        Number(b.eagle_number)-
        Number(a.eagle_number)
    );
  }

  const orderedYears=
    Array.from(groups.keys())
      .sort((a,b)=>b-a);

  const openAdd=()=>{
    setEagleYear('');
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setSuffix('');
    setModalError('');
    setShowAdd(true);
  };

  const closeAdd=()=>{
    setShowAdd(false);
    setModalError('');
  };

  const reorderEagles=async(
    targetId:number,
    targetYear:number
  )=>{
    if(draggedId==null)
      return;

    if(draggedId===targetId){
      setDraggedId(null);
      return;
    }

    if(q){
      setDraggedId(null);
      return;
    }

    const ordered=
      [...rows]
        .sort(
          (a:any,b:any)=>
            Number(b.eagle_number)-
            Number(a.eagle_number)
        );

    const fromIndex=
      ordered.findIndex(
        (e:any)=>
          Number(e.id)===
          draggedId
      );

    const targetIndex=
      ordered.findIndex(
        (e:any)=>
          Number(e.id)===
          targetId
      );

    if(
      fromIndex<0||
      targetIndex<0
    ){
      setDraggedId(null);
      return;
    }

    const [
      moved
    ]=ordered.splice(
      fromIndex,
      1
    );

    moved.eagle_year=
      targetYear;

    const insertIndex=
      ordered.findIndex(
        (e:any)=>
          Number(e.id)===
          targetId
      );

    ordered.splice(
      insertIndex,
      0,
      moved
    );

    try{
      await put(
        '/admin/eagles/order',
        {
          items:ordered.map(
            (e:any)=>({
              id:Number(e.id),
              eagle_year:Number(
                e.eagle_year
              )
            })
          )
        }
      );

      await load();
    }catch(e:any){
      setError(
        e?.message||
        'Unable to reorder Eagle Scouts.'
      );
    }finally{
      setDraggedId(null);
    }
  };

  const moveToYear=async(
    year:number,
    yearEagles:any[]
  )=>{
    if(
      draggedId==null||
      !yearEagles.length
    ){
      setDraggedId(null);
      return;
    }
  
    await reorderEagles(
      Number(yearEagles[0].id),
      year
    );
  };

  return <Page
    title="Eagle Scouts"
    actions={
      canEdit&&
        <div className="eagle-page-actions">
          <button
            type="button"
            className="button eagle-edit-button"
            onClick={()=>{
              setDraggedId(null);
              setEditing(
                value=>!value
              );
            }}
          >
            {editing?'Done':'Edit'}
          </button>

          {editing&&
            <button
              type="button"
              className="home-add-button"
              aria-label="Add Eagle Scout"
              onClick={openAdd}
            >
              +
            </button>
          }
        </div>
    }
  >
    <div className="eagle-search-row">
      <input
        type="search"
        className="search eagle-search"
        placeholder="Search"
        aria-label="Search"
        value={q}
        onChange={e=>
          setQ(e.target.value)
        }
      />

      {editing&&q&&
        <span className="eagle-search-note">
          Clear search to reorder Eagles.
        </span>
      }
    </div>

    {error&&
      <p className="error">
        {error}
      </p>
    }

    {loaded&&(
      groups.size?
<div
  ref={eagleGridRef}
  className="eagle-year-grid"
  style={{
    ...(eagleCardMinWidth?
      {
        '--eagle-card-min-width':
          `${eagleCardMinWidth}px`
      }:
      {}),
    visibility:
      eagleCardMeasured?
        'visible':
        'hidden'
  } as React.CSSProperties}
>
          {orderedYears.map(
            year=>{
              const eagles=
                groups.get(year)??[];

              return (
                <section
                  className="card eagle-year-card"
                  key={year}
                  onDragOver={e=>{
                    if(
                      !editing||
                      !!q||
                      draggedId==null
                    )
                      return;

                    e.preventDefault();
                    e.dataTransfer.dropEffect=
                      'move';
                  }}
                  onDrop={async e=>{
                    e.preventDefault();

                    if(
                      !editing||
                      !!q||
                      draggedId==null
                    )
                      return;

                    await moveToYear(
                      year,
                      eagles
                    );
                  }}
                >
                  <h2 className="eagle-year-title">
                    {year}
                  </h2>

                  <div className="eagle-list">
                    {eagles.map(
                      (e:any)=>
                        <div
                          className={
                            'eagle-entry'+
                            (
                              draggedId===
                              Number(e.id)?
                                ' dragging':
                                ''
                            )
                          }
                          key={e.id}
                          draggable={
                            editing&&!q
                          }
                          onDragStart={event=>{
                            if(
                              !editing||
                              q
                            )
                              return;

                            setDraggedId(
                              Number(e.id)
                            );

                            event.dataTransfer.effectAllowed=
                              'move';

                            event.dataTransfer.setData(
                              'text/plain',
                              String(e.id)
                            );
                          }}
                          onDragEnd={()=>{
                            setDraggedId(null);
                          }}
                          onDragOver={event=>{
                            if(
                              !editing||
                              q||
                              draggedId==null||
                              draggedId===
                                Number(e.id)
                            )
                              return;

                            event.preventDefault();
                            event.dataTransfer.dropEffect=
                              'move';
                          }}
                          onDrop={async event=>{
                            event.preventDefault();
                            event.stopPropagation();

                            if(
                              !editing||
                              q||
                              draggedId==null
                            )
                              return;

                            await reorderEagles(
                              Number(e.id),
                              Number(e.eagle_year)
                            );
                          }}
                        >
                          <div className="eagle-entry-name">
                            {editing&&
                              <span className="eagle-drag-handle">
                                ⋮⋮
                              </span>
                            }

                            <span className="eagle-number">
                              {e.eagle_number}.
                            </span>

                            <span>
                              {formatName(e)}
                            </span>
                          </div>

                          {editing&&
                            <button
                              type="button"
                              className="eagle-delete-button"
                              aria-label={
                                `Delete Eagle Scout ${formatName(e)}`
                              }
                              onClick={async()=>{
                                if(
                                  !window.confirm(
                                    `Delete Eagle Scout ${formatName(e)}?`
                                  )
                                )
                                  return;

                                try{
                                  setError('');

                                  await api(
                                    `/admin/eagles/${e.id}`,
                                    {
                                      method:'DELETE'
                                    }
                                  );

                                  await load();
                                }catch(error:any){
                                  setError(
                                    error?.message||
                                    'Unable to delete Eagle Scout.'
                                  );
                                }
                              }}
                            >
                              −
                            </button>
                          }
                        </div>
                    )}
                  </div>
                </section>
              );
            }
          )}
        </div>:
        <p className="muted">
          {q?
            'No Eagle Scouts match your search.':
            'No Eagle Scouts are currently listed.'
          }
        </p>
    )}

    {showAdd&&
      <div
        className="modal-backdrop"
        onMouseDown={e=>{
          if(
            e.target===
            e.currentTarget
          )
            closeAdd();
        }}
      >
        <div
          className="modal-card eagle-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="eagle-modal-title"
        >
          <div className="modal-header">
            <h2 id="eagle-modal-title">
              Add Eagle Scout
            </h2>

            <button
              type="button"
              className="modal-close"
              aria-label="Close"
              onClick={closeAdd}
            >
              ×
            </button>
          </div>

          <form
            className="form eagle-form"
            onSubmit={async e=>{
              e.preventDefault();
              setModalError('');

              if(!firstName.trim()){
                setModalError(
                  'First name is required.'
                );
                return;
              }

              if(!lastName.trim()){
                setModalError(
                  'Last name is required.'
                );
                return;
              }

              if(eagleYear.trim()){
                const year=
                  Number(eagleYear);

                if(
                  !Number.isInteger(year)||
                  year<1
                ){
                  setModalError(
                    'Year must be a valid whole number.'
                  );
                  return;
                }
              }

              try{
                await post(
                  '/admin/eagles',
                  {
                    eagle_year:eagleYear,
                    first_name:firstName,
                    middle_name:middleName,
                    last_name:lastName,
                    suffix
                  }
                );

                await load();
                closeAdd();
              }catch(e:any){
                setModalError(
                  e?.message||
                  'Unable to add Eagle Scout.'
                );
              }
            }}
          >
            <label>
              Year
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={eagleYear}
                onChange={e=>
                  setEagleYear(
                    e.target.value
                  )
                }
              />
            </label>

            <div className="eagle-form-row">
              <label>
                First
                <input
                  value={firstName}
                  onChange={e=>
                    setFirstName(
                      e.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                Middle
                <input
                  value={middleName}
                  onChange={e=>
                    setMiddleName(
                      e.target.value
                    )
                  }
                />
              </label>
            </div>

            <div className="eagle-form-row">
              <label>
                Last
                <input
                  value={lastName}
                  onChange={e=>
                    setLastName(
                      e.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                Suffix
                <input
                  value={suffix}
                  onChange={e=>
                    setSuffix(
                      e.target.value
                    )
                  }
                />
              </label>
            </div>

            {modalError&&
              <p className="error">
                {modalError}
              </p>
            }

            <div className="button-row">
              <button
                type="submit"
                className="primary"
              >
                Add Eagle Scout
              </button>

              <button
                type="button"
                onClick={closeAdd}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    }
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
  const [showCopyEvent,setShowCopyEvent]=useState(false);
  const [showSubscribe,setShowSubscribe]=useState(false);
  const [calendarUrlCopied,setCalendarUrlCopied]=useState(false);

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

  {canEdit?
    <button
      type="button"
      className="button"
      onClick={()=>{
        setShowCopyEvent(true);
      }}
    >
      Copy Event
    </button>:
    <span />
  }

  <button
    type="button"
    className="button"
    onClick={()=>{
      setCalendarUrlCopied(false);
      setShowSubscribe(true);
    }}
  >
    Subscribe
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

    {showCopyEvent&&
  <CopyEventModal
    events={d.events||[]}
    onSaved={()=>{
      setShowCopyEvent(false);
      load();
    }}
    onCancel={()=>{
      setShowCopyEvent(false);
    }}
  />
}

    {showSubscribe&&
  <div
    className="modal-backdrop"
    onMouseDown={e=>{
      if(
        e.target===
        e.currentTarget
      )
        setShowSubscribe(false);
    }}
  >
    <div
      className="modal-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscribe-calendar-title"
    >
      <div className="modal-header">
        <h2 id="subscribe-calendar-title">
          Subscribe to Troop 690 Calendar
        </h2>

        <button
          type="button"
          className="modal-close"
          onClick={()=>{
            setShowSubscribe(false);
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <section className="calendar-subscribe-section">
        <h3>Apple Calendar</h3>

        <ol>
          <li>
            Tap <strong>Subscribe with Apple Calendar</strong>.
          </li>
          <li>
            Follow the prompt to subscribe.
          </li>
        </ol>

        <a
          className="button"
          href={
            'webcal://'+
            window.location.host+
            '/api/calendar.ics'
          }
        >
          Subscribe with Apple Calendar
        </a>
      </section>

      <section className="calendar-subscribe-section">
        <h3>Google Calendar</h3>

        <ol>
          <li>
            Visit <strong>calendar.google.com on a computer</strong>.
          </li>
          <li>
            Go to <strong>Other calendars → + → From URL</strong>.
          </li>
          <li>
            Enter the Troop 690 calendar address.
          </li>
          <li>
            Click <strong>Add calendar</strong>.
          </li>
        </ol>

        <button
          type="button"
          className="button"
          onClick={async()=>{
            try{
              await navigator.clipboard.writeText(
                window.location.origin+
                '/api/calendar.ics'
              );
              setCalendarUrlCopied(true);
              setTimeout(()=>{
                setCalendarUrlCopied(false);
              },2000);
            }catch{
              setCalendarUrlCopied(false);
            }
          }}
        >
          {calendarUrlCopied?
            'Calendar Address Copied':
            'Copy Calendar Address'
          }
        </button>
      </section>
    </div>
  </div>
}
  </Page>
}

function CopyEventModal({
  events,
  onSaved,
  onCancel
}:{
  events:any[],
  onSaved:()=>void,
  onCancel:()=>void
}){
  const pad=(n:number)=>
    String(n).padStart(2,'0');

  const dateKey=(date:Date)=>{
    return `${
      date.getFullYear()
    }-${
      pad(date.getMonth()+1)
    }-${
      pad(date.getDate())
    }`;
  };

  const oneDayEvents=
    [...events]
      .filter((e:any)=>{
        if(!e.start_at||!e.end_at)
          return false;

        return (
          String(e.start_at).slice(0,10)===
          String(e.end_at).slice(0,10)
        );
      })
      .sort((a:any,b:any)=>
        String(b.start_at)
          .localeCompare(
            String(a.start_at)
          )
      );

  const [sourceId,setSourceId]=useState(
    oneDayEvents.length?
      String(oneDayEvents[0].id):
      ''
  );

  const [viewDate,setViewDate]=useState(()=>{
    const source=
      oneDayEvents[0];

    if(source){
      const parts=
        String(source.start_at)
          .slice(0,10)
          .split('-')
          .map(Number);

      return new Date(
        parts[0],
        parts[1]-1,
        1
      );
    }

    const now=new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  });

  const [selectedDates,setSelectedDates]=
    useState<string[]>([]);

  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const source=
    oneDayEvents.find(
      (e:any)=>String(e.id)===sourceId
    );

  const year=viewDate.getFullYear();
  const month=viewDate.getMonth();

  const firstDay=
    new Date(
      year,
      month,
      1
    ).getDay();

  const daysInMonth=
    new Date(
      year,
      month+1,
      0
    ).getDate();

  const previousMonthDays=
    new Date(
      year,
      month,
      0
    ).getDate();

  const cells:any[]=[];

  for(let i=0;i<firstDay;i++){
    cells.push({
      day:
        previousMonthDays-
        firstDay+
        i+
        1,
      current:false,
      date:new Date(
        year,
        month-1,
        previousMonthDays-
        firstDay+
        i+
        1
      )
    });
  }

  for(let day=1;day<=daysInMonth;day++){
    cells.push({
      day,
      current:true,
      date:new Date(
        year,
        month,
        day
      )
    });
  }

  while(cells.length%7!==0){
    const day=
      cells.length-
      firstDay-
      daysInMonth+
      1;

    cells.push({
      day,
      current:false,
      date:new Date(
        year,
        month+1,
        day
      )
    });
  }

  const toggleDate=(date:Date)=>{
    const key=dateKey(date);

    setSelectedDates(
      current=>
        current.includes(key)?
          current.filter(
            x=>x!==key
          ):
          [...current,key]
    );
  };

  const changeMonth=(delta:number)=>{
    setViewDate(
      current=>
        new Date(
          current.getFullYear(),
          current.getMonth()+delta,
          1
        )
    );
  };

  const monthName=
    viewDate.toLocaleString(
      'en-US',
      {month:'long'}
    );

  const save=async()=>{
    setError('');

    if(!source){
      setError(
        'Select an event to copy.'
      );
      return;
    }

    if(!selectedDates.length){
      setError(
        'Select at least one date.'
      );
      return;
    }

    setSaving(true);

    try{
      await post(
        '/admin/events/copy',
        {
          source_event_id:Number(
            source.id
          ),
          dates:
            [...selectedDates].sort()
        }
      );

      onSaved();
    }catch(err:any){
      setError(
        err?.message||
        'Unable to copy event.'
      );
    }finally{
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e=>{
        if(
          e.target===
          e.currentTarget
        )
          onCancel();
      }}
    >
      <div
        className="modal-card copy-event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-event-title"
      >
        <div className="modal-header">
          <h2 id="copy-event-title">
            Copy Event
          </h2>

          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error&&
          <div className="error">
            {error}
          </div>
        }

        {!oneDayEvents.length?
          <p className="muted">
            There are no one-day events
            available to copy.
          </p>:
          <>
            <label>
              Event to copy
              <select
                value={sourceId}
                onChange={e=>
                  setSourceId(e.target.value)
                }
              >
                {oneDayEvents.map(
                  (e:any)=>
                    <option
                      key={e.id}
                      value={e.id}
                    >
                      {String(
                        e.start_at
                      ).slice(0,10)}
                      {' ('}
                      {e.title}
                      {')'}
                    </option>
                )}
              </select>
            </label>

            <div className="copy-event-calendar-head">
              <button
                type="button"
                className="button secondary"
                onClick={()=>{
                  changeMonth(-1);
                }}
              >
                ‹
              </button>

              <div>
                {monthName} {year}
              </div>

              <button
                type="button"
                className="button secondary"
                onClick={()=>{
                  changeMonth(1);
                }}
              >
                ›
              </button>
            </div>

            <div className="copy-event-calendar">
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
                  className="copy-event-weekday"
                  key={day}
                >
                  {day}
                </div>
              )}

              {cells.map(
                (cell:any,i:number)=>{
                  const key=
                    dateKey(cell.date);

                  const checked=
                    selectedDates.includes(
                      key
                    );

                  return (
                    <label
                      className={
                        'copy-event-day '+
                        (
                          cell.current?
                            '':
                            'copy-event-day-adjacent '
                        )+
                        (
                          checked?
                            'copy-event-day-selected':
                            ''
                        )
                      }
                      key={i}
                    >
                      <span>
                        {cell.day}
                      </span>

                      {cell.current&&
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={()=>{
                            toggleDate(
                              cell.date
                            );
                          }}
                        />
                      }
                    </label>
                  );
                }
              )}
            </div>

            <p className="muted">
              {selectedDates.length?
                `${selectedDates.length} date${
                  selectedDates.length===1?
                    '':
                    's'
                } selected.`:
                'Select the dates where you want a new copy of this event.'}
            </p>

            <div className="button-row">
              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={save}
              >
                {saving?
                  'Copying…':
                  'Copy Events'}
              </button>

              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </>
        }
      </div>
    </div>
  );
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
      <Page>
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
      ←
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
              'Delete this event? Any photos associated with this event will also be permanently deleted from the site and storage. This cannot be undone.'
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
    <dd className="event-description">
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
  const skipSearchRef=useRef(false);

  useEffect(()=>{
    setQuery(value||'');
  },[value]);

useEffect(()=>{
  if(skipSearchRef.current){
    skipSearchRef.current=false;
    return;
  }

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

  skipSearchRef.current=true;

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
    event_type:'',
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

    if(!String(form.event_type||'').trim()){
      setError(
        'Event Type is required.'
      );
      return;
    }

    if(
      !form.start_date||
      !form.end_date
    ){
      setError(
        'Start and End are required.'
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
    required
    onChange={e=>{
      set(
        'event_type',
        e.target.value
      );
    }}
  >
    <option value="" disabled>
      Select event type
    </option>
    <option value="Ceremony">
      Ceremony
    </option>
    <option value="Court of Honor">
      Court of Honor
    </option>
    <option value="Fundraiser">
      Fundraiser
    </option>
    <option value="Mass">
      Mass
    </option>
    <option value="Meeting">
      Meeting
    </option>
    <option value="Service">
      Service
    </option>
    <option value="Summer Camp">
      Summer Camp
    </option>
    <option value="Trip">
      Trip
    </option>
    <option value="Other">
      Other
    </option>
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

function PhotoViewer({
  photos,
  index,
  onClose
}:{
  photos:any[],
  index:number,
  onClose:()=>void
}){
  const [current,setCurrent]=useState(index);
  const [zoom,setZoom]=useState(1);

  useEffect(()=>{
    setCurrent(index);
    setZoom(1);
  },[index]);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){
        onClose();
      }else if(e.key==='ArrowLeft'&&current>0){
        setCurrent(x=>x-1);
        setZoom(1);
      }else if(
        e.key==='ArrowRight'&&
        current<photos.length-1
      ){
        setCurrent(x=>x+1);
        setZoom(1);
      }
    };

    window.addEventListener(
      'keydown',
      onKey
    );

    return ()=>window.removeEventListener(
      'keydown',
      onKey
    );
  },[
    current,
    photos.length,
    onClose
  ]);

  const photo=photos[current];

  if(!photo)
    return null;

  return <div
    className="photo-viewer"
    role="dialog"
    aria-modal="true"
    aria-label="Photo viewer"
    onMouseDown={e=>{
      if(e.target===e.currentTarget)
        onClose();
    }}
  >
    <div className="photo-viewer-stage">
      <img
        className="photo-viewer-image"
        src={'/files/'+photo.storage_key}
        alt={`Photo ${current+1}`}
        style={{
          transform:`scale(${zoom})`
        }}
        draggable={false}
      />
    </div>

    {current>0&&
      <button
        type="button"
        className={
          'photo-viewer-arrow '+
          'photo-viewer-prev'
        }
        aria-label="Previous photo"
        onClick={()=>{
          setCurrent(x=>x-1);
          setZoom(1);
        }}
      >
        ‹
      </button>
    }

    {current<photos.length-1&&
      <button
        type="button"
        className={
          'photo-viewer-arrow '+
          'photo-viewer-next'
        }
        aria-label="Next photo"
        onClick={()=>{
          setCurrent(x=>x+1);
          setZoom(1);
        }}
      >
        ›
      </button>
    }

    <div className="photo-viewer-controls">
      <button
        type="button"
        className="photo-viewer-control"
        aria-label="Zoom out"
        onClick={()=>
          setZoom(
            x=>Math.max(
              1,
              Number(
                (x-.25).toFixed(2)
              )
            )
          )
        }
      >
        −
      </button>

      <button
        type="button"
        className="photo-viewer-control"
        aria-label="Reset zoom"
        onClick={()=>
          setZoom(1)
        }
      >
        {Math.round(zoom*100)}%
      </button>

      <button
        type="button"
        className="photo-viewer-control"
        aria-label="Zoom in"
        onClick={()=>
          setZoom(
            x=>Math.min(
              4,
              Number(
                (x+.25).toFixed(2)
              )
            )
          )
        }
      >
        +
      </button>
    </div>

    <button
      type="button"
      className="photo-viewer-close"
      aria-label="Close photo viewer"
      onClick={onClose}
    >
      ×
    </button>
  </div>;
}

function AddPhotoModal({
  eventId,
  onSaved,
  onCancel
}:{
  eventId:string,
  onSaved:()=>void,
  onCancel:()=>void
}){
  const [files,setFiles]=
    useState<File[]>([]);

  const [saving,setSaving]=
    useState(false);

  const [error,setError]=
    useState('');

  const save=async()=>{
    setError('');

    if(!files.length){
      setError('Choose at least one photo.');
      return;
    }

    setSaving(true);

    try{
      const form=new FormData();

      form.append(
        'eventId',
        eventId
      );

      for(const file of files){
        form.append(
          'file',
          file
        );
      }

      const r=await fetch(
        '/api/admin/photos',
        {
          method:'POST',
          body:form,
          credentials:'include'
        }
      );

      const data=await r.json();

      if(!r.ok)
        throw new Error(
          data?.error||
          'Unable to add the photos.'
        );

      onSaved();
    }catch(e:any){
      setError(
        e?.message||
        'Unable to add the photos.'
      );
    }finally{
      setSaving(false);
    }
  };

  return <div
    className="modal-backdrop"
    onMouseDown={e=>{
      if(e.target===e.currentTarget)
        onCancel();
    }}
  >
    <div
      className="modal-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-photos-title"
    >
      <div className="modal-header">
        <h2 id="add-photos-title">
          Add Photos
        </h2>

        <button
          type="button"
          className="modal-close"
          aria-label="Close"
          onClick={onCancel}
          disabled={saving}
        >
          ×
        </button>
      </div>

      {error&&
        <div className="error">
          {error}
        </div>
      }

      <div className="form">
        <label>
          Photos
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={e=>
              setFiles(
                Array.from(
                  e.target.files||[]
                )
              )
            }
            disabled={saving}
          />
        </label>

        {files.length>0&&
          <p className="muted">
            {files.length} photo{
              files.length===1?
                '':
                's'
            } selected.
          </p>
        }

        <div className="button-row">
          <button
            type="button"
            className="primary"
            onClick={save}
            disabled={
              saving||
              !files.length
            }
          >
            {saving?
              'Adding…':
              'Add Photos'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>;
}

const zipU16=(value:number)=>{
  const b=new Uint8Array(2);
  const v=new DataView(
    b.buffer
  );

  v.setUint16(
    0,
    value,
    true
  );

  return b;
};

const zipU32=(value:number)=>{
  const b=new Uint8Array(4);
  const v=new DataView(
    b.buffer
  );

  v.setUint32(
    0,
    value>>>0,
    true
  );

  return b;
};

const zipConcat=(parts:Uint8Array[])=>{
  const total=parts.reduce(
    (sum,x)=>sum+x.length,
    0
  );

  const out=
    new Uint8Array(total);

  let offset=0;

  for(const part of parts){
    out.set(part,offset);
    offset+=part.length;
  }

  return out;
};

const crc32Table=(()=>{
  const table=
    new Uint32Array(256);

  for(let n=0;n<256;n++){
    let c=n;

    for(let k=0;k<8;k++)
      c=(c&1)?
        0xedb88320^(c>>>1):
        c>>>1;

    table[n]=c>>>0;
  }

  return table;
})();

const crc32=(data:Uint8Array)=>{
  let c=0xffffffff;

  for(const byte of data)
    c=
      crc32Table[
        (c^byte)&0xff
      ]^
      (c>>>8);

  return (
    c^
    0xffffffff
  )>>>0;
};

const zipDosTime=()=>{
  const d=new Date();

  return {
    time:
      (d.getHours()<<11)|
      (d.getMinutes()<<5)|
      Math.floor(
        d.getSeconds()/2
      ),

    date:
      ((d.getFullYear()-1980)<<9)|
      ((d.getMonth()+1)<<5)|
      d.getDate()
  };
};

const safeZipName=(value:string)=>
  String(value||'Photo')
    .replace(
      /[\\/:*?"<>|]+/g,
      '_'
    )
    .trim()||
    'Photo';

async function downloadPhotosZip(
  event:any,
  photos:any[]
){
  const encoder=
    new TextEncoder();

  const files:{
    name:string,
    data:Uint8Array,
    crc:number,
    time:number,
    date:number
  }[]=[];

  const stamp=zipDosTime();

  for(
    let i=0;
    i<photos.length;
    i++
  ){
    const p=photos[i];

    const response=
      await fetch(
        '/files/'+p.storage_key,
        {credentials:'include'}
      );

    if(!response.ok)
      throw new Error(
        'Unable to download one of the photos.'
      );

    const data=
      new Uint8Array(
        await response.arrayBuffer()
      );

    const rawName=
      String(
        p.storage_key
      )
        .split('/')
        .pop()||
      `photo-${i+1}.jpg`;

    files.push({
      name:
        `${String(i+1).padStart(3,'0')}-`+
        safeZipName(rawName),

      data,

      crc:
        crc32(data),

      time:
        stamp.time,

      date:
        stamp.date
    });
  }

  const chunks:Uint8Array[]=[];
  const central:Uint8Array[]=[];
  let offset=0;

  for(const file of files){
    const name=
      encoder.encode(file.name);

    const local=zipConcat([
      zipU32(0x04034b50),
      zipU16(20),
      zipU16(0x800),
      zipU16(0),
      zipU16(file.time),
      zipU16(file.date),
      zipU32(file.crc),
      zipU32(file.data.length),
      zipU32(file.data.length),
      zipU16(name.length),
      zipU16(0),
      name,
      file.data
    ]);

    chunks.push(local);

    central.push(
      zipConcat([
        zipU32(0x02014b50),
        zipU16(20),
        zipU16(20),
        zipU16(0x800),
        zipU16(0),
        zipU16(file.time),
        zipU16(file.date),
        zipU32(file.crc),
        zipU32(file.data.length),
        zipU32(file.data.length),
        zipU16(name.length),
        zipU16(0),
        zipU16(0),
        zipU16(0),
        zipU16(0),
        zipU32(0),
        zipU32(offset),
        name
      ])
    );

    offset+=local.length;
  }

  const centralData=
    zipConcat(central);

  const end=zipConcat([
    zipU32(0x06054b50),
    zipU16(0),
    zipU16(0),
    zipU16(files.length),
    zipU16(files.length),
    zipU32(centralData.length),
    zipU32(offset),
    zipU16(0)
  ]);

  const zipData=zipConcat([
    ...chunks,
    ...central,
    end
  ]);
  
  const zipBuffer=new ArrayBuffer(
    zipData.byteLength
  );
  
  new Uint8Array(zipBuffer).set(
    zipData
  );
  
  const blob=new Blob(
    [zipBuffer],
    {
      type:'application/zip'
    }
  );

  const url=
    URL.createObjectURL(blob);

  const a=
    document.createElement('a');

  a.href=url;

  a.download=
    `${String(event.start_at).slice(0,10)} `+
    `${safeZipName(event.title)}.zip`;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function PhotoAlbum({
  id,
  me
}:{
  id:string,
  me:any
}){
  const [d,setD]=
    useState<any>();

  const [showAdd,setShowAdd]=
    useState(false);

  const [selectMode,setSelectMode]=
    useState(false);

  const [selectedIds,setSelectedIds]=
    useState<number[]>([]);

  const [viewerIndex,setViewerIndex]=
    useState<number|null>(null);

  const [message,setMessage]=
    useState('');

  const [busy,setBusy]=
    useState(false);

  const nav=useNavigate();
  
  const isAdmin=
    !!me?.isAdministrator;

  const canManage=
    isAdmin||
    !!me?.permissions?.includes(
      'PHOTO'
    );

  const load=async()=>{
    try{
      setD(
        await api('/photos/'+id)
      );
    }catch(e:any){
      setD({
        error:
          e?.message||
          'Unable to load Photos.'
      });
    }
  };

  useEffect(()=>{
    load();
    setSelectMode(false);
    setSelectedIds([]);
    setViewerIndex(null);
  },[id]);

  const photos=
    d?.photos||[];

  const allSelected=
    photos.length>0&&
    selectedIds.length===
      photos.length;

  const selectedPhotos=
    photos.filter(
      (x:any)=>
        selectedIds.includes(
          Number(x.id)
        )
    );

  const toggleSelected=(
    photoId:number
  )=>{
    setSelectedIds(
      current=>
        current.includes(photoId)?
          current.filter(
            x=>x!==photoId
          ):
          [...current,photoId]
    );
  };

  const toggleSelectMode=()=>{
    setSelectMode(
      current=>!current
    );

    setSelectedIds([]);
  };

  const selectAll=()=>{
    setSelectedIds(
      photos.map(
        (x:any)=>
          Number(x.id)
      )
    );
  };

  const runDownload=async()=>{
    if(!photos.length||busy)
      return;

    const downloadThese=
      selectMode?
        selectedPhotos:
        photos;

    if(!downloadThese.length)
      return;

    setMessage('');
    setBusy(true);

    try{
      await downloadPhotosZip(
        d.event,
        downloadThese
      );
    }catch(e:any){
      setMessage(
        e?.message||
        'Unable to download the photos.'
      );
    }finally{
      setBusy(false);
    }
  };

  const deleteSelected=async()=>{
    if(
      !canManage||
      !selectedIds.length||
      busy||
      (!isAdmin&&selectedIds.length>1)
    )
      return;

    const confirmed=
      window.confirm(
        `Delete ${selectedIds.length} selected photo${
          selectedIds.length===1?
            '':
            's'
        }? This cannot be undone.`
      );

    if(!confirmed)
      return;

    setMessage('');
    setBusy(true);

    try{
      await post(
        '/admin/photos/delete',
        {
          event_id:Number(id),
          photo_ids:selectedIds
        }
      );

      setSelectedIds([]);
      await load();
    }catch(e:any){
      setMessage(
        e?.message||
        'Unable to delete the selected photos.'
      );
    }finally{
      setBusy(false);
    }
  };

  const setCover=async()=>{
    if(
      !isAdmin||
      selectedIds.length!==1||
      busy
    )
      return;

    setMessage('');
    setBusy(true);

    try{
      await put(
        '/admin/photo-albums/'+
        id+
        '/cover',
        {
          photo_id:
            selectedIds[0]
        }
      );

      setSelectedIds([]);
      await load();
    }catch(e:any){
      setMessage(
        e?.message||
        'Unable to set the cover photo.'
      );
    }finally{
      setBusy(false);
    }
  };

  if(!d)
    return <Page title="">
      <Loading/>
    </Page>;

  if(d.error)
    return <Page title="Photos">
      <p className="error">
        {d.error}
      </p>
    </Page>;

  return <Page
    title={d.event.title}
    actions={
      <button
        type="button"
        className="button secondary"
        onClick={()=>{
          nav('/photos');
        }}
      >
        ←
      </button>
    }
  >
    <div className="photo-page-actions">
      {canManage&&
        <button
          type="button"
          className="button"
          onClick={()=>
            setShowAdd(true)
          }
        >
          Add Photos
        </button>
      }

      <button
        type="button"
        className="button"
        onClick={
          toggleSelectMode
        }
      >
        {selectMode?
          'Done':
          'Select'}
      </button>

      {selectMode&&
        <button
          type="button"
          className="button"
          onClick={selectAll}
          disabled={
            allSelected||
            !photos.length
          }
        >
          Select All
        </button>
      }

      <button
        type="button"
        className="button"
        onClick={runDownload}
        disabled={
          (selectMode&&
            !selectedIds.length)||
          busy||
          !photos.length
        }
      >
        {busy?
          'Working…':
          'Download'}
      </button>

      {canManage&&
        selectMode&&
        <button
          type="button"
          className="button"
          onClick={
            deleteSelected
          }
          disabled={
            !selectedIds.length||
            busy||
            (!isAdmin&&selectedIds.length>1)
          }
        >
          Delete
        </button>
      }

      {isAdmin&&
        selectMode&&
        <button
          type="button"
          className="button"
          onClick={setCover}
          disabled={
            selectedIds.length!==1||
            busy
          }
        >
          Set Cover Photo
        </button>
      }

      {isAdmin&&
        <button
          type="button"
          className="button"
          onClick={async()=>{
            const confirmed=
              window.confirm(
                'Remove this event from Photos? All photos for this event will also be permanently deleted from the site and storage. The Calendar event will not be deleted. This cannot be undone.'
              );

            if(!confirmed)
              return;

            setMessage('');
            setBusy(true);

            try{
              await api(
                '/admin/photo-albums/'+
                id,
                {
                  method:'DELETE'
                }
              );

              window.location.href='/photos';
            }catch(e:any){
              setMessage(
                e?.message||
                'Unable to remove the event from Photos.'
              );

              setBusy(false);
            }
          }}
          disabled={busy}
        >
          Remove from Photos
        </button>
      }
    </div>

    {message&&
      <div className="error">
        {message}
      </div>
    }

    {!photos.length?
      <p className="muted">
        No photos.
      </p>:

      <div className="photo-event-grid">
        {photos.map(
          (x:any,i:number)=>
            <figure
              className="photo-item"
              key={x.id}
            >
              <button
                type="button"
                className="photo-image-button"
                onClick={()=>{
                  if(selectMode){
                    toggleSelected(
                      Number(x.id)
                    );
                  }else{
                    setViewerIndex(i);
                  }
                }}
                aria-label={
                  `View photo ${i+1}`
                }
              >
                <img
                  src={
                    '/files/'+
                    x.storage_key
                  }
                  alt={`Photo ${i+1} from ${d.event.title}`}
                  className="photo-grid-image"
                />
              </button>

              {selectMode&&
                <label
                  className="photo-select-control"
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.includes(
                        Number(x.id)
                      )
                    }
                    onChange={()=>
                      toggleSelected(
                        Number(x.id)
                      )
                    }
                    aria-label={
                      `Select photo ${i+1}`
                    }
                  />
                </label>
              }
            </figure>
        )}
      </div>
    }

    {showAdd&&
      <AddPhotoModal
        eventId={id}
        onSaved={async()=>{
          setShowAdd(false);
          await load();
        }}
        onCancel={()=>
          setShowAdd(false)
        }
      />
    }

    {viewerIndex!==null&&
      <PhotoViewer
        photos={photos}
        index={viewerIndex}
        onClose={()=>
          setViewerIndex(null)
        }
      />
    }
  </Page>;
}

function AddPhotoEventModal({
  events,
  onSaved,
  onCancel
}:{
  events:any[],
  onSaved:()=>void,
  onCancel:()=>void
}){
  const eventTypes=[
    'Ceremony',
    'Court of Honor',
    'Fundraiser',
    'Mass',
    'Meeting',
    'Service',
    'Summer Camp',
    'Trip',
    'Other'
  ];

  const [
    selectedTypes,
    setSelectedTypes
  ]=useState<string[]>(
    eventTypes
  );

  const [eventId,setEventId]=
    useState(
      events.length?
        String(events[0].id):
        ''
    );

  const [
    filterOpen,
    setFilterOpen
  ]=useState(false);

  const [saving,setSaving]=
    useState(false);

  const [error,setError]=
    useState('');

  const visibleEvents=
    events.filter(
      (e:any)=>
        selectedTypes.includes(
          String(
            e.event_type||
            'Other'
          )
        )
    );

  useEffect(()=>{
    if(
      !visibleEvents.some(
        (e:any)=>
          String(e.id)===eventId
      )
    ){
      setEventId(
        visibleEvents.length?
          String(
            visibleEvents[0].id
          ):
          ''
      );
    }
  },[
    selectedTypes.join('|'),
    events
      .map((x:any)=>x.id)
      .join('|')
  ]);

  const toggleType=(
    type:string
  )=>{
    setSelectedTypes(
      current=>
        current.includes(type)?
          current.filter(
            x=>x!==type
          ):
          [...current,type]
    );
  };

  const save=async()=>{
    setError('');

    if(!eventId){
      setError(
        'Select an event.'
      );
      return;
    }

    setSaving(true);

    try{
      await post(
        '/admin/photo-albums',
        {
          event_id:
            Number(eventId)
        }
      );

      onSaved();
    }catch(e:any){
      setError(
        e?.message||
        'Unable to add the event.'
      );
    }finally{
      setSaving(false);
    }
  };

  return <div
    className="modal-backdrop"
    onMouseDown={e=>{
      if(e.target===e.currentTarget)
        onCancel();
    }}
  >
    <div
      className={
        'modal-card '+
        'copy-event-modal'
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby={
        'add-photo-event-title'
      }
    >
      <div className="modal-header">
        <h2 id="add-photo-event-title">
          Add New Event
        </h2>

        <button
          type="button"
          className="modal-close"
          aria-label="Close"
          onClick={onCancel}
        >
          ×
        </button>
      </div>

      {error&&
        <div className="error">
          {error}
        </div>
      }

      {!events.length?
        <p className="muted">
          There are no past or current events available to add.
        </p>:

        <div className="form">
          <label>
            Event
            <select
              value={eventId}
              onChange={e=>
                setEventId(
                  e.target.value
                )
              }
            >
              {visibleEvents.map(
                (e:any)=>
                  <option
                    key={e.id}
                    value={e.id}
                  >
                    {String(
                      e.start_at
                    ).slice(0,10)}
                    {' ('}
                    {e.title}
                    {')'}
                  </option>
              )}
            </select>
          </label>

          <div className="photo-filter-field">
            <span className="photo-filter-label">
              Event Types
            </span>

            <div className="photo-filter-dropdown">
              <button
                type="button"
                className="photo-filter-trigger"
                aria-expanded={
                  filterOpen
                }
                onClick={()=>
                  setFilterOpen(
                    x=>!x
                  )
                }
              >
                {selectedTypes.length}
                {' selected'}
              </button>

              {filterOpen&&
                <div className="photo-filter-menu">
                  {eventTypes.map(
                    type=>
                      <label
                        key={type}
                        className={
                          'photo-filter-option'
                        }
                      >
                        <input
                          type="checkbox"
                          checked={
                            selectedTypes.includes(
                              type
                            )
                          }
                          onChange={()=>
                            toggleType(type)
                          }
                        />

                        <span>
                          {type}
                        </span>
                      </label>
                  )}
                </div>
              }
            </div>
          </div>

          {!visibleEvents.length&&
            <p className="muted">
              No events match the selected event types.
            </p>
          }

          <div className="button-row">
            <button
              type="button"
              className="primary"
              onClick={save}
              disabled={
                saving||
                !eventId
              }
            >
              {saving?
                'Adding…':
                'Add Event'}
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      }
    </div>
  </div>;
}

function Photos({
  me
}:{
  me:any
}){
  const [a,setA]=
    useState<any[]>([]);

  const [loaded,setLoaded]=
    useState(false);

  const [
    showAddEvent,
    setShowAddEvent
  ]=useState(false);

  const [
    eventOptions,
    setEventOptions
  ]=useState<any[]>([]);

  const [
    loadingOptions,
    setLoadingOptions
  ]=useState(false);

  const [error,setError]=
    useState('');

  const [
    storageBytes,
    setStorageBytes
  ]=useState<number|null>(null);

  const [
    storageError,
    setStorageError
  ]=useState('');
  
  const canManage=
    !!me?.isAdministrator||
    !!me?.permissions?.includes(
      'PHOTO'
    );

  const load=async()=>{
    try{
      setLoaded(false);
      setError('');

      const x=
        await api('/photos');

      setA(
        x.albums||[]
      );

      setLoaded(true);
    }catch(e:any){
      setError(
        e?.message||
        'Unable to load Photos.'
      );
    }
  };

  useEffect(()=>{
    load();
  },[]);

    useEffect(()=>{
    if(!me?.isAdministrator){
      setStorageBytes(null);
      setStorageError('');
      return;
    }

    api('/admin/r2-storage')
      .then(x=>{
        setStorageBytes(
          Number(x.usedBytes)||0
        );
        setStorageError('');
      })
      .catch((e:any)=>{
        setStorageError(
          e?.message||
          'Unable to load storage usage.'
        );
      });
  },[
    me?.isAdministrator
  ]);

  const openAddEvent=
    async()=>{
      setLoadingOptions(true);

      try{
        const x=
          await api(
            '/admin/photo-events'
          );

        setEventOptions(
          x.events||[]
        );

        setShowAddEvent(true);
      }catch(e:any){
        setError(
          e?.message||
          'Unable to load available events.'
        );
      }finally{
        setLoadingOptions(false);
      }
    };

  const eventTypeClass=(
    type:string
  )=>
    'calendar-event-'+
    String(
      type||'Other'
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-'
      );

const maxStorageBytes=
  10*1000*1000*1000;

const storagePercent=
  storageBytes===null?
    0:
    Math.min(
      100,
      (storageBytes/
        maxStorageBytes)*100
    );

const formatStorage=(bytes:number)=>{
  if(bytes<1000)
    return `${bytes.toFixed(2)} B`;

  if(bytes<1000*1000)
    return `${(
      bytes/1000
    ).toFixed(2)} KB`;

  if(bytes<1000*1000*1000)
    return `${(
      bytes/(1000*1000)
    ).toFixed(2)} MB`;

  return `${(
    bytes/(1000*1000*1000)
  ).toFixed(2)} GB`;
};

const formatStoragePercent=(
  bytes:number
)=>{
  const rawPercent=Math.min(
    100,
    (bytes/maxStorageBytes)*100
  );

  if(
    rawPercent===0||
    rawPercent===100
  ){
    return `${rawPercent}%`;
  }

  if(
    rawPercent<1||
    rawPercent>99
  ){
    return `${rawPercent.toFixed(1)}%`;
  }

  return `${Math.round(rawPercent)}%`;
};

  const storageFillClass=
    storageBytes!==null&&
    storageBytes>=9*1000*1000*1000?
      'red':
    storageBytes!==null&&
    storageBytes>=6*1000*1000*1000?
      'yellow':
      'blue';
  
  return <Page
    title="Photos"
    actions={
      <div className="photos-page-head-actions">

        {me?.isAdministrator&&
          <div className="storage-usage">
<div className="storage-usage-label">
  <span>
    {storageError?
      'Unavailable':
      storageBytes===null?
        'Loading…':
        `${formatStorage(
          storageBytes
        )} (${formatStoragePercent(
          storageBytes
        )})`}
  </span>

  <span>10 GB</span>
</div>

            <div
              className="storage-usage-bar"
              role="progressbar"
              aria-label="R2 storage used"
              aria-valuemin={0}
              aria-valuemax={10}
              aria-valuenow={
                storageBytes===null?
                  0:
                  Math.min(
                    10,
                    storageBytes/
                    (1024*1024*1024)
                  )
              }
            >
              <div
                className={
                  'storage-usage-fill '+
                  storageFillClass
                }
                style={{
                  width:
                    `${storagePercent}%`
                }}
              />
            </div>
          </div>
        }

        {canManage&&
          <button
            type="button"
            className="button"
            onClick={openAddEvent}
            disabled={loadingOptions}
          >
            {loadingOptions?
              'Loading…':
              'Add New Event'}
          </button>
        }

      </div>
    }
  >
    {error&&
      <div className="error">
        {error}
      </div>
    }

    {loaded&&(
      a.length?
        <div className="photo-album-grid">
          {a.map(
          (x:any)=>
            <a
              className={
                'photo-album-card card'
              }
              key={x.id}
              href={
                '/photos/'+x.event_id
              }
            >
              {x.cover_storage_key?
                <img
                  className="photo-album-cover"
                  src={
                    '/files/'+
                    x.cover_storage_key
                  }
                  alt=""
                />:

                <div className={
                  'photo-album-placeholder'
                }>
                  No photos
                </div>
              }

              <div className="photo-album-date">
                {new Date(
                  x.start_at
                ).toLocaleDateString(
                  'en-US',
                  {
                    month:'numeric',
                    day:'numeric',
                    year:'numeric'
                  }
                )}
              </div>

              <div
                className={
                  'photo-album-title '+
                  eventTypeClass(
                    x.event_type
                  )
                }
              >
                {x.title}
              </div>
            </a>
          )}
        </div>:
        <p className="muted">
          No photos.
        </p>
    )}

    {showAddEvent&&
      <AddPhotoEventModal
        events={eventOptions}
        onSaved={async()=>{
          setShowAddEvent(false);
          await load();
        }}
        onCancel={()=>
          setShowAddEvent(false)
        }
      />
    }
  </Page>;
}

function Leadership({me}:{me:any}){
  const [d,setD]=useState<any>();
  const [editing,setEditing]=useState(false);
  const [editingDescription,setEditingDescription]=
    useState<number|null>(null);
  const [descriptionDraft,setDescriptionDraft]=
    useState('');
  const [savingDescription,setSavingDescription]=
    useState(false);
  const [error,setError]=useState('');

  const [collapsedSections,setCollapsedSections]=
    useState<Record<string,boolean>>({});

  const youthGridRef=
    useRef<HTMLDivElement|null>(null);

  const adultGridRef=
    useRef<HTMLDivElement|null>(null);

  const measureLeadershipRows=()=>{
    const measureGrid=(
      grid:HTMLDivElement|null,
      selector:string
    )=>{
      if(!grid)
        return;

      const rows=
        Array.from(
          grid.querySelectorAll(selector)
        ) as HTMLElement[];

      if(!rows.length)
        return;

      const mobile=
        window.matchMedia(
          '(max-width:800px)'
        ).matches;

      if(mobile){
        rows.forEach(row=>
          row.style.removeProperty('height')
        );

        grid.style.removeProperty(
          '--leadership-row-height'
        );

        return;
      }

      rows.forEach(row=>{
        row.style.height='auto';
      });

      const tallest=Math.max(
        ...rows.map(row=>
          Math.ceil(
            row.getBoundingClientRect().height
          )
        )
      );

      grid.style.setProperty(
        '--leadership-row-height',
        `${tallest}px`
      );
    };

    measureGrid(
      youthGridRef.current,
      '.leadership-holder-row'
    );

    measureGrid(
      adultGridRef.current,
      '.leadership-adult-row'
    );
  };

  useLayoutEffect(()=>{
    measureLeadershipRows();

    const frame=
      window.requestAnimationFrame(
        measureLeadershipRows
      );

    const observer=
      new ResizeObserver(
        measureLeadershipRows
      );

    if(youthGridRef.current)
      observer.observe(
        youthGridRef.current
      );

    if(adultGridRef.current)
      observer.observe(
        adultGridRef.current
      );

    window.addEventListener(
      'resize',
      measureLeadershipRows
    );

    document.fonts?.ready.then(
      measureLeadershipRows
    );

    return()=>{
      window.cancelAnimationFrame(frame);

      observer.disconnect();

      window.removeEventListener(
        'resize',
        measureLeadershipRows
      );
    };
  },[
    d,
    editing,
    editingDescription,
    collapsedSections
  ]);

  const canEdit=
    !!me?.isAdministrator||
    !!me?.permissions?.includes('LEAD');

  const load=async()=>{
    try{
      setError('');

      const x=
        await api('/leadership');

      setD(x);
    }catch(e:any){
      setError(
        e?.message||
        'Unable to load leadership.'
      );
    }
  };

  useEffect(()=>{
    load();
  },[]);

  const startDescriptionEdit=(x:any)=>{
    setEditingDescription(
      Number(x.id)
    );

    setDescriptionDraft(
      String(
        x.description||
        'Description'
      )
    );
  };

  const cancelDescriptionEdit=()=>{
    setEditingDescription(null);
    setDescriptionDraft('');
  };

  const saveDescription=async(
    x:any
  )=>{
    try{
      setSavingDescription(true);
      setError('');

      await put(
        `/admin/leadership/${x.id}`,
        {
          description:
            descriptionDraft
        }
      );

      setD((current:any)=>({
        ...current,
        positions:
          current.positions.map(
            (position:any)=>
              Number(position.id)===
              Number(x.id)?
                {
                  ...position,
                  description:
                    descriptionDraft.trim()||
                    'Description'
                }:
                position
          )
      }));

      cancelDescriptionEdit();
    }catch(e:any){
      setError(
        e?.message||
        'Unable to save description.'
      );
    }finally{
      setSavingDescription(false);
    }
  };

  if(!d)
    return <Page title="Leadership">
      {error&&
        <p className="error">
          {error}
        </p>
      }
    </Page>;

  const toggleSection=(key:string)=>{
    setCollapsedSections(current=>({
      ...current,
      [key]:!current[key]
    }));
  };

  return <Page
    title="Leadership"
    actions={
      canEdit&&
      <div className="leadership-page-actions">
        <button
          type="button"
          className="button leadership-edit-button"
          onClick={()=>{
            setEditing(
              value=>!value
            );

            if(editing)
              cancelDescriptionEdit();
          }}
        >
          {editing?'Done':'Edit'}
        </button>
      </div>
    }
  >
    {error&&
      <p className="error">
        {error}
      </p>
    }

    <section>
      <button
        type="button"
        className="leadership-section-toggle"
        onClick={()=>
          toggleSection('youth')
        }
        aria-expanded={!collapsedSections.youth}
      >
        <span className="leadership-section-arrow">
          {collapsedSections.youth?'▸':'▾'}
        </span>
        <span>Youth Leaders</span>
      </button>

      {!collapsedSections.youth&&
        <div className="leadership-section-content">
          <div
            className="leadership-youth-grid"
            ref={youthGridRef}
          >
            {d.positions.map((x:any)=>{
              return (
                <article
                  className="card leadership-youth-card"
                  key={x.id}
                >
                  <h3 className="leadership-card-title">
                    {x.name}
                  </h3>

                  {x.holders.length>0&&
                    <div className="leadership-holder-list">
                      {x.holders.map(
                        (holder:any)=>
                          <div
                            className="leadership-holder-row"
                            key={holder.id}
                          >
                            <div className="leadership-holder-name">
                              {holder.name}
                              {holder.suffix&&
                                ` ${holder.suffix}`
                              }
                            </div>

                            {(
                              x.name==='Patrol Leader'||
                              x.name==='Assistant Patrol Leader'
                            )&&
                              holder.patrol&&
                              <div className="leadership-holder-subtitle">
                                {holder.patrol}
                              </div>
                            }
                          </div>
                      )}
                    </div>
                  }

                  <div className="leadership-description-section">
                    <div className="leadership-description-heading">
                      {editing&&
                        <button
                          type="button"
                          className="leadership-change-button"
                          onClick={()=>
                            startDescriptionEdit(x)
                          }
                        >
                          Change
                        </button>
                      }
                    </div>

                    {editingDescription===
                      Number(x.id)?
                      <div className="leadership-description-editor">
                        <textarea
                          value={descriptionDraft}
                          onChange={e=>
                            setDescriptionDraft(
                              e.target.value
                            )
                          }
                        />

                        <div className="leadership-description-actions">
                          <button
                            type="button"
                            className="button"
                            disabled={
                              savingDescription
                            }
                            onClick={()=>
                              saveDescription(x)
                            }
                          >
                            Save
                          </button>

                          <button
                            type="button"
                            className="button"
                            disabled={
                              savingDescription
                            }
                            onClick={
                              cancelDescriptionEdit
                            }
                          >
                            Cancel
                          </button>
                        </div>
                      </div>:
                      <p className="leadership-description">
                        {x.description}
                      </p>
                    }
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      }
    </section>

    <section>
      <button
        type="button"
        className="leadership-section-toggle"
        onClick={()=>
          toggleSection('adult')
        }
        aria-expanded={!collapsedSections.adult}
      >
        <span className="leadership-section-arrow">
          {collapsedSections.adult?'▸':'▾'}
        </span>
        <span>Adult Leaders</span>
      </button>

      {!collapsedSections.adult&&
        <div className="leadership-section-content">
          <div
            className="leadership-adult-grid"
            ref={adultGridRef}
          >
            <article className="card leadership-adult-card">
              <h3 className="leadership-card-title">
                Executive Leadership
              </h3>

              <div className="leadership-adult-list">
                {d.adult.executive.map(
                  (x:any)=>
                    <div
                      className="leadership-adult-row"
                      key={`${x.id}-${x.title}`}
                    >
                      <div className="leadership-adult-name">
                        {x.name}
                      </div>

                      <div className="leadership-adult-title">
                        {x.title}
                      </div>
                    </div>
                )}
              </div>
            </article>

            <article className="card leadership-adult-card">
              <h3 className="leadership-card-title">
                Assistant Scoutmasters
              </h3>

              <div className="leadership-adult-list">
                {d.adult.assistantScoutmasters.map(
                  (x:any)=>
                    <div
                      className="leadership-adult-row leadership-adult-row-name-only"
                      key={x.id}
                    >
                      <div className="leadership-adult-name">
                        {x.name}
                      </div>
                    </div>
                )}
              </div>
            </article>

            <article className="card leadership-adult-card">
              <h3 className="leadership-card-title">
                Committee Members
              </h3>

              <div className="leadership-adult-list">
                {d.adult.committee.map(
                  (x:any)=>
                    <div
                      className="leadership-adult-row"
                      key={x.id}
                    >
                      <div className="leadership-adult-name">
                        {x.name}
                      </div>

                      <div className="leadership-adult-title">
                        {x.title}
                      </div>
                    </div>
                )}
              </div>
            </article>
          </div>
        </div>
      }
    </section>

    <section>
      <button
        type="button"
        className="leadership-section-toggle"
        onClick={()=>
          toggleSection('splHistory')
        }
        aria-expanded={!collapsedSections.splHistory}
      >
        <span className="leadership-section-arrow">
          {collapsedSections.splHistory?'▸':'▾'}
        </span>
        <span>SPL History</span>
      </button>

      {!collapsedSections.splHistory&&
        <div className="leadership-section-content">
          {d.history
            .filter(
              (x:any)=>
                x.type==='SPL'||
                x.type==='ASPL'
            )
            .map(
              (x:any)=>
                <div
                  className="list-row"
                  key={x.id}
                >
                  <span>{x.type}</span>
                  <b>{x.person_name}</b>
                  <span>
                    {x.start_year}-{x.end_year}
                  </span>
                </div>
            )}
        </div>
      }
    </section>

    <section>
      <button
        type="button"
        className="leadership-section-toggle"
        onClick={()=>
          toggleSection('scoutmasterHistory')
        }
        aria-expanded={!collapsedSections.scoutmasterHistory}
      >
        <span className="leadership-section-arrow">
          {collapsedSections.scoutmasterHistory?'▸':'▾'}
        </span>
        <span>Scoutmaster History</span>
      </button>

      {!collapsedSections.scoutmasterHistory&&
        <div className="leadership-section-content">
          {d.history
            .filter(
              (x:any)=>
                x.type==='Scoutmaster'
            )
            .map(
              (x:any)=>
                <div
                  className="list-row"
                  key={x.id}
                >
                  <b>{x.person_name}</b>
                  <span>
                    {x.start_year}-{x.end_year}
                  </span>
                </div>
            )}
        </div>
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
    ['/images/uniform/class-a.png','Class A'],
    ['/images/uniform/class-b.png','Class B'],
    ['/images/uniform/right-sleeve.png','Right sleeve'],
    ['/images/uniform/left-sleeve.png','Left sleeve'],
    ['/images/uniform/right-pocket.png','Right pocket'],
    ['/images/uniform/left-pocket.png','Left pocket']
  ];

  return <Page title="Scout Uniform">
    <section>
      <h2>Class A uniform</h2>
      <p>The Class A uniform is the troop's formal Scout uniform.</p>
      <ImgSlot src="/images/uniform/class-a.png"/>
    </section>

    <section>
      <h2>Class B uniform</h2>
      <p>The Class B uniform is the troop's activity uniform.</p>
      <ImgSlot src="/images/uniform/class-b.png"/>
    </section>

    <section>
      <h2>Insignia Guide</h2>

      <div className="uniform-grid">
        {areas.slice(2).map(([src,n])=>
          <div className="card" key={src}>
            <h3>{n}</h3>
            <ImgSlot src={src}/>
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
  return <img
    className="uniform-img"
    src={src||'/images/uniform/placeholder.png'}
    alt="Uniform guide"
  />;
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
          <h2>Youth ({youth.length})</h2>
          {youthTable}
        </section>

        <section>
          <h2>Adults ({adults.length})</h2>
          {adultTable}
        </section>

        <section>
          <h2>Adult Leaders ({leaders.length})</h2>
          {leaderTable}
        </section>

        <section>
          <h2>Archived Eagle Scouts ({archived.length})</h2>
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
                <option value="Rev. Msgr.">Rev. Msgr.</option>
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
