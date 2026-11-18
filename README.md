# Berhampore Salon — Service Menu Website (deployable code)

A deployable salon service-menu website modelled on the structure of the
Lakme Salon Berhampore branch menu (K K Banerjee Road, Berhampore) — Men/Women
toggle, categories, search, sort and level filters, booking, and a
notification/reminder queue.

**This is generic salon code.** It uses no Lakme branding, logos, or images.
The branch address is used as the model location only. The salon should put
its own name, logo and confirmed prices in admin before publishing.

## What customers can do

- Browse the menu at `/` — a split hero (“The chair is waiting.”) with
  the branch address and a “Next available” line whose button pre-fills
  the next bookable time (see “Anti-slop rebuild” below), then a flat
  sticky filter bar with a Women / Men toggle, search, sort by price or
  duration, icon category chips (Hair, Make Up, Hands And Feet, Skin)
  and stylist-level pills (Entry / Mid / Premium).
- See services as an editorial price list — hairline-divided rows with
  dotted leaders and tabular prices, grouped by category, with
  provenance badges. No identical rounded cards.
- Book: pick a service, date/time and details beside a sticky
  visit-summary, then confirm. The confirmation shows a timeline of
  the queued reminders (confirmation now, 24-hour and 3-hour reminders,
  salon alert) with their due times and “queued” status. Booking
  creates a confirmation and reminder queue (see below).

## What the salon can do (admin, `/admin.html`)

- See a flat stat strip (services on menu, bookings, reminders queued,
  due now) and switch between Services / Bookings / Reminders with
  plain text tabs.
- Add, edit, hide and delete services in a native `<dialog>`; deletes ask
  in a proper confirmation dialog. A price edit changes the customer
  menu immediately, because the menu is read from the database, not from
  hardcoded HTML.
- View bookings and the notification queue as hairline reminder rows,
  and process due notifications.

## Anti-slop rebuild (2026-11-18)

Mirrors the test app's anti-slop rebuild, in the same layout language,
with no Lakme branding. Design plan (Anthropic Frontend Design,
two-pass, local notes at
`~/workspace/research/design-skills-anti-slop.md`):

- **Colour (from salon materials):** bottle-green `#143c32` / `#0d2b24`,
  brass `#a8862f` on warm paper `#f7f2e8`, ink `#1b241f`. The single
  bold moment is the split hero headline; everything else is quiet.
- **Type:** one grotesk family (system stack) for display and body,
  display at weight 800 with tight tracking; prices use tabular-nums.
- **Layout:** split hero, then the menu as an editorial price list
  (hairline rows, dotted leaders), grouped by category.

## Images

Four original photos in `public/images/` (all 1920×1280 JPEG, no text
or logos, matching the bottle-green/brass palette):

- `hero.jpg` — salon interior (bottle-green walls, brass mirrors, black
  barber chairs), in the right column of the split hero.
- `hair-cut.jpg` — stylist trimming a woman's long hair, on the Hair Cut row.
- `hair-spa.jpg` — hair wash/spa at the basin, on the three Hair Spa rows.
- `mens-cut.jpg` — barber clipper cut on a man, on the Men Normal Cut row.

Every image has explicit `width`/`height` and descriptive alt text; all
but the hero are `loading="lazy"`. To swap in real salon photos, replace
these four files with same-named JPEGs — no code change needed.
- **Anti-default check:** no cream + terracotta, no SaaS-card kit, no
  tracked all-caps eyebrows, no middle-dot meta strings, no `→` on
  buttons. The hairline price list is subject-driven (a salon price
  list is a list), not a broadsheet newspaper layout.
- **Removed:** frosted-glass filter bar (`backdrop-filter` gone), the
  floating pill booking bar, soft card shadows, the Hair Spa
  scroll-snap card strip (spa services now sit in the price list),
  and the sliding pill toggle/tabs (now plain text tabs with a brass
  underline for the active one).

Native platform primitives are used wherever they fit (per Google
Modern Web Guidance, local notes at
`~/workspace/research/modern-web-guidance.md`):

- Native `<dialog>` (`showModal()`, `::backdrop`, `method="dialog"`) for
  the service delete confirmation and the add/edit service form. Delete
  also uses `closedby="any"` with a click-outside fallback in JS, since
  `closedby` is not yet Baseline Widely Available — Esc still closes it
  natively everywhere.
- Native radio inputs drive the Women/Men toggle and the admin tabs
  (checked label reads as active with a brass underline).
  Category chips and level pills are buttons with `aria-pressed`.
- `<details>` for the “About prices” disclosure; native `type="search"`,
  `<select>` and `:user-invalid` form styling instead of custom widgets.
- A `prefers-reduced-motion` media query disables the animations;
  remaining animation is transform/opacity only.
- Same-document View Transitions (`document.startViewTransition`, with a
  plain fallback) animate the menu ↔ booking switch.
- Icons: one consistent stroke icon set throughout (16px, 1.6 stroke).
  Kubai icons were NOT mixed in partially — that stays a whole-set
  decision for a later pass, if the salon wants it.
- The “Next available” line shows the next bookable hour (10:00–19:00
  window, next day if past 19:00). That window is a strip convenience
  only: no staff slots are seeded, so wire the real `slots` table rows
  into it when the salon adds staff and slots.
- Flat solid colours throughout (no gradients), same as before.

Vercel Web Design Guidelines audit fixes applied in this rebuild:

- Visible `:focus-visible` (3px brass outline) on all interactive
  elements; the search field uses `:focus-within` on its wrapper
  instead of `outline: none` on the input.
- Skip link to the service menu; hierarchical headings (one `h1`,
  category `h2`s, service `h3`s).
- No `user-scalable=no` in the viewport meta; no `transition: all`;
  `touch-action: manipulation` on buttons; prices use tabular-nums.
- Form controls keep their labels; icon-only buttons do not exist
  (chips carry text labels); destructive deletes need the dialog
  confirmation, never an immediate delete.

## Seed data — read this before publishing

**Only one price is verified from the branch menu:**

| Service | Price | Duration | Status |
|---|---|---|---|
| Hair Cut | Rs. 340–1750 | 45–60 mins | **Verified** from the branch service menu |

**Unverified, admin-editable — do NOT present as official prices until confirmed:**

| Service | Price | Status |
|---|---|---|
| Hair Spa — Insta Care | Rs. 1330 | Unverified: Justdial listing for this branch, NOT the official menu |
| Hair Spa — Beauty Sutra | Rs. 3520 | Unverified: Justdial listing for this branch, NOT the official menu |
| Hair Spa — Moroccan Oil | Rs. 4280 | Unverified: Justdial listing for this branch, NOT the official menu |

**Owner-added service (from the test app, added by the owner in admin):**

| Service | Price | Duration | Status |
|---|---|---|---|
| Normal Cut (Men, Hair) | Rs. 100 | 20 mins, Entry | **Owner-added** — price unverified against the branch menu |

**All other categories start empty by design.** No other prices are invented.
The salon adds its real Make Up, Hands And Feet, Skin and further Men services in admin.
Unverified rows are labelled "unverified" in the seed files (`lib/seed.js`,
`db/seed.sql`) and in the customer menu until an admin changes them; the
owner-added row is labelled "Owner-added" in the same places.

## Project layout

```
public/               Customer menu (index.html, app.js) + admin (admin.html, admin.js) + styles.css
api/                  Vercel serverless functions: services, bookings, notifications
api/admin/services.js Admin CRUD for services (add/edit/hide/delete)
lib/db.js             Storage: Postgres when DATABASE_URL is set, JSON file in local dev only
lib/seed.js           Seed data with provenance labels
lib/booking.js        Booking creation + the 4-row notification queue
lib/notifications.js  Processor for due queue rows
lib/providers.js      WhatsApp Business / SMS provider hooks (env-driven only)
lib/http.js           JSON + admin-token helpers shared by API routes
server.js             Local dev server reusing the exact same API handlers
db/schema.sql         Postgres schema: branches, services, staff, slots, customers, bookings, notifications
db/seed.sql           SQL version of the seed (same provenance rules)
scripts/verify.js     End-to-end verification (see "Verify locally")
vercel.json           Vercel function config
```

## API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/services?gender=&category=&level=&q=&sort=` | Live menu. `sort`: `price_asc`, `price_desc`, `duration_asc`, `duration_desc` |
| POST | `/api/bookings` | Create booking. Body: `service_id, name, phone, appointment_at` (ISO) |
| GET | `/api/bookings` | Admin: list bookings (requires admin token if set) |
| GET | `/api/admin/services` | Admin: list all services including hidden |
| POST | `/api/admin/services` | Admin: add a service |
| PUT | `/api/admin/services?id=…` | Admin: edit a service (price edits update the menu live) |
| DELETE | `/api/admin/services?id=…` | Admin: delete a service |
| GET | `/api/notifications?booking_id=` | Admin: view the queue |
| POST | `/api/notifications` | Admin: process due queue rows (call on a schedule) |

## Database

Schema: `db/schema.sql`. Tables: `branches`, `services`, `staff`, `slots`,
`customers`, `bookings`, `notifications`.

Local dev (no `DATABASE_URL`) uses a JSON file at `data/db.json`, seeded
from `lib/seed.js`. **That file is local-dev only.** On Vercel, serverless
functions have an ephemeral filesystem, so if `DATABASE_URL` is missing in
production the API returns a clear error instead of silently losing bookings.

## Deploy to Vercel (exact steps)

1. Push this folder to a Git repository (GitHub, GitLab, or Bitbucket).
2. In Vercel, **Add New → Project → Import** that repository. No framework
   preset is needed: static files come from `public/`, API routes from `api/`.
3. Create a Postgres database — Vercel Postgres, Neon, or Supabase Postgres —
   and copy its connection string.
4. In the Vercel project, run `db/schema.sql` then `db/seed.sql` against
   that database (database dashboard SQL editor, or `psql <url> -f db/schema.sql`).
5. In Vercel **Settings → Environment Variables**, set:
   - `DATABASE_URL` — the Postgres connection string (required)
   - `ADMIN_TOKEN` — a long random token of your choice (required before going public)
   - Notification variables from the next section (only when you are ready to send)
6. Deploy. The customer menu is the site root; admin is `/admin.html`.
   In admin, enter the same `ADMIN_TOKEN` when prompted.
7. In admin, confirm or correct the three unverified Hair Spa prices, then
   add the salon's real services for the empty categories, staff and slots.

Alternative hosts: any Node host can run `npm start` (which runs `server.js`)
with `DATABASE_URL` set, behind any static file server for `public/`. The
Vercel path above is the recommended one because `api/` maps directly to
serverless functions.

## Notifications and reminders — how the queue works

On every booking, four rows are queued in `notifications` (`lib/booking.js`):

| Kind | Due | Recipient |
|---|---|---|
| `confirmation` | Immediately | Customer phone from the booking |
| `reminder_24h` | 24 hours before the appointment | Customer phone |
| `reminder_3h` | 3 hours before the appointment | Customer phone |
| `salon_alert` | Immediately | Salon — **only if `SALON_ALERT_PHONE` is set by the owner** |

Processing: call `POST /api/notifications` (with the admin token) on a
schedule — for example every 15 minutes from an external scheduler
(cron-job.org, GitHub Actions, or a Vercel Cron on a paid plan). It picks
up queued rows whose `due_at` has passed and attempts each through
`lib/providers.js`. A row is marked `sent` **only** when the provider call
succeeds. Missing configuration leaves the row `queued` with a note — it is
never falsely reported as sent.

## WhatsApp / SMS setup — what turns the queue into real messages

**Nothing is sent in this code version by default.** `NOTIFICATION_CHANNEL`
defaults to `queue`, which means messages are queued and shown in admin only.
That is deliberate: sending needs the salon's own provider account.

### To send via WhatsApp (WhatsApp Business Cloud API)

1. Create a Meta developer app and a WhatsApp Business account, or use a
   WhatsApp Business Solution Provider (BSP) — the salon's choice.
2. Complete Meta's business verification and get a phone number approved
   for WhatsApp Business. Template messages are required for notifications
   sent outside the 24-hour customer-service window; confirmations and
   reminders sent later than that window need an approved template —
   check Meta's current template rules before going live.
3. In Vercel environment variables, set:
   - `NOTIFICATION_CHANNEL=whatsapp`
   - `WHATSAPP_TOKEN` — a permanent (system-user) access token, **never**
     committed to the repo
   - `WHATSAPP_PHONE_NUMBER_ID` — the WhatsApp Business phone number ID
   - `WHATSAPP_TEMPLATE_NAME` — only if you switch the hook to templates (optional, see code comment)
   - `SALON_ALERT_PHONE` — the salon's own number, in international format, for salon alerts
4. Test with the salon's own number first, then confirm a test booking
   shows `sent` in the admin queue before announcing the site.

### To send via SMS instead

1. Pick an SMS provider that operates in India (for example an Indian
   SMS gateway with DLT support — DLT registration and approved templates
   are required for commercial SMS in India; check the provider's current
   DLT rules).
2. In Vercel environment variables, set:
   - `NOTIFICATION_CHANNEL=sms`
   - `SMS_API_URL` — the provider's send endpoint
   - `SMS_API_KEY` — the provider API key, **never** committed to the repo
   - `SMS_SENDER_ID` — if the provider requires one
   - `SALON_ALERT_PHONE` — the salon's own number for salon alerts
3. Adapt the single provider call in `lib/providers.js` (`sendViaSms`) to
   the provider's exact request shape, then test as above.

### Rules that apply to both channels

- No credentials are in this repo; everything is via environment variables.
- No phone numbers are invented or hardcoded. Customer numbers come only
  from bookings; the salon alert number comes only from `SALON_ALERT_PHONE`.
- Customers must have consented to messages at booking (the booking form
  is the consent point; add your own privacy/consent wording before launch
  if your provider requires it).

## Verify locally

```bash
npm install        # installs pg (Postgres driver); not needed for local JSON-store verification
npm run verify     # starts the real server, checks menu, booking, queue and admin price edit
```

Or run it manually:

```bash
node server.js     # http://localhost:3000  (JSON store in data/db.json)
```

## Still owed (not done in this code drop)

- **No deployment has been performed** — the code is ready to deploy, but
  no Vercel project, database, or domain has been created.
- **No real WhatsApp/SMS sending** — provider hooks are in place, but no
  provider account, token, or salon alert number has been configured, so
  the demo queues messages only.
- **Unverified prices** — the three Hair Spa prices must be confirmed or
  corrected by the salon in admin before they are published as official.
- **Empty categories** — Make Up, Hands And Feet, Skin and further Men services,
  plus staff and slot rows, must be added by the salon in admin. (Men now has
  one owner-added service: Normal Cut, Rs.100, 20 mins.)
- **Next-available line** — shows the next bookable hour in a 10:00–19:00
  window; wire real staff slots from the `slots` table when they exist.
- **Admin auth** is a single shared token (`ADMIN_TOKEN`). For multiple
  staff accounts, add proper user accounts before giving admin access widely.
- **Payments** are out of scope: booking here is appointment-only, no payment.
