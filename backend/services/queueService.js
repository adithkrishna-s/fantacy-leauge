const Queue = require('bull');
const Redis = require('ioredis');
const axios = require('axios');

// Redis configuration
const redisConfig = {
  host: 'localhost', // or your Redis server IP
  port: 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

// Create the queue
const whatsappQueue = new Queue('whatsapp-notifications', {
  createClient: (type) => {
    return new Redis(redisConfig); // 🔥 Always create a fresh Redis connection
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Process jobs with random delay between 20-60 seconds
whatsappQueue.process(async (job) => {
  const { countryCode, phoneNumber, message } = job.data;

  // Clean the country code
  const cleanedCountryCode = countryCode.replace('+', '');
  const receiverNumber = `${cleanedCountryCode}${phoneNumber}`;

  // Credentials come from the environment (read at send time so they are
  // available regardless of dotenv load order). Never hard-code secrets.
  const appkey = process.env.WHATSAPP_APPKEY;
  const authkey = process.env.WHATSAPP_AUTHKEY;
  const apiUrl = process.env.WHATSAPP_API_URL || 'https://websender.eappcloud.in/api/create-message';

  if (!appkey || !authkey) {
    throw new Error('WhatsApp credentials not configured (set WHATSAPP_APPKEY and WHATSAPP_AUTHKEY)');
  }

  const whatsappData = {
    appkey,
    authkey,
    to: receiverNumber,
    message: message,
  };

  try {
    const response = await axios.post(apiUrl, whatsappData);
    console.log(`WhatsApp message sent to ${phoneNumber}:`, response.data);
    return true;
  } catch (error) {
    console.error(`Failed to send WhatsApp to ${phoneNumber}:`, error.response?.data || error.message);
    throw error; // Triggers retry mechanism
  }
});

// Add delay between jobs
whatsappQueue.on('completed', () => {
  // const delay = Math.floor(Math.random() * 40000) + 20000; // 20-60 seconds
  const delay = Math.floor(Math.random() * 10000) + 50000; // 50-60 seconds
  whatsappQueue.pause(); // Pause first
  setTimeout(() => whatsappQueue.resume(), delay);
});

// Queue-level error handling
whatsappQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

// Function to add a job to the WhatsApp queue
const addToWhatsappQueue = async (countryCode, phoneNumber, message) => {
  try {
    return await whatsappQueue.add({
      countryCode,
      phoneNumber,
      message
    });
  } catch (error) {
    console.error('Failed to add job to WhatsApp queue:', error.message);
    return null; // Gracefully handle Redis/queue unavailability
  }
};

module.exports = {
  addToWhatsappQueue,
  whatsappQueue
};

