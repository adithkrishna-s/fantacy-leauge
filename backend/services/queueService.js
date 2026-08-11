// WhatsApp notifications are currently DISABLED.
//
// This project previously pushed outbound WhatsApp messages onto a Bull queue
// backed by Redis, drained by workers/whatsappWorker.js. That setup has been
// retired, so this module is now a no-op shim: it preserves the
// addToWhatsappQueue() contract the controllers still call (async, resolves to
// null, never throws), but sends nothing and requires no Redis.
//
// To re-enable: restore the Bull/Redis implementation here (see git history for
// services/queueService.js) and bring back workers/whatsappWorker.js.

const addToWhatsappQueue = async (/* countryCode, phoneNumber, message */) => {
  // Intentionally a no-op. Returns null to match the previous
  // "queue unavailable" behaviour that all callers already handle gracefully.
  return null;
};

module.exports = { addToWhatsappQueue };
