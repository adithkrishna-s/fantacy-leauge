const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  team1Scores: { type: [Number], required: true }, // Array of scores for team 1 players
  team2Scores: { type: [Number], required: true }, // Array of scores for team 2 players
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Result', resultSchema);