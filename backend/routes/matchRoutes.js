const express = require('express');
const Match = require('../models/Match');
const { addMatch, getMatches, updateMatch, deleteMatch, updatePlayers, getMatchById, getMatchesByClub, approveCredits } = require('../controllers/matchController');
const { admin, protect, manager, member, managerOrMember, managerOrAdmin, managerOrAdminOrMember } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, managerOrAdmin, addMatch);
router.get('/', protect, managerOrAdmin, getMatches);

router.route("/:id")
  .get(protect, managerOrAdminOrMember, getMatchById)
  .put(protect, managerOrAdmin, updateMatch)
  .delete(protect, managerOrAdmin, deleteMatch);

router.post('/Admin-club/:clubId', protect, admin, addMatch);
router.get('/club/:clubId', protect, managerOrAdminOrMember, getMatchesByClub);
router.post('/:matchId/approve-credits', protect, managerOrAdmin, approveCredits);
router.put('/:id/update-players', protect, managerOrAdmin, updatePlayers);



module.exports = router;