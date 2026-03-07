const asyncHandler = require("express-async-handler");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// @desc    Add a new transaction
// @route   POST /api/transactions
// @access  Private
const addTransaction = asyncHandler(async (req, res) => {
  try {
    const { userId, amount, type, status } = req.body;

    if (!userId || !amount || !type || !status) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Create transaction
    const transaction = await Transaction.create({
      user: userId,
      amount,
      type,
      status,
    });

    // Get user details including updated credits
    const user = await User.findById(userId).select('countryCode phoneNumber credits');
    if (!user) {
      console.error("User not found for transaction notification");
      return res.status(201).json({ 
        message: "Transaction added but user not found for notification", 
        transaction 
      });
    }

    // Format amount with + or - based on type
    const formattedAmount = type === 'Credit' ? `+₹${amount}` : `-₹${amount}`;

    // Prepare WhatsApp Message
    const message = `
💰 **Transaction Notification**

Transaction Type: *${type}*
Amount: *${formattedAmount}*
Status: *${status}*
Available Balance: *₹${user.credits}*

📅 Date: *${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}*

Thank you for using FantasyLeague7!
    `.trim();

    // Add message to queue
    try {
      await addToWhatsappQueue(user.countryCode, user.phoneNumber, message);
      console.log(`Transaction notification queued for user ${userId}`);
    } catch (queueError) {
      console.error(`Failed to queue transaction notification for user ${userId}:`, queueError);
      // Continue with success response even if queuing fails
    }

    res.status(201).json({ 
      success: true,
      message: "Transaction added successfully!", 
      data: {
        transaction,
        notificationQueued: true
      }
    });
  } catch (error) {
    console.error("Error adding transaction:", error);
    res.status(500).json({ 
      success: false,
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});




// @desc    Get transactions by user ID
// @route   GET /api/transactions/:userId
// @access  Private
const getTransactionsByUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const transactions = await Transaction.find({ user: userId });

    if (!transactions.length) {
        return res.status(404).json({ error: "No transactions found for this user." });
    }

    res.json(transactions);
});

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = asyncHandler(async (req, res) => {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
        return res.status(404).json({ error: "Transaction not found." });
    }

    await transaction.deleteOne();
    res.json({ message: "Transaction deleted successfully." });
});

module.exports = { addTransaction, getTransactionsByUser, deleteTransaction };
