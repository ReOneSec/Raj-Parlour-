// Berhampore Salon — customer menu + booking (anti-slop rebuild).
// Menu is an editorial price list, not cards. API contract unchanged:
// GET /api/services, POST /api/bookings (201 + 4 queued notifications:
// confirmation, reminder_24h, reminder_3h, salon_alert). Nothing is
// sent from this page.

let gender = "WOMEN";
let category = "";
let level = "";
let services = [];
let allServices = [];

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function priceText(s) {
  if (s.price_min == null) return "Price on enquiry";
  if (s.price_max && s.price_max !== s.price_min) return `Rs.${s.price_min}–${s.price_max}`;
  return `Rs.${s.price_min}`;
}
function durationText(s) {
  if (s.duration_min == null) return "Duration not stated";
  if (s.duration_max && s.duration_max !== s.duration_min) return `${s.duration_min}–${s.duration_max} mins`;
  return `${s.duration_min} mins`;
}
// Photos, by service id. Only the services with a photo get one; the
// rest stay as plain price rows. All four images are originals in
// public/images/ (1920x1280 JPEG, no text or logos).
function photoFor(s) {
  if (s.id === "hair-cut") return { src: "/images/hair-cut.jpg", alt: "Stylist trimming a woman's long hair" };
  if (String(s.id || "").startsWith("hair-spa-")) return { src: "/images/hair-spa.jpg", alt: "Hair wash and spa treatment at the basin" };
  if (s.id === "normal-cut") return { src: "/images/mens-cut.jpg", alt: "Barber giving a man a clipper cut" };
  return null;
}
function badgeFor(s) {
  if (s.provenance === "verified") return `<span class="badge verified">Verified menu price</span>`;
  if (s.provenance === "unverified") return `<span class="badge unverified">Unverified price — to confirm</span>`;
  if (String(s.provenance_note || "").startsWith("Owner-added")) return `<span class="badge owner">Owner-added</span>`;
  return "";
}
// Next bookable time: next hour on the hour, 10:00–19:00 bookable window.
// This is a strip convenience only — the salon's real staff slots live
// in the slots table and are not seeded; wire them here when added.
function nextSlotDate() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  if (d.getHours() >= 19 || d.getHours() < 10) {
    d.setDate(d.getDate() + (d.getHours() >= 19 ? 1 : 0));
    d.setHours(10, 0, 0, 0);
  }
  return d;
}
function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtWhen(d) {
  return d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
function switchView(showBooking) {
  const apply = () => {
    document.getElementById("menuView").hidden = showBooking;
    document.getElementById("bookingView").hidden = !showBooking;
    window.scrollTo({ top: 0 });
  };
  if (document.startViewTransition) document.startViewTransition(apply);
  else apply();
}

async function load() {
  const params = new URLSearchParams({ gender });
  const sort = document.getElementById("sort").value;
  const q = document.getElementById("search").value.trim();
  if (category) params.set("category", category);
  if (level) params.set("level", level);
  if (sort) params.set("sort", sort);
  if (q) params.set("q", q);
  const res = await fetch(`/api/services?${params}`);
  const data = await res.json();
  services = data.services || [];
  // Unfiltered list (for the spa strip + next-available service) is the
  // same gender, no category/level/search filter.
  const allRes = await fetch(`/api/services?gender=${gender}`);
  allServices = ((await allRes.json()).services) || [];
  render();
}

function render() {
  // Editorial price list, grouped by category in the order returned:
  // one hairline row per service — name, dotted leader, tabular price.
  const list = document.getElementById("list");
  document.getElementById("empty").hidden = services.length > 0;
  const groups = [];
  for (const s of services) {
    const g = groups.find((x) => x.category === s.category);
    if (g) g.items.push(s); else groups.push({ category: s.category, items: [s] });
  }
  list.innerHTML = groups.map((g) => `
    <section class="price-group" aria-label="${esc(g.category)}">
      <h2>${esc(g.category)}</h2>
      ${g.items.map((s) => {
        const photo = photoFor(s);
        return `
      <article class="price-row${photo ? " has-photo" : ""}">
        ${photo ? `<figure class="row-photo"><img src="${photo.src}" width="1920" height="1280" loading="lazy" alt="${esc(photo.alt)}"></figure>` : ""}
        <div class="row-body">
        <div class="row-head">
          <h3>${esc(s.name)}</h3>
          <span class="leader" aria-hidden="true"></span>
          <span class="price">${esc(priceText(s))}</span>
        </div>
        <div class="row-meta">${esc(s.subcategory || "")}${s.subcategory ? " · " : ""}${esc(durationText(s))}${s.level ? ` · <span class="level">${esc(s.level)}</span>` : ""}</div>
        <div>${badgeFor(s)}</div>
        <div class="row-actions"><button type="button" class="btn btn-primary" data-book="${esc(s.id)}">Book this service</button></div>
        </div>
      </article>`;}).join("")}
    </section>`).join("");
  list.querySelectorAll("[data-book]").forEach((btn) => {
    btn.addEventListener("click", () => openBooking(btn.dataset.book));
  });

  // Booking service select: every service in this gender, not just the filtered view.
  const select = document.getElementById("serviceSelect");
  const current = select.value;
  select.innerHTML = allServices.map((s) => `<option value="${esc(s.id)}">${esc(s.name)} — ${esc(priceText(s))}</option>`).join("");
  if (current && allServices.some((s) => s.id === current)) select.value = current;

  updateNextStrip();
  updateSummary();
}

function updateNextStrip() {
  const next = nextSlotDate();
  document.getElementById("nextAvailableText").textContent = `Next available — ${fmtWhen(next)}`;
}

function openBooking(serviceId) {
  if (serviceId) document.getElementById("serviceSelect").value = serviceId;
  document.getElementById("confirmPanel").hidden = true;
  document.getElementById("bookingResult").textContent = "";
  if (!document.getElementById("appointmentAt").value) {
    document.getElementById("appointmentAt").value = toLocalInput(nextSlotDate());
  }
  renderSlotSuggestions();
  updateSummary();
  switchView(true);
}

function renderSlotSuggestions() {
  const row = document.getElementById("slotRow");
  const base = nextSlotDate();
  const slots = [0, 1, 2].map((i) => new Date(base.getTime() + i * 60 * 60 * 1000));
  row.innerHTML = slots.map((d, i) => `<button type="button" class="pill" data-slot="${toLocalInput(d)}">${i === 0 ? "Next: " : ""}${fmtWhen(d)}</button>`).join("");
  row.querySelectorAll("[data-slot]").forEach((b) => b.addEventListener("click", () => {
    document.getElementById("appointmentAt").value = b.dataset.slot;
    updateSummary();
  }));
}

function selectedService() {
  return allServices.find((s) => s.id === document.getElementById("serviceSelect").value) || services[0] || null;
}

function updateSummary() {
  const s = selectedService();
  const whenVal = document.getElementById("appointmentAt").value;
  const when = whenVal ? fmtWhen(new Date(whenVal)) : "—";
  document.getElementById("sumService").textContent = s ? s.name : "—";
  document.getElementById("sumPrice").textContent = s ? priceText(s) : "—";
  document.getElementById("sumDuration").textContent = s ? durationText(s) : "—";
  document.getElementById("sumWhen").textContent = when;
  document.getElementById("sumName").textContent = document.getElementById("custName").value || "—";
  document.getElementById("sumTotal").textContent = s ? `Total: ${priceText(s)}` : "—";
}

function setGender(next) {
  gender = next;
  load();
}

document.querySelectorAll('input[name="gender"]').forEach((r) => r.addEventListener("change", () => setGender(r.value)));
document.getElementById("categoryChips").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-category]");
  if (!btn) return;
  category = btn.dataset.category;
  document.querySelectorAll("#categoryChips .chip").forEach((c) => c.setAttribute("aria-pressed", String(c === btn)));
  load();
});
document.getElementById("levelPills").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-level]");
  if (!btn) return;
  level = btn.dataset.level;
  document.querySelectorAll("#levelPills .pill").forEach((p) => p.setAttribute("aria-pressed", String(p === btn)));
  load();
});
for (const id of ["sort", "search"]) {
  document.getElementById(id).addEventListener("input", load);
}
document.getElementById("nextBookBtn").addEventListener("click", () => {
  const first = allServices[0];
  openBooking(first ? first.id : undefined);
});
document.getElementById("nextSlotBtn").addEventListener("click", () => {
  document.getElementById("appointmentAt").value = toLocalInput(nextSlotDate());
  renderSlotSuggestions();
  updateSummary();
});
document.getElementById("backToMenuBtn").addEventListener("click", () => switchView(false));
document.getElementById("bookAnotherBtn").addEventListener("click", () => {
  document.getElementById("confirmPanel").hidden = true;
  document.getElementById("bookingResult").textContent = "";
  switchView(false);
});
for (const id of ["serviceSelect", "appointmentAt", "custName"]) {
  document.getElementById(id).addEventListener("input", updateSummary);
}

// The date/time + service form never submits on its own (Enter in it
// must not reload the page); the confirm button lives in the details
// form, and its submit reads both forms.
document.getElementById("bookingForm").addEventListener("submit", (e) => e.preventDefault());
document.getElementById("detailsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const out = document.getElementById("bookingResult");
  out.textContent = "Booking…";
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: document.getElementById("serviceSelect").value,
      name: document.getElementById("custName").value,
      phone: document.getElementById("custPhone").value,
      appointment_at: new Date(document.getElementById("appointmentAt").value).toISOString(),
    }),
  });
  const data = await res.json();
  if (!res.ok) { out.textContent = `Could not book: ${data.error || "unknown error"}`; return; }
  const labels = { confirmation: "Confirmation", reminder_24h: "Reminder — 24 hours before", reminder_3h: "Reminder — 3 hours before", salon_alert: "Salon alert" };
  document.getElementById("confirmText").textContent =
    `Booking ${data.booking.id} confirmed for ${data.service ? data.service.name : ""}. ` +
    `These reminders are queued — they are sent only once the salon connects WhatsApp / SMS.`;
  document.getElementById("confirmTimeline").innerHTML = (data.notifications || []).map((n) => `
    <li><span class="kind">${esc(labels[n.kind] || n.kind)}</span>
    <div class="when">Due ${new Date(n.due_at).toLocaleString("en-IN")} · ${esc(n.status)}</div></li>`).join("");
  document.getElementById("confirmPanel").hidden = false;
  document.getElementById("confirmPanel").scrollIntoView({ behavior: "smooth" });
  out.textContent = "";
});

load();
