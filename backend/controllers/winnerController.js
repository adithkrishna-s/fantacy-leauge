const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');

// @desc    Get winners by user
// @route   GET /api/winners/my-winnings
// @access  Private/Member
const getMyWinnings = asyncHandler(async (req, res) => {
  const allWinners = await prisma.winners.findMany({
    include: {
      Match: { select: { id: true, team1: true, team2: true } },
      Group: { select: { id: true, betType: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const userId = req.user._id;

  const userWinnings = allWinners.filter(w => {
    const checkArr = (arr) => Array.isArray(arr) && arr.some(item => item.user === userId);
    return checkArr(w.firstWinners) || checkArr(w.secondWinners) || checkArr(w.thirdWinners);
  }).map(w => ({
    ...w,
    _id: w.id,
    match: w.Match ? { _id: w.Match.id, team1: w.Match.team1, team2: w.Match.team2 } : null,
    group: w.Group ? { _id: w.Group.id, betType: w.Group.betType } : null
  }));

  res.json(userWinnings);
});

module.exports = { getMyWinnings };