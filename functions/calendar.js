export async function onRequest(context) {

    const { request, env, next } = context;

    const url = new URL(request.url);

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
content="width=device-width,initial-scale=1">

<title>Troop 690 Calendar</title>

<style>

:root{

--navy:#0B2345;
--red:#C8102E;

}

*{

box-sizing:border-box;

}

body{

margin:0;
min-height:100vh;
display:flex;
justify-content:center;
align-items:center;
padding:24px;
background:var(--navy);
font-family:system-ui,sans-serif;

}

.card{

width:100%;
max-width:420px;
padding:40px;
border-radius:24px;
background:#fff;
box-shadow:0 16px 40px rgba(0,0,0,.25);
text-align:center;

}

h1{

margin:0 0 12px;
color:var(--red);
font-size:2rem;

}

p{

margin:0 0 24px;
color:#666;
line-height:1.6;

}

input{

width:100%;
padding:14px;
font-size:16px;
border-radius:12px;
border:1px solid #ccc;
margin-bottom:20px;

}

button{

width:100%;
padding:14px;
border:none;
border-radius:999px;
background:var(--red);
color:#fff;
font-size:16px;
font-weight:700;
cursor:pointer;
transition:.25s;

}

button:hover{

filter:brightness(.92);

}

.error{

margin-top:18px;
font-weight:700;
color:var(--red);

}

</style>

</head>

<body>

<div class="card">

<h1>

Troop 690 Calendar

</h1>

<p>

Please enter the troop password to continue.

</p>

<form method="POST">

<input
type="password"
name="password"
placeholder="Password"
required
autofocus>

<button type="submit">

Continue

</button>

</form>

${incorrect ? '<div class="error">Incorrect password.</div>' : ""}

</div>

</body>

</html>`, {

        headers: {
    "Content-Type": "text/html;charset=UTF-8",
    "Cache-Control": "no-store"
}

    });

}
