const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  team1: { type: String, required: true },
  team2: { type: String, required: true },
  dateTime: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Inactive', 'Ongoing', 'Announced'], default: 'Inactive' },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prizeShareStatus: { type: Boolean, default: false },
  result: { type: mongoose.Schema.Types.ObjectId, ref: 'Result' },
  Team1Players: { type: Object, default: {} },
  Team2Players: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Match', matchSchema);