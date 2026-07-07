/*
=========================================================
 Troop 690 Website
 site.js
 Version 3.0
=========================================================
*/

document.addEventListener("DOMContentLoaded", () => {

    initMobileMenu();

    initDropdowns();

    initScrollAnimations();

    initCounters();

    initModals();

    initAccordion();

    initGallery();

 initLeadership();

});

/*=========================================================
MOBILE MENU
=========================================================*/

function initMobileMenu(){

    const button=document.querySelector(".mobile-menu-button");

    const menu=document.querySelector(".desktop-nav");

    if(!button || !menu) return;

    button.addEventListener("click",()=>{

        menu.classList.toggle("mobile-open");

        button.classList.toggle("open");

    });

}

/*=========================================================
DESKTOP DROPDOWNS
=========================================================*/

function initDropdowns(){

    document.querySelectorAll(".nav-dropdown").forEach(dropdown=>{

        dropdown.addEventListener("mouseenter",()=>{

            dropdown.classList.add("open");

        });

        dropdown.addEventListener("mouseleave",()=>{

            dropdown.classList.remove("open");

        });

    });

}

/*=========================================================
SCROLL REVEAL
=========================================================*/

function initScrollAnimations(){

    const items=document.querySelectorAll(

        ".fade-up,.fade-left,.fade-right"

    );

    if(items.length===0) return;

    const observer=new IntersectionObserver(entries=>{

        entries.forEach(entry=>{

            if(entry.isIntersecting){

                entry.target.classList.add("visible");

                observer.unobserve(entry.target);

            }

        });

    },{

        threshold:.05

    });

    items.forEach(item=>observer.observe(item));

}

/*=========================================================
NUMBER COUNTERS
=========================================================*/

function initCounters(){

    const counters=document.querySelectorAll("[data-counter]");

    if(counters.length===0) return;

    const observer=new IntersectionObserver(entries=>{

        entries.forEach(entry=>{

            if(!entry.isIntersecting) return;

            animateCounter(entry.target);

            observer.unobserve(entry.target);

        });

    },{

        threshold:.5

    });

    counters.forEach(counter=>observer.observe(counter));

}

function animateCounter(element){

    const target=parseInt(

        element.dataset.counter,

        10

    );

    const duration=1800;

    const startTime=performance.now();

    function update(now){

        const progress=Math.min(

            (now-startTime)/duration,

            1

        );

        const value=Math.floor(

            progress*target

        );

        element.textContent=value;

        if(progress<1){

            requestAnimationFrame(update);

        }

    }

    requestAnimationFrame(update);

}
/*=========================================================
MODALS
=========================================================*/

function initModals(){

    const modal=document.querySelector(".modal");

    if(!modal) return;

    const body=modal.querySelector(".modal-body");

    const scoutLaw={

        trustworthy:{
            title:"A Scout is Trustworthy.",
            body:"A Scout tells the truth and keeps promises. Honesty is a part of the Scout's code of conduct."
        },

        loyal:{
            title:"A Scout is Loyal.",
            body:"A Scout is true to family, friends, Scout leaders, and school, as well as nation and world communities."
        },

        helpful:{
            title:"A Scout is Helpful.",
            body:"A Scout is concerned about other people, willingly volunteering to help others without expecting payment or reward."
        },

        friendly:{
            title:"A Scout is Friendly.",
            body:"A Scout is a friend to all, seeking to understand others. The Scout respects those with ideas and customs that are different from the Scout's own."
        },

        courteous:{
            title:"A Scout is Courteous.",
            body:"A Scout is polite to everyone regardless of age or position, knowing that good manners make it easier for people to get along together."
        },

        kind:{
            title:"A Scout is Kind.",
            body:"A Scout understands that there is strength in being gentle, treats others with the same respect the Scout wants in return, and does not harm or kill anything without reason."
        },

        obedient:{
            title:"A Scout is Obedient.",
            body:"A Scout follows the rules of the family, school, and troop, and obeys the laws of the community and country. If these rules are deemed unfair, the Scout attempts to change them in an orderly manner rather than disobey them."
        },

        cheerful:{
            title:"A Scout is Cheerful.",
            body:"A Scout looks for the bright side of life, cheerfully doing tasks and trying to make others happy."
        },

        thrifty:{
            title:"A Scout is Thrifty.",
            body:"A Scout saves for the future, protects and conserves natural resources, and uses time and property carefully."
        },

        brave:{
            title:"A Scout is Brave.",
            body:"A Scout can face danger even while being afraid, yet has the courage to stand for what is right even if others ridicule or threaten."
        },

        clean:{
            title:"A Scout is Clean.",
            body:"A Scout keeps the body, mind, and spirit clean, and associates with those who believe in living by these same ideals."
        },

        reverent:{
            title:"A Scout is Reverent.",
            body:"A Scout is faithful, demonstrates that faith in both word and action, and respects the beliefs of others."
        }

    };

    document.querySelectorAll("[data-modal]").forEach(button=>{

        button.addEventListener("click",()=>{

            const id=button.dataset.modal;

            const content=document.getElementById(id);

            if(!content) return;

            body.innerHTML=content.innerHTML;

            modal.classList.add("open");

            document.body.style.overflow="hidden";

        });

    });

    document.querySelectorAll(".law-pill").forEach(button=>{

        button.addEventListener("click",()=>{

            const law=scoutLaw[button.dataset.law];

            if(!law) return;

            body.innerHTML=`
                <h2>${law.title}</h2>
                <p>${law.body}</p>
            `;

            modal.classList.add("open");

            document.body.style.overflow="hidden";

        });

    });

    modal.addEventListener("click",(event)=>{

        if(

            event.target===modal ||

            event.target.classList.contains("modal-close")

        ){

            closeModal();

        }

    });

    document.addEventListener("keydown",(event)=>{

        if(event.key==="Escape"){

            closeModal();

        }

    });

    function closeModal(){

        modal.classList.remove("open");

        document.body.style.overflow="";

    }

}

/*=========================================================
ACCORDIONS
=========================================================*/

function initAccordion(){

    document.querySelectorAll(".accordion-header")

    .forEach(button=>{

        button.addEventListener("click",()=>{

            button.parentElement.classList.toggle("open");

        });

    });

}

/*=========================================================
LIGHTBOX GALLERY
=========================================================*/

function initGallery(){

    const images=document.querySelectorAll(".gallery img");

    if(images.length===0) return;

    const overlay=document.createElement("div");

    overlay.className="modal";

    overlay.innerHTML=`
        <div class="modal-window">
            <button class="modal-close">&times;</button>
            <img class="lightbox-image" alt="">
        </div>
    `;

    document.body.appendChild(overlay);

    const image=overlay.querySelector(".lightbox-image");

    images.forEach(img=>{

        img.addEventListener("click",()=>{

            image.src=img.src;
            image.alt=img.alt;

            overlay.classList.add("open");

            document.body.style.overflow="hidden";

        });

    });

    overlay.addEventListener("click",(e)=>{

        if(

            e.target===overlay ||

            e.target.classList.contains("modal-close")

        ){

            overlay.classList.remove("open");

            document.body.style.overflow="";

        }

    });

}

/*=========================================================
AUTO YEAR
=========================================================*/

const year=document.getElementById("copyright-year");

if(year){

    year.textContent=new Date().getFullYear();

}

/*=========================================================
YEARS OF SCOUTING
=========================================================*/

const founded=document.querySelector("[data-founded]");

if(founded){

    founded.dataset.counter=

        new Date().getFullYear()-1962;

}

/*=========================================================
SMOOTH SCROLL LINKS
=========================================================*/

document.querySelectorAll('a[href^="#"]')

.forEach(link=>{

    link.addEventListener("click",event=>{

        const target=document.querySelector(

            link.getAttribute("href")

        );

        if(!target) return;

        event.preventDefault();

        target.scrollIntoView({

            behavior:"smooth",

            block:"start"

        });

    });

});

/*=========================================================
EAGLE SCOUT DATABASE
=========================================================*/

initEagleScouts();

function normalize(text){

    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .toLowerCase();

}

async function initEagleScouts(){

    const container=document.getElementById("eagle-years-container");

    if(!container) return;

    const search=document.getElementById("eagle-search");

    const jump=document.getElementById("year-jump");

    const results=document.getElementById("search-results");

    const total=document.getElementById("eagle-total");

    const years=document.getElementById("eagle-years");

    const response=await fetch("data/eagles.csv");

    const text=await response.text();

    const rows=text.trim().split("\n").slice(1);

    const eagles=rows.map(row=>{

        const cols=row.split(",");

        return{

            year:cols[0],

            number:cols[1],

            first:cols[2],

            middle:cols[3],

            last:cols[4],

            suffix:cols[5]||""

        };

    });

total.dataset.counter=eagles.length;

years.dataset.counter=

    new Date().getFullYear()-1967+1;

 initCounters();

    const grouped={};

    eagles

        .sort((a,b)=>b.number-a.number)

        .forEach(eagle=>{

            if(!grouped[eagle.year]){

                grouped[eagle.year]=[];

            }

            grouped[eagle.year].push(eagle);

        });

    Object.keys(grouped)

        .sort((a,b)=>b-a)

        .forEach(year=>{

            const button=document.createElement("button");

            button.className="year-pill";

            button.textContent=year;

            button.onclick=()=>{

                document.getElementById(

                    "year-"+year

                ).scrollIntoView({

                    behavior:"smooth",

                    block:"start"

                });

            };

            jump.appendChild(button);

            const card=document.createElement("div");

            card.className="content-card year-card";

            card.id="year-"+year;

            const heading=document.createElement("h2");

            heading.textContent=year;

            heading.style.textAlign="center";

            card.appendChild(heading);

            grouped[year].forEach(eagle=>{

                const p=document.createElement("p");

                p.className="eagle-entry";

                let name=eagle.first;

                if(eagle.middle){

                    name+=" "+eagle.middle;

                }

                name+=" "+eagle.last;

                if(eagle.suffix){

                    name+=" "+eagle.suffix;

                }

                p.innerHTML=

                    "<strong>"+

                    eagle.number+

                    ".</strong> "+

                    name;

                card.appendChild(p);

            });

            container.appendChild(card);

        });

    search.addEventListener("input",()=>{

        const query=normalize(search.value.trim());

if(query===""){

    results.innerHTML="";

    container.style.display="grid";

container.style.gridTemplateColumns=
    "repeat(auto-fit,minmax(340px,1fr))";

    return;

}

container.style.display="none";

results.innerHTML="";

container.style.gridTemplateColumns="1fr";

const numberSearch=/^\d+$/.test(query);

const matches=eagles.filter(eagle=>{

    if(numberSearch){

        return eagle.number===query;

    }

    const full=normalize(

    eagle.number+" "+

    eagle.first+" "+

    eagle.middle+" "+

    eagle.last+" "+

    eagle.suffix

);

    return full.includes(query);

});

        if(matches.length===0){

            results.innerHTML=`

                <div class="content-card">

                    <h2>No Results</h2>

                    <p style="text-align:center;">

                        No Eagle Scouts matched your search.

                    </p>

                </div>

            `;

            return;

        }

        matches

            .sort((a,b)=>b.number-a.number)

            .forEach(eagle=>{

                const card=document.createElement("div");

                card.className="content-card";

                let name=eagle.first;

                if(eagle.middle){

                    name+=" "+eagle.middle;

                }

                name+=" "+eagle.last;

                if(eagle.suffix){

                    name+=" "+eagle.suffix;

                }

                card.innerHTML=`

                    <h3>

                        ${eagle.number}. ${name}

                    </h3>

                    <p>

                        Eagle Scout Class of ${eagle.year}

                    </p>

                `;

                results.appendChild(card);

            });

    });

}

/*=========================================================
TIMELINE DATABASE
=========================================================*/

initTimeline();

async function initTimeline(){

    const container=document.getElementById("timeline-container");

    if(!container) return;

    const response=await fetch("data/timeline.csv");

    const text=await response.text();

    const rows=text.trim().split("\n").slice(1);

const events=rows.map(row=>{

    const firstComma=row.indexOf(",");

    return{

        year:row.substring(0,firstComma),

        event:row
            .substring(firstComma+1)
            .replace(/^"|"$/g,"")

    };

});

    const grouped={};

    events.forEach(event=>{

        if(!grouped[event.year]){

            grouped[event.year]=[];

        }

        grouped[event.year].push(event.event);

    });

    Object.keys(grouped)

        .sort((a,b)=>b-a)

        .forEach(year=>{

            const item=document.createElement("div");

            item.className="timeline-item";

            const paragraphs=grouped[year]

                .map(text=>`<p>${text}</p>`)

                .join("");

            item.innerHTML=`

                <div class="timeline-year">

                    ${year}

                </div>

                <div class="timeline-marker"></div>

                <div class="timeline-content">

                    ${paragraphs}

                </div>

            `;

            container.appendChild(item);

        });

}

/*=========================================================
LEADERSHIP DATABASE
=========================================================*/

initLeadership();

async function initLeadership(){

    const splAspl=document.getElementById("spl-aspl-container");

    if(!splAspl) return;

    const plApl=document.getElementById("pl-apl-container");

    const troop=document.getElementById("troop-position-container");

    const splHistory=document.getElementById("spl-history-container");

    const smAsm=document.getElementById("sm-asm-container");

    const committee=document.getElementById("committee-container");

    const smHistory=document.getElementById("sm-history-container");

    const files={

        splAspl:"data/spl-aspl-current.csv",

        plApl:"data/pl-apl-current.csv",

        troop:"data/troop-position-current.csv",

        splHistory:"data/spl-history.csv",

        smAsm:"data/sm-asm-current.csv",

        committee:"data/committee-current.csv",

        smHistory:"data/sm-history.csv"

    };

    async function loadCSV(file){

        const text=await fetch(file).then(r=>r.text());

        return text.trim().split("\n").slice(1).map(row=>

            row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)

               .map(col=>col.replace(/^"|"$/g,""))

        );

    }

    const currentYouth=await loadCSV(files.splAspl);

    const patrols=await loadCSV(files.plApl);

    const troopPositions=await loadCSV(files.troop);

    const youthHistory=await loadCSV(files.splHistory);

    const currentAdults=await loadCSV(files.smAsm);

    const committeeRows=await loadCSV(files.committee);

    const adultHistory=await loadCSV(files.smHistory);

    function buildCurrent(container,title,data){

        container.innerHTML=`<h2>${title}</h2>`;

        data.forEach(row=>{

            const div=document.createElement("div");

            div.className="leader-row";

            div.innerHTML=`

                <div class="leader-position">

                    ${row[0]}

                </div>

                <div class="leader-name">

                    ${row[1]}

                    ${
                        row[2]
                        ? `<span class="leader-note">${row[2]}</span>`
                        : ""
                    }

                </div>

            `;

            container.appendChild(div);

        });

    }

    function buildHistory(container,title,data,left,right){

        container.innerHTML=`<h2>${title}</h2>`;

        const table=document.createElement("table");

        table.className="history-table";

        table.innerHTML=`

            <thead>

                <tr>

                    <th>Years</th>

                    <th>${left}</th>

                    <th>${right}</th>

                </tr>

            </thead>

            <tbody></tbody>

        `;

        const body=table.querySelector("tbody");

        data.forEach(row=>{

            body.innerHTML+=`

                <tr>

                    <td>

                        ${row[0]}–${row[1]}

                    </td>

                    <td>

                        ${row[2]}

                    </td>

                    <td>

                        ${row[3]}

                    </td>

                </tr>

            `;

        });

        container.appendChild(table);

    }

    buildCurrent(

        splAspl,

        "Senior Patrol Leadership",

        currentYouth

    );

    buildCurrent(

        plApl,

        "Patrol Leadership",

        patrols

    );

    buildCurrent(

        troop,

        "Troop Positions",

        troopPositions

    );

    buildCurrent(

        smAsm,

        "Scoutmaster Corps",

        currentAdults

    );

    buildCurrent(

        committee,

        "Troop Committee",

        committeeRows

    );

    buildHistory(

        splHistory,

        "Senior Patrol Leader History",

        youthHistory,

        "SPL",

        "ASPL"

    );

    buildHistory(

        smHistory,

        "Scoutmaster History",

        adultHistory,

        "Scoutmaster",

        ""

    );

}
