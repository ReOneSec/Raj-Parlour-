const { createBooking } = require("../lib/booking");
const { getStore } = require("../lib/db");
const { sendJson, sendError, readJson } = require("../lib/http");

module.exports = async (req, res) => {
  try {
    if (req.method === "POST") {
      const body = await readJson(req);
      const result = await createBooking(body);
      return sendJson(res, 201, result);
    }
    if (req.method === "GET") {
      // Admin view of bookings; kept behind the same admin check as admin routes.
      const { requireAdmin } = require("../lib/http");
      if (!requireAdmin(req, res)) return;
      return sendJson(res, 200, { bookings: await getStore().listBookings() });
    }
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    sendError(res, err);
  }
};
