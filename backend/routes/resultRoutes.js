const express = require('express');
const { addResult, updateResult, getResultById } = require('../controllers/resultController');
const { protect, manager, managerOrAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, managerOrAdmin, addResult);
router.route('/:id').put(protect, managerOrAdmin, updateResult);
router.get("/:id", protect, managerOrAdmin, getResultById);

module.exports = router;