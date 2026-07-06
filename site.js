document.addEventListener("DOMContentLoaded", () => {

    ///////////////////////////////////////////////////////////
    // Fade In Animation
    ///////////////////////////////////////////////////////////

    const fadeObserver = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add("visible");

                fadeObserver.unobserve(entry.target);

            }

        });

    }, {

        threshold: 0.15

    });

    document.querySelectorAll(".fade-in, .card, .stat").forEach(element => {

        element.classList.add("fade-in");

        fadeObserver.observe(element);

    });

    ///////////////////////////////////////////////////////////
    // Animated Counters
    ///////////////////////////////////////////////////////////

    document.querySelectorAll("[data-count]").forEach(counter => {

        const target = parseInt(counter.dataset.count);

        if (isNaN(target)) return;

        let current = 0;

        const duration = 1200;

        const frameRate = 60;

        const totalFrames = duration / (1000 / frameRate);

        const increment = Math.max(1, Math.ceil(target / totalFrames));

        function updateCounter() {

            current += increment;

            if (current >= target) {

                counter.textContent = target;

            } else {

                counter.textContent = current;

                requestAnimationFrame(updateCounter);

            }

        }

        const counterObserver = new IntersectionObserver((entries) => {

            if (entries[0].isIntersecting) {

                updateCounter();

                counterObserver.disconnect();

            }

        });

        counterObserver.observe(counter);

    });

    ///////////////////////////////////////////////////////////
    // Live Search (Eagle Scout Page)
    ///////////////////////////////////////////////////////////

    const searchBox = document.getElementById("search");

    if (searchBox) {

        const cards = document.querySelectorAll(".year-block, .card");

        searchBox.addEventListener("input", function () {

            const query = this.value.toLowerCase().trim();

            cards.forEach(card => {

                const text = card.textContent.toLowerCase();

                card.style.display = text.includes(query)
                    ? ""
                    : "none";

            });

        });

    }

    ///////////////////////////////////////////////////////////
    // Highlight Current Navigation Link
    ///////////////////////////////////////////////////////////

    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    document.querySelectorAll("nav a").forEach(link => {

        const href = link.getAttribute("href");

        if (href === currentPage) {

            link.classList.add("active");

        }

    });

    ///////////////////////////////////////////////////////////
    // Smooth Scrolling
    ///////////////////////////////////////////////////////////

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {

        anchor.addEventListener("click", function (e) {

            const target = document.querySelector(this.getAttribute("href"));

            if (!target) return;

            e.preventDefault();

            target.scrollIntoView({

                behavior: "smooth"

            });

        });

    });

    ///////////////////////////////////////////////////////////
    // Scroll To Top Button (Optional)
    ///////////////////////////////////////////////////////////

    const topButton = document.getElementById("backToTop");

    if (topButton) {

        window.addEventListener("scroll", () => {

            if (window.scrollY > 500) {

                topButton.classList.add("show");

            } else {

                topButton.classList.remove("show");

            }

        });

        topButton.addEventListener("click", () => {

            window.scrollTo({

                top: 0,

                behavior: "smooth"

            });

        });

    }

});
