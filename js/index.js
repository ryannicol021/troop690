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
