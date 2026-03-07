// backend/routes/groupRoutes.js
const express = require('express');
const { protect, manager, managerOrMember, managerOrAdmin, managerOrAdminOrMember } = require('../middleware/authMiddleware');
const {
  createGroup,
  getGroupsByMatch,
  getGroupById, 
  updateGroup,
  deleteGroup,
} = require('../controllers/groupController');

const router = express.Router();

router.post('/', protect, managerOrAdmin, createGroup);
router.get('/match/:matchId', protect, managerOrAdminOrMember, getGroupsByMatch);
router.get('/:id', protect, managerOrAdminOrMember, getGroupById);
router.put('/:id', protect, managerOrAdmin, updateGroup);
router.delete('/:id', protect, managerOrAdmin, deleteGroup);


module.exports = router;