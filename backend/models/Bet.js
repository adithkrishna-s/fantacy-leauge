// backend/models/Bet.js
const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  betAmount: { type: Number, required: true },
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  better: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, default: 0 },
  result: { type: String, enum: ['Win', 'Loss', null], default: null },
  combination: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bet', betSchema);