// backend/routes/winnerRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { protect, member, managerOrMember, managerOrAdminOrMember } = require('../middleware/authMiddleware');
const { getMyWinnings } = require('../controllers/winnerController');

router.route('/my-winnings').get(protect, member, getMyWinnings);

router.get('/group/:groupId', protect, managerOrAdminOrMember, async (req, res) => {
    try {
      // The winner JSON arrays already embed firstName/lastName for each
      // winner (written in approveCredits), so no relation populate is needed.
      const winners = await prisma.winners.findFirst({ where: { group: req.params.groupId } });
      res.json(winners ? { ...winners, _id: winners.id } : null);
    } catch (error) {
      console.error('Failed to fetch winners by group:', error);
      res.status(500).json({ message: 'Failed to fetch winners' });
    }
});

module.exports = router;