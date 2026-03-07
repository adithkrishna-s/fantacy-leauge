// server.js
const express = require('express');
const app = express();
const dotenv = require('dotenv');
const connectDB = require('./config/db');
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

// Connect to Database
connectDB();

// ✅ Middleware for CORS
app.use(cors({
  origin: 'https://fantasyleague7.com:3000',  // Allow requests from React frontend
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



// Users API Route
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// ✅ Error Handling Middleware
app.use(errorHandler);

// ✅ Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));