// Booking creation + notification queueing. One function, used by both
// the Vercel API route and the local dev server, so the two can never drift.
//
// On every booking, exactly four queue rows are created:
//   confirmation — due now
//   reminder_24h — due 24 hours before the appointment
//   reminder_3h  — due 3 hours before the appointment
//   salon_alert  — due now, recipient only if SALON_ALERT_PHONE is set
// Nothing is sent here. Sending happens only in lib/notifications.js
// when due rows are processed through lib/providers.js.

const { getStore, BRANCH } = require("./db");
const { processDueNotifications } = require("./notifications");

function formatPrice(service) {
  if (service.price_min == null) return "Price on enquiry";
  if (service.price_max && service.price_max !== service.price_min) {
    return `Rs.${service.price_min}–${service.price_max}`;
  }
  return `Rs.${service.price_min}`;
}

async function createBooking({ service_id, name, phone, appointment_at }) {
  if (!service_id || !name || !phone || !appointment_at) {
    const err = new Error("service_id, name, phone and appointment_at are all required");
    err.status = 400;
    throw err;
  }
  const appointment = new Date(appointment_at);
  if (Number.isNaN(appointment.getTime())) {
    const err = new Error("appointment_at is not a valid date/time");
    err.status = 400;
    throw err;
  }
  const store = getStore();
  const service = await store.getService(service_id);
  if (!service || !service.is_active) {
    const err = new Error("Service not found or not available");
    err.status = 404;
    throw err;
  }
  const customer = await store.findOrCreateCustomer(name.trim(), phone.trim());
  const booking = await store.createBooking({
    branch_id: BRANCH.id,
    service_id: service.id,
    customer_id: customer.id,
    appointment_at: appointment.toISOString(),
  });

  const when = appointment.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const channel = process.env.NOTIFICATION_CHANNEL || "queue";
  const salonPhone = process.env.SALON_ALERT_PHONE || null;
  const queue = [
    { kind: "confirmation", recipient_phone: phone.trim(), due_at: new Date().toISOString(),
      message: `Booking confirmed at ${BRANCH.name}, ${BRANCH.address}: ${service.name} (${formatPrice(service)}) on ${when}.` },
    { kind: "reminder_24h", recipient_phone: phone.trim(),
      due_at: new Date(appointment.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      message: `Reminder: your ${service.name} appointment at ${BRANCH.name} is tomorrow, ${when}.` },
    { kind: "reminder_3h", recipient_phone: phone.trim(),
      due_at: new Date(appointment.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      message: `Reminder: your ${service.name} appointment at ${BRANCH.name} is in 3 hours, ${when}.` },
    { kind: "salon_alert", recipient_phone: salonPhone, due_at: new Date().toISOString(),
      message: `New booking: ${service.name} for ${name.trim()} (${phone.trim()}) on ${when}.` },
  ];
  const notifications = [];
  for (const n of queue) {
    notifications.push(await store.queueNotification({ booking_id: booking.id, channel, ...n }));
  }
  // Process only rows that are due now (confirmation + salon alert);
  // future reminders stay queued until their due time.
  await processDueNotifications(store);
  return { booking, customer, service, notifications: await store.listNotifications(booking.id) };
}

module.exports = { createBooking };
