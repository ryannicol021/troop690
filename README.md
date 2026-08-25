# Troop 690 Website

Functional React + Cloudflare Workers + D1 + R2 application for Troop 690.

## Stack
- React/Vite frontend
- Hono API on Cloudflare Workers
- Cloudflare D1 for structured data and sessions
- Cloudflare R2 for uploaded documents/photos
- ICS subscription endpoints for Apple Calendar and Google Calendar
- Server-side authorization using configurable roles and permissions

## Local setup
1. `npm install`
2. Create a D1 database named `troop690` and an R2 bucket named `troop690-files`.
3. Replace `database_id` in `wrangler.toml`.
4. Run migrations: `npx wrangler d1 migrations apply troop690 --local`
5. Start Vite: `npm run dev`

For an integrated local Worker/API environment, use `npx wrangler dev` after building.

## Production
1. Set the D1 database ID in `wrangler.toml`.
2. Create the R2 bucket.
3. Apply migrations with `npx wrangler d1 migrations apply troop690 --remote`.
4. Deploy with `npm run deploy`.
5. Point `troop690.org` at the Worker and add `troop690.ryannicol.com` as the interim hostname if desired.

## First administrator
The database migration includes the permission/role definitions but deliberately does not create a privileged password. Use the bootstrap endpoint once, with a one-time `BOOTSTRAP_SECRET` Worker secret, to create the first administrator, then remove that secret.

## AHMR consent form
The application supports an administrator-uploaded official AHMR PDF template and overlays the parent's digital signature. The official Scouting America form itself is not reproduced in source code because it was not supplied with the specification.

## Owner-supplied images
The troop photo and the five uniform/insignia images are represented by upload slots in Administration. No replacement artwork is invented by the application.
