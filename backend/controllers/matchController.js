const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');
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
      club = await prisma.club.findUnique({ where: { id: clubId } });
      if (!club) {
        res.status(404);
        throw new Error('Club not found');
      }
      managerId = club.user;
    } else if (userType === 'Manager') {
      club = await prisma.club.findUnique({ where: { user: userId } });
      if (!club && req.user) {
        club = await prisma.club.findFirst({
          where: {
            OR: [
              { managerEmail: req.user.email || '___none___' },
              { managerPhone: req.user.phoneNumber || '___none___' }
            ]
          }
        });
        if (club) {
          await prisma.club.update({
            where: { id: club.id },
            data: { user: userId }
          }).catch(console.error);
        }
      }
      if (!club) {
        res.status(400);
        throw new Error('Club not found for this manager. Please contact Admin to assign a club.');
      }
      managerId = userId;
    } else {
      res.status(403);
      throw new Error('Not authorized to add matches');
    }

    // Create the match
    const newMatchId = require('crypto').randomUUID();
    const match = await prisma.match.create({
      data: {
        id: newMatchId,
        team1,
        team2,
        dateTime: new Date(dateTime),
        club: club.id,
        manager: managerId,
        status: status || 'Inactive',
      }
    });

    // Get all members of the club (including firstName and lastName)
    const members = await prisma.user.findMany({
      where: { memberOf: club.id },
      select: { countryCode: true, phoneNumber: true, firstName: true, lastName: true }
    });

    // Format match date for the message
    const matchDate = new Date(dateTime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const generateMsgId = () => {
      return Math.random().toString(36).substring(2, 10).toUpperCase();
    };

    // Add notifications to queue
    const notificationPromises = members.map(async (member) => {
      const msgId = generateMsgId();
      
      const message = `
Hi ${member.firstName} ${member.lastName},

🏏 **New Match Alert!**

🎉 *${team1} vs ${team2}* has been added to *${club.clubName}*!

⏰ *Match Time:* ${matchDate}

💰 Get ready to place your bets and win big!

🔗 *Dashboard:* https://fantacyleauge.com/dashboard

🏆 May the best team win!

msgid: ${msgId}
      `.trim();

      try {
        await addToWhatsappQueue(member.countryCode || '+91', member.phoneNumber, message);
        return { success: true, phoneNumber: member.phoneNumber, msgId };
      } catch (error) {
        console.error(`Failed to queue notification for ${member.phoneNumber}:`, error);
        return { success: false, phoneNumber: member.phoneNumber, error: error.message };
      }
    });

    const queueResults = await Promise.all(notificationPromises);
    const successfulQueues = queueResults.filter(r => r.success).length;

    res.status(201).json({
      success: true,
      message: "Match added and notifications queued successfully!",
      data: {
        match: { ...match, _id: match.id },
        notifications: {
          totalMembers: members.length,
          queuedSuccessfully: successfulQueues,
          failedToQueue: members.length - successfulQueues,
          messageIds: queueResults.filter(r => r.success).map(r => r.msgId)
        }
      }
    });

  } catch (error) {
    console.error("Error in addMatch:", error);
    const statusCode = error.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || "Internal Server Error",
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

  let match = await prisma.match.findUnique({ where: { id: matchId } });

  if (!match) {
    res.status(404);
    throw new Error('Match not found or you do not have permission to edit this match');
  }

  if (userType !== "Admin" && match.manager !== userId) {
    res.status(403);
    throw new Error('Not authorized to edit this match');
  }

  const updatedMatch = await prisma.match.update({
    where: { id: matchId },
    data: {
      // If team players exist in model
    }
  });
  res.json({ ...updatedMatch, _id: updatedMatch.id });
});

// @desc    Get all matches for a manager
// @route   GET /api/matches
// @access  Private/Manager
const getMatches = asyncHandler(async (req, res) => {
  const managerId = req.user._id;
  const matches = await prisma.match.findMany({
    where: { manager: managerId },
    include: {
      Club: {
        select: { id: true, clubName: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedMatches = matches.map(m => ({
    ...m,
    _id: m.id,
    club: m.Club ? { _id: m.Club.id, clubName: m.Club.clubName } : null
  }));

  res.json(formattedMatches);
});

// @desc    Update a match
// @route   PUT /api/matches/:id
// @access  Private/Manager
const updateMatch = asyncHandler(async (req, res) => {
  const { team1, team2, dateTime, status } = req.body;
  const matchId = req.params.id;
  const { _id: userId, userType } = req.user;

  let match = await prisma.match.findUnique({ where: { id: matchId } });

  if (!match) {
    res.status(404);
    throw new Error('Match not found or you do not have permission to edit this match');
  }

  if (userType !== "Admin" && match.manager !== userId) {
    res.status(403);
    throw new Error('Not authorized to edit this match');
  }

  const updatedMatch = await prisma.match.update({
    where: { id: matchId },
    data: {
      team1: team1 !== undefined ? team1 : match.team1,
      team2: team2 !== undefined ? team2 : match.team2,
      dateTime: dateTime ? new Date(dateTime) : match.dateTime,
      status: status !== undefined ? status : match.status,
    }
  });

  res.json({ ...updatedMatch, _id: updatedMatch.id });
});

// @desc    Get a single match by ID
// @route   GET /api/matches/:id
// @access  Private/Manager
const getMatchById = asyncHandler(async (req, res) => {
  const matchId = req.params.id;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      Club: {
        select: { id: true, clubName: true }
      }
    }
  });

  if (!match) {
    res.status(404);
    throw new Error('Match not found or you do not have permission to view this match');
  }

  res.json({
    ...match,
    _id: match.id,
    club: match.Club ? { _id: match.Club.id, clubName: match.Club.clubName } : null
  });
});

// @desc    Delete a match
// @route   DELETE /api/matches/:id
// @access  Private/Manager
const deleteMatch = asyncHandler(async (req, res) => {
  const matchId = req.params.id;
  const { _id: userId, userType } = req.user;

  let match = await prisma.match.findUnique({ where: { id: matchId } });

  if (!match) {
    res.status(404);
    throw new Error('Match not found or you do not have permission to delete this match');
  }

  if (userType !== "Admin" && match.manager !== userId) {
    res.status(403);
    throw new Error('Not authorized to delete this match');
  }

  await prisma.match.delete({ where: { id: matchId } });
  res.json({ message: 'Match deleted successfully' });
});

// @desc    Get all matches for a club (for members)
// @route   GET /api/matches/club/:clubId
// @access  Private/Member
const getMatchesByClub = asyncHandler(async (req, res) => {
  const clubId = req.params.clubId;
  const matches = await prisma.match.findMany({
    where: { club: clubId },
    include: {
      Club: {
        select: { id: true, clubName: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedMatches = matches.map(m => ({
    ...m,
    _id: m.id,
    club: m.Club ? { _id: m.Club.id, clubName: m.Club.clubName } : null
  }));

  res.json(formattedMatches);
});

// @desc    Approve credits for a match
// @route   POST /api/matches/:matchId/approve-credits
// @access  Private/Manager
const approveCredits = asyncHandler(async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        Club: true
      }
    });

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

    const groups = await prisma.group.findMany({
      where: { match: matchId },
      orderBy: { createdAt: 'asc' }
    });

    const admin = await prisma.user.findFirst({ where: { userType: 'Admin' } });
    const manager = await prisma.user.findUnique({ where: { id: match.manager } });
    const allUsers = await prisma.user.findMany({
      select: { countryCode: true, phoneNumber: true, firstName: true, lastName: true }
    });

    const notificationQueueResults = {
      winners: { queued: 0, failed: 0 },
      admin: { queued: 0, failed: 0 },
      manager: { queued: 0, failed: 0 },
      users: { queued: 0, failed: 0 }
    };
    
    const generateMsgId = () => {
      return Math.random().toString(36).substring(2, 10).toUpperCase();
    };

    let resultsMessage = `

🏏 *Match Results Announcement* 🏏

*Club:* ${match.Club ? match.Club.clubName : ''}
*Match:* ${match.team1} vs ${match.team2}

📊 *Final Results:*
    `.trim();

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const groupNumber = i + 1;
      const bets = await prisma.bet.findMany({
        where: { group: group.id },
        include: { User: true }
      });

      bets.sort((a, b) => b.score - a.score);

      // Rank by DISTINCT score so a missing tier stays empty instead of
      // collapsing to 0. The old `|| 0` fallback meant that when fewer than
      // three distinct scores existed (e.g. everyone tied), the 2nd/3rd place
      // scores became 0 and any bet that genuinely scored 0 was paid a prize.
      const distinctScores = [...new Set(bets.map((bet) => bet.score))].sort((a, b) => b - a);
      const [firstPlaceScore, secondPlaceScore, thirdPlaceScore] = distinctScores;

      const firstWinners = firstPlaceScore !== undefined ? bets.filter((bet) => bet.score === firstPlaceScore) : [];
      const secondWinners = secondPlaceScore !== undefined ? bets.filter((bet) => bet.score === secondPlaceScore) : [];
      const thirdWinners = thirdPlaceScore !== undefined ? bets.filter((bet) => bet.score === thirdPlaceScore) : [];

      const totalBetAmount = group.totalBetAmount || 0;
      const firstPrize = (totalBetAmount * (group.winnerShare1 || 0)) / 100;
      const secondPrize = (totalBetAmount * (group.winnerShare2 || 0)) / 100;
      const thirdPrize = (totalBetAmount * (group.winnerShare3 || 0)) / 100;

      const formatWinners = (winners, prizePerWinner) => {
        return winners.map(w => 
          `${w.User ? w.User.firstName : ''} (Combination: ${w.combination}) - RS ${prizePerWinner.toFixed(2)}`
        ).join('\n       ');
      };

      resultsMessage += `

🔹 *Group ${groupNumber} Results:*
🥇 *1st Place (Score: ${firstPlaceScore ?? '-'}):*
       ${firstWinners.length > 0 ? formatWinners(firstWinners, firstPrize / firstWinners.length) : 'No winners'}

🥈 *2nd Place (Score: ${secondPlaceScore ?? '-'}):*
       ${secondWinners.length > 0 ? formatWinners(secondWinners, secondPrize / secondWinners.length) : 'No winners'}

🥉 *3rd Place (Score: ${thirdPlaceScore ?? '-'}):*
       ${thirdWinners.length > 0 ? formatWinners(thirdWinners, thirdPrize / thirdWinners.length) : 'No winners'}
      `.trim();

      const distributePrize = async (winners, prizeAmount, position) => {
        if (winners.length > 0 && prizeAmount > 0) {
          const amountPerWinner = prizeAmount / winners.length;
          
          for (const winner of winners) {
            if (!winner.User || !winner.User.id) continue;
            
            const user = await prisma.user.findUnique({ where: { id: winner.User.id } });
            if (!user) continue;

            let referralBonus = 0;
            let netWinnings = amountPerWinner;
            
            if (user.referredBy && user.userType === 'Member') {
              referralBonus = amountPerWinner * 0.05;
              netWinnings = amountPerWinner - referralBonus;
              
              await prisma.user.update({
                where: { id: user.id },
                data: { credits: { increment: netWinnings } }
              });

              const txnCode = `TXN-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
              const winnerTransaction = await prisma.transaction.create({
                data: {
                  id: require('crypto').randomUUID(),
                  transactionId: txnCode,
                  user: user.id,
                  amount: netWinnings,
                  type: "Credit",
                  description: `Winning amount (${position} place) for ${match.team1} vs ${match.team2} - group: ${group.id}`,
                }
              });

              const referrer = await prisma.user.findUnique({ where: { id: user.referredBy } });
              if (referrer) {
                await prisma.user.update({
                  where: { id: referrer.id },
                  data: {
                    credits: { increment: referralBonus },
                    referralEarnings: { increment: referralBonus }
                  }
                });

                const refTxnCode = `TXN-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
                await prisma.transaction.create({
                  data: {
                    id: require('crypto').randomUUID(),
                    transactionId: refTxnCode,
                    user: referrer.id,
                    amount: referralBonus,
                    type: "Credit",
                    description: `Referral bonus from ${user.firstName}'s winnings`,
                  }
                });

                const referrerMessage = `
💰 **Referral Bonus Credited**

➕ *Amount Credited:* RS ${referralBonus.toFixed(2)}
🏦 *New Balance:* RS ${(referrer.credits + referralBonus).toFixed(2)}
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

                await addToWhatsappQueue(referrer.countryCode || '+91', referrer.phoneNumber, referrerMessage);
              }
            } else {
              await prisma.user.update({
                where: { id: user.id },
                data: { credits: { increment: amountPerWinner } }
              });

              const txnCode = `TXN-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
              const winnerTransaction = await prisma.transaction.create({
                data: {
                  id: require('crypto').randomUUID(),
                  transactionId: txnCode,
                  user: user.id,
                  amount: amountPerWinner,
                  type: "Credit",
                  description: `Winning amount (${position} place) for ${match.team1} vs ${match.team2} - group: ${group.id}`,
                }
              });
            }

            const winnerMessage = `
🏆 **Congratulations! You Won!**

🥇 *Position:* ${position}
💰 *Amount Won:* RS ${netWinnings.toFixed(2)}
🏏 *Match:* ${match.team1} vs ${match.team2}
📊 *Group:* ${groupNumber}
🎯 *Your Combination:* ${winner.combination}
            `.trim();

            const creditMessage = `
💰 **Credit Received - Winnings**

➕ *Amount Credited:* RS ${netWinnings.toFixed(2)}
🏦 *New Balance:* RS ${(user.credits + netWinnings).toFixed(2)}
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

            try {
              await addToWhatsappQueue(user.countryCode || '+91', user.phoneNumber, winnerMessage);
              await addToWhatsappQueue(user.countryCode || '+91', user.phoneNumber, creditMessage);
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

      for (const winner of firstWinners) {
        await prisma.bet.update({ where: { id: winner.id }, data: { result: 'Win' } });
      }
      for (const winner of secondWinners) {
        await prisma.bet.update({ where: { id: winner.id }, data: { result: 'Win' } });
      }
      for (const winner of thirdWinners) {
        await prisma.bet.update({ where: { id: winner.id }, data: { result: 'Win' } });
      }

      const losers = bets.filter(
        (bet) =>
          bet.score !== firstPlaceScore &&
          bet.score !== secondPlaceScore &&
          bet.score !== thirdPlaceScore
      );
      for (const loser of losers) {
        await prisma.bet.update({ where: { id: loser.id }, data: { result: 'Loss' } });
      }

      await prisma.winners.create({
        data: {
          id: require('crypto').randomUUID(),
          match: matchId,
          group: group.id,
          firstWinners: firstWinners.map((bet) => ({
            user: bet.better,
            bet: bet.id,
            score: bet.score,
            amountWon: firstPrize / (firstWinners.length || 1),
            combination: bet.combination,
            firstName: bet.User ? bet.User.firstName : '',
            lastName: bet.User ? bet.User.lastName : '',
          })),
          secondWinners: secondWinners.map((bet) => ({
            user: bet.better,
            bet: bet.id,
            score: bet.score,
            amountWon: secondPrize / (secondWinners.length || 1),
            combination: bet.combination,
            firstName: bet.User ? bet.User.firstName : '',
            lastName: bet.User ? bet.User.lastName : '',
          })),
          thirdWinners: thirdWinners.map((bet) => ({
            user: bet.better,
            bet: bet.id,
            score: bet.score,
            amountWon: thirdPrize / (thirdWinners.length || 1),
            combination: bet.combination,
            firstName: bet.User ? bet.User.firstName : '',
            lastName: bet.User ? bet.User.lastName : '',
          })),
        }
      });

      const remainingAmount = totalBetAmount - (firstPrize + secondPrize + thirdPrize);
      const adminSharePct = match.Club ? match.Club.adminShare || 0 : 0;
      const adminShare = (remainingAmount * adminSharePct) / 100;
      const managerShare = remainingAmount - adminShare;

      if (adminShare > 0 && admin) {
        await prisma.user.update({
          where: { id: admin.id },
          data: { credits: { increment: adminShare } }
        });

        const adminTxnCode = `TXN-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
        await prisma.transaction.create({
          data: {
            id: require('crypto').randomUUID(),
            transactionId: adminTxnCode,
            user: admin.id,
            amount: adminShare,
            type: "Credit",
            description: `Admin Share (${adminSharePct}%) for ${match.team1} vs ${match.team2} - group: ${group.id}`,
          }
        });
      }

      if (managerShare > 0 && manager) {
        await prisma.user.update({
          where: { id: manager.id },
          data: { credits: { increment: managerShare } }
        });

        const mgrTxnCode = `TXN-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
        await prisma.transaction.create({
          data: {
            id: require('crypto').randomUUID(),
            transactionId: mgrTxnCode,
            user: manager.id,
            amount: managerShare,
            type: "Credit",
            description: `Manager Share for ${match.team1} vs ${match.team2} - group: ${group.id}`,
          }
        });
      }
    }

    resultsMessage += `

🎉 *Congratulations to all winners!*
💰 *Winnings will be credited to your accounts shortly.*

Thank you for participating in ${match.Club ? match.Club.clubName : ''}'s fantasy league!

🔗 *Dashboard:* https://fantacyleauge.com/dashboard
    `.trim();

    const userNotificationPromises = allUsers.map(async (user) => {
      const msgId = generateMsgId();
      const personalizedMessage = `
Hi ${user.firstName} ${user.lastName},

${resultsMessage}

msgid: ${msgId}
      `.trim();

      try {
        await addToWhatsappQueue(user.countryCode || '+91', user.phoneNumber, personalizedMessage);
        notificationQueueResults.users.queued += 1;
        return { success: true, phoneNumber: user.phoneNumber };
      } catch (error) {
        console.error(`Failed to queue results notification for ${user.phoneNumber}:`, error);
        notificationQueueResults.users.failed += 1;
        return { success: false, phoneNumber: user.phoneNumber, error: error.message };
      }
    });

    await Promise.all(userNotificationPromises);

    await prisma.match.update({
      where: { id: matchId },
      data: { status: 'Announced', prizeShareStatus: true }
    });

    res.json({
      success: true,
      message: 'Credits approved and distribution queued successfully',
      data: {
        matchId: match.id,
        prizeDistributionCompleted: true,
        notificationsQueued: notificationQueueResults,
        resultsMessage: resultsMessage
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

module.exports = { addMatch, getMatches, updatePlayers, updateMatch, deleteMatch, getMatchById, getMatchesByClub, approveCredits };