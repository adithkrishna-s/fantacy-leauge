// backend/routes/betRoutes.js
const express = require('express');
const { protect, member, managerOrMember, managerOrAdminOrMember } = require('../middleware/authMiddleware');
const { placeBet, getBetsByGroup, placeMultipleBets, getMyBets } = require('../controllers/betController');

const router = express.Router();

router.post('/', protect, member, placeBet);
router.post('/multiple', protect, member, placeMultipleBets);
router.get('/group/:groupId', protect, managerOrAdminOrMember, getBetsByGroup);
router.route('/my-bets').get(protect, member, getMyBets);

module.exports = router;