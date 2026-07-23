document.addEventListener("DOMContentLoaded", () => {

    initMobileMenu();

    initDropdowns();

    const heroImage = document.querySelector(".hero-image img");

    if(heroImage){

        if(heroImage.complete){

            initScrollAnimations();

        }else{

            heroImage.addEventListener("load", initScrollAnimations);

        }

    }else{

        initScrollAnimations();

    }

    initCounters();

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
AUTO YEAR
=========================================================*/

const year=document.getElementById("copyright-year");

if(year){

    year.textContent=new Date().getFullYear();

}

/*=========================================================
EAGLE SCOUT DATABASE
=========================================================*/

initEagleScouts();

function normalize(text){

    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .replace(/[.'’,\-]/g,"")
        .replace(/\s+/g," ")
        .trim()
        .toLowerCase();

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

            grouped[year].slice().reverse().forEach(eagle=>{

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

                `${eagle.number} ${eagle.first} ${eagle.middle} ${eagle.last} ${eagle.suffix}`

            );

            const firstLast=normalize(

                `${eagle.first} ${eagle.last}`

            );

            const firstMiddleLast=normalize(

                `${eagle.first} ${eagle.middle} ${eagle.last}`

            );

            return(

                full.includes(query) ||

                firstLast.includes(query) ||

                firstMiddleLast.includes(query)

            );

        });

        if(matches.length===0){

            results.innerHTML=`

                <div class="search-empty">

                    <h2>No Results</h2>

                    <p>No Eagle Scouts matched your search.</p>

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

                        <span style="color:var(--red);">

                            ${eagle.number}.

                        </span>

                        ${name}

                    </h3>

                    <p>

                        Eagle Scout Class of ${eagle.year}

                    </p>

                `;

                results.appendChild(card);

            });

    });

}
