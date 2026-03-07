const express = require("express");
const { addTransaction, getTransactionsByUser, deleteTransaction } = require("../controllers/TransactionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, addTransaction);
router.get("/:userId", protect, getTransactionsByUser);
router.delete("/:id", protect, deleteTransaction);

module.exports = router;
