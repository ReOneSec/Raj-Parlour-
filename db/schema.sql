-- Salon Berhampore — Postgres schema.
-- Apply to Vercel Postgres, Neon, Supabase Postgres, or any Postgres
-- before deploying. Local development (no DATABASE_URL) uses a JSON
-- file store with the same shape; see lib/db.js.
-- No credentials, phone numbers or customer data are in this file.

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id),
  gender TEXT NOT NULL CHECK (gender IN ('WOMEN', 'MEN')),
  category TEXT NOT NULL,          -- Hair, Make Up, Hands And Feet, Skin
  subcategory TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  price_min INTEGER,               -- INR, null = price on enquiry
  price_max INTEGER,
  currency TEXT NOT NULL DEFAULT 'INR',
  duration_min INTEGER,            -- minutes, null = not stated
  duration_max INTEGER,
  level TEXT NOT NULL DEFAULT 'Entry' CHECK (level IN ('Entry', 'Mid', 'Premium')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  provenance TEXT NOT NULL DEFAULT 'admin' CHECK (provenance IN ('verified', 'unverified', 'admin')),
  provenance_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (price_min IS NULL OR price_max IS NULL OR price_min <= price_max),
  CHECK (duration_min IS NULL OR duration_max IS NULL OR duration_min <= duration_max)
);
CREATE INDEX IF NOT EXISTS services_branch_gender_category_idx
  ON services (branch_id, gender, category) WHERE is_active;

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookable time slots. Seed rows are intentionally NOT included here:
-- the salon creates its own staff and slot rows in admin after deploy.
-- A booking may leave staff_id NULL (unassigned) until the salon assigns it.
CREATE TABLE IF NOT EXISTS slots (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id),
  staff_id TEXT REFERENCES staff(id),
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, staff_id, slot_date, start_time)
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phone)
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  staff_id TEXT REFERENCES staff(id),
  appointment_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_appointment_idx ON bookings (appointment_at);

-- Notification / reminder queue. Rows are queued on booking and sent
-- only through lib/providers.js, which is driven by environment variables.
-- Nothing is sent merely by inserting a row here.
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  kind TEXT NOT NULL CHECK (kind IN ('confirmation', 'reminder_24h', 'reminder_3h', 'salon_alert')),
  channel TEXT NOT NULL DEFAULT 'queue' CHECK (channel IN ('queue', 'whatsapp', 'sms')),
  recipient_phone TEXT,            -- NULL for salon_alert until SALON_ALERT_PHONE is set by the owner
  message TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notifications_due_idx ON notifications (due_at) WHERE status = 'queued';
