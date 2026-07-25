if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
}

document.addEventListener("DOMContentLoaded", () => {
    window.scrollTo(0, 0);
    initMobileMenu();
    initDropdowns();
    if(!document.getElementById("spl-aspl-buttons")){
        const heroImage = document.querySelector(".hero-photo img");
        if(heroImage){
            if(heroImage.complete){
                initScrollAnimations();
            }else{
                heroImage.addEventListener("load", initScrollAnimations);
            }
        }else{
            initScrollAnimations();
        }
    }
    initCounters();
    initModals();
    initAccordion();
    initLeadership().then(()=>{
        initLeadershipModals();
        initScrollAnimations();
        });
});

function initMobileMenu(){
    const button=document.querySelector(".mobile-menu-button");
    const menu=document.querySelector(".desktop-nav");
    if(!button || !menu) return;
    button.addEventListener("click",()=>{
        menu.classList.toggle("mobile-open");
        button.classList.toggle("open");
        });

}

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

function initScrollAnimations(){
    const items=document.querySelectorAll(".fade-up");
    if(items.length===0) return;
    const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
            if(entry.isIntersecting){
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    },{
        threshold: 0.5,
    });
    items.forEach(item=>observer.observe(item));
}

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
    const target=parseInt(element.dataset.counter,10);
    const duration=1800;
    const startTime=performance.now();
    function update(now){
        const progress=Math.min((now-startTime)/duration,1);
        const value=Math.floor(progress*target);
        element.textContent=value;
        if(progress<1){
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

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
            body.innerHTML=`<h2>${law.title}</h2><p>${law.body}</p>`;
            modal.classList.add("open");
            document.body.style.overflow="hidden";
        });
    });
    modal.addEventListener("click",(event)=>{
        if(event.target===modal || event.target.classList.contains("modal-close")){
            closeModal();
        }
    });
    document.addEventListener("keydown",(event)=>{
        if(event.key==="Escape"){
            closeModal();
        }
    });
    function closeModal(){
        modal.style.pointerEvents="none";
        modal.classList.remove("open");
        document.body.style.overflow="";
        setTimeout(()=>{
            modal.style.pointerEvents="";
            },300);
        }
}

function initAccordion(){
    document.querySelectorAll(".accordion-header")
    .forEach(button=>{
        button.addEventListener("click",()=>{
            button.parentElement.classList.toggle("open");
        });
    });
}

const year=document.getElementById("copyright-year");
if(year){
    year.textContent=new Date().getFullYear();
}

const founded=document.querySelector("[data-founded]");
if(founded){
    founded.dataset.counter=new Date().getFullYear()-1962;
}

document.querySelectorAll('a[href^="#"]').forEach(link=>{
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

initEagleScouts();

function normalize(text){
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[.'’,\-]/g,"").replace(/\s+/g," ").trim().toLowerCase();
}

async function initEagleScouts(){
    const container=document.getElementById("eagle-years-container");
    const search=document.getElementById("eagle-search");
    const jump=document.getElementById("year-jump");
    const results=document.getElementById("search-results");
    const total=document.getElementById("eagle-total");
    const response=await fetch("data/eagles.csv");
    const text=await response.text();
    const rows=text.trim().split("\n").slice(1);
    const eagles=rows.map(row=>{
        const cols=row.split(",");
        return{year:cols[0],number:cols[1],first:cols[2],middle:cols[3],last:cols[4],suffix:cols[5]||""};
    });
    total.dataset.counter=eagles.length;
    initCounters();
    const grouped={};
    eagles.sort((a,b)=>b.number-a.number).forEach(eagle=>{
        if(!grouped[eagle.year]){
            grouped[eagle.year]=[];
        }
        grouped[eagle.year].push(eagle);
    });
    Object.keys(grouped).sort((a,b)=>b-a).forEach(year=>{
        const button=document.createElement("button");
        button.className="year-pill";
        button.textContent=year;
        button.onclick=()=>{
            document.getElementById("year-"+year).scrollIntoView({
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
            p.innerHTML="<strong>"+eagle.number+".</strong> "+name;
            card.appendChild(p);
        });
        container.appendChild(card);
    });
    search.addEventListener("input",()=>{
        const query=normalize(search.value.trim());
        if(query===""){
            results.innerHTML="";
            container.style.display="grid";
            container.style.gridTemplateColumns="repeat(auto-fit,minmax(340px,1fr))";
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
            const full = normalize(`${eagle.number} ${eagle.first} ${eagle.middle} ${eagle.last} ${eagle.suffix}`);
            const firstLast = normalize(`${eagle.first} ${eagle.last}`);
            const firstMiddleLast = normalize(`${eagle.first} ${eagle.middle} ${eagle.last}`);
            return (full.includes(query) || firstLast.includes(query) || firstMiddleLast.includes(query));
        });
        if(matches.length===0){
            results.innerHTML = `<div class="search-empty"><h2>No Results</h2><p>No Eagle Scouts matched your search.</p></div>`;
            return;
        }
        matches.sort((a,b)=>b.number-a.number).forEach(eagle=>{
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
            card.innerHTML=`<h3><span style="color:var(--red);">${eagle.number}.</span> ${name}</h3><p>Eagle Scout Class of ${eagle.year}</p>`;
            results.appendChild(card);
        });
    });
}

initTimeline();

async function initTimeline(){
    const container=document.getElementById("timeline-container");
    if(!container) return;
    const response=await fetch("data/timeline.csv");
    const text=await response.text();
    const rows=text.trim().split("\n").slice(1);
    const events=rows.map(row=>{
        const firstComma=row.indexOf(",");
        return{year:row.substring(0,firstComma),event:row.substring(firstComma+1).replace(/^"|"$/g,"")};
    });
    const grouped={};
    events.forEach(event=>{
        if(!grouped[event.year]){
            grouped[event.year]=[];
        }
        grouped[event.year].push(event.event);
    });
    Object.keys(grouped).sort((a,b)=>b-a).forEach(year=>{
        const item=document.createElement("div");
        item.className="timeline-item";
        const paragraphs=grouped[year].map(text=>`<p>${text}</p>`).join("");
        item.innerHTML=`<div class="timeline-year">${year}</div><div class="timeline-marker"></div><div class="timeline-content">${paragraphs}</div>`;
        container.appendChild(item);
    });
}

async function initLeadership(){
    const loadCSV = async(file)=>{
        const text = await fetch(file).then(r=>r.text());
        return text.trim().split("\n").slice(1).map(row=>row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(col=>col.replace(/^"|"$/g,"")));
    };
    function button(position){
        return `<button class="position-button"><span class="position-label">${position}</span><span class="position-arrow">›</span></button>`;
    }
    function historyCard(years,content){
        return `<div class="history-card"><div class="history-years">${years}</div>${content.join("")}</div>`;
    }
    const buildButtons=(id,file,icons)=>{
        const container=document.getElementById(id);
        if(!container) return;
        loadCSV(file).then(rows=>{
            container.innerHTML="";
            const positionOrder = {
                "spl-aspl-buttons": ["Senior Patrol Leader","Assistant Senior Patrol Leader"],
                "pl-apl-buttons": ["Patrol Leader","Assistant Patrol Leader"],
                "troop-position-buttons": ["Junior Assistant Scoutmaster","Order of the Arrow Representative","Troop Guide","Chaplain Aide","Outdoor Ethics Guide","Webmaster","Historian","Librarian","Quartermaster","Scribe","Bugler"],
                "sm-asm-buttons": ["Scoutmaster","Assistant Scoutmaster"],
                "committee-buttons": ["Executive Officer","Chartered Organization Representative","Committee Chair","Committee Member"]
            };
            const positions = [...new Set(rows.map(r => r[0]))];
            (positionOrder[id] || positions).filter(position => positions.includes(position)).forEach(position => {
                container.innerHTML += button(position);
            });
        });
    };
    buildButtons("spl-aspl-buttons","data/spl-aspl-current.csv",{"Senior Patrol Leader":"⚜️","Assistant Senior Patrol Leader":"⭐"});
    buildButtons("pl-apl-buttons","data/pl-apl-current.csv",{"Patrol Leader":"🧭","Assistant Patrol Leader":"🥾"});
    buildButtons("troop-position-buttons","data/troop-position-current.csv",{"Junior Assistant Scoutmaster":"🦅","Troop Guide":"🥾","Order of the Arrow Representative":"🏹","Chaplain Aide":"🙏","Outdoor Ethics Guide":"🌲","Webmaster":"💻","Historian":"📷","Librarian":"📚","Quartermaster":"📦","Scribe":"✏️","Bugler":"🎺"});
    buildButtons("sm-asm-buttons","data/sm-asm-current.csv",{"Scoutmaster":"👨‍🏫","Assistant Scoutmaster":"🧑‍🏫"});
    buildButtons("committee-buttons","data/committee-current.csv",{"Executive Officer":"⛪","Chartered Organization Representative":"🤝","Committee Chair":"📋","Committee Member":"👥"});
    const splHistory=document.getElementById("spl-history-container");
    if(splHistory){
        const rows=await loadCSV("data/spl-history.csv");
        splHistory.innerHTML="";
        [...rows].reverse().forEach(r=>{
            splHistory.innerHTML += historyCard(r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`, [`<div class="history-role"><strong>SPL</strong>${r[2]}</div>`,`<div class="history-role smaller"><strong>ASPL</strong>${r[3]}</div>`]);
        });
    }
    const smHistory=document.getElementById("sm-history-container");
    if(smHistory){
        const rows=await loadCSV("data/sm-history.csv");
        smHistory.innerHTML="";
        [...rows].reverse().forEach(r=>{
            smHistory.innerHTML += historyCard(r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`, [`<div class="history-role even-smaller history-title"><strong> </strong></div><div class="history-role history-name">${r[2]}</div><div class="history-role even-smaller history-title"><strong> </strong></div>`]);
        });
    }
}

async function initLeadershipModals(){
    const modal=document.querySelector(".modal");
    const modalBody=document.querySelector(".modal-body");
    const close=document.querySelector(".modal-close");
    if(!modal || !modalBody) return;
    const descriptions={
        "Senior Patrol Leader":"The senior patrol leader is the primary link between a troop's Scouts and its adult leaders, leading troop meetings, patrol leaders' council meetings, and helping plan troop activities.",
        "Assistant Senior Patrol Leader":"The assistant senior patrol leader acts as senior patrol leader when needed and provides leadership to other youth leaders.",
        "Patrol Leader":"Patrol leaders keep the patrols organized and help Scouts work together.",
        "Assistant Patrol Leader":"The assistant patrol leader supports the patrol leader and acts in the patrol leader's absence.",
        "Troop Guide":"Troop guides mentor new Scouts, teach basic skills, and help them become familiar with troop operations.",
        "Quartermaster":"The quartermaster maintains troop equipment and keeps gear organized and ready.",
        "Chaplain Aide":"Chaplain aides support the troop chaplain and help meet the religious needs of the troop.",
        "Webmaster":"The webmaster maintains the troop website and ensures information remains accurate and up to date.",
        "Outdoor Ethics Guide":"Outdoor ethics guides promote Leave No Trace, the Outdoor Code, and responsible outdoor practices.",
        "Historian":"The historian preserves the troop's history by collecting photographs, records, and memorabilia while documenting important events and activities.",
        "Librarian":"The librarian maintains the troop's library of merit badge pamphlets, handbooks, and other resources, helping Scouts locate the materials they need.",
        "Junior Assistant Scoutmaster":"The junior assistant Scoutmaster is an experienced older Scout who serves as a leader and mentor, helping the Scoutmaster and assistant Scoutmasters with troop operations.",
        "Order of the Arrow Representative":"The Order of the Arrow representative serves as the link between the troop and the Order of the Arrow, encouraging participation in OA events and promoting its principles.",
        "Scribe":"The scribe keeps troop records, attendance, meeting notes, and other important information for the troop.",
        "Bugler":"The bugler plays bugle calls during troop meetings, ceremonies, campouts, and other Scouting events.",
        "Scoutmaster":"The Scoutmaster provides direction, coaching, and support while working directly with Scouts.",
        "Assistant Scoutmaster":"Assistant Scoutmasters support the Scoutmaster in delivering the Scouting program.",
        "Executive Officer":"The executive officer leads the chartered organization and supports the continuation of Scouting.",
        "Chartered Organization Representative":"The chartered organization representative connects the troop, chartered organization, district, and council.",
        "Committee Chair":"The committee chair organizes and supervises the troop committee.",
        "Committee Member":"Committee members support troop administration and provide resources that allow Scout leaders to focus on working with Scouts."
    };
    const holders={};
    async function loadHolders(file){
        const rows=await fetch(file).then(r=>r.text()).then(text=>text.trim().split("\n").slice(1).map(row=>row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(col=>col.replace(/^"|"$/g,""))));
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
    document.querySelectorAll(".position-button").forEach(button=>{
        button.addEventListener("click",()=>{
            const position = button.querySelector(".position-label").textContent.trim();
            const people = holders[position] || [];
            modalBody.innerHTML=`<h2>${position}</h2>${people.map(person=>`<div class="modal-person ${position==="Assistant Scoutmaster" ? "modal-many" : ""} ${position==="Committee Member" ? "modal-committee" : ""}">${person.name}${person.note?`<span>${person.note}</span>`:""}</div>`).join("")}<p class="modal-description">${descriptions[position] || ""}</p>`;
            modal.classList.add("open");
            document.body.style.overflow="hidden";
        });
    });
    function closeModal(){
        modal.classList.remove("open");
        document.body.style.overflow="";
    }
    close.addEventListener("click",closeModal);
    modal.addEventListener("click",e=>{
        if(e.target===modal){
            closeModal();
        }
    });
}

initAdvancement();

async function initAdvancement(){
    const grid=document.getElementById("rank-grid");
    const modal=document.querySelector(".modal");
    const body=modal.querySelector(".modal-body");
    if(!grid || !modal || !body) return;
    const text=await fetch("data/rank-requirements.csv").then(r=>r.text());
    const rows=text.trim().split("\n").slice(1).map(row=>row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(col=>col.replace(/^"|"$/g,"")));
    const requirements={};
    rows.forEach(r=>{
        const rank=r[0];
        const requirement=r[1];
        const link=r[2];
        if(!requirements[rank]){
            requirements[rank]=[];
        }
        requirements[rank].push({requirement,link});
    });
    grid.querySelectorAll(".rank-card").forEach(card=>{
        card.addEventListener("click",()=>{
            const rank=card.dataset.rank;
            buildRankModal(rank,requirements[rank] || []);
        });
    });
    function buildRankModal(rank,list){
        body.innerHTML=`<h2>${rank}</h2>`;
        const groups={};
        const simpleRanks = ["Star", "Life", "Eagle"];
        if(simpleRanks.includes(rank)){
            groups["all"] = list;
        }else{
            list.forEach(item=>{
                const group = item.requirement.match(/^\d+/)[0];
                if(!groups[group]){
                    groups[group] = [];
                }
                groups[group].push(item);
            });
        }
        Object.keys(groups).forEach(group=>{
            const section=document.createElement("div");
            section.className="rank-group";
            section.innerHTML=`${group==="all" ? "" : '<div class="rank-divider"></div>'}<div class="requirement-grid"></div>`;
            const grid = section.querySelector(".requirement-grid");
            if(group==="all"){
                grid.classList.add("single-rank");
            }
            groups[group].forEach(item=>{
                const button=document.createElement("button");
                button.className="requirement";
                button.textContent=item.requirement;
                if(item.link && item.link.trim()!==""){
                    button.onclick=()=>{
                        if(!modal.classList.contains("open")) return;
                        window.open(item.link,"_blank");
                    };
                }else{
                    button.classList.add("disabled");
                    button.disabled=true;
                }
                grid.appendChild(button);
            });
            body.appendChild(section);
        });
        modal.classList.add("open");
        document.body.style.overflow="hidden";
    }
}

initKnots();

async function initKnots(){
    const column1=document.getElementById("knot-column-1");
    const column2=document.getElementById("knot-column-2");
    const column3=document.getElementById("knot-column-3");
    if(!column1) return;
    const rows=await fetch("data/knot-videos.csv").then(r=>r.text()).then(text=>text.trim().split("\n").slice(1).map(row=>row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(col=>col.replace(/^"|"$/g,""))));
    const columns={
        "Square Knot":column1,
        "Two Half-Hitches":column1,
        "Taut-Line Hitch":column1,
        "Sheet Bend Knot":column2,
        "Bowline Knot":column2,
        "Clove Hitch":column3,
        "Timber Hitch":column3
    };
    rows.forEach(row=>{
        const knot=row[0];
        const link=row[1];
        const button=document.createElement("a");
        button.className="knot-button";
        button.textContent=knot;
        button.href=link;
        button.target="_blank";
        button.rel="noopener";
        if(columns[knot]){
            columns[knot].appendChild(button);
        }
    });
}

initAwards();

async function initAwards(){
    const grid=document.getElementById("award-grid");
    if(!grid) return;
    const rows=await fetch("data/award-links.csv").then(r=>r.text()).then(text=>text.trim().split("\n").slice(1).map(row=>row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(col=>col.replace(/^"|"$/g,""))));
    rows.forEach(row=>{
        const button=document.createElement("a");
        button.className="award-button";
        button.textContent=row[0];
        button.href=row[1];
        button.target="_blank";
        button.rel="noopener";
        grid.appendChild(button);
    });
}

initUniform();

function initUniform(){
    const modal=document.querySelector(".modal");
    const body=modal?.querySelector(".modal-body");
    if(!modal || !body) return;
    const items={
        "right-pocket-1":{
            title:"National Jamboree Patch",
            text:"Worn only by Scouts and Scouters who attended a National Scout Jamboree."
        },
        "right-pocket-2":{
            title:"Nametag",
            text:"Commonly worn by adult volunteers at official Scouting events."
        },
        "right-pocket-3":{
            title:"Interpreter Strip",
            text:"Worn by members who are proficient in a language other than English."
        },
        "right-pocket-4":{
            title:"Scouting America",
            text:"Displayed by every member of Scouting America as part of the official uniform."
        },
        "right-pocket-5":{
            title:"OA Lodge Flap",
            text:"The only patch worn on a pocket flap, identifying a member's local Order of the Arrow lodge."
        },
        "right-pocket-6":{
            title:"Temporary Patch",
            text:"Temporary patches are worn here and may include Totin' Chip, Firem'n Chit, Duty to God, special event patches, camp patches, and many others."
        },
        "right-pocket-7":{
            title:"Recruiter Strip",
            text:"Awarded to Scouts who successfully recruit another youth to join Scouting."
        },
        "left-pocket-1":{
            title:"World Crest",
            text:"Worn by all members of the worldwide Scouting movement, which includes organizations outside of Scouting America."
        },
        "left-pocket-2":{
            title:"Service Stars",
            text:"Optional insignia showing the number of years a member has participated in the troop."
        },
        "left-pocket-3":{
            title:"Square Knots",
            text:"Recognize awards earned that may not be displayed on the uniform at all times."
        },
        "left-pocket-4":{
            title:"Award Medals",
            text:"Official medals may be worn on formal occasions to recognize major Scouting achievements and awards."
        },
        "left-pocket-5":{
            title:"Rank Patch",
            text:"Displays the highest rank the Scout has earned."
        },
        "left-pocket-6":{
            title:"Arrow of Light",
            text:"May be worn by Scouts who earned the highest rank in Cub Scouts before joining the troop."
        },
        "right-sleeve-1":{
            title:"Shoulder Loops",
            text:"Green shoulder loops identify participation in Scouting America's main program."
        },
        "right-sleeve-2":{
            title:"American Flag",
            text:"Represents a Scout's duty to country and is worn on every official uniform."
        },
        "right-sleeve-3":{
            title:"Patrol Emblem",
            text:"Shows the patrol to which the Scout belongs."
        },
        "right-sleeve-4":{
            title:"National Honor Patrol",
            text:"May be worn by patrols recognized as National Honor Patrols."
        },
        "left-sleeve-1":{
            title:"Council Shoulder Patch",
            text:"Identifies each Scout and Scouter as a member of Scouting America Long Island."
        },
        "left-sleeve-2":{
            title:"Veteran Unit Bar",
            text:"Shows how many years the troop has continuously served the community."
        },
        "left-sleeve-3":{
            title:"Troop Numerals",
            text:"Identifies the troop number."
        },
        "left-sleeve-4":{
            title:"Founder Strip",
            text:"Exclusive to any founding members of a troop. No current member of Troop 690 is a Founder."
        },
        "left-sleeve-5":{
            title:"Position Patch",
            text:"Identifies the leadership position currently held by the Scout or adult volunteer."
        },
        "left-sleeve-6":{
            title:"Trained Strip",
            text:"Worn by members who have completed official training for their registered position."
        }
    };
    document.querySelectorAll(".uniform-number").forEach(button=>{
        button.addEventListener("click",()=>{
            const item=items[button.dataset.part];
            if(!item) return;
            body.innerHTML=`
                <h3 class="modal-uniform-title">${item.title}</h3>
                <p>${item.text}</p>
            `;
            modal.classList.add("open");
            document.body.style.overflow="hidden";
        });
    });
}
