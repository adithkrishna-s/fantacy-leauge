const mongoose = require('mongoose');

const generateCombinations = () => {
  let numbers = ['1', '2', '3', '4', '5', '6', '7'];
  let letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  let all = [...numbers, ...letters];
  let combinations = new Set();

  // Generate all unique 3-character combinations
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      for (let k = j + 1; k < all.length; k++) {
        let combo = [all[i], all[j], all[k]].sort().join(''); // Normalize order
        combinations.add(combo);
      }
    }
  }

  return Array.from(combinations);
};

const groupSchema = new mongoose.Schema({
  betType: {
    type: String,
    enum: ['First Better', 'Bidding Method', 'Multi Better'],
    default: 'First Better',
    required: true,
  },
  betAmount: { type: Number, required: true },
  minimumIncrement: { type: Number, required: function () { return this.betType === 'Bidding Method'; }},
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Inactive' },
  totalBetAmount: { type: Number, default: 0 },
  winnerShare1: { type: Number, required: true },
  winnerShare2: { type: Number, required: true },
  winnerShare3: { type: Number, required: true },
  adminShare: { type: Number, required: true },
  managerShare: { type: Number, required: true },
  CombinationsMaster: { type: [String], default: generateCombinations() }, // Prepopulate
  SelectedCombinations: { type: [String], default: [] }, // Track chosen combinations
  createdAt: { type: Date, default: Date.now },
});

// Auto-fill adminShare & managerShare
groupSchema.pre('save', async function (next) {
  const Match = mongoose.model('Match');
  const Club = mongoose.model('Club');

  const match = await Match.findById(this.match).populate('club');
  if (match && match.club) {
    const club = await Club.findById(match.club);
    this.adminShare = club.adminShare;
    this.managerShare = club.managerShare;
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);
