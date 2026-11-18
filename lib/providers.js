// PROVIDER HOOKS — the only place a real message can ever be sent.
//
// Design rules, enforced by the code below:
//  1. No credentials are in this repo. Everything comes from env vars.
//  2. No phone numbers are invented. The salon alert has NO recipient
//     until the owner sets SALON_ALERT_PHONE themselves.
//  3. If the chosen channel is not configured, sending is SKIPPED and
//     the queue row is left as "queued" with a note — it is never
//     reported as sent. The demo therefore sends nothing, by design.
//  4. When configured, the hook calls the provider the owner chose.
//     WhatsApp uses the WhatsApp Business Cloud API; SMS uses a
//     provider endpoint supplied via SMS_API_URL (no provider is
//     hardcoded, because the owner picks one). Verify the provider's
//     current API docs before going live — see README § "WhatsApp/SMS".

async function sendViaWhatsApp(to, message) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { sent: false, note: "WHATSAPP_NOT_CONFIGURED: set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID" };
  }
  // PROVIDER HOOK: WhatsApp Business Cloud API, text message.
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: message } }),
  });
  if (!res.ok) return { sent: false, note: `WhatsApp provider error: HTTP ${res.status}` };
  return { sent: true, note: "Sent via WhatsApp Business Cloud API" };
}

async function sendViaSms(to, message) {
  const apiUrl = process.env.SMS_API_URL;
  const apiKey = process.env.SMS_API_KEY;
  if (!apiUrl || !apiKey) {
    return { sent: false, note: "SMS_NOT_CONFIGURED: set SMS_API_URL and SMS_API_KEY (and SMS_SENDER_ID if your provider needs one)" };
  }
  // PROVIDER HOOK: generic SMS provider endpoint supplied by the owner.
  // Request shape varies by provider — adapt this one call to the
  // provider's docs; do not hardcode a provider or a sender number here.
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, message, sender_id: process.env.SMS_SENDER_ID || undefined }),
  });
  if (!res.ok) return { sent: false, note: `SMS provider error: HTTP ${res.status}` };
  return { sent: true, note: "Sent via configured SMS provider" };
}

// One entry point for the notification processor. Returns {sent, note}.
// channel "queue" means: keep it queued for review, never send.
async function sendNotification(notification) {
  const channel = process.env.NOTIFICATION_CHANNEL || "queue";
  if (channel === "queue") {
    return { sent: false, note: "NOTIFICATION_CHANNEL=queue (default): message queued only, nothing sent" };
  }
  if (!notification.recipient_phone) {
    return { sent: false, note: "No recipient phone configured for this notification (salon alert needs SALON_ALERT_PHONE)" };
  }
  if (channel === "whatsapp") return sendViaWhatsApp(notification.recipient_phone, notification.message);
  if (channel === "sms") return sendViaSms(notification.recipient_phone, notification.message);
  return { sent: false, note: `Unknown NOTIFICATION_CHANNEL: ${channel}` };
}

module.exports = { sendNotification };
