const asyncHandler = require('express-async-handler');
const Result = require('../models/Result');
const Match = require('../models/Match');
const Bet = require('../models/Bet');
const Group = require('../models/Group');


// @desc    Get a single result by ID
// @route   GET /api/results/:id
// @access  Private/Admin
const getResultById = asyncHandler(async (req, res) => {
  const result = await Result.findById(req.params.id);
  if (!result) {
    res.status(404);
    throw new Error("Result not found");
  }
  res.json(result);
});

// @desc    Add result for a match
// @route   POST /api/results
// @access  Private/Manager
const addResult = asyncHandler(async (req, res) => {
  const { matchId, team1Scores, team2Scores } = req.body;

  // Validate scores
  if (team1Scores.length !== 7 || team2Scores.length !== 7) {
    res.status(400);
    throw new Error('Scores for all 7 players of each team must be provided');
  }

  // Create result
  const result = await Result.create({
    match: matchId,
    team1Scores,
    team2Scores,
  });

  // Update match status to 'Announced'
  await Match.findByIdAndUpdate(matchId, { result: result, status: 'Ongoing' });

  // Calculate bet scores
  await calculateBetScores(matchId, team1Scores, team2Scores);

  res.status(201).json(result);
});

// @desc    Update result for a match
// @route   PUT /api/results/:id
// @access  Private/Manager
const updateResult = asyncHandler(async (req, res) => {
  const { id } = req.params; // Use result ID from URL parameter
  const { team1Scores, team2Scores } = req.body;

  // Find the result using the result ID from the URL
  const result = await Result.findById(id);

  if (!result) {
    res.status(404);
    throw new Error('Result not found');
  }

  // Update the result scores
  result.team1Scores = team1Scores;
  result.team2Scores = team2Scores;

  const updatedResult = await result.save();

  // Calculate bet scores
  await calculateBetScores(result.match, team1Scores, team2Scores);

  res.json(updatedResult);
});


// @desc    Calculate bet scores for a match
// @access  Private
const calculateBetScores = async (matchId, team1Scores, team2Scores) => {
  // Fetch all groups for the match
  const groups = await Group.find({ match: matchId });

  for (const group of groups) {
    // Fetch all bets in the group
    const bets = await Bet.find({ group: group._id });

    for (const bet of bets) {
      const combination = bet.combination;
      let totalScore = 0;

      // Calculate the score for the combination
      for (let i = 0; i < combination.length; i++) {
        const char = combination[i];
        if (/\d/.test(char)) {
          // Numeric character (Team 1)
          const playerIndex = parseInt(char) - 1;
          totalScore += team1Scores[playerIndex];
        } else if (/[A-G]/.test(char)) {
          // Alphabetic character (Team 2)
          const playerIndex = char.charCodeAt(0) - 65;
          totalScore += team2Scores[playerIndex];
        }
      }

      // Update the bet with the calculated score
      bet.score = totalScore;
      await bet.save();
    }
  }
};

module.exports = { addResult, updateResult, getResultById };