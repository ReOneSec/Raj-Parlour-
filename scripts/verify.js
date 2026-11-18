// End-to-end verification through the real code path:
// starts server.js on an ephemeral port (fresh JSON store), then checks
//  1. the menu page renders and contains Hair Cut + the anti-slop UI
//     markers (split hero, editorial price list, flat filter bar),
//  2. GET /api/services returns the verified Hair Cut price and the
//     owner-added Men Normal Cut (Rs.100, 20 mins),
//  3. a booking creates exactly 4 notification queue rows,
//  4. an admin price edit changes the menu price on the next fetch,
//  5. the admin page uses a native <dialog> for deletes,
//  6. the stylesheet has no frosted glass, no soft shadows, no
//     floating-pill bar, and uses the bottle-green/brass palette.
// Usage: node scripts/verify.js   (exit 0 = all checks pass)
// The script deletes its own test data file afterwards.

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const dataFile = path.join(__dirname, "..", "data", "verify-db.json");
if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);

const port = 3457;
const env = { ...process.env, PORT: String(port), DATA_FILE: dataFile };
const server = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env, stdio: "pipe" });

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  server.kill();
  process.exit(1);
}
function check(cond, label) {
  if (!cond) fail(label);
  console.log(`ok: ${label}`);
}

(async () => {
  // Wait for the server to answer.
  let up = false;
  for (let i = 0; i < 50 && !up; i++) {
    try { const r = await fetch(`http://localhost:${port}/`); up = r.ok; } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  if (!up) fail("server did not start");

  try {
    const home = await (await fetch(`http://localhost:${port}/`)).text();
    check(home.includes("Berhampore Salon") && home.includes("Hair"), "menu page renders");
    check(home.includes("The chair is waiting.") && home.includes("filterbar") && home.includes("bookingView") && home.includes("pricelist"),
      "anti-slop UI present: split hero, flat filter bar, editorial price list, booking view");
    check(!home.includes("spa-strip") && !home.includes("next-pill"),
      "no spa strip or floating pill bar in the menu markup");
    const css = await (await fetch(`http://localhost:${port}/styles.css`)).text();
    check(css.includes("#143c32") && css.includes("#a8862f"), "bottle-green/brass palette in stylesheet");
    check(!css.includes("backdrop-filter") && !css.includes("box-shadow") && !css.includes("999px"),
      "no frosted glass, no soft shadows, no pill radii in stylesheet");
    check(css.includes(":focus-visible"), "visible focus styles present");
    const adminPage = await (await fetch(`http://localhost:${port}/admin.html`)).text();
    check(adminPage.includes("<dialog") && adminPage.includes("deleteDialog") && adminPage.includes("reminder-list"),
      "admin page uses native dialog for deletes and hairline reminder list");

    const before = await (await fetch(`http://localhost:${port}/api/services?gender=WOMEN&category=Hair`)).json();
    const hairCut = (before.services || []).find((s) => s.id === "hair-cut");
    check(hairCut && hairCut.price_min === 340 && hairCut.price_max === 1750, "Hair Cut seeded at Rs.340-1750 (verified price)");
    const men = await (await fetch(`http://localhost:${port}/api/services?gender=MEN`)).json();
    const normalCut = (men.services || []).find((s) => s.id === "normal-cut");
    check(normalCut && normalCut.price_min === 100 && normalCut.duration_min === 20 && normalCut.level === "Entry",
      "owner-added Normal Cut seeded: Men, Rs.100, 20 mins, Entry");
    check((before.services || []).some((s) => s.provenance === "unverified"), "unverified Hair Spa rows are labelled as unverified");
    check(!(before.services || []).some((s) => s.category === "Skin"), "Skin category starts empty (no invented prices)");

    const appointment = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const bookingRes = await fetch(`http://localhost:${port}/api/bookings`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: "hair-cut", name: "Test Customer", phone: "test-phone-not-a-real-number", appointment_at: appointment }),
    });
    const booking = await bookingRes.json();
    check(bookingRes.status === 201, "booking created (201)");
    const kinds = (booking.notifications || []).map((n) => n.kind).sort();
    check(JSON.stringify(kinds) === JSON.stringify(["confirmation", "reminder_24h", "reminder_3h", "salon_alert"]),
      `booking queued 4 notifications: ${kinds.join(", ")}`);
    check((booking.notifications || []).every((n) => n.status === "queued"),
      "no notification reported as sent with no provider configured (demo sends nothing)");

    const editRes = await fetch(`http://localhost:${port}/api/admin/services?id=hair-cut`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price_min: 350, price_max: 1800 }),
    });
    check(editRes.ok, "admin price edit accepted");
    const after = await (await fetch(`http://localhost:${port}/api/services?gender=WOMEN&category=Hair`)).json();
    const edited = (after.services || []).find((s) => s.id === "hair-cut");
    check(edited && edited.price_min === 350 && edited.price_max === 1800, "admin price edit changes the menu (350-1800)");
    console.log("ALL CHECKS PASSED");
  } finally {
    server.kill();
    if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
  }
  process.exit(0);
})().catch((err) => fail(err.message));
