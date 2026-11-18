const { getStore } = require("../lib/db");
const { processDueNotifications } = require("../lib/notifications");
const { sendJson, sendError, requireAdmin } = require("../lib/http");

module.exports = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const store = getStore();
    if (req.method === "GET") {
      const q = req.query || {};
      return sendJson(res, 200, { notifications: await store.listNotifications(q.booking_id || undefined) });
    }
    if (req.method === "POST") {
      // Process due rows. Call this on a schedule from an external
      // scheduler (POST with x-admin-token every 15 minutes) — see README.
      const processed = await processDueNotifications(store);
      return sendJson(res, 200, { processed: processed.length, notifications: processed });
    }
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    sendError(res, err);
  }
};
