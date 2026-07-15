export async function onRequest(context) {

    const { request, env, next } = context;

    const url = new URL(request.url);

    // Only protect /calendar
    if (url.pathname !== "/calendar") {
        return next();
    }

    // Already authenticated?
    const cookie = request.headers.get("Cookie") || "";

    if (
        cookie.includes(
            `calendar_access=${env.CALENDAR_COOKIE}`
        )
    ) {
        return next();
    }

    let incorrect = false;

    // Password submitted
    if (request.method === "POST") {

        const form = await request.formData();

        if (
            form.get("password") === env.CALENDAR_PASSWORD
        ) {

            return new Response(null, {
                status: 303,
                headers: {
                    "Location": request.url,
                    "Set-Cookie":
`calendar_access=${env.CALENDAR_COOKIE}; Path=/; Max-Age=1209600; SameSite=Lax; Secure; HttpOnly; Priority=High`
                }
            });

        }

        incorrect = true;

    }

    return new Response(`<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0">

<title>Calendar • Troop 690</title>

<meta
name="description"
content="Official website of Troop 690 in Seaford, New York.">

<link rel="icon" type="image/png" href="/images/favicon.png">

<link
rel="preconnect"
href="https://fonts.googleapis.com">

<link
rel="preconnect"
href="https://fonts.gstatic.com"
crossorigin>

<link
href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;700&family=Merriweather:wght@700&display=swap"
rel="stylesheet">

<link
rel="stylesheet"
href="/css/styles.css">

</head>

<body>

<header class="site-header">

    <div class="container nav-container">

        <a
            class="logo"
            href=".">

            <span class="logo-main">
                Troop 690
            </span>

            <span class="logo-sub">
                Seaford, New York
            </span>

        </a>

        <nav class="desktop-nav">

            <a href=".">
                Home
            </a>

            <a href="eagle-scouts">
                Eagle Scouts
            </a>

            <a href="leadership">
                Leadership
            </a>

            <a href="advancement">
                Advancement
            </a>

            <div class="nav-dropdown desktop-only">

                <button>
                    More
                </button>

                <div class="dropdown-menu">

                    <a href="summer-camp">
                        Summer Camp
                    </a>

                    <a href="scout-uniform">
                        Scout Uniform
                    </a>

                    <a class="active" href="calendar">
                        Calendar
                    </a>

                    <a href="contact-us">
                        Contact Us
                    </a>

                </div>

            </div>

            <a class="mobile-only" href="summer-camp">
                Summer Camp
            </a>

            <a class="mobile-only" href="scout-uniform">
                Scout Uniform
            </a>

            <a class="mobile-only active" href="calendar">
                Calendar
            </a>

            <a class="mobile-only" href="contact-us">
                Contact Us
            </a>

        </nav>

        <button
            class="mobile-menu-button"
            aria-label="Menu">

            ☰

        </button>

    </div>

</header>

<section class="hero page-hero">

    <div class="container">

        <div class="hero-card fade-up compact-hero">

            <h1>

                Calendar

            </h1>

        </div>

    </div>

</section>

<main>

<section class="section">

    <div class="container">

        <div class="content-card fade-up">

            <h3 style="color:#C62828;">

                Enter the Password

            </h3>

            <p class="lead">

                The calendar is only accessible to families registered in the troop.

            </p>

            <form method="POST">

                <input

                    class="search-input"

                    type="password"

                    name="password"

                    placeholder="Password"

                    autocomplete="current-password"

                    required

                    autofocus>

<p
style="
height:20px;
margin:-10px 0 14px 0;
display:flex;
align-items:center;
justify-content:center;
color:#C62828;
font-weight:700;
visibility:${incorrect ? "visible" : "hidden"};
">

Incorrect password.

</p>

                <div class="button-group">

                    <button
                        class="btn btn-primary"
                        type="submit">

                        Continue

                    </button>

                </div>

            </form>

        </div>

    </div>

</section>

</main>

<footer class="site-footer">

    <div class="container">

        <div class="footer-copy">

            <h3>

                Troop 690

            </h3>

            <p>

                <a
                    href="https://stwilliam.org"
                    target="_blank"
                    rel="noopener">

                    St. William the Abbot RC Church

                </a>

            </p>

            <p>

                <a
                    href="https://scoutingli.org"
                    target="_blank"
                    rel="noopener">

                    Scouting America Long Island

                </a>

            </p>

            <p>

                &copy; 1962&ndash;<span id="copyright-year">2026</span>
                Troop 690. All rights reserved.

            </p>

        </div>

    </div>

</footer>

<div class="modal">

    <div class="modal-window">

        <button
            class="modal-close">

            &times;

        </button>

        <div class="modal-body">

        </div>

    </div>

</div>

<script src="/js/site.js"></script>

</body>

</html>`, {

        headers: {
            "Content-Type": "text/html;charset=UTF-8",
            "Cache-Control": "no-store"
        }

    });

}
