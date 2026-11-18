const { getStore } = require("../lib/db");
const { sendJson, sendError } = require("../lib/http");

function sortServices(rows, sort) {
  const byPrice = (s) => s.price_min ?? Number.POSITIVE_INFINITY;
  const byDuration = (s) => s.duration_min ?? Number.POSITIVE_INFINITY;
  const copy = rows.slice();
  if (sort === "price_asc") copy.sort((a, b) => byPrice(a) - byPrice(b));
  if (sort === "price_desc") copy.sort((a, b) => byPrice(b) - byPrice(a));
  if (sort === "duration_asc") copy.sort((a, b) => byDuration(a) - byDuration(b));
  if (sort === "duration_desc") copy.sort((a, b) => byDuration(b) - byDuration(a));
  return copy;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
    const q = req.query || {};
    const rows = await getStore().listServices({
      gender: q.gender || undefined,
      category: q.category || undefined,
      level: q.level || undefined,
      q: q.q || undefined,
    });
    sendJson(res, 200, { services: sortServices(rows, q.sort || "") });
  } catch (err) {
    sendError(res, err);
  }
};
