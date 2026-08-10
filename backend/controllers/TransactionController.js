const asyncHandler = require("express-async-handler");
const prisma = require("../config/prisma");
const { addToWhatsappQueue } = require('../services/queueService');

// @desc    Add a new transaction
// @route   POST /api/transactions
// @access  Private
const addTransaction = asyncHandler(async (req, res) => {
  try {
    const { userId, amount, type, status, description } = req.body;

    if (!userId || !amount || !type) {
      return res.status(400).json({ error: "All required fields must be provided." });
    }

    const txnCode = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const transaction = await prisma.transaction.create({
      data: {
        id: require('crypto').randomUUID(),
        transactionId: txnCode,
        user: userId,
        amount: parseFloat(amount),
        type,
        description: description || `Transaction (${type})`,
      }
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error("User not found for transaction notification");
      return res.status(201).json({ 
        message: "Transaction added but user not found for notification", 
        transaction: { ...transaction, _id: transaction.id }
      });
    }

    const formattedAmount = type === 'Credit' ? `+₹${amount}` : `-₹${amount}`;

    const message = `
💰 **Transaction Notification**

Transaction Type: *${type}*
Amount: *${formattedAmount}*
Available Balance: *₹${user.credits}*

📅 Date: *${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}*

Thank you for using FantasyLeague7!
    `.trim();

    try {
      await addToWhatsappQueue(user.countryCode || '+91', user.phoneNumber, message);
      console.log(`Transaction notification queued for user ${userId}`);
    } catch (queueError) {
      console.error(`Failed to queue transaction notification for user ${userId}:`, queueError);
    }

    res.status(201).json({ 
      success: true,
      message: "Transaction added successfully!", 
      data: {
        transaction: { ...transaction, _id: transaction.id },
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
  const transactions = await prisma.transaction.findMany({
    where: { user: userId },
    orderBy: { createdAt: 'desc' }
  });

  const formattedTransactions = transactions.map(t => ({
    ...t,
    _id: t.id
  }));

  res.json(formattedTransactions);
});

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await prisma.transaction.findUnique({ where: { id: req.params.id } });

  if (!transaction) {
    return res.status(404).json({ error: "Transaction not found." });
  }

  await prisma.transaction.delete({ where: { id: req.params.id } });
  res.json({ message: "Transaction deleted successfully." });
});

module.exports = { addTransaction, getTransactionsByUser, deleteTransaction };
