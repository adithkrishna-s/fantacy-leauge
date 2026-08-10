const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');

// @desc    Get a single result by ID
// @route   GET /api/results/:id
// @access  Private/Admin
const getResultById = asyncHandler(async (req, res) => {
  const result = await prisma.result.findUnique({ where: { id: req.params.id } });
  if (!result) {
    res.status(404);
    throw new Error("Result not found");
  }
  res.json({ ...result, _id: result.id });
});

// @desc    Add result for a match
// @route   POST /api/results
// @access  Private/Manager
const addResult = asyncHandler(async (req, res) => {
  const { matchId, team1Scores, team2Scores } = req.body;

  if (team1Scores.length !== 7 || team2Scores.length !== 7) {
    res.status(400);
    throw new Error('Scores for all 7 players of each team must be provided');
  }

  const resultId = require('crypto').randomUUID();
  const result = await prisma.result.create({
    data: {
      id: resultId,
      match: matchId,
      team1Scores: team1Scores.map(s => parseInt(s) || 0),
      team2Scores: team2Scores.map(s => parseInt(s) || 0),
    }
  });

  await prisma.match.update({
    where: { id: matchId },
    data: { result: result.id, status: 'Ongoing' }
  });

  await calculateBetScores(matchId, team1Scores, team2Scores);

  res.status(201).json({ ...result, _id: result.id });
});

// @desc    Update result for a match
// @route   PUT /api/results/:id
// @access  Private/Manager
const updateResult = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { team1Scores, team2Scores } = req.body;

  const result = await prisma.result.findUnique({ where: { id } });

  if (!result) {
    res.status(404);
    throw new Error('Result not found');
  }

  const updatedResult = await prisma.result.update({
    where: { id },
    data: {
      team1Scores: team1Scores.map(s => parseInt(s) || 0),
      team2Scores: team2Scores.map(s => parseInt(s) || 0),
    }
  });

  await calculateBetScores(result.match, team1Scores, team2Scores);

  res.json({ ...updatedResult, _id: updatedResult.id });
});

// @desc    Calculate bet scores for a match
// @access  Private
const calculateBetScores = async (matchId, team1Scores, team2Scores) => {
  const groups = await prisma.group.findMany({ where: { match: matchId } });

  for (const group of groups) {
    const bets = await prisma.bet.findMany({ where: { group: group.id } });

    for (const bet of bets) {
      const combination = bet.combination;
      let totalScore = 0;

      for (let i = 0; i < combination.length; i++) {
        const char = combination[i];
        if (/\d/.test(char)) {
          const playerIndex = parseInt(char) - 1;
          totalScore += (team1Scores[playerIndex] || 0);
        } else if (/[A-G]/.test(char)) {
          const playerIndex = char.charCodeAt(0) - 65;
          totalScore += (team2Scores[playerIndex] || 0);
        }
      }

      await prisma.bet.update({
        where: { id: bet.id },
        data: { score: totalScore }
      });
    }
  }
};

module.exports = { addResult, updateResult, getResultById };