// backend/controllers/betController.js
const asyncHandler = require('express-async-handler');
const Bet = require('../models/Bet');
const Group = require('../models/Group');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Match = require('../models/Match'); 
const axios = require('axios');
const { addToWhatsappQueue } = require('../services/queueService');


// @desc    Place multiple new bets
// @route   POST /api/bets/multiple
// @access  Private/Member
const placeMultipleBets = asyncHandler(async (req, res) => {
  try {
    const { betAmount, matchId, groupId, combinations } = req.body;

    if (!Array.isArray(combinations) || combinations.length === 0) {
      res.status(400);
      throw new Error('At least one combination is required');
    }

    if (combinations.length > 5) {
      res.status(400);
      throw new Error('Maximum 5 combinations allowed per request');
    }

    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    const user = await User.findById(req.user._id).select('countryCode phoneNumber credits firstName');
    const totalAmount = betAmount * combinations.length;

    if (user.credits < totalAmount) {
      res.status(400);
      throw new Error(`Insufficient credits. You need RS${totalAmount} but only have RS${user.credits}`);
    }

    const match = await Match.findById(matchId);
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

    // Fetch existing bets in the group
    const existingBets = await Bet.find({ group: groupId });

    const betsToCreate = [];
    const uniqueCombinations = new Set();

    for (const comb of combinations) {
      const newCombination = comb.split('').sort().join('');

      if (uniqueCombinations.has(newCombination)) {
        res.status(400);
        throw new Error(`Duplicate combination detected: ${comb}`);
      }
      uniqueCombinations.add(newCombination);

      // Check if combination exists in the master list
      const isInMasterCombinations = group.CombinationsMaster.includes(newCombination);

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
          (bet) => bet.better.toString() === req.user._id.toString() &&
            bet.combination.split('').sort().join('') === newCombination
        );
        if (hasUserPlacedSameBet) {
          res.status(400);
          throw new Error(`You have already placed a bet on combination ${comb}`);
        }
      }

      if (group.betType === 'First Better' && isInMasterCombinations) {
        group.CombinationsMaster = group.CombinationsMaster.filter(c => c !== newCombination);
        group.SelectedCombinations.push(newCombination);
      }

      betsToCreate.push({
        betAmount,
        match: matchId,
        group: groupId,
        better: req.user._id,
        combination: comb,
      });
    }

    // Save all changes
    await group.save();
    const createdBets = await Bet.insertMany(betsToCreate);

    // Deduct total amount from user's credits
    user.credits -= totalAmount;
    await user.save();

    // Update group's total bet amount
    group.totalBetAmount += totalAmount;
    await group.save();

    // Format match date for messages
    const matchDate = new Date(match.dateTime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Prepare Bet Confirmation WhatsApp Message
    const betConfirmationMessage = `
🎯 **${combinations.length} Bets Placed Successfully!**

🏏 *Match:* ${match.team1} vs ${match.team2}
📅 *Date & Time:* ${matchDate}
💰 *Total Bet Amount:* RS ${totalAmount.toFixed(2)}
🎲 *Combinations:* ${combinations.join(', ')}
📊 *Bet Type:* ${group.betType}

🤞 Good luck! May your combinations win!
    `.trim();

    // Create a transaction record
    const transaction = await Transaction.create({
      user: user._id,
      amount: totalAmount,
      type: 'Debit',
      description: `RS ${totalAmount.toFixed(2)} Bet placed in ${match.team1} vs ${match.team2} on ${combinations.length} combinations`
    });

    // Prepare Debit Transaction WhatsApp Message
    const debitMessage = `
💸 **Transaction Alert - Debit**

➖ *Amount Debited:* RS ${totalAmount.toFixed(2)}
🏦 *Remaining Balance:* RS ${user.credits.toFixed(2)}
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

    // Queue both notifications
    try {
      await addToWhatsappQueue(user.countryCode, user.phoneNumber, betConfirmationMessage);
      await addToWhatsappQueue(user.countryCode, user.phoneNumber, debitMessage);
      console.log(`Bet notifications queued for ${user.phoneNumber}`);
    } catch (queueError) {
      console.error(`Failed to queue bet notifications for ${user.phoneNumber}:`, queueError);
    }

    res.status(201).json({
      success: true,
      message: `${combinations.length} bets placed successfully!`,
      data: {
        bets: createdBets,
        newBalance: user.credits,
        transactionId: transaction._id,
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

    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    const user = await User.findById(req.user._id).select('countryCode phoneNumber credits firstName');
    if (user.credits < betAmount) {
      res.status(400);
      throw new Error('Insufficient credits');
    }

    const match = await Match.findById(matchId);
    if (!match) {
      res.status(404);
      throw new Error('Match not found');
    }

    const combinationRegex = /^[1-7A-G]{3}$/;
    if (!combinationRegex.test(combination)) {
      res.status(400);
      throw new Error('Invalid combination');
    }

    // Fetch existing bets in the group
    const existingBets = await Bet.find({ group: groupId });

    // Normalize the combination for comparison
    const newCombination = combination.split('').sort().join('');

    // Check if combination exists in the master list
    const isInMasterCombinations = group.CombinationsMaster.includes(newCombination);

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
        (bet) => bet.better.toString() === req.user._id.toString() &&
          bet.combination.split('').sort().join('') === newCombination
      );
      if (hasUserPlacedSameBet) {
        res.status(400);
        throw new Error('You have already placed a bet on this combination.');
      }
    }

    if (group.betType === 'First Better' && isInMasterCombinations) {
      group.CombinationsMaster = group.CombinationsMaster.filter(c => c !== newCombination);
      group.SelectedCombinations.push(newCombination);
      await group.save();
    }

    // Create and save the bet
    const bet = await Bet.create({
      betAmount,
      match: matchId,
      group: groupId,
      better: req.user._id,
      combination,
    });

    // Deduct bet amount from user's credits
    const amount = parseFloat(betAmount);
    user.credits -= amount;
    await user.save();

    // Update group's total bet amount
    group.totalBetAmount += amount;
    await group.save();

    // Format match date for messages
    const matchDate = new Date(match.dateTime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 1. Prepare Bet Confirmation WhatsApp Message
    const betConfirmationMessage = `
🎯 **Bet Placed Successfully!**

🏏 *Match:* ${match.team1} vs ${match.team2}
📅 *Date & Time:* ${matchDate}
💰 *Bet Amount:* RS ${amount.toFixed(2)}
🎲 *Combination:* ${combination}
📊 *Bet Type:* ${group.betType}

🤞 Good luck! May your combination win!
    `.trim();

    // 2. Create a transaction record
    const transaction = await Transaction.create({
      user: user._id,
      amount: amount,
      type: 'Debit',
      description: `RS ${amount.toFixed(2)} Bet placed in ${match.team1} vs ${match.team2} on ${combination}`
    });

    // 3. Prepare Debit Transaction WhatsApp Message
    const debitMessage = `
💸 **Transaction Alert - Debit**

➖ *Amount Debited:* RS ${amount.toFixed(2)}
🏦 *Remaining Balance:* RS ${user.credits.toFixed(2)}
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

    // Queue both notifications
    try {
      await addToWhatsappQueue(user.countryCode, user.phoneNumber, betConfirmationMessage);
      await addToWhatsappQueue(user.countryCode, user.phoneNumber, debitMessage);
      console.log(`Bet notifications queued for ${user.phoneNumber}`);
    } catch (queueError) {
      console.error(`Failed to queue bet notifications for ${user.phoneNumber}:`, queueError);
      // Continue even if queuing fails since the bet was placed successfully
    }

    res.status(201).json({
      success: true,
      message: "Bet placed successfully!",
      data: {
        bet,
        newBalance: user.credits,
        transactionId: transaction._id,
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

  const bets = await Bet.find({ group: groupId }).populate('better', 'firstName lastName phoneNumber');
  res.json(bets);
});

// @desc    Get bets by user
// @route   GET /api/bets/my-bets
// @access  Private/Member
const getMyBets = asyncHandler(async (req, res) => {
    const bets = await Bet.find({ better: req.user._id })
        .populate('match', 'team1 team2')
        .populate('group', 'betType')
        .sort({ createdAt: -1 });

    res.json(bets);
});

module.exports = { placeBet, placeMultipleBets, getBetsByGroup, getMyBets };