// Shared helpers for Vercel serverless functions and the local server.
// Vercel passes (req, res); server.js adapts its own request to the same shape.

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function sendError(res, err) {
  const status = err.status || 500;
  sendJson(res, status, { error: err.message || "Internal error" });
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

// Admin routes: if ADMIN_TOKEN is set, the caller must send it as
// x-admin-token. If it is NOT set (local dev only), admin is open and
// every admin response carries a warning — set it before going public.
function requireAdmin(req, res) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return { open: true };
  if (req.headers && req.headers["x-admin-token"] === token) return { open: false };
  sendJson(res, 401, { error: "Admin token required" });
  return null;
}

module.exports = { sendJson, sendError, readJson, requireAdmin };
