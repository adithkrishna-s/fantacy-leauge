// routes/userRoutes.js
const express = require('express');
const { registerUser, loginUser, changePassword, getUsers, addMember, getUserById, registerMember, getMembers, addCredit, removeMember, deductCredit, getUserProfile, getMembersbyClub, AdminaddMember, AdminregisterMember, getUserByReferralCode, getReferralStats, sendWhatsAppInvite } = require('../controllers/userController');
const { protect, admin, manager, managerOrMember, managerOrAdmin, managerOrAdminOrMember } = require('../middleware/authMiddleware');
const router = express.Router();



router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', protect, admin, getUsers); // Protect this route
router.post('/add-member', protect, managerOrAdmin, addMember);
router.post('/add-member/:clubId', protect, admin, AdminaddMember);
router.post('/register-member', protect, managerOrAdmin, registerMember);
router.post('/register-member/:clubId', protect, admin, AdminregisterMember);
router.get('/members', protect, managerOrAdmin, getMembers); // Fetch members
router.get('/members/:clubId', protect, admin, getMembersbyClub); // Fetch members
router.put('/add-credit/:id', protect, managerOrAdmin, addCredit); // Add credit
router.put('/deduct-credit/:id', protect, managerOrAdmin, deductCredit); // Deduct Credit
router.put('/remove-member/:id', protect, managerOrAdmin, removeMember); // Remove member
router.get('/profile', protect, getUserProfile);
router.get('/userdetails/:id', protect, managerOrAdminOrMember, getUserById);
router.put('/change-password', protect, changePassword);
router.get('/referral/:code', getUserByReferralCode);
router.get('/referral-stats', protect, getReferralStats);
router.post('/send-whatsapp', protect, sendWhatsAppInvite); // You'll need to implement this


module.exports = router;
