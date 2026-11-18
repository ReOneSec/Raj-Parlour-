// Salon Admin — flat stat strip, plain text tabs, hairline reminder rows,
// native <dialog> for service deletes and the add/edit form.
// API contract unchanged: /api/admin/services, /api/bookings,
// /api/notifications (GET list, POST process due).

function headers() {
  const token = document.getElementById("adminToken").value.trim();
  if (token) sessionStorage.setItem("adminToken", token);
  const h = { "Content-Type": "application/json" };
  if (token) h["x-admin-token"] = token;
  return h;
}
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

let pendingDeleteId = null;
let pendingDeleteName = "";

function showTab(name) {
  document.getElementById("panelServices").hidden = name !== "services";
  document.getElementById("panelBookings").hidden = name !== "bookings";
  document.getElementById("panelReminders").hidden = name !== "reminders";
}

function openServiceDialog(service) {
  const dlg = document.getElementById("serviceDialog");
  document.getElementById("serviceDialogTitle").textContent = service ? "Edit service" : "Add a service";
  document.getElementById("serviceResult").textContent = "";
  const set = (id, v) => { document.getElementById(id).value = v ?? ""; };
  set("fId", service ? service.id : "");
  set("fName", service ? service.name : "");
  set("fGender", service ? service.gender : "WOMEN");
  set("fCategory", service ? service.category : "Hair");
  set("fSubcategory", service ? service.subcategory : "");
  set("fPriceMin", service ? service.price_min : "");
  set("fPriceMax", service ? service.price_max : "");
  set("fDurMin", service ? service.duration_min : "");
  set("fDurMax", service ? service.duration_max : "");
  set("fLevel", service ? service.level : "Entry");
  set("fProvenance", service ? service.provenance : "admin");
  document.getElementById("fActive").checked = service ? service.is_active : true;
  dlg.showModal();
}

function openDeleteDialog(id, name) {
  pendingDeleteId = id;
  pendingDeleteName = name;
  document.getElementById("deleteText").textContent =
    `Delete “${name}” from the menu? Bookings already made for it are not deleted.`;
  document.getElementById("deleteDialog").showModal();
}

async function refresh() {
  const saved = sessionStorage.getItem("adminToken");
  if (saved) document.getElementById("adminToken").value = saved;
  const [svcRes, notifRes, bookRes] = await Promise.all([
    fetch("/api/admin/services", { headers: headers() }),
    fetch("/api/notifications", { headers: headers() }),
    fetch("/api/bookings", { headers: headers() }),
  ]);
  const svc = await svcRes.json();
  const notif = await notifRes.json();
  const books = await bookRes.json();
  if (svc.warning) document.getElementById("adminWarning").textContent = svc.warning;

  const services = svc.services || [];
  const notifications = notif.notifications || [];
  const bookings = books.bookings || [];
  const now = new Date().toISOString();
  document.getElementById("statServices").textContent = services.filter((s) => s.is_active).length;
  document.getElementById("statBookings").textContent = bookings.length;
  document.getElementById("statQueued").textContent = notifications.filter((n) => n.status === "queued").length;
  document.getElementById("statDue").textContent = notifications.filter((n) => n.status === "queued" && n.due_at <= now).length;

  const rows = services.map((s) => `<tr>
    <td>${esc(s.name)}</td><td>${esc(s.gender)} / ${esc(s.category)}</td>
    <td>${s.price_min ?? "—"}${s.price_max && s.price_max !== s.price_min ? "–" + s.price_max : ""}</td>
    <td>${esc(s.provenance)}${String(s.provenance_note || "").startsWith("Owner-added") ? " (owner-added)" : ""}</td>
    <td>${s.is_active ? "Shown" : "Hidden"}</td>
    <td><button type="button" class="btn" data-edit="${esc(s.id)}">Edit</button>
        <button type="button" class="btn" data-hide="${esc(s.id)}">${s.is_active ? "Hide" : "Show"}</button>
        <button type="button" class="btn" data-del="${esc(s.id)}" data-name="${esc(s.name)}">Delete</button></td></tr>`).join("");
  document.getElementById("servicesTable").innerHTML =
    `<table><tr><th>Name</th><th>Gender / Category</th><th>Price</th><th>Provenance</th><th>Menu</th><th>Actions</th></tr>${rows || "<tr><td colspan=6>No services yet</td></tr>"}</table>`;

  document.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
    const s = services.find((x) => x.id === b.dataset.edit);
    if (s) openServiceDialog(s);
  }));
  document.querySelectorAll("[data-hide]").forEach((b) => b.addEventListener("click", async () => {
    const s = services.find((x) => x.id === b.dataset.hide);
    await fetch(`/api/admin/services?id=${encodeURIComponent(s.id)}`, {
      method: "PUT", headers: headers(), body: JSON.stringify({ is_active: !s.is_active }),
    });
    refresh();
  }));
  document.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    openDeleteDialog(b.dataset.del, b.dataset.name);
  }));

  // Hairline reminder rows (newest first, as returned by the API).
  const kindLabel = { confirmation: "Confirmation", reminder_24h: "24-hour reminder", reminder_3h: "3-hour reminder", salon_alert: "Salon alert" };
  document.getElementById("notificationsList").innerHTML = notifications.map((n) => `
    <article class="reminder-row">
      <div class="avatar" aria-hidden="true">${esc((kindLabel[n.kind] || n.kind).slice(0, 1))}</div>
      <div class="body">
        <div class="head"><strong>${esc(kindLabel[n.kind] || n.kind)}</strong>
          <span class="status ${esc(n.status)}">${esc(n.status)}</span>
          <time>${new Date(n.due_at).toLocaleString("en-IN")}</time></div>
        <p>To: ${esc(n.recipient_phone || "salon — no alert number set")} · ${esc(n.message || "")}</p>
        ${n.provider_note ? `<p>Note: ${esc(n.provider_note)}</p>` : ""}
      </div>
    </article>`).join("") || "<p>No notifications yet — they appear here when a booking is made.</p>";

  const brows = bookings.map((b) => `<tr><td>${esc(b.id)}</td><td>${esc(b.service_id)}</td>
    <td>${new Date(b.appointment_at).toLocaleString("en-IN")}</td><td>${esc(b.status)}</td></tr>`).join("");
  document.getElementById("bookingsTable").innerHTML =
    `<table><tr><th>Booking</th><th>Service</th><th>Appointment</th><th>Status</th></tr>${brows || "<tr><td colspan=4>No bookings yet</td></tr>"}</table>`;
}

document.getElementById("refreshBtn").addEventListener("click", refresh);
document.getElementById("addServiceBtn").addEventListener("click", () => openServiceDialog(null));
document.getElementById("cancelServiceBtn").addEventListener("click", () => {
  document.getElementById("serviceDialog").close();
});
document.querySelectorAll('input[name="adminTab"]').forEach((r) => r.addEventListener("change", () => showTab(r.value)));
document.getElementById("processBtn").addEventListener("click", async () => {
  const res = await fetch("/api/notifications", { method: "POST", headers: headers() });
  const data = await res.json();
  alert(`Processed ${data.processed ?? 0} due notification(s).`);
  refresh();
});
document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  await fetch(`/api/admin/services?id=${encodeURIComponent(pendingDeleteId)}`, { method: "DELETE", headers: headers() });
  document.getElementById("deleteDialog").close();
  pendingDeleteId = null;
  refresh();
});

// Light-dismiss fallback for browsers without closedby support:
// a click on the dialog element itself (outside its content box) closes it.
for (const dlg of document.querySelectorAll("dialog")) {
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });
}

document.getElementById("serviceForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("fId").value.trim();
  const num = (v) => (v === "" ? null : Number(v));
  const body = {
    name: document.getElementById("fName").value,
    gender: document.getElementById("fGender").value,
    category: document.getElementById("fCategory").value,
    subcategory: document.getElementById("fSubcategory").value,
    price_min: num(document.getElementById("fPriceMin").value),
    price_max: num(document.getElementById("fPriceMax").value),
    duration_min: num(document.getElementById("fDurMin").value),
    duration_max: num(document.getElementById("fDurMax").value),
    level: document.getElementById("fLevel").value,
    provenance: document.getElementById("fProvenance").value,
    is_active: document.getElementById("fActive").checked,
  };
  const url = id ? `/api/admin/services?id=${encodeURIComponent(id)}` : "/api/admin/services";
  const res = await fetch(url, { method: id ? "PUT" : "POST", headers: headers(), body: JSON.stringify(body) });
  const data = await res.json();
  document.getElementById("serviceResult").textContent = res.ok ? "Saved — the customer menu updates from this data." : `Error: ${data.error || "unknown"}`;
  if (res.ok) {
    document.getElementById("serviceDialog").close();
    refresh();
  }
});

refresh();
