const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private/Manager
const createGroup = asyncHandler(async (req, res) => {
  const { betType, betAmount, minimumIncrement, matchId, winnerShare1, winnerShare2, winnerShare3, status } = req.body;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    res.status(404);
    throw new Error('Match not found');
  }

  if (betType === 'Bidding Method' && (!minimumIncrement || isNaN(minimumIncrement))) {
    res.status(400);
    throw new Error('Minimum increment is required for Bidding Method');
  }

  const club = await prisma.club.findUnique({ where: { id: match.club } });
  if (!club) {
    res.status(404);
    throw new Error('Club not found for this match');
  }

  const groupId = require('crypto').randomUUID();
  const group = await prisma.group.create({
    data: {
      id: groupId,
      betType: betType || 'First Better',
      betAmount: parseFloat(betAmount),
      minimumIncrement: betType === 'Bidding Method' ? parseFloat(minimumIncrement) : null,
      match: matchId,
      status: status || 'Inactive',
      winnerShare1: parseFloat(winnerShare1),
      winnerShare2: parseFloat(winnerShare2),
      winnerShare3: parseFloat(winnerShare3),
      adminShare: club.adminShare,
      managerShare: club.managerShare,
    }
  });

  res.status(201).json({ ...group, _id: group.id });
});

// @desc    Get all groups for a match
// @route   GET /api/groups/match/:matchId
// @access  Private/Manager
const getGroupsByMatch = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const groups = await prisma.group.findMany({
    where: { match: matchId },
    include: {
      Match: {
        select: { id: true, team1: true, team2: true, dateTime: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedGroups = groups.map(g => ({
    ...g,
    _id: g.id,
    match: g.Match ? { _id: g.Match.id, team1: g.Match.team1, team2: g.Match.team2, dateTime: g.Match.dateTime } : null
  }));

  res.json(formattedGroups);
});

// @desc    Update a group
// @route   PUT /api/groups/:id
// @access  Private/Manager
const updateGroup = asyncHandler(async (req, res) => {
  const { betType, betAmount, minimumIncrement, winnerShare1, winnerShare2, winnerShare3, status } = req.body;
  const groupId = req.params.id;

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  const match = await prisma.match.findUnique({ where: { id: group.match } });
  if (!match) {
    res.status(404);
    throw new Error('Match not found');
  }

  if (betType === 'Bidding Method' && (!minimumIncrement || isNaN(minimumIncrement))) {
    res.status(400);
    throw new Error('Minimum increment is required for Bidding Method');
  }

  const club = await prisma.club.findUnique({ where: { id: match.club } });

  const updatedGroup = await prisma.group.update({
    where: { id: groupId },
    data: {
      betType: betType !== undefined ? betType : group.betType,
      betAmount: betAmount !== undefined ? parseFloat(betAmount) : group.betAmount,
      minimumIncrement: betType === 'Bidding Method' ? parseFloat(minimumIncrement) : null,
      status: status !== undefined ? status : group.status,
      winnerShare1: winnerShare1 !== undefined ? parseFloat(winnerShare1) : group.winnerShare1,
      winnerShare2: winnerShare2 !== undefined ? parseFloat(winnerShare2) : group.winnerShare2,
      winnerShare3: winnerShare3 !== undefined ? parseFloat(winnerShare3) : group.winnerShare3,
      adminShare: club ? club.adminShare : group.adminShare,
      managerShare: club ? club.managerShare : group.managerShare,
    }
  });

  res.json({ ...updatedGroup, _id: updatedGroup.id });
});

// @desc    Delete a group
// @route   DELETE /api/groups/:id
// @access  Private/Manager
const deleteGroup = asyncHandler(async (req, res) => {
  const groupId = req.params.id;

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  // Cascade delete the group and refund any OPEN (unsettled) bets. A bet is
  // open when its result is still null — settled Win/Loss bets were already
  // paid out during prize distribution, so their stakes must not be refunded.
  let totalRefunded = 0;
  let refundedBets = 0;

  await prisma.$transaction(async (tx) => {
    const openBets = await tx.bet.findMany({
      where: { group: groupId, result: null },
      select: { better: true, betAmount: true },
    });

    const refundByUser = {};
    for (const bet of openBets) {
      refundByUser[bet.better] = (refundByUser[bet.better] || 0) + bet.betAmount;
    }
    refundedBets = openBets.length;

    for (const [userId, amount] of Object.entries(refundByUser)) {
      if (amount <= 0) continue;
      totalRefunded += amount;
      await tx.user.update({ where: { id: userId }, data: { credits: { increment: amount } } });
      await tx.transaction.create({
        data: {
          id: require('crypto').randomUUID(),
          transactionId: `REFUND-${require('crypto').randomUUID()}`,
          user: userId,
          amount,
          type: 'Credit',
          description: 'Refund for open bet(s) on a deleted group',
        },
      });
    }

    await tx.bet.deleteMany({ where: { group: groupId } });
    await tx.winners.deleteMany({ where: { group: groupId } });
    await tx.group.delete({ where: { id: groupId } });
  }, { maxWait: 10000, timeout: 30000 });

  res.json({
    message: 'Group deleted successfully',
    refundedBets,
    totalRefunded,
  });
});

// @desc    Get a single group by ID
// @route   GET /api/groups/:id
// @access  Private/Manager
const getGroupById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      Match: {
        select: { id: true, team1: true, team2: true, dateTime: true }
      }
    }
  });

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  res.json({
    ...group,
    _id: group.id,
    match: group.Match ? { _id: group.Match.id, team1: group.Match.team1, team2: group.Match.team2, dateTime: group.Match.dateTime } : null
  });
});

module.exports = {
  createGroup,
  getGroupsByMatch,
  updateGroup,
  deleteGroup,
  getGroupById
};