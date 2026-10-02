# Troop 690 Website

The Troop 690 website is a React and Cloudflare Workers application for managing troop information, members, events, attendance, advancement, photos, communications, and administrative content.

## Technology

* React
* TypeScript
* Vite
* React Router
* Cloudflare Workers
* Cloudflare D1
* Cloudflare R2
* Hono
* Zod
* PDF-Lib

The frontend is built into `dist/` and served by the Cloudflare Worker. The Worker provides the API and connects the site to D1 and R2.

## Cloudflare Setup

The Worker requires:

* A Cloudflare Worker
* A D1 database
* An R2 bucket

The current Wrangler configuration uses:

```toml
name = "troop690"
main = "worker/index.ts"

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"

[[d1_databases]]
binding = "DB"
database_name = "troop690"
migrations_dir = "db/migrations"

[[r2_buckets]]
binding = "FILES"
bucket_name = "troop690-files"
```

The D1 database must have the migrations in `db/migrations/` applied in order.

The R2 bucket stores uploaded website photos and other site files.

## Worker Environment Variables

The Worker uses the following secrets:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
APPS_SCRIPT_URL
APPS_SCRIPT_SECRET
```

`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are used for Cloudflare R2 management.

`APPS_SCRIPT_URL` and `APPS_SCRIPT_SECRET` are used by the newsletter sender on the Email page. The Apps Script receives the newsletter HTML and text content from the Worker and sends the message through the troop's email account.

## Website Features

### Home

The Home page contains:

* Troop 690 branding
* Contact information
* Announcements
* Upcoming events
* Recent photos
* Footer links

Administrators can manage homepage contacts and announcements and control which roles can see individual contact information.

Footer links can be configured for:

* Chartered Organization
* Local Council

### Eagle Scouts

The Eagle Scouts page displays the troop's Eagle Scout history.

Administrators can:

* Add Eagle Scouts
* Edit Eagle Scout information
* Reorder Eagle Scouts
* Maintain archived Eagle Scout records

Archived Eagle Scouts are retained for historical purposes and are handled separately from the active membership roster.

### Calendar

The Calendar displays troop events and provides:

* Monthly calendar view
* Event filtering by event type
* Event details
* Calendar subscription
* iCalendar feed
* Event creation
* Event editing
* Event deletion
* Event copying
* Event locations
* Attendance
* Event permissions

Available event types are:

* Ceremony
* Court of Honor
* Fundraiser
* Mass
* Meeting
* Service
* Summer Camp
* Trip
* Other

Administrators and authorized adults can manage events according to their assigned permissions.

Places are managed by administrators through **Administration → Manage Places**. Saved places provide the location suggestions used when creating or editing events, while event records retain their own saved place and address information.

### Attendance

Attendance is managed from individual event pages.

Adults connected to a family can record attendance for members of their family using:

* Yes
* Unsure
* No

Attendance choices are available before the event ends. Once the event has ended, attendance choices are finalized according to the recorded response.

Authorized attendance managers can open **Attendance Management** and manage the event roster.

The attendance roster supports:

* Youth
* Adults
* Adult Leaders
* Drag-and-drop attendance management
* Attending
* Not Attending
* Unsure
* Saving attendance records

Archived members are excluded from the active attendance roster.

### Event Permissions

Certain event types support permission records in addition to attendance.

Permission management is available for:

* Summer Camp
* Trip

Parents can give or revoke permission for their youth to attend.

Permission records include the required participation and emergency authorization information and can be signed and exported.

Authorized managers can:

* Review permissions
* Give permission
* Revoke permission
* Review individual permission records
* Export an individual permission form as a PDF
* Export all permission forms as a ZIP

Individual permission PDFs use the member's last and first name for the filename, with numbered suffixes when duplicate names occur.

### Photos

The Photos section provides:

* Photo albums
* Event-linked albums
* Album covers
* Photo viewing
* Photo uploads
* Photo deletion
* Bulk photo export

Photos are stored in Cloudflare R2.

Administrators can associate events with photo albums and manage the photos belonging to those albums.

### Leadership

The Leadership page contains current troop leadership and historical leadership information.

It supports:

* Youth Leaders
* Adult Leaders
* Senior Patrol Leader history
* Scoutmaster history

Authorized users can edit leadership information and maintain historical leadership entries.

### Advancement

The Advancement page contains the troop's advancement information, including:

* Rank requirements
* Advancement requirements
* Merit Badges
* Awards
* Advancement positions

Authorized administrators can maintain requirements, positions, awards, and related advancement information.

### Scout Uniform

The Scout Uniform page provides the troop's uniform guide.

It contains:

* Class A Uniform
* Class B Uniform
* Insignia Guide

The insignia guide supports editable insignia labels and descriptions through the site's administrative editing system.

### Email

The Email page provides troop communication tools.

It contains:

* Select Members
* Youth
* Adults
* Adult Leaders
* Opted-out members
* Message List
* Troop Newsletter

The member selector allows authorized users to select recipients for regular messages.

The Message List provides saved message entries and a Create workflow.

The Troop Newsletter section uses troop announcements and upcoming events to create newsletter content. Newsletter sending is connected to Google Apps Script through the Worker environment variables.

### Member Info

Member Info provides the troop's membership management system.

It includes:

* Individual Members
* Families
* Patrols

Member records contain information such as:

* Name
* Contact information
* Address
* Membership information
* Adult or youth status
* Adult Leader status
* Positions
* Email preferences
* Order of the Arrow membership
* Eagle Scout archive status
* Safety and training information where applicable

Administrators can add, edit, invite, and manage members according to their permissions.

### Families

Families are managed under **Member Info → Families**.

The family system connects members who belong to the same family and is used by the event attendance system to determine which youth an adult may manage.

### Patrols

Patrol management is available under Member Info.

Authorized users can:

* Create patrols
* Edit patrols
* Move members between patrols
* Manage unassigned members

### Administration

The Administration section contains the site's administrative tools.

It includes:

* Site Administrator
* Position-to-Permission Mapping
* Account Logins
* Manage Places
* Footer Links
* Other site configuration and management tools

### Manage Places

Manage Places maintains the troop's reusable event locations.

Each saved place contains:

* Place Name
* Address

These places are used by the event location search when entering event information.

Existing events retain their stored location information even when the saved place list changes.

### Account Management

The site supports:

* Log In
* Log Out
* Account invitation links
* Account claiming
* Password reset links
* Account login management

Member accounts are connected to the corresponding member record.

Administrators can create account links for members and send the generated link through the member's email client.

Youth account links can also include the appropriate emergency contacts.

### Update Info

Members with the appropriate permission can update their own account and member information through **Update Info**.

### Current View

Authorized administrators and users with the appropriate editing permissions can use **Current View** to view the website as another role.

The available views include:

* Guest
* Youth
* Adult
* Adult Leader
* Administrator

Current View is useful for checking role-based navigation, page visibility, and editing access.

## Permissions

The website uses a permission system to control access to administrative features.

Permissions are assigned through positions and can be mapped through:

**Administration → Position-to-Permission Mapping**

The system supports permissions for areas including:

* Homepage content
* Eagle Scouts
* Leadership
* History
* Advancement
* Uniform
* Calendar
* Photos
* Email
* Member Information
* Invitations
* Attendance
* Event management
* Event permissions
* Administration

The site administrator account has full administrative access.

## Database

D1 contains the site's structured information, including:

* Member records
* Accounts
* Families
* Patrols
* Positions
* Permissions
* Events
* Attendance
* Event permissions
* Announcements
* Leadership history
* Advancement information
* Awards
* Uniform insignia
* Places
* Photo albums
* Footer links
* Other site configuration

Database changes are maintained as ordered migrations in:

```text
db/migrations/
```

Current migrations include:

```text
0001_initial
0002_permissions
0003_photo_albums
0004_remove_photo_captions
0005_case_insensitive_usernames
0006_remove_documents
0007_history
0008_leadership_history_entries
0009_normalize_advancement_positions
0010_attendance_permissions
0011_uniform_insignia
0012_places
0013_announcement_order
0014_remove_unused_camp_permission
0015_footer_links
```

## File Storage

Cloudflare R2 is used for uploaded photos and site files.

The Worker exposes stored files through the site's `/files/` path while keeping the underlying R2 bucket behind the application.

## Project Structure

```text
troop690/
├── db/
│   └── migrations/
├── public/
│   └── images/
├── src/
│   ├── main.tsx
│   └── styles.css
├── worker/
│   └── index.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.toml
```

### `src/main.tsx`

Contains the React application, pages, components, forms, modals, role-based navigation, and client-side site functionality.

### `src/styles.css`

Contains the website's layout, responsive design, forms, tables, modals, buttons, navigation, and page styling.

### `worker/index.ts`

Contains the Cloudflare Worker, API routes, authentication, authorization, D1 operations, R2 operations, file serving, PDF generation, calendar feed, and newsletter integration.

### `db/migrations/`

Contains the database schema history and all database changes.

### `public/images/`

Contains the site's static images and uniform guide images.

## Deployment

The production site is designed to run on Cloudflare Workers with:

* Workers
* D1
* R2
* Static assets

The repository is connected to the Cloudflare deployment environment so that the site can be built and deployed from the repository.

For the production troop deployment, the Cloudflare resources, secrets, domain, and email integration should be configured under the troop's own accounts.

## Domain and Email

The production website uses the troop's domain.

The troop email account is also used for website communications and the newsletter system.

The production email setup consists of:

1. A troop-owned email account.
2. The troop domain configured through Cloudflare.
3. Domain email forwarding to the troop email account.
4. Google Apps Script connected to the troop email account.
5. The website's `APPS_SCRIPT_URL` and `APPS_SCRIPT_SECRET` configured in Cloudflare.

## Initial Production Setup

A new production installation requires:

1. A troop-owned Cloudflare account.
2. A Cloudflare Worker.
3. A D1 database.
4. An R2 bucket.
5. The database migrations from `db/migrations/`.
6. The application repository connected to the Worker.
7. The required Worker secrets configured.
8. The troop domain connected to the Worker.
9. The troop email account configured.
10. Google Apps Script configured for newsletter sending.
11. The website's member accounts populated and invitation links distributed.

Once configured, the website is managed through its normal administrative pages rather than by directly editing the database for routine site content.
