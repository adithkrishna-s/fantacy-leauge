// server.js
const express = require('express');
const app = express();
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const clubRoutes = require("./routes/clubRoutes");
const matchRoutes = require("./routes/matchRoutes");
const groupRoutes = require('./routes/groupRoutes');
const resultRoutes = require('./routes/resultRoutes');
const winnerRoutes = require('./routes/winnerRoutes');
const transactionRoutes = require("./routes/transactionRoutes");

const betRoutes = require('./routes/betRoutes'); 
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorMiddleware');
const cors = require('cors');
const { updateMatchStatuses } = require('./scripts/matchStatusUpdater');





// Load environment variables
dotenv.config();

// ✅ Middleware for CORS
const allowedOrigins = [
  'https://fantacyleauge.com',
  'https://www.fantacyleauge.com',
  'http://localhost:3000',
  'http://localhost:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow requests during proxying/SSR
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ✅ Middleware for parsing JSON and cookies
app.use(express.json());
app.use(cookieParser());

// Run immediately on startup
updateMatchStatuses();

// Then run every minute (60000 milliseconds)
setInterval(updateMatchStatuses, 60000);

// ✅ Routes
app.use('/api/users', userRoutes);
app.use("/api/clubs", clubRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/winners', winnerRoutes);
app.use("/api/transactions", transactionRoutes);





// ✅ Error Handling Middleware
app.use(errorHandler);

// ✅ Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));