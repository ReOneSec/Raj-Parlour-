// Local dev server only — NOT used on Vercel (Vercel runs api/*.js
// as serverless functions and serves public/ as static files).
// Reuses the exact same API handlers, so a local verification is a
// verification of the deployed code path, not a second implementation.

const http = require("http");
const fs = require("fs");
const path = require("path");

const services = require("./api/services");
const bookings = require("./api/bookings");
const notifications = require("./api/notifications");
const adminServices = require("./api/admin/services");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

function queryOf(url) {
  const q = {};
  for (const [k, v] of url.searchParams.entries()) q[k] = v;
  return q;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    req.query = queryOf(url);

    if (url.pathname === "/api/services") return services(req, res);
    if (url.pathname === "/api/bookings") return bookings(req, res);
    if (url.pathname === "/api/notifications") return notifications(req, res);
    if (url.pathname === "/api/admin/services") return adminServices(req, res);

    // Static files from public/. Anything outside public/ is not served.
    let filePath = path.join(__dirname, "public", url.pathname === "/" ? "index.html" : url.pathname);
    if (!filePath.startsWith(path.join(__dirname, "public"))) {
      res.statusCode = 403; return res.end("Forbidden");
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.statusCode = 404; return res.end("Not found");
    }
    res.setHeader("Content-Type", MIME[path.extname(filePath)] || "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
});

const port = process.env.PORT || 3000;
if (require.main === module) {
  server.listen(port, () => console.log(`Salon Berhampore dev server on http://localhost:${port}`));
}
module.exports = server;
