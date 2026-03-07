const asyncHandler = require('express-async-handler');
const Match = require('../models/Match');
const Club = require('../models/Club');
const User = require('../models/User');
const Group = require('../models/Group');
const Bet = require('../models/Bet');
const Winners = require('../models/Winners');
const Transaction = require('../models/Transaction'); 
const axios = require('axios');
const { addToWhatsappQueue } = require('../services/queueService');


// @desc    Add a new match
// @route   POST /api/matches
// @access  Private/Manager
const addMatch = asyncHandler(async (req, res) => {
  try {
    const { team1, team2, dateTime, status } = req.body;
    const { clubId } = req.params;
    const userId = req.user._id;
    const userType = req.user.userType;

    // Authorization and validation
    let club;
    let managerId;

    if (userType === 'Admin') {
      club = await Club.findById(clubId);
      if (!club) {
        res.status(404);
        throw new Error('Club not found');
      }
      managerId = club.user;
    } else if (userType === 'Manager') {
      club = await Club.findOne({ user: userId });
      if (!club) {
        res.status(404);
        throw new Error('Club not found for this manager');
      }
      managerId = userId;
    } else {
      res.status(403);
      throw new Error('Not authorized to add matches');
    }

    // Create the match
    const match = await Match.create({
      team1,
      team2,
      dateTime,
      club: club._id,
      manager: managerId,
      status: status,
    });

    // Get all members of the club (including firstName and lastName)
    const members = await User.find({ memberOf: club._id }).select('countryCode phoneNumber firstName lastName');

    // Format match date for the message
    const matchDate = new Date(dateTime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Function to generate 8-character unique ID
    const generateMsgId = () => {
      return Math.random().toString(36).substring(2, 10).toUpperCase();
    };

    // Add notifications to queue
    const notificationPromises = members.map(async (member) => {
      // Generate a unique message ID for each message
      const msgId = generateMsgId();
      
      const message = `
Hi ${member.firstName} ${member.lastName},

🏏 **New Match Alert!**

🎉 *${team1} vs ${team2}* has been added to *${club.clubName}*!

⏰ *Match Time:* ${matchDate}

💰 Get ready to place your bets and win big!

🔗 *Dashboard:* https://fantasyleague7.com/dashboard

🏆 May the best team win!

msgid: ${msgId}
      `.trim();

      try {
        await addToWhatsappQueue(member.countryCode, member.phoneNumber, message);
        return { success: true, phoneNumber: member.phoneNumber, msgId };
      } catch (error) {
        console.error(`Failed to queue notification for ${member.phoneNumber}:`, error);
        return { success: false, phoneNumber: member.phoneNumber, error: error.message };
      }
    });

    // Wait for all queue additions to complete
    const queueResults = await Promise.all(notificationPromises);
    
    // Count successful queue additions
    const successfulQueues = queueResults.filter(r => r.success).length;
    console.log(`Queued notifications for ${successfulQueues}/${members.length} members successfully`);

    // Immediate response - don't wait for actual sending
    res.status(201).json({
      success: true,
      message: "Match added and notifications queued successfully!",
      data: {
        match,
        notifications: {
          totalMembers: members.length,
          queuedSuccessfully: successfulQueues,
          failedToQueue: members.length - successfulQueues,
          // Include all message IDs if needed for tracking
          messageIds: queueResults.filter(r => r.success).map(r => r.msgId)
        }
      }
    });

  } catch (error) {
    console.error("Error in addMatch:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Internal Server Error",
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});



// @desc    Update player names for a match
// @route   PUT /api/matches/:id/update-players
// @access  Private/Manager
const updatePlayers = asyncHandler(async (req, res) => {
  const { team1Players, team2Players } = req.body;
  const matchId = req.params.id;
  const { _id: userId, userType } = req.user;

  let match;
  if (userType === "Admin") {
    match = await Match.findById(matchId);
  } else {
    match = await Match.findOne({ _id: matchId, manager: userId });
  }

  if (!match) {
    res.status(404);
    throw new Error('Match not found or you do not have permission to edit this match');
  }

  match.Team1Players = team1Players;
  match.Team2Players = team2Players;

  const updatedMatch = await match.save();
  res.json(updatedMatch);
});




// @desc    Get all matches for a manager
// @route   GET /api/matches
// @access  Private/Manager
const getMatches = asyncHandler(async (req, res) => {
  const managerId = req.user._id;
  const matches = await Match.find({ manager: managerId }).populate('club', 'clubName');
  res.json(matches);
});


// @desc    Update a match
// @route   PUT /api/matches/:id
// @access  Private/Manager
const updateMatch = asyncHandler(async (req, res) => {
    const { team1, team2, dateTime, status } = req.body;
    const matchId = req.params.id;
    const { _id: userId, userType } = req.user;

    let match;
    if (userType === "Admin") {
        match = await Match.findById(matchId);
    } else {
        match = await Match.findOne({ _id: matchId, manager: userId });
    }

    if (!match) {
        res.status(404);
        throw new Error('Match not found or you do not have permission to edit this match');
    }

    match.team1 = team1;
    match.team2 = team2;
    match.dateTime = dateTime;
    match.status = status;

    const updatedMatch = await match.save();
    res.json(updatedMatch);
});

// @desc    Get a single match by ID
// @route   GET /api/matches/:id
// @access  Private/Manager
const getMatchById = asyncHandler(async (req, res) => {
    const matchId = req.params.id;
    const { _id: userId, userType } = req.user;

    let match;
    // if (userType === "Admin") {
    match = await Match.findById(matchId).populate('club', 'clubName');
    // } else {
    //     match = await Match.findOne({ _id: matchId, manager: userId }).populate('club', 'clubName');
    // }

    if (!match) {
        res.status(404);
        throw new Error('Match not found or you do not have permission to view this match');
    }

    res.json(match);
});


// @desc    Delete a match
// @route   DELETE /api/matches/:id
// @access  Private/Manager
const deleteMatch = asyncHandler(async (req, res) => {
    const matchId = req.params.id;
    const { _id: userId, userType } = req.user;

    // Allow Admin to delete any match
    let match;
    if (userType === "Admin") {
        match = await Match.findById(matchId);
    } else {
        match = await Match.findOne({ _id: matchId, manager: userId });
    }

    if (!match) {
        res.status(404);
        throw new Error('Match not found or you do not have permission to delete this match');
    }

    await Match.deleteOne({ _id: matchId });
    res.json({ message: 'Match deleted successfully' });
});

// @desc    Get all matches for a club (for members)
// @route   GET /api/matches/club/:clubId
// @access  Private/Member
const getMatchesByClub = asyncHandler(async (req, res) => {
    const clubId = req.params.clubId;
    const matches = await Match.find({ club: clubId }).populate('club', 'clubName');
    res.json(matches);
});


// @desc    Approve credits for a match
// @route   POST /api/matches/:matchId/approve-credits
// @access  Private/Manager
const approveCredits = asyncHandler(async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId).populate('club');
    if (!match) {
      res.status(404);
      throw new Error('Match not found');
    }

    if (match.status !== 'Ongoing') {
      res.status(400);
      throw new Error('Match results must be announced before approving credits');
    }

    if (match.prizeShareStatus) {
      res.status(400);
      throw new Error('Prize already distributed for this match');
    }

    const groups = await Group.find({ match: matchId }).sort({ createdAt: 1 }); // Sort groups by creation time
    const admin = await User.findOne({ userType: 'Admin' });
    const manager = await User.findById(match.manager);
    const allUsers = await User.find().select('countryCode phoneNumber firstName lastName');

    // Track queued notifications
    const notificationQueueResults = {
      winners: { queued: 0, failed: 0 },
      admin: { queued: 0, failed: 0 },
      manager: { queued: 0, failed: 0 },
      users: { queued: 0, failed: 0 }
    };
    
    // Function to generate 8-character unique ID
    const generateMsgId = () => {
      return Math.random().toString(36).substring(2, 10).toUpperCase();
    };

    // Prepare results message for all users
    let resultsMessage = `

🏏 *Match Results Announcement* 🏏

*Club:* ${match.club.clubName}
*Match:* ${match.team1} vs ${match.team2}

📊 *Final Results:*
    `.trim();

    // Process each group
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const groupNumber = i + 1; // Number groups starting from 1
      const bets = await Bet.find({ group: group._id }).populate('better');

      // Sort bets by score in descending order
      bets.sort((a, b) => b.score - a.score);

      // Get top 3 scores
      const firstPlaceScore = bets[0]?.score || 0;
      const secondPlaceScore = bets.find((bet) => bet.score < firstPlaceScore)?.score || 0;
      const thirdPlaceScore = bets.find((bet) => bet.score < secondPlaceScore)?.score || 0;

      // Filter bets for each position
      const firstWinners = bets.filter((bet) => bet.score === firstPlaceScore);
      const secondWinners = bets.filter((bet) => bet.score === secondPlaceScore);
      const thirdWinners = bets.filter((bet) => bet.score === thirdPlaceScore);

      // Calculate prize amounts
      const totalBetAmount = group.totalBetAmount || 0;
      const firstPrize = (totalBetAmount * (group.winnerShare1 || 0)) / 100;
      const secondPrize = (totalBetAmount * (group.winnerShare2 || 0)) / 100;
      const thirdPrize = (totalBetAmount * (group.winnerShare3 || 0)) / 100;

      // Format winners with names and combinations
      const formatWinners = (winners, prizePerWinner) => {
        return winners.map(w => 
          `${w.better.firstName} (Combination: ${w.combination}) - RS ${prizePerWinner.toFixed(2)}`
        ).join('\n       ');
      };

      // Add group results to the main message with combinations
      resultsMessage += `

🔹 *Group ${groupNumber} Results:*
🥇 *1st Place (Score: ${firstPlaceScore}):*
       ${firstWinners.length > 0 ? formatWinners(firstWinners, firstPrize / firstWinners.length) : 'No winners'}
       
🥈 *2nd Place (Score: ${secondPlaceScore}):*
       ${secondWinners.length > 0 ? formatWinners(secondWinners, secondPrize / secondWinners.length) : 'No winners'}
       
🥉 *3rd Place (Score: ${thirdPlaceScore}):*
       ${thirdWinners.length > 0 ? formatWinners(thirdWinners, thirdPrize / thirdWinners.length) : 'No winners'}
      `.trim();

      // Updated distributePrize function that works with your existing code
      const distributePrize = async (winners, prizeAmount, position) => {
        if (winners.length > 0 && prizeAmount > 0) {
          const amountPerWinner = prizeAmount / winners.length;
          
          for (const winner of winners) {
            if (!winner.better || !winner.better._id) {
              console.warn('Skipping winner due to missing better reference:', winner);
              continue;
            }
            
            const user = await User.findById(winner.better._id);
            if (!user) continue;

            // Calculate referral bonus (5% of winnings) if applicable
            let referralBonus = 0;
            let netWinnings = amountPerWinner;
            
            if (user.referredBy && user.userType === 'Member') {
              referralBonus = amountPerWinner * 0.05;
              netWinnings = amountPerWinner - referralBonus;
              
              // Update winner's credits with net amount
              user.credits = (Number(user.credits) || 0) + (Number(netWinnings) || 0);
              await user.save();

              // Create transaction for winner (net amount)
              const winnerTransaction = await Transaction.create({
                user: user._id,
                amount: netWinnings,
                type: "Credit",
                description: `Winning amount (${position} place) for ${match.team1} vs ${match.team2} - group: ${group._id}`,
              });

              // Update referrer's credits and earnings
              const referrer = await User.findById(user.referredBy);
              if (referrer) {
                referrer.credits = (Number(referrer.credits) || 0) + (Number(referralBonus) || 0);
                referrer.referralEarnings = (Number(referrer.referralEarnings) || 0) + (Number(referralBonus) || 0);
                await referrer.save();

                // Create transaction for referrer
                await Transaction.create({
                  user: referrer._id,
                  amount: referralBonus,
                  type: "Credit",
                  description: `Referral bonus from ${user.firstName}'s winnings`,
                });

                // Send notification to referrer
                const referrerMessage = `
      💰 **Referral Bonus Credited**

      ➕ *Amount Credited:* RS ${referralBonus.toFixed(2)}
      🏦 *New Balance:* RS ${referrer.credits.toFixed(2)}
      📝 *Description:* Referral bonus from ${user.firstName}'s winnings

      📅 *Date:* ${new Date().toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                `.trim();

                await addToWhatsappQueue(referrer.countryCode, referrer.phoneNumber, referrerMessage);
              }
            } else {
              // No referral - full amount to winner
              user.credits = (Number(user.credits) || 0) + (Number(amountPerWinner) || 0);
              await user.save();

              // Create transaction for winner (full amount)
              const winnerTransaction = await Transaction.create({
                user: user._id,
                amount: amountPerWinner,
                type: "Credit",
                description: `Winning amount (${position} place) for ${match.team1} vs ${match.team2} - group: ${group._id}`,
              });
            }

            // Prepare Winner Notification (keeping your exact template)
            const winnerMessage = `
      🏆 **Congratulations! You Won!**

      🥇 *Position:* ${position}
      💰 *Amount Won:* RS ${netWinnings.toFixed(2)}
      🏏 *Match:* ${match.team1} vs ${match.team2}
      📊 *Group:* ${groupNumber}
      🎯 *Your Combination:* ${winner.combination}

      💳 *Transaction ID:* ${winnerTransaction._id}
            `.trim();

            const creditMessage = `
      💰 **Credit Received - Winnings**

      ➕ *Amount Credited:* RS ${netWinnings.toFixed(2)}
      🏦 *New Balance:* RS ${user.credits.toFixed(2)}
      📝 *Description:* ${position} place winnings for ${match.team1} vs ${match.team2}

      📅 *Date:* ${new Date().toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
            `.trim();

            // Queue both notifications
            try {
              await addToWhatsappQueue(user.countryCode, user.phoneNumber, winnerMessage);
              await addToWhatsappQueue(user.countryCode, user.phoneNumber, creditMessage);
              notificationQueueResults.winners.queued += 2;
            } catch (error) {
              console.error(`Failed to queue notifications for winner ${user.phoneNumber}:`, error);
              notificationQueueResults.winners.failed += 2;
            }
          }
        }
      };

      await distributePrize(firstWinners, firstPrize, "1st");
      await distributePrize(secondWinners, secondPrize, "2nd");
      await distributePrize(thirdWinners, thirdPrize, "3rd");

      // Update bet results
      const updateBetResults = async (winners, result) => {
        for (const winner of winners) {
          await Bet.findByIdAndUpdate(winner._id, { result });
        }
      };

      await updateBetResults(firstWinners, 'Win');
      await updateBetResults(secondWinners, 'Win');
      await updateBetResults(thirdWinners, 'Win');

      // Update losers
      const losers = bets.filter(
        (bet) =>
          bet.score !== firstPlaceScore &&
          bet.score !== secondPlaceScore &&
          bet.score !== thirdPlaceScore
      );
      await updateBetResults(losers, 'Loss');

      // Save winners
      await Winners.create({
        match: matchId,
        group: group._id,
        firstWinners: firstWinners.map((bet) => ({
          user: bet.better._id,
          bet: bet._id,
          score: bet.score,
          amountWon: firstPrize / firstWinners.length,
          combination: bet.combination,
          firstName: bet.better.firstName,
          lastName: bet.better.lastName,
        })),
        secondWinners: secondWinners.map((bet) => ({
          user: bet.better._id,
          bet: bet._id,
          score: bet.score,
          amountWon: secondPrize / secondWinners.length,
          combination: bet.combination,
          firstName: bet.better.firstName,
          lastName: bet.better.lastName,
        })),
        thirdWinners: thirdWinners.map((bet) => ({
          user: bet.better._id,
          bet: bet._id,
          score: bet.score,
          amountWon: thirdPrize / thirdWinners.length,
          combination: bet.combination,
          firstName: bet.better.firstName,
          lastName: bet.better.lastName,
        })),
      });

      // Distribute remaining credits to admin and manager
      const remainingAmount = totalBetAmount - (firstPrize + secondPrize + thirdPrize);
      const adminShare = (remainingAmount * (match.club.adminShare || 0)) / 100;
      const managerShare = remainingAmount - adminShare;

      // Credit admin
      if (adminShare > 0 && admin) {
        admin.credits = (Number(admin.credits) || 0) + adminShare;
        await admin.save();
        const adminTransaction = await Transaction.create({
          user: admin._id,
          amount: adminShare,
          type: "Credit",
          description: `Admin Share (${match.club.adminShare}%) for ${match.team1} vs ${match.team2} - group: ${group._id}`,
        });

        // Prepare admin notifications
        const adminMessage = `
📊 **Admin Share Credited**

🏏 *Match:* ${match.team1} vs ${match.team2}
📌 *Group:* ${groupNumber}
💰 *Admin Share:* RS ${adminShare.toFixed(2)} (${match.club.adminShare}%)
📝 *From:* Remaining after prize distribution

🏆 *Winners:*
🥇 1st Place: ${firstWinners.length} winner(s) - RS ${firstPrize.toFixed(2)}
🥈 2nd Place: ${secondWinners.length} winner(s) - RS ${secondPrize.toFixed(2)}
🥉 3rd Place: ${thirdWinners.length} winner(s) - RS ${thirdPrize.toFixed(2)}

💳 *Transaction ID:* ${adminTransaction._id}
        `.trim();

        const adminCreditMessage = `
💰 **Credit Received - Admin Share**

➕ *Amount Credited:* RS ${adminShare.toFixed(2)}
🏦 *New Balance:* RS ${admin.credits.toFixed(2)}
📝 *Description:* Admin share from ${match.team1} vs ${match.team2}

📅 *Date:* ${new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
        `.trim();

        // Queue admin notifications
        try {
          await addToWhatsappQueue(admin.countryCode, admin.phoneNumber, adminMessage);
          await addToWhatsappQueue(admin.countryCode, admin.phoneNumber, adminCreditMessage);
          notificationQueueResults.admin.queued += 2;
        } catch (error) {
          console.error(`Failed to queue admin notifications:`, error);
          notificationQueueResults.admin.failed += 2;
        }
      }

      // Credit manager
      if (managerShare > 0 && manager) {
        manager.credits = (Number(manager.credits) || 0) + managerShare;
        await manager.save();
        const managerTransaction = await Transaction.create({
          user: manager._id,
          amount: managerShare,
          type: "Credit",
          description: `Manager Share for ${match.team1} vs ${match.team2} - group: ${group._id}`,
        });

        // Prepare manager notifications
        const managerMessage = `
📊 **Manager Share Credited**

🏏 *Match:* ${match.team1} vs ${match.team2}
📌 *Group:* ${groupNumber}
💰 *Manager Share:* RS ${managerShare.toFixed(2)}
📝 *From:* Remaining after prize distribution

🏆 *Winners:*
🥇 1st Place: ${firstWinners.length} winner(s) - RS ${firstPrize.toFixed(2)}
🥈 2nd Place: ${secondWinners.length} winner(s) - RS ${secondPrize.toFixed(2)}
🥉 3rd Place: ${thirdWinners.length} winner(s) - RS ${thirdPrize.toFixed(2)}

💳 *Transaction ID:* ${managerTransaction._id}
        `.trim();

        const managerCreditMessage = `
💰 **Credit Received - Manager Share**

➕ *Amount Credited:* RS ${managerShare.toFixed(2)}
🏦 *New Balance:* RS ${manager.credits.toFixed(2)}
📝 *Description:* Manager share from ${match.team1} vs ${match.team2}

📅 *Date:* ${new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
        `.trim();

        // Queue manager notifications
        try {
          await addToWhatsappQueue(manager.countryCode, manager.phoneNumber, managerMessage);
          await addToWhatsappQueue(manager.countryCode, manager.phoneNumber, managerCreditMessage);
          notificationQueueResults.manager.queued += 2;
        } catch (error) {
          console.error(`Failed to queue manager notifications:`, error);
          notificationQueueResults.manager.failed += 2;
        }
      }
    }

    // Complete the results message
    resultsMessage += `

🎉 *Congratulations to all winners!*
💰 *Winnings will be credited to your accounts shortly.*

Thank you for participating in ${match.club.clubName}'s fantasy league!

🔗 *Dashboard:* https://fantasyleague7.com/dashboard
    `.trim();

    // Send results message to all users
    const userNotificationPromises = allUsers.map(async (user) => {
      const msgId = generateMsgId();
      
      // Create personalized message
      const personalizedMessage = `
Hi ${user.firstName} ${user.lastName},

${resultsMessage}

msgid: ${msgId}
      `.trim();

      try {
        await addToWhatsappQueue(user.countryCode, user.phoneNumber, personalizedMessage);
        notificationQueueResults.users.queued += 1;
        return { success: true, phoneNumber: user.phoneNumber };
      } catch (error) {
        console.error(`Failed to queue results notification for ${user.phoneNumber}:`, error);
        notificationQueueResults.users.failed += 1;
        return { success: false, phoneNumber: user.phoneNumber, error: error.message };
      }
    });

    await Promise.all(userNotificationPromises);

    // Update match status
    await Match.findByIdAndUpdate(matchId, { status: 'Announced' });
    match.prizeShareStatus = true;
    await match.save();

    res.json({
      success: true,
      message: 'Credits approved and distribution queued successfully',
      data: {
        matchId: match._id,
        prizeDistributionCompleted: true,
        notificationsQueued: notificationQueueResults,
        resultsMessage: resultsMessage // For debugging purposes
      }
    });

  } catch (error) {
    console.error("Error approving credits:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message
    });
  }
});


module.exports = { addMatch, getMatches, updatePlayers, updateMatch, deleteMatch, getMatchById, getMatchesByClub, approveCredits};