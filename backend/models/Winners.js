// backend/models/Winners.js
const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema({
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  firstWinners: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      bet: { type: mongoose.Schema.Types.ObjectId, ref: 'Bet', required: true },
      score: { type: Number, required: true },
      amountWon: { type: Number, required: true },
      combination: { type: String, required: true }, // Add combination field
      firstName: { type: String, required: true }, // Add firstName
      lastName: { type: String, required: true }, // Add lastName
    },
  ],
  secondWinners: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      bet: { type: mongoose.Schema.Types.ObjectId, ref: 'Bet', required: true },
      score: { type: Number, required: true },
      amountWon: { type: Number, required: true },
      combination: { type: String, required: true }, // Add combination field
      firstName: { type: String, required: true }, // Add firstName
      lastName: { type: String, required: true }, // Add lastName
    },
  ],
  thirdWinners: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      bet: { type: mongoose.Schema.Types.ObjectId, ref: 'Bet', required: true },
      score: { type: Number, required: true },
      amountWon: { type: Number, required: true },
      combination: { type: String, required: true }, // Add combination field
      firstName: { type: String, required: true }, // Add firstName
      lastName: { type: String, required: true }, // Add lastName
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Winners', winnerSchema);