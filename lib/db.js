// Storage abstraction with one interface, two backends.
//
// PRODUCTION (Vercel): set DATABASE_URL to a Postgres database
// (Vercel Postgres, Neon, Supabase Postgres) and apply db/schema.sql +
// db/seed.sql first. Serverless functions have an ephemeral filesystem,
// so the JSON fallback is REFUSED in production — silently losing
// bookings would be worse than a clear error.
//
// LOCAL DEV (no DATABASE_URL, no VERCEL=1): a JSON file store at
// data/db.json, seeded from lib/seed.js on first use. This is for
// verification only, not a production database.
//
// Both backends expose the same methods, so API routes and server.js
// never need to know which one is in use.

const fs = require("fs");
const path = require("path");
const { BRANCH, SERVICES } = require("./seed");

let jsonCache = null;
let pgPool = null;

function dataFile() {
  return process.env.DATA_FILE || path.join(__dirname, "..", "data", "db.json");
}

function jsonStore() {
  if (jsonCache) return jsonCache;
  const file = dataFile();
  if (fs.existsSync(file)) {
    jsonCache = JSON.parse(fs.readFileSync(file, "utf8"));
  } else {
    jsonCache = {
      branches: [BRANCH],
      services: JSON.parse(JSON.stringify(SERVICES)),
      staff: [],
      slots: [],
      customers: [],
      bookings: [],
      notifications: [],
    };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(jsonCache, null, 2));
  }
  return jsonCache;
}

function jsonSave() {
  fs.writeFileSync(dataFile(), JSON.stringify(jsonCache, null, 2));
}

function usePostgres() {
  return Boolean(process.env.DATABASE_URL);
}

function isProduction() {
  return process.env.VERCEL === "1";
}

function pg() {
  if (!pgPool) {
    // eslint-disable-next-line global-require
    const { Pool } = require("pg");
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pgPool;
}

const serviceRow = (r) => ({
  id: r.id,
  branch_id: r.branch_id,
  gender: r.gender,
  category: r.category,
  subcategory: r.subcategory,
  name: r.name,
  price_min: r.price_min,
  price_max: r.price_max,
  currency: r.currency,
  duration_min: r.duration_min,
  duration_max: r.duration_max,
  level: r.level,
  is_active: r.is_active,
  provenance: r.provenance,
  provenance_note: r.provenance_note,
});

// ---- JSON backend -------------------------------------------------------
const jsonBackend = {
  async listServices({ gender, category, level, q, includeHidden } = {}) {
    let rows = jsonStore().services.filter((s) => includeHidden || s.is_active);
    if (gender) rows = rows.filter((s) => s.gender === gender);
    if (category) rows = rows.filter((s) => s.category === category);
    if (level) rows = rows.filter((s) => s.level === level);
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((s) => `${s.name} ${s.category} ${s.subcategory}`.toLowerCase().includes(needle));
    }
    return rows;
  },
  async getService(id) {
    return jsonStore().services.find((s) => s.id === id) || null;
  },
  async createService(data) {
    const row = { id: data.id || `svc-${Date.now()}`, ...data, is_active: data.is_active !== false };
    jsonStore().services.push(row);
    jsonSave();
    return row;
  },
  async updateService(id, patch) {
    const row = jsonStore().services.find((s) => s.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    jsonSave();
    return row;
  },
  async deleteService(id) {
    const store = jsonStore();
    const before = store.services.length;
    store.services = store.services.filter((s) => s.id !== id);
    jsonSave();
    return store.services.length < before;
  },
  async findOrCreateCustomer(name, phone) {
    const store = jsonStore();
    let row = store.customers.find((c) => c.phone === phone);
    if (!row) {
      row = { id: `cust-${Date.now()}`, name, phone };
      store.customers.push(row);
      jsonSave();
    }
    return row;
  },
  async createBooking(data) {
    const row = { id: `book-${Date.now()}`, status: "confirmed", ...data };
    jsonStore().bookings.push(row);
    jsonSave();
    return row;
  },
  async listBookings() {
    return jsonStore().bookings.slice().reverse();
  },
  async queueNotification(data) {
    const row = { id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, status: "queued", ...data };
    jsonStore().notifications.push(row);
    jsonSave();
    return row;
  },
  async listNotifications(bookingId) {
    const rows = jsonStore().notifications;
    return (bookingId ? rows.filter((n) => n.booking_id === bookingId) : rows.slice()).reverse();
  },
  async listDueNotifications(nowIso) {
    return jsonStore().notifications.filter((n) => n.status === "queued" && n.due_at <= nowIso);
  },
  async markNotification(id, status, providerNote) {
    const row = jsonStore().notifications.find((n) => n.id === id);
    if (!row) return null;
    row.status = status;
    row.provider_note = providerNote || null;
    if (status === "sent") row.sent_at = new Date().toISOString();
    jsonSave();
    return row;
  },
};

// ---- Postgres backend ---------------------------------------------------
const pgBackend = {
  async listServices({ gender, category, level, q, includeHidden } = {}) {
    const conds = [];
    const params = [];
    if (!includeHidden) { conds.push("is_active"); }
    if (gender) { params.push(gender); conds.push(`gender = $${params.length}`); }
    if (category) { params.push(category); conds.push(`category = $${params.length}`); }
    if (level) { params.push(level); conds.push(`level = $${params.length}`); }
    if (q) { params.push(`%${q}%`); conds.push(`(name ILIKE $${params.length} OR category ILIKE $${params.length} OR subcategory ILIKE $${params.length})`); }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const { rows } = await pg().query(`SELECT * FROM services ${where} ORDER BY category, name`, params);
    return rows.map(serviceRow);
  },
  async getService(id) {
    const { rows } = await pg().query("SELECT * FROM services WHERE id = $1", [id]);
    return rows[0] ? serviceRow(rows[0]) : null;
  },
  async createService(d) {
    const id = d.id || `svc-${Date.now()}`;
    const { rows } = await pg().query(
      `INSERT INTO services (id, branch_id, gender, category, subcategory, name, price_min, price_max,
        currency, duration_min, duration_max, level, is_active, provenance, provenance_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [id, d.branch_id, d.gender, d.category, d.subcategory || "", d.name, d.price_min ?? null,
       d.price_max ?? null, d.currency || "INR", d.duration_min ?? null, d.duration_max ?? null,
       d.level || "Entry", d.is_active !== false, d.provenance || "admin", d.provenance_note || null],
    );
    return serviceRow(rows[0]);
  },
  async updateService(id, patch) {
    const keys = Object.keys(patch);
    if (!keys.length) return this.getService(id);
    const set = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const { rows } = await pg().query(
      `UPDATE services SET ${set}, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, ...keys.map((k) => patch[k])],
    );
    return rows[0] ? serviceRow(rows[0]) : null;
  },
  async deleteService(id) {
    const { rowCount } = await pg().query("DELETE FROM services WHERE id = $1", [id]);
    return rowCount > 0;
  },
  async findOrCreateCustomer(name, phone) {
    const { rows } = await pg().query(
      `INSERT INTO customers (id, name, phone) VALUES ($1, $2, $3)
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
      [`cust-${Date.now()}`, name, phone],
    );
    return rows[0];
  },
  async createBooking(data) {
    const id = `book-${Date.now()}`;
    const { rows } = await pg().query(
      `INSERT INTO bookings (id, branch_id, service_id, customer_id, staff_id, appointment_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,'confirmed') RETURNING *`,
      [id, data.branch_id, data.service_id, data.customer_id, data.staff_id || null, data.appointment_at],
    );
    return rows[0];
  },
  async listBookings() {
    const { rows } = await pg().query("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 200");
    return rows;
  },
  async queueNotification(d) {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { rows } = await pg().query(
      `INSERT INTO notifications (id, booking_id, kind, channel, recipient_phone, message, due_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'queued') RETURNING *`,
      [id, d.booking_id, d.kind, d.channel, d.recipient_phone || null, d.message, d.due_at],
    );
    return rows[0];
  },
  async listNotifications(bookingId) {
    const { rows } = bookingId
      ? await pg().query("SELECT * FROM notifications WHERE booking_id = $1 ORDER BY created_at DESC", [bookingId])
      : await pg().query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200");
    return rows;
  },
  async listDueNotifications(nowIso) {
    const { rows } = await pg().query(
      "SELECT * FROM notifications WHERE status = 'queued' AND due_at <= $1 ORDER BY due_at",
      [nowIso],
    );
    return rows;
  },
  async markNotification(id, status, providerNote) {
    const { rows } = await pg().query(
      `UPDATE notifications SET status = $2, provider_note = $3,
        sent_at = CASE WHEN $2 = 'sent' THEN now() ELSE sent_at END
       WHERE id = $1 RETURNING *`,
      [id, status, providerNote || null],
    );
    return rows[0] || null;
  },
};

function getStore() {
  if (usePostgres()) return pgBackend;
  if (isProduction()) {
    throw new Error("DATABASE_URL is not set. Apply db/schema.sql + db/seed.sql to a Postgres database and set DATABASE_URL before deploying — the JSON store is local-dev only.");
  }
  return jsonBackend;
}

module.exports = { getStore, BRANCH };
