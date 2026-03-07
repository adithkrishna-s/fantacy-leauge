// /backend/workers/whatsappWorker.js

const { whatsappQueue } = require('../services/queueService');

console.log("✅ WhatsApp Worker Started - Listening to Queue...");

process.on('SIGINT', () => {
  console.log("❌ WhatsApp Worker Stopped");
  process.exit();
});
