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

        threshold:.15

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

    document.querySelectorAll("[data-modal]").forEach(button=>{

        button.addEventListener("click",()=>{

            const id=button.dataset.modal;

            const content=document.getElementById(id);

            if(!content) return;

            const body=modal.querySelector(".modal-body");

            body.innerHTML=content.innerHTML;

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
