// backend/controllers/winnerController.js
const asyncHandler = require('express-async-handler');
const Winners = require('../models/Winners');

// @desc    Get winners by user
// @route   GET /api/winners/my-winnings
// @access  Private/Member
const getMyWinnings = asyncHandler(async (req, res) => {
  const winners = await Winners.find({
    $or: [
      { 'firstWinners.user': req.user._id },
      { 'secondWinners.user': req.user._id },
      { 'thirdWinners.user': req.user._id },
    ],
  }).populate('match', 'team1 team2')
    .populate('group', 'betType');

  res.json(winners);
});

module.exports = { getMyWinnings };