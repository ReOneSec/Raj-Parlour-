// Notification processor: finds queued rows whose due time has passed
// and attempts each one through the provider hooks. A row is marked
// "sent" ONLY when the provider call actually succeeds; anything else
// stays "queued" (for missing config / no recipient) or becomes
// "failed" (for a provider error), with the reason recorded.

const { sendNotification } = require("./providers");

async function processDueNotifications(store) {
  const now = new Date().toISOString();
  const due = await store.listDueNotifications(now);
  const results = [];
  for (const n of due) {
    const outcome = await sendNotification(n);
    if (outcome.sent) {
      results.push(await store.markNotification(n.id, "sent", outcome.note));
    } else if (outcome.note.includes("NOT_CONFIGURED") || outcome.note.includes("No recipient") || outcome.note.includes("NOTIFICATION_CHANNEL=queue")) {
      // Not an error to retry blindly: leave queued so the owner can
      // configure the channel and re-run processing later.
      results.push(n);
    } else {
      results.push(await store.markNotification(n.id, "failed", outcome.note));
    }
  }
  return results;
}

module.exports = { processDueNotifications };
