# Troop 690 Website

The Troop 690 website is the troop's permanent website and information system.

It is designed to belong to the troop rather than to any individual person. The website, domain, database, file storage, and email system should remain usable through changes in Scoutmasters, Committee Chairs, Chartered Organization Representatives, administrators, and other volunteers.

Once the site is established, normal troop administration is done through the website and the troop's Google account. Cloudflare provides the infrastructure behind the site but is not part of normal day-to-day administration.

## What the Website Provides

The website brings the troop's public information, member information, events, attendance, advancement, photos, communications, and administrative tools into one system.

### Home

The Home page provides:

- Troop 690 branding
- Contact information
- Announcements
- Upcoming events
- Recent photos
- Chartered organization information
- Local council information

Administrators can manage contacts and announcements and control which roles can see individual contact information.

### Eagle Scouts

The Eagle Scouts page maintains the troop's Eagle Scout history.

Administrators can add, edit, reorder, and archive Eagle Scout records.

### Calendar

The Calendar provides the troop's event calendar and includes:

- Monthly calendar view
- Event type filtering
- Event details
- Calendar subscription
- iCalendar subscription
- Event creation
- Event editing
- Event copying
- Event deletion
- Event locations
- Attendance
- Event permissions

Events can use the troop's saved places while retaining their own stored location information.

### Attendance

Adults can record attendance for youth in their family.

Attendance choices are:

- Yes
- Unsure
- No

Attendance is available until the event ends. After an event ends, the attendance record is finalized.

Authorized attendance managers can use Attendance Management to manage the event roster, including:

- Attending
- Not Attending
- Unsure

The attendance system keeps youth, adults, and adult leaders organized while excluding archived members from the active roster.

### Event Permissions

Summer Camp and Trip events can use the event permission system.

Parents can:

- Give permission
- Revoke permission
- Review permission information

Authorized managers can review permission records and export them as PDFs.

All permission forms for an event can also be exported together as a ZIP file.

### Photos

The Photos section provides:

- Photo albums
- Event-linked albums
- Album covers
- Photo uploads
- Photo viewing
- Photo deletion
- Photo exports

Photos are stored in Cloudflare R2.

### Leadership

The Leadership page contains current and historical troop leadership information.

It includes:

- Youth Leaders
- Adult Leaders
- Senior Patrol Leader history
- Scoutmaster history

Authorized administrators can maintain current leadership and historical records.

### Advancement

The Advancement page contains the troop's advancement information, including:

- Rank requirements
- Advancement positions
- Merit Badges
- Awards

Authorized administrators can maintain advancement requirements, positions, and awards.

### Scout Uniform

The Scout Uniform page provides the troop's uniform guide.

It includes:

- Class A Uniform
- Class B Uniform
- Insignia Guide

The Insignia Guide can be maintained through the website's editing system.

### Email

The Email page provides troop communication tools.

It includes:

- Member selection
- Youth recipients
- Adult recipients
- Adult Leader recipients
- Opted-out members
- Message List
- Troop Newsletter

The Message List allows authorized users to create messages for selected members.

The Troop Newsletter uses troop announcements and upcoming events to create newsletter content.

Newsletter sending is connected to the troop's Google account through Google Apps Script.

### Member Info

Member Info is the main membership management area.

It includes:

- Members
- Families
- Patrols

Member records can contain:

- Name
- Contact information
- Address
- Membership information
- Adult or youth status
- Adult Leader status
- Positions
- Email preferences
- Order of the Arrow membership
- Eagle Scout archive information
- Applicable training and expiration information

Authorized administrators can add, edit, invite, and manage members.

### Families

Families are managed under:

**Member Info → Families**

Family relationships are used by the attendance system to determine which youth an adult can manage.

### Patrols

Patrols are managed under Member Info.

Authorized users can create and edit patrols and assign members to patrols.

### Administration

Administration contains the tools needed to maintain the website.

It includes:

- Site Administrator
- Position-to-Permission Mapping
- Account Logins
- Manage Places
- Footer Links

The goal is for normal website administration to happen here rather than through the underlying database or hosting platform.

### Manage Places

Manage Places maintains the troop's reusable event locations.

Each place has:

- Place Name
- Address

Saved places appear as suggestions when an event location is entered.

Events retain their own saved location information, so changing the saved-place list does not change existing events.

### Account Management

The website supports:

- Log In
- Log Out
- Account invitation links
- Account claiming
- Password reset
- Account management

Member accounts are connected to member records.

Administrators can generate account links for members and send those links through email.

### Update Info

Members with the appropriate access can update their own information through Update Info.

### Current View

Administrators can view the website as another role to check what different users see.

The available views include:

- Guest
- Youth
- Adult
- Adult Leader
- Administrator

This makes it possible to verify role-based navigation and access without changing the actual account.

## Roles and Permissions

The website uses roles and permissions to determine what each person can see and manage.

Permissions are assigned through positions and managed through:

**Administration → Position-to-Permission Mapping**

This allows the troop to change who is responsible for different parts of the website without changing the underlying website or giving those people access to the infrastructure.

The system supports permissions for areas including:

- Home
- Eagle Scouts
- Leadership
- History
- Advancement
- Scout Uniform
- Calendar
- Photos
- Email
- Member Information
- Invitations
- Attendance
- Event Permissions
- Administration

The site administrator provides full administrative access.

## Ownership and Continuity

The website is intentionally designed so that it does not depend on any one person's continued involvement.

The production resources should be owned by the troop:

- Domain
- Cloudflare account
- Worker
- D1 database
- R2 storage
- Troop email account
- Google Apps Script

The Cloudflare account should not belong to an individual volunteer's personal account.

The troop's Google account is the normal human-facing account for services that require an external account, such as newsletter sending.

Website administrators should normally only need the website itself and the troop's Google account. They should not need to know how Cloudflare, D1, R2, or the Worker operate.

This separation is intentional.

If a Scoutmaster, Committee Chair, Chartered Organization Representative, webmaster, or other administrator leaves the troop or is removed from the website, their website account can be removed without affecting the existence of the website or its underlying infrastructure.

A new administrator can be given the appropriate website permissions without transferring ownership of the website itself.

## Cloudflare

Cloudflare provides the infrastructure that runs the website.

The production installation uses:

- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2

The Worker serves the website and provides the application's backend API.

D1 stores the structured website information.

R2 stores uploaded files, including photos.

Cloudflare is infrastructure for the website, not the website's normal administrative interface.

Once the production environment is established, routine troop administration should not require anyone to log into Cloudflare.

## Google Account and Email

The troop should maintain a dedicated Google account for the website's email-related services.

That account is used for the troop's communications infrastructure and Google Apps Script.

The newsletter system uses Google Apps Script to send messages generated by the website.

The production domain can also be configured so that email sent to the troop's domain is forwarded to the troop's Google account.

The Google account should be owned and maintained by the troop rather than by a particular volunteer.

## Technical Structure

The website consists of a React frontend and a Cloudflare Worker backend.

The main project components are:

```text
src/
    main.tsx
    styles.css

worker/
    index.ts

db/
    migrations/

public/
    images/

index.html
package.json
vite.config.ts
wrangler.toml
