const { getStore } = require("../../lib/db");
const { sendJson, sendError, readJson, requireAdmin } = require("../../lib/http");
const { BRANCH } = require("../../lib/seed");

const ALLOWED = ["gender", "category", "subcategory", "name", "price_min", "price_max",
  "currency", "duration_min", "duration_max", "level", "is_active", "provenance", "provenance_note"];

function pick(body) {
  const out = {};
  for (const key of ALLOWED) if (body[key] !== undefined) out[key] = body[key];
  return out;
}

module.exports = async (req, res) => {
  try {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const store = getStore();
    const warning = admin.open ? "ADMIN_TOKEN is not set: admin is open. Set ADMIN_TOKEN before going public." : null;

    if (req.method === "GET") {
      return sendJson(res, 200, { warning, services: await store.listServices({ includeHidden: true }) });
    }
    if (req.method === "POST") {
      const body = await readJson(req);
      if (!body.name || !body.category || !body.gender) {
        return sendJson(res, 400, { error: "name, category and gender are required" });
      }
      const created = await store.createService({ branch_id: BRANCH.id, ...pick(body) });
      return sendJson(res, 201, { warning, service: created });
    }
    // Single-service routes use ?id=… (Vercel file routing has no path params here).
    const id = (req.query || {}).id;
    if (!id) return sendJson(res, 400, { error: "Query param id is required for PUT/DELETE" });
    if (req.method === "PUT") {
      const updated = await store.updateService(id, pick(await readJson(req)));
      if (!updated) return sendJson(res, 404, { error: "Service not found" });
      return sendJson(res, 200, { warning, service: updated });
    }
    if (req.method === "DELETE") {
      const ok = await store.deleteService(id);
      if (!ok) return sendJson(res, 404, { error: "Service not found" });
      return sendJson(res, 200, { warning, deleted: id });
    }
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    sendError(res, err);
  }
};
