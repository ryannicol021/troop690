document.addEventListener("DOMContentLoaded", () => {

    initMobileMenu();

    initDropdowns();

    const heroImage = document.querySelector(".hero-photo img");

    if (heroImage) {

        if (heroImage.complete) {

            initScrollAnimations();

        } else {

            heroImage.addEventListener("load", initScrollAnimations);

        }

    } else {

        initScrollAnimations();

    }

    initCounters();

    initModals();

    initTimeline();

});

/*=========================================================
MOBILE MENU
=========================================================*/

function initMobileMenu() {

    const button = document.querySelector(".mobile-menu-button");
    const menu = document.querySelector(".desktop-nav");

    if (!button || !menu) return;

    button.addEventListener("click", () => {

        menu.classList.toggle("mobile-open");
        button.classList.toggle("open");

    });

}

/*=========================================================
DESKTOP DROPDOWNS
=========================================================*/

function initDropdowns() {

    document.querySelectorAll(".nav-dropdown").forEach(dropdown => {

        dropdown.addEventListener("mouseenter", () => {

            dropdown.classList.add("open");

        });

        dropdown.addEventListener("mouseleave", () => {

            dropdown.classList.remove("open");

        });

    });

}

/*=========================================================
SCROLL REVEAL
=========================================================*/

function initScrollAnimations() {

    const items = document.querySelectorAll(
        ".fade-up,.fade-left,.fade-right"
    );

    if (items.length === 0) return;

    const observer = new IntersectionObserver(entries => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add("visible");
                observer.unobserve(entry.target);

            }

        });

    }, {
        threshold: 0.05
    });

    items.forEach(item => observer.observe(item));

}

/*=========================================================
NUMBER COUNTERS
=========================================================*/

function initCounters() {

    const counters = document.querySelectorAll("[data-counter]");

    if (counters.length === 0) return;

    const observer = new IntersectionObserver(entries => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            animateCounter(entry.target);

            observer.unobserve(entry.target);

        });

    }, {
        threshold: 0.5
    });

    counters.forEach(counter => observer.observe(counter));

}

function animateCounter(element) {

    const target = parseInt(element.dataset.counter, 10);

    const duration = 1800;

    const startTime = performance.now();

    function update(now) {

        const progress = Math.min(
            (now - startTime) / duration,
            1
        );

        const value = Math.floor(progress * target);

        element.textContent = value;

        if (progress < 1) {

            requestAnimationFrame(update);

        }

    }

    requestAnimationFrame(update);

}

/*=========================================================
MODALS
=========================================================*/

function initModals() {

    const modal = document.querySelector(".modal");

    if (!modal) return;

    const body = modal.querySelector(".modal-body");

    const scoutLaw = {

        trustworthy: {
            title: "A Scout is trustworthy.",
            body: "A Scout tells the truth and keeps promises. Honesty is a part of the Scout's code of conduct."
        },

        loyal: {
            title: "A Scout is loyal.",
            body: "A Scout is true to family, friends, Scout leaders, and school, as well as nation and world communities."
        },

        helpful: {
            title: "A Scout is helpful.",
            body: "A Scout is concerned about other people, willingly volunteering to help others without expecting payment or reward."
        },

        friendly: {
            title: "A Scout is friendly.",
            body: "A Scout is a friend to all, seeking to understand others. The Scout respects those with ideas and customs that are different from the Scout's own."
        },

        courteous: {
            title: "A Scout is courteous.",
            body: "A Scout is polite to everyone regardless of age or position, knowing that good manners make it easier for people to get along together."
        },

        kind: {
            title: "A Scout is kind.",
            body: "A Scout understands that there is strength in being gentle, treats others with the same respect the Scout wants in return, and does not harm or kill anything without reason."
        },

        obedient: {
            title: "A Scout is obedient.",
            body: "A Scout follows the rules of the family, school, and troop, and obeys the laws of the community and country. If these rules are deemed unfair, the Scout attempts to change them in an orderly manner rather than disobey them."
        },

        cheerful: {
            title: "A Scout is cheerful.",
            body: "A Scout looks for the bright side of life, cheerfully doing tasks and trying to make others happy."
        },

        thrifty: {
            title: "A Scout is thrifty.",
            body: "A Scout saves for the future, protects and conserves natural resources, and uses time and property carefully."
        },

        brave: {
            title: "A Scout is brave.",
            body: "A Scout can face danger even while being afraid, yet has the courage to stand for what is right even if others ridicule or threaten."
        },

        clean: {
            title: "A Scout is clean.",
            body: "A Scout keeps the body, mind, and spirit clean, and associates with those who believe in living by these same ideals."
        },

        reverent: {
            title: "A Scout is reverent.",
            body: "A Scout is faithful, demonstrates that faith in both word and action, and respects the beliefs of others."
        }

    };

    document.querySelectorAll(".law-pill").forEach(button => {

        button.addEventListener("click", () => {

            const law = scoutLaw[button.dataset.law];

            if (!law) return;

            body.innerHTML = `
                <h2>${law.title}</h2>
                <p>${law.body}</p>
            `;

            modal.classList.add("open");
            document.body.style.overflow = "hidden";

        });

    });

    modal.addEventListener("click", event => {

        if (
            event.target === modal ||
            event.target.classList.contains("modal-close")
        ) {

            closeModal();

        }

    });

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            closeModal();

        }

    });

    function closeModal() {

        modal.style.pointerEvents = "none";

        modal.classList.remove("open");

        document.body.style.overflow = "";

        setTimeout(() => {

            modal.style.pointerEvents = "";

        }, 300);

    }

}

/*=========================================================
AUTO YEAR
=========================================================*/

const year = document.getElementById("copyright-year");

if (year) {

    year.textContent = new Date().getFullYear();

}

/*=========================================================
YEARS OF SCOUTING
=========================================================*/

const founded = document.querySelector("[data-founded]");

if (founded) {

    founded.dataset.counter =
        new Date().getFullYear() - 1962;

}

/*=========================================================
TIMELINE DATABASE
=========================================================*/

async function initTimeline() {

    const container = document.getElementById("timeline-container");

    if (!container) return;

    const response = await fetch("data/timeline.csv");
    const text = await response.text();

    const rows = text
        .trim()
        .split("\n")
        .slice(1);

    const events = rows.map(row => {

        const firstComma = row.indexOf(",");

        return {

            year: row.substring(0, firstComma),

            event: row
                .substring(firstComma + 1)
                .replace(/^"|"$/g, "")

        };

    });

    const grouped = {};

    events.forEach(event => {

        if (!grouped[event.year]) {

            grouped[event.year] = [];

        }

        grouped[event.year].push(event.event);

    });

    Object.keys(grouped)
        .sort((a, b) => b - a)
        .forEach(year => {

            const item = document.createElement("div");

            item.className = "timeline-item";

            const paragraphs = grouped[year]
                .map(text => `<p>${text}</p>`)
                .join("");

            item.innerHTML = `

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
