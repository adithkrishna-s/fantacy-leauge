const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');
const { addToWhatsappQueue } = require('../services/queueService');

// @desc    Place multiple new bets
// @route   POST /api/bets/multiple
// @access  Private/Member
const placeMultipleBets = asyncHandler(async (req, res) => {
  try {
    const { betAmount, matchId, groupId, combinations } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(combinations) || combinations.length === 0) {
      res.status(400);
      throw new Error('At least one combination is required');
    }

    if (combinations.length > 5) {
      res.status(400);
      throw new Error('Maximum 5 combinations allowed per request');
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const totalAmount = parseFloat(betAmount) * combinations.length;

    if (user.credits < totalAmount) {
      res.status(400);
      throw new Error(`Insufficient credits. You need RS${totalAmount} but only have RS${user.credits}`);
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      res.status(404);
      throw new Error('Match not found');
    }

    const combinationRegex = /^[1-7A-G]{3}$/;
    for (const comb of combinations) {
      if (!combinationRegex.test(comb)) {
        res.status(400);
        throw new Error(`Invalid combination: ${comb}`);
      }
    }

    const existingBets = await prisma.bet.findMany({ where: { group: groupId } });

    const betsToCreate = [];
    const uniqueCombinations = new Set();
    let updatedMaster = [...(group.CombinationsMaster || [])];
    let updatedSelected = [...(group.SelectedCombinations || [])];

    for (const comb of combinations) {
      const newCombination = comb.split('').sort().join('');

      if (uniqueCombinations.has(newCombination)) {
        res.status(400);
        throw new Error(`Duplicate combination detected: ${comb}`);
      }
      uniqueCombinations.add(newCombination);

      const isInMasterCombinations = updatedMaster.includes(newCombination);

      if (group.betType === 'First Better') {
        const isCombinationTaken = existingBets.some(
          (bet) => bet.combination.split('').sort().join('') === newCombination
        );
        if (isCombinationTaken) {
          res.status(400);
          throw new Error(`Combination ${comb} already taken. Please try another combination.`);
        }
      } else if (group.betType === 'Multi Better') {
        const hasUserPlacedSameBet = existingBets.some(
          (bet) => bet.better === userId &&
            bet.combination.split('').sort().join('') === newCombination
        );
        if (hasUserPlacedSameBet) {
          res.status(400);
          throw new Error(`You have already placed a bet on combination ${comb}`);
        }
      }

      if (group.betType === 'First Better' && isInMasterCombinations) {
        updatedMaster = updatedMaster.filter(c => c !== newCombination);
        updatedSelected.push(newCombination);
      }

      betsToCreate.push({
        id: require('crypto').randomUUID(),
        betAmount: parseFloat(betAmount),
        match: matchId,
        group: groupId,
        better: userId,
        combination: comb,
      });
    }

    await prisma.group.update({
      where: { id: groupId },
      data: {
        CombinationsMaster: updatedMaster,
        SelectedCombinations: updatedSelected,
        totalBetAmount: { increment: totalAmount }
      }
    });

    await prisma.bet.createMany({ data: betsToCreate });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: totalAmount } }
    });

    const matchDate = new Date(match.dateTime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const betConfirmationMessage = `
🎯 **${combinations.length} Bets Placed Successfully!**

🏏 *Match:* ${match.team1} vs ${match.team2}
📅 *Date & Time:* ${matchDate}
💰 *Total Bet Amount:* RS ${totalAmount.toFixed(2)}
🎲 *Combinations:* ${combinations.join(', ')}
📊 *Bet Type:* ${group.betType}

🤞 Good luck! May your combinations win!
    `.trim();

    const txnCode = `TXN-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
    const transaction = await prisma.transaction.create({
      data: {
        id: require('crypto').randomUUID(),
        transactionId: txnCode,
        user: userId,
        amount: totalAmount,
        type: 'Debit',
        description: `RS ${totalAmount.toFixed(2)} Bet placed in ${match.team1} vs ${match.team2} on ${combinations.length} combinations`
      }
    });

    const debitMessage = `
💸 **Transaction Alert - Debit**

➖ *Amount Debited:* RS ${totalAmount.toFixed(2)}
🏦 *Remaining Balance:* RS ${updatedUser.credits.toFixed(2)}
📝 *Description:* Bet placed on ${combinations.length} combinations for ${match.team1} vs ${match.team2}

📅 *Date:* ${new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}

Thank you for using FantacyLeague7!
    `.trim();

    try {
      await addToWhatsappQueue(user.countryCode || '+91', user.phoneNumber, betConfirmationMessage);
      await addToWhatsappQueue(user.countryCode || '+91', user.phoneNumber, debitMessage);
    } catch (queueError) {
      console.error(`Failed to queue bet notifications for ${user.phoneNumber}:`, queueError);
    }

    res.status(201).json({
      success: true,
      message: `${combinations.length} bets placed successfully!`,
      data: {
        bets: betsToCreate.map(b => ({ ...b, _id: b.id })),
        newBalance: updatedUser.credits,
        transactionId: transaction.id,
        notificationsQueued: true
      }
    });

  } catch (error) {
    console.error("Error placing multiple bets:", error);
    res.status(500).json({ 
      success: false,
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});

// @desc    Place a new bet
// @route   POST /api/bets
// @access  Private/Member
const placeBet = asyncHandler(async (req, res) => {
  try {
    const { betAmount, matchId, groupId, combination } = req.body;
    const userId = req.user._id;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const amount = parseFloat(betAmount);
    if (user.credits < amount) {
      res.status(400);
      throw new Error('Insufficient credits');
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      res.status(404);
      throw new Error('Match not found');
    }

    const combinationRegex = /^[1-7A-G]{3}$/;
    if (!combinationRegex.test(combination)) {
      res.status(400);
      throw new Error('Invalid combination');
    }

    const existingBets = await prisma.bet.findMany({ where: { group: groupId } });
    const newCombination = combination.split('').sort().join('');
    let updatedMaster = [...(group.CombinationsMaster || [])];
    let updatedSelected = [...(group.SelectedCombinations || [])];

    const isInMasterCombinations = updatedMaster.includes(newCombination);

    if (group.betType === 'First Better') {
      const isCombinationTaken = existingBets.some(
        (bet) => bet.combination.split('').sort().join('') === newCombination
      );
      if (isCombinationTaken) {
        res.status(400);
        throw new Error('Combination already taken. Please try another combination.');
      }
    } else if (group.betType === 'Multi Better') {
      const hasUserPlacedSameBet = existingBets.some(
        (bet) => bet.better === userId &&
          bet.combination.split('').sort().join('') === newCombination
      );
      if (hasUserPlacedSameBet) {
        res.status(400);
        throw new Error('You have already placed a bet on this combination.');
      }
    }

    if (group.betType === 'First Better' && isInMasterCombinations) {
      updatedMaster = updatedMaster.filter(c => c !== newCombination);
      updatedSelected.push(newCombination);

      await prisma.group.update({
        where: { id: groupId },
        data: {
          CombinationsMaster: updatedMaster,
          SelectedCombinations: updatedSelected,
          totalBetAmount: { increment: amount }
        }
      });
    } else {
      await prisma.group.update({
        where: { id: groupId },
        data: {
          totalBetAmount: { increment: amount }
        }
      });
    }

    const betId = require('crypto').randomUUID();
    const bet = await prisma.bet.create({
      data: {
        id: betId,
        betAmount: amount,
        match: matchId,
        group: groupId,
        better: userId,
        combination,
      }
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } }
    });

    const matchDate = new Date(match.dateTime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const betConfirmationMessage = `
🎯 **Bet Placed Successfully!**

🏏 *Match:* ${match.team1} vs ${match.team2}
📅 *Date & Time:* ${matchDate}
💰 *Bet Amount:* RS ${amount.toFixed(2)}
🎲 *Combination:* ${combination}
📊 *Bet Type:* ${group.betType}

🤞 Good luck! May your combination win!
    `.trim();

    const txnCode = `TXN-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
    const transaction = await prisma.transaction.create({
      data: {
        id: require('crypto').randomUUID(),
        transactionId: txnCode,
        user: userId,
        amount: amount,
        type: 'Debit',
        description: `RS ${amount.toFixed(2)} Bet placed in ${match.team1} vs ${match.team2} on ${combination}`
      }
    });

    const debitMessage = `
💸 **Transaction Alert - Debit**

➖ *Amount Debited:* RS ${amount.toFixed(2)}
🏦 *Remaining Balance:* RS ${updatedUser.credits.toFixed(2)}
📝 *Description:* Bet placed on ${combination} for ${match.team1} vs ${match.team2}

📅 *Date:* ${new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}

Thank you for using FantacyLeague7!
    `.trim();

    try {
      await addToWhatsappQueue(user.countryCode || '+91', user.phoneNumber, betConfirmationMessage);
      await addToWhatsappQueue(user.countryCode || '+91', user.phoneNumber, debitMessage);
    } catch (queueError) {
      console.error(`Failed to queue bet notifications for ${user.phoneNumber}:`, queueError);
    }

    res.status(201).json({
      success: true,
      message: "Bet placed successfully!",
      data: {
        bet: { ...bet, _id: bet.id },
        newBalance: updatedUser.credits,
        transactionId: transaction.id,
        notificationsQueued: true
      }
    });

  } catch (error) {
    console.error("Error placing bet:", error);
    res.status(500).json({ 
      success: false,
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});

// @desc    Get bets by group
// @route   GET /api/bets/group/:groupId
// @access  Private/Member
const getBetsByGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const bets = await prisma.bet.findMany({
    where: { group: groupId },
    include: {
      User: {
        select: { id: true, firstName: true, lastName: true, phoneNumber: true }
      }
    }
  });

  const formattedBets = bets.map(b => ({
    ...b,
    _id: b.id,
    better: b.User ? { _id: b.User.id, firstName: b.User.firstName, lastName: b.User.lastName, phoneNumber: b.User.phoneNumber } : null
  }));

  res.json(formattedBets);
});

// @desc    Get bets by user
// @route   GET /api/bets/my-bets
// @access  Private/Member
const getMyBets = asyncHandler(async (req, res) => {
  const bets = await prisma.bet.findMany({
    where: { better: req.user._id },
    include: {
      Match: { select: { id: true, team1: true, team2: true } },
      Group: { select: { id: true, betType: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedBets = bets.map(b => ({
    ...b,
    _id: b.id,
    match: b.Match ? { _id: b.Match.id, team1: b.Match.team1, team2: b.Match.team2 } : null,
    group: b.Group ? { _id: b.Group.id, betType: b.Group.betType } : null
  }));

  res.json(formattedBets);
});

module.exports = { placeBet, placeMultipleBets, getBetsByGroup, getMyBets };