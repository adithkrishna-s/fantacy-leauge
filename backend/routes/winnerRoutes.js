// backend/routes/winnerRoutes.js
const express = require('express');
const router = express.Router();
const { protect, member, managerOrMember, managerOrAdminOrMember } = require('../middleware/authMiddleware');
const { getMyWinnings } = require('../controllers/winnerController');
const Winners = require('../models/Winners');

router.route('/my-winnings').get(protect, member, getMyWinnings);

router.get('/group/:groupId', protect, managerOrAdminOrMember, async (req, res) => {
    try {
      const winners = await Winners.findOne({ group: req.params.groupId })
        .populate('firstWinners.user', 'firstName lastName')
        .populate('secondWinners.user', 'firstName lastName')
        .populate('thirdWinners.user', 'firstName lastName');
      res.json(winners);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch winners' });
    }
});

module.exports = router;