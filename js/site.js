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

 initLeadership().then(()=>{

    initLeadershipModals();

});

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
            title:"A Scout is trustworthy.",
            body:"A Scout tells the truth and keeps promises. Honesty is a part of the Scout's code of conduct."
        },

        loyal:{
            title:"A Scout is loyal.",
            body:"A Scout is true to family, friends, Scout leaders, and school, as well as nation and world communities."
        },

        helpful:{
            title:"A Scout is helpful.",
            body:"A Scout is concerned about other people, willingly volunteering to help others without expecting payment or reward."
        },

        friendly:{
            title:"A Scout is friendly.",
            body:"A Scout is a friend to all, seeking to understand others. The Scout respects those with ideas and customs that are different from the Scout's own."
        },

        courteous:{
            title:"A Scout is courteous.",
            body:"A Scout is polite to everyone regardless of age or position, knowing that good manners make it easier for people to get along together."
        },

        kind:{
            title:"A Scout is kind.",
            body:"A Scout understands that there is strength in being gentle, treats others with the same respect the Scout wants in return, and does not harm or kill anything without reason."
        },

        obedient:{
            title:"A Scout is obedient.",
            body:"A Scout follows the rules of the family, school, and troop, and obeys the laws of the community and country. If these rules are deemed unfair, the Scout attempts to change them in an orderly manner rather than disobey them."
        },

        cheerful:{
            title:"A Scout is cheerful.",
            body:"A Scout looks for the bright side of life, cheerfully doing tasks and trying to make others happy."
        },

        thrifty:{
            title:"A Scout is thrifty.",
            body:"A Scout saves for the future, protects and conserves natural resources, and uses time and property carefully."
        },

        brave:{
            title:"A Scout is brave.",
            body:"A Scout can face danger even while being afraid, yet has the courage to stand for what is right even if others ridicule or threaten."
        },

        clean:{
            title:"A Scout is clean.",
            body:"A Scout keeps the body, mind, and spirit clean, and associates with those who believe in living by these same ideals."
        },

        reverent:{
            title:"A Scout is reverent.",
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

async function initLeadership(){

    const loadCSV = async(file)=>{

        const text = await fetch(file)
            .then(r=>r.text());

        return text.trim()
            .split("\n")
            .slice(1)
            .map(row=>

                row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
                .map(col=>col.replace(/^"|"$/g,""))

            );

    };


function button(label){

    return `

        <button class="position-button">

            <span class="position-label">${label}</span>

            <span class="position-arrow">›</span>

        </button>

    `;

}


    function historyCard(years,content){

        return `

            <div class="history-card">

                <div class="history-years">
                    ${years}
                </div>

                ${content.join("")}

            </div>

        `;

    }



    const buildButtons=(id,file,icons)=>{

        const container=document.getElementById(id);

        if(!container) return;

        loadCSV(file).then(rows=>{

            container.innerHTML="";

            [...new Set(rows.map(r=>r[0]))]

            .forEach(position=>{

                container.innerHTML += button(

                    icons[position] || "⚜️",

                    position

                );

            });

        });

    };



    buildButtons(

        "spl-aspl-buttons",

        "data/spl-aspl-current.csv",

        {

            "Senior Patrol Leader":"⚜️",

            "Assistant Senior Patrol Leader":"⭐"

        }

    );



    buildButtons(

        "pl-apl-buttons",

        "data/pl-apl-current.csv",

        {

            "Patrol Leader":"🧭",

            "Assistant Patrol Leader":"🥾"

        }

    );



    buildButtons(

        "troop-position-buttons",

        "data/troop-position-current.csv",

        {

            "Junior Assistant Scoutmaster":"🦅",

            "Troop Guide":"🥾",

            "Order of the Arrow Representative":"🏹",

            "Chaplain Aide":"🙏",

            "Outdoor Ethics Guide":"🌲",

            "Webmaster":"💻",

            "Historian":"📷",

            "Librarian":"📚",

            "Quartermaster":"📦",

            "Scribe":"✏️",

            "Bugler":"🎺"

        }

    );



    buildButtons(

        "sm-asm-buttons",

        "data/sm-asm-current.csv",

        {

            "Scoutmaster":"👨‍🏫",

            "Assistant Scoutmaster":"🧑‍🏫"

        }

    );



    buildButtons(

        "committee-buttons",

        "data/committee-current.csv",

        {

            "Executive Officer":"⛪",

            "Chartered Organization Representative":"🤝",

            "Committee Chair":"📋",

            "Committee Member":"👥"

        }

    );



    const splHistory=document.getElementById(
        "spl-history-container"
    );


    if(splHistory){

        const rows=await loadCSV(
            "data/spl-history.csv"
        );


        splHistory.innerHTML="";


        rows.forEach(r=>{

            splHistory.innerHTML += historyCard(

                `${r[0]}–${r[1]}`,

                [

                    `
                    <div class="history-role">
                        <strong>SPL</strong>
                        ${r[2]}
                    </div>
                    `,

                    `
                    <div class="history-role smaller">
                        <strong>ASPL</strong>
                        ${r[3]}
                    </div>
                    `

                ]

            );

        });

    }



    const smHistory=document.getElementById(
        "sm-history-container"
    );


    if(smHistory){

        const rows=await loadCSV(
            "data/sm-history.csv"
        );


        smHistory.innerHTML="";


        rows.forEach(r=>{

            smHistory.innerHTML += historyCard(

                `${r[0]}–${r[1]}`,

                [

                    `
                    <div class="history-role">
                        ${r[2]}
                    </div>
                    `

                ]

            );

        });

    }

}





async function initLeadershipModals(){

    const modal=document.querySelector(".modal");

    const modalBody=document.querySelector(".modal-body");

    const close=document.querySelector(".modal-close");


    if(!modal || !modalBody) return;



    const descriptions={

        "Senior Patrol Leader":
        "The senior patrol leader is the primary link between a troop's Scouts and its adult leaders, leading troop meetings, patrol leaders' council meetings, and helping plan troop activities.",

        "Assistant Senior Patrol Leader":
        "The assistant senior patrol leader acts as senior patrol leader when needed and provides leadership to other youth leaders.",

        "Patrol Leader":
        "Patrol leaders keep their patrols organized and help Scouts work together.",

        "Assistant Patrol Leader":
        "The assistant patrol leader supports the patrol leader and acts in their absence.",

        "Troop Guide":
        "Troop guides mentor new Scouts, teach basic skills, and help them become familiar with troop operations.",

        "Quartermaster":
        "The quartermaster maintains troop equipment and keeps gear organized and ready.",

        "Chaplain Aide":
        "Chaplain aides support the troop chaplain and help meet the religious needs of the troop.",

        "Webmaster":
        "The webmaster maintains the troop website and ensures information remains accurate and up to date.",

        "Outdoor Ethics Guide":
        "Outdoor ethics guides promote Leave No Trace, the Outdoor Code, and responsible outdoor practices.",

        "Scoutmaster":
        "The Scoutmaster provides direction, coaching, and support while working directly with Scouts.",

        "Assistant Scoutmaster":
        "Assistant Scoutmasters support the Scoutmaster in delivering the Scouting program.",

        "Executive Officer":
        "The executive officer leads the chartered organization and supports the continuation of Scouting.",

        "Chartered Organization Representative":
        "The chartered organization representative connects the troop, chartered organization, district, and council.",

        "Committee Chair":
        "The committee chair organizes and supervises the troop committee.",

        "Committee Member":
        "Committee members support troop administration and provide resources that allow Scout leaders to focus on working with Scouts."

    };



    const holders={};



    async function loadHolders(file){

        const rows=await fetch(file)
        .then(r=>r.text())
        .then(text=>

            text.trim()
            .split("\n")
            .slice(1)
            .map(row=>

                row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
                .map(col=>col.replace(/^"|"$/g,""))

            )

        );


        rows.forEach(row=>{

            if(!holders[row[0]])

                holders[row[0]]=[];


            holders[row[0]].push({

                name:row[1],

                note:row[2]

            });

        });

    }



    await loadHolders("data/spl-aspl-current.csv");
    await loadHolders("data/pl-apl-current.csv");
    await loadHolders("data/troop-position-current.csv");
    await loadHolders("data/sm-asm-current.csv");
    await loadHolders("data/committee-current.csv");



    document.querySelectorAll(".position-button")

    .forEach(button=>{


        button.addEventListener("click",()=>{


            const position =
                button.querySelector(".position-label")
                .textContent
                .trim();



            const people = holders[position] || [];



            modalBody.innerHTML=`

    <h2>${position}</h2>

    ${people.map(person=>`

        <div class="modal-person ${position==="Assistant Scoutmaster" ? "modal-many" : ""} ${position==="Committee Member" ? "modal-committee" : ""}">

            ${person.name}

            ${
                person.note
                ?
                `<span>${person.note}</span>`
                :
                ""
            }

        </div>

    `).join("")}

    <p class="modal-description">

        ${descriptions[position] || ""}

    </p>

`;


            modal.classList.add("open");

            document.body.style.overflow="hidden";


        });


    });



    function closeModal(){

        modal.classList.remove("open");

        document.body.style.overflow="";

    }



    close.addEventListener(
        "click",
        closeModal
    );


    modal.addEventListener(
        "click",
        e=>{

            if(e.target===modal){

                closeModal();

            }

        }

    );


}
