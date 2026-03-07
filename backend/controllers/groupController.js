// backend/controllers/groupController.js
const asyncHandler = require('express-async-handler');
const Group = require('../models/Group');
const Match = require('../models/Match');
const Club = require('../models/Club');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private/Manager
const createGroup = asyncHandler(async (req, res) => {
  const { betType, betAmount, minimumIncrement, matchId, winnerShare1, winnerShare2, winnerShare3, status } = req.body;

  // Validate match
  const match = await Match.findById(matchId);
  if (!match) {
    res.status(404);
    throw new Error('Match not found');
  }

  // Validate minimumIncrement for Bidding Method
  if (betType === 'Bidding Method' && (!minimumIncrement || isNaN(minimumIncrement))) {
    res.status(400);
    throw new Error('Minimum increment is required for Bidding Method');
  }

  const club = await Club.findById(match.club);

  const group = await Group.create({
    betType,
    betAmount,
    minimumIncrement: betType === 'Bidding Method' ? minimumIncrement : undefined,
    match: matchId,
    status,
    winnerShare1,
    winnerShare2,
    winnerShare3,
    adminShare: club.adminShare, // Auto-assign from club
    managerShare: club.managerShare, // Auto-assign from club
  });

  res.status(201).json(group);
});

// @desc    Get all groups for a match
// @route   GET /api/groups/match/:matchId
// @access  Private/Manager
const getGroupsByMatch = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const groups = await Group.find({ match: matchId }).populate('match', 'team1 team2 dateTime');
  res.json(groups);
});

// @desc    Update a group
// @route   PUT /api/groups/:id
// @access  Private/Manager
const updateGroup = asyncHandler(async (req, res) => {
  const { betType, betAmount, minimumIncrement, winnerShare1, winnerShare2, winnerShare3, status } = req.body;
  const groupId = req.params.id;

  // Validate match
  

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  const match = await Match.findById(group.match._id);
  if (!match) {
    res.status(404);
    throw new Error('Match not found');
  }

  // Validate minimumIncrement for Bidding Method
  if (betType === 'Bidding Method' && (!minimumIncrement || isNaN(minimumIncrement))) {
    res.status(400);
    throw new Error('Minimum increment is required for Bidding Method');
  }

  const club = await Club.findById(match.club);

  group.betType = betType;
  group.betAmount = betAmount;
  group.minimumIncrement = betType === 'Bidding Method' ? minimumIncrement : undefined;
  group.status = status;
  group.winnerShare1 = winnerShare1;
  group.winnerShare2 = winnerShare2;
  group.winnerShare3 = winnerShare3;
  group.adminShare = club.adminShare; // Auto-assign from club
  group.managerShare = club.managerShare; // Auto-assign from club
  

  const updatedGroup = await group.save();
  res.json(updatedGroup);
});

// @desc    Delete a group
// @route   DELETE /api/groups/:id
// @access  Private/Manager
const deleteGroup = asyncHandler(async (req, res) => {
  const groupId = req.params.id;

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  await Group.deleteOne({ _id: groupId });
  res.json({ message: 'Group deleted successfully' });
});


// @desc    Get a single group by ID
// @route   GET /api/groups/:id
// @access  Private/Manager
const getGroupById = asyncHandler(async (req, res) => {
    const { id } = req.params;
  
    const group = await Group.findById(id).populate('match', 'team1 team2 dateTime ');
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }
  
    res.json(group);
});

module.exports = {
  createGroup,
  getGroupsByMatch,
  updateGroup,
  deleteGroup,
  getGroupById
};