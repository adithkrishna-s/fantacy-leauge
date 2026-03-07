// controllers/userController.js
const User = require('../models/User');
const Club = require('../models/Club');
const Transaction = require('../models/Transaction');
const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { addToWhatsappQueue } = require('../services/queueService');


// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, countryCode, phoneNumber, password, referralCode } = req.body;

  // Remove spaces from phone number
  const cleanedPhoneNumber = phoneNumber.replace(/\s/g, '');

  // Check if phone number already exists
  const phoneNumberExists = await User.findOne({ phoneNumber: cleanedPhoneNumber });
  if (phoneNumberExists) {
    res.status(400);
    throw new Error('Phone number already exists');
  }


  let referredBy = null;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode, userType: 'Member' });
    if (!referrer) {
      res.status(400);
      throw new Error('Invalid referral code');
    }
    referredBy = referrer._id;
  }


  const user = await User.create({
    firstName,
    lastName,
    email,
    countryCode,
    phoneNumber: cleanedPhoneNumber,
    password,
    referredBy
  });

  if (user) {
    try {
      // Update referrer's count if applicable
      if (referredBy) {
        await User.findByIdAndUpdate(referredBy, {
          $inc: { referralCount: 1 }
        });
      }

      // Send welcome message to the new user
      const welcomeMessage = `
🎉 *Welcome to Fantasy League 7!*

Dear ${firstName},

Thank you for registering with Fantasy League 7! We're excited to have you on board.

🔹 *Your Login Details:*
📱 Phone: ${cleanedPhoneNumber}
🔑 Password: ${password} (Keep this secure)

ℹ️ *Next Steps:*
- The admin has been notified about your registration
- You'll soon be added to a club where you can participate in matches
- Explore the platform at https://fantasyleague7.com

📌 *Important:*
- Do not share your password with anyone
- Contact support if you need any assistance

We wish you the best of luck in your fantasy cricket journey!

🏏 *The Fantasy League 7 Team*
      `.trim();

      await addToWhatsappQueue(countryCode, cleanedPhoneNumber, welcomeMessage);

      // Send notification to admin
      const admin = await User.findOne({ userType: 'Admin' });
      if (admin) {
        const adminNotification = `
🆕 *New User Registration Alert*

A new user has registered on Fantasy League 7:

👤 *Name:* ${firstName} ${lastName}
📱 *Phone:* ${countryCode}${cleanedPhoneNumber}
📧 *Email:* ${email || 'Not provided'}
🕒 *Registered At:* ${new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}

Please add this user to an appropriate club at your earliest convenience.

        `.trim();

        await addToWhatsappQueue(admin.countryCode, admin.phoneNumber, adminNotification);
      }

    } catch (error) {
      console.error('Error sending welcome messages:', error);
      // Don't fail the registration if messaging fails
    }

    res.status(201).json({
      _id: user.id,
      email: user.email,
      userType: user.userType,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});



// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      res.status(400);
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Prepare WhatsApp Message
    const message = `
🔒 **Password Update Notification**

Your FantasyLeague7 account password has been successfully updated.

📱 Account: *${user.phoneNumber}*
🆕 New Password: *${newPassword}*

For security reasons:
- Do not share your password with anyone
- Change your password regularly
- Contact support if you didn't initiate this change

🔗 Login: https://fantasyleague7.com/login
    `.trim();

    // Add message to queue
    try {
      await addToWhatsappQueue(user.countryCode, user.phoneNumber, message);
      console.log("WhatsApp message added to queue successfully");
    } catch (waError) {
      console.error("Failed to add WhatsApp message to queue:", waError.message);
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});



// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { phoneNumber, password } = req.body;

  // Remove spaces from phone number
  const cleanedPhoneNumber = phoneNumber.replace(/\s/g, '');

  const user = await User.findOne({ phoneNumber: cleanedPhoneNumber });

  console.log('Comparing:', password, user.password);
  const isMatch = await bcrypt.compare(password, user.password);
  console.log('Match result:', isMatch);

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user._id,
      firstName: user.firstName,
      email: user.email,
      userType: user.userType,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid phone number or password');
  }
});

// @desc    Get all users
// @route   GET /api/users/
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});



// @desc    Add existing user as member
// @route   POST /api/users/add-member
// @access  Private/Manager
const addMember = asyncHandler(async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const managerId = req.user._id;

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.userType !== 'Member') {
      res.status(400);
      throw new Error('User is not a member');
    }

    const club = await Club.findOne({ user: managerId });
    if (!club) {
      res.status(404);
      throw new Error('Club not found for this manager');
    }

    user.memberOf = club._id;
    await user.save();

    const manager = await User.findById(managerId); // Fetch manager details
    const ManagerNumber = club.managerPhone;

    const message = `
🎉 **Hello ${user.firstName},** you have been added to **${club.clubName}** by **${manager.firstName} ${manager.lastName}**.

🚀 Get ready to build your dream team and start winning!

🔗 **Login now & explore**: https://fantasyleague7.com/dashboard

Manager Phone Number: *${ManagerNumber}*

🏏 Let the game begin!
    `.trim();

    // Add message to queue
    try {
      await addToWhatsappQueue(user.countryCode, user.phoneNumber, message);
      console.log("Member addition WhatsApp message added to queue successfully");
    } catch (waError) {
      console.error("Failed to add WhatsApp message to queue:", waError.message);
    }

    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});



// @desc    Add existing user as member
// @route   POST /api/users/add-member/:clubId
// @access  Private/Admin
const AdminaddMember = asyncHandler(async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const { clubId } = req.params;

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.userType !== 'Member') {
      res.status(400);
      throw new Error('User is not a member');
    }

    const club = await Club.findById(clubId);
    if (!club) {
      res.status(404);
      throw new Error('Club not found');
    }

    user.memberOf = club._id;
    await user.save();

    const ManagerNumber = club.managerPhone;

    const message = `
🎉 **Hello ${user.firstName},** you have been added to **${club.clubName}** by **${club.managerFirstName}**.

🚀 Get ready to build your dream team and start winning!

🔗 **Login now & explore**: https://fantasyleague7.com/dashboard

Manager Phone Number: *${ManagerNumber}*

🏏 Let the game begin!
    `.trim();

    // Add message to queue
    try {
      await addToWhatsappQueue(user.countryCode, user.phoneNumber, message);
      console.log("Admin member addition WhatsApp message added to queue successfully");
    } catch (waError) {
      console.error("Failed to add WhatsApp message to queue:", waError.message);
    }

    res.json({ 
      message: 'Member added successfully',
      memberId: user._id,
      clubName: club.clubName
    });
  } catch (error) {
    console.error("Error in admin adding member:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});



// @desc    Register new member
// @route   POST /api/users/register-member
// @access  Private/Manager
const registerMember = asyncHandler(async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, countryCode } = req.body;
    const managerId = req.user._id;

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const club = await Club.findOne({ user: managerId });
    if (!club) {
        res.status(404);
        throw new Error('Club not found for this manager');
    }

    const ManagerNumber = club.managerPhone;

    const user = await User.create({
        firstName,
        lastName,
        email,
        countryCode,
        phoneNumber,
        password,
        userType: 'Member',
        memberOf: club._id,
    });

    const manager = await User.findById(managerId); // Fetch manager details

    const message = `
🎉 **Hello ${firstName},** you have been added to **${club.clubName}** by **${manager.firstName} ${manager.lastName}**.

🚀 Get ready to build your dream team and start winning!

🔑 **Login Details:**
👤 Username: *${phoneNumber}*
🔒 Password: *${password}*

🔗 **Login now & explore**: https://fantasyleague7.com/dashboard

Manager Phone Number: *${ManagerNumber}*

🏏 Let the game begin!
    `.trim();

    // Add message to queue
    try {
      await addToWhatsappQueue(countryCode, phoneNumber, message);
      console.log("Member registration WhatsApp message added to queue successfully");
    } catch (waError) {
      console.error("Failed to add WhatsApp message to queue:", waError.message);
    }

    res.status(201).json({ message: 'Member registered successfully' });
  } catch (error) {
    console.error("Error registering member:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});



// @desc    Get user details by ID
// @route   GET /api/users/userdetails/:id
// @access  Private
const getUserById = asyncHandler(async (req, res) => {
  const memberId = req.params.id;
  const user = await User.findById(memberId);
  if (user) {
    res.json({
      _id: user._id,
      firstName: user.firstName,
      email: user.email,
      phone: user.phoneNumber,
      userType: user.userType,
      credits: user.credits,  // Include credits here
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});




// @desc    Register new member
// @route   POST /api/users/register-member/:clubId
// @access  Private/Admin
const AdminregisterMember = asyncHandler(async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, countryCode } = req.body;
    const { clubId } = req.params;

    const userExists = await User.findOne({ phoneNumber });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const club = await Club.findById(clubId);
    if (!club) {
      res.status(404);
      throw new Error('Club not found');
    }

    const ManagerNumber = club.managerPhone;

    const user = await User.create({
      firstName,
      lastName,
      email,
      countryCode,
      phoneNumber,
      password,
      userType: 'Member',
      memberOf: club._id,
    });

    const message = `
🎉 **Hello ${firstName},** you have been added to **${club.clubName}** by **${club.managerFirstName}**.

🚀 Get ready to build your dream team and start winning!

🔑 **Login Details:**
👤 Username: *${phoneNumber}*
🔒 Password: **${password}**
🔗 **Login now & explore**: https://fantasyleague7.com/dashboard

Manager Phone Number: *${ManagerNumber}*

🏏 Let the game begin!
    `.trim();

    // Add message to queue
    try {
      await addToWhatsappQueue(countryCode, phoneNumber, message);
      console.log("Admin member registration WhatsApp message added to queue successfully");
    } catch (waError) {
      console.error("Failed to add WhatsApp message to queue:", waError.message);
    }

    res.status(201).json({ 
      message: 'Member registered successfully',
      memberId: user._id,
      clubName: club.clubName
    });
  } catch (error) {
    console.error("Error in admin registering member:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});



// @desc    Get all members of the manager's club
// @route   GET /api/users/members
// @access  Private/Manager
const getMembers = asyncHandler(async (req, res) => {
  const managerId = req.user._id;

  const club = await Club.findOne({ user: managerId });
  if (!club) {
    res.status(404);
    throw new Error('Club not found for this manager');
  }

  const members = await User.find({ memberOf: club._id }).select('-password');
  res.json(members);
});

// @desc    Get all members of the manager's club
// @route   GET /api/users/members/:clubId
// @access  Private/Manager
const getMembersbyClub = asyncHandler(async (req, res) => {
  const clubId = req.params.clubId;

  const club = await Club.findOne({ _id: clubId });
  if (!club) {
    res.status(404);
    throw new Error('Club not found for this manager');
  }

  const members = await User.find({ memberOf: club._id }).select('-password');
  res.json(members);
});



// @desc    Add credit to a member
// @route   PUT /api/users/add-credit/:id
// @access  Private/Manager
const addCredit = asyncHandler(async (req, res) => {
  try {
    const { creditAmount } = req.body;
    const memberId = req.params.id;

    if (!creditAmount || isNaN(creditAmount) || creditAmount <= 0) {
      res.status(400);
      throw new Error('Please enter a valid credit amount');
    }

    const member = await User.findById(memberId);
    if (!member) {
      res.status(404);
      throw new Error('Member not found');
    }

    const amount = parseFloat(creditAmount);
    member.credits += amount;
    await member.save();

    // Create a new transaction
    const transaction = await Transaction.create({
      user: member._id,
      amount: amount,
      type: "Credit",
      description: `₹${creditAmount} Credited by Manager`,
    });

    // Prepare WhatsApp Notification
    const message = `
💰 **Credit Added to Your Account**

💳 *Transaction Type:* Credit
➕ *Amount Credited:* +₹${amount.toFixed(2)}
🏦 *New Wallet Balance:* ₹${member.credits.toFixed(2)}
📝 *Description:* Credited by Manager

📅 *Date:* ${new Date().toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}

Thank you for using FantasyLeague7!
    `.trim();

    // Add message to queue
    try {
      await addToWhatsappQueue(member.countryCode, member.phoneNumber, message);
      console.log("Credit notification added to WhatsApp queue successfully");
    } catch (waError) {
      console.error("Failed to add credit notification to queue:", waError.message);
    }

    res.json({ 
      message: 'Credit added successfully',
      newBalance: member.credits,
      transactionId: transaction._id 
    });

  } catch (error) {
    console.error("Error adding credit:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});


// @desc    Remove a member from the club
// @route   PUT /api/users/remove-member/:id
// @access  Private/Manager
const removeMember = asyncHandler(async (req, res) => {
  const memberId = req.params.id;

  const member = await User.findById(memberId);
  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }

  member.memberOf = null;
  await member.save();

  res.json({ message: 'Member removed successfully' });
});


// @desc    Deduct credit from a member
// @route   PUT /api/users/deduct-credit/:id
// @access  Private/Manager
const deductCredit = asyncHandler(async (req, res) => {
  try {
    const { creditAmount } = req.body;
    const memberId = req.params.id;

    if (!creditAmount || isNaN(creditAmount) || creditAmount <= 0) {
      res.status(400);
      throw new Error('Please enter a valid credit amount');
    }

    const member = await User.findById(memberId).select('countryCode phoneNumber credits firstName');
    if (!member) {
      res.status(404);
      throw new Error('Member not found');
    }

    const amount = parseFloat(creditAmount);
    if (member.credits < amount) {
      res.status(400);
      throw new Error('Insufficient credits for deduction');
    }

    member.credits -= amount;
    await member.save();

    // Create transaction record
    const transaction = await Transaction.create({
      user: member._id,
      amount: amount,
      type: "Debit",
      description: `₹${amount.toFixed(2)} Debited by Manager`,
      reference: `DEDUCT-${Date.now()}`
    });

    // Prepare WhatsApp message
    const message = `
⚠️ **Credit Deduction Notification**

Dear ${member.firstName},

💸 *Transaction Type:* Debit
➖ *Amount Deducted:* ₹${amount.toFixed(2)}
💰 *Remaining Balance:* ₹${member.credits.toFixed(2)}
📝 *Reason:* Manager adjustment

📅 *Date:* ${new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}

🔢 *Transaction ID:* ${transaction._id}

For any queries, please contact your manager.
    `.trim();

    // Add to queue
    try {
      await addToWhatsappQueue(member.countryCode, member.phoneNumber, message);
      console.log(`Deduction notification queued for ${member.phoneNumber}`);
    } catch (queueError) {
      console.error('Failed to queue deduction notification:', queueError);
      // Optional: You could log this to a separate error tracking system
    }

    res.json({
      success: true,
      message: 'Credit deduction processed successfully',
      data: {
        memberId: member._id,
        amountDeducted: amount,
        newBalance: member.credits,
        transactionId: transaction._id,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error(`Credit deduction failed for member ${memberId}:`, error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('memberOf', 'clubName');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});



// NeWly Added
// @desc    Forgot password - send OTP via WhatsApp
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Remove spaces from phone number
    const cleanedPhoneNumber = phoneNumber.replace(/\s/g, '');

    const user = await User.findOne({ phoneNumber: cleanedPhoneNumber });
    if (!user) {
      res.status(404);
      throw new Error('User not found with this phone number');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    // Save OTP and expiry to user
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = otpExpiry;
    await user.save();

    // Prepare OTP message
    const message = `
🔐 **Password Reset OTP Verification**

Hello ${user.firstName || 'User'},

Your one-time password (OTP) is: 
🔢 *${otp}*

⏳ Valid for: 10 minutes
📱 Sent to: ${phoneNumber}

⚠️ Do not share this OTP with anyone.

If you didn't request this, please secure your account immediately.
    `.trim();

    // Add message to queue
    try {
      await addToWhatsappQueue(user.countryCode, cleanedPhoneNumber, message);
      
      res.json({ 
        success: true,
        message: 'OTP sent successfully to your WhatsApp',
        data: {
          phoneNumber: cleanedPhoneNumber,
          otpExpiresAt: new Date(otpExpiry).toISOString(),
          // Don't send OTP back in response
          userFirstName: user.firstName // Optional, for client-side personalization
        }
      });
    } catch (queueError) {
      console.error('Failed to queue OTP message:', queueError);
      throw new Error('OTP generation succeeded but failed to queue WhatsApp notification');
    }

  } catch (error) {
    console.error("Password reset error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to process password reset request',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});



// @desc    Verify OTP
// @route   POST /api/users/verify-otp
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
  const { phoneNumber, otp } = req.body;

  // Remove spaces from phone number
  const cleanedPhoneNumber = phoneNumber.replace(/\s/g, '');

  const user = await User.findOne({ 
    phoneNumber: cleanedPhoneNumber,
    resetPasswordOTP: otp,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid OTP or OTP has expired');
  }

  res.json({ 
    message: 'OTP verified successfully',
    phoneNumber: cleanedPhoneNumber,
    otpVerified: true
  });
});

// @desc    Reset password
// @route   POST /api/users/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { phoneNumber, otp, newPassword } = req.body;

  // Remove spaces from phone number
  const cleanedPhoneNumber = phoneNumber.replace(/\s/g, '');

  const user = await User.findOne({ 
    phoneNumber: cleanedPhoneNumber,
    resetPasswordOTP: otp,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid OTP or OTP has expired');
  }

  // Update password and clear OTP fields
  user.password = newPassword;
  user.resetPasswordOTP = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: 'Password reset successfully' });
});

// Add these new functions to the controller
const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// @desc    Get user by referral code
// @route   GET /api/users/referral/:code
// @access  Public
const getUserByReferralCode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const user = await User.findOne({ referralCode: code, userType: 'Member' });
  
  if (!user) {
    res.status(404);
    throw new Error('Invalid referral code');
  }
  
  res.json({
    firstName: user.firstName,
    lastName: user.lastName,
    referralCode: user.referralCode
  });
});

// @desc    Get referral stats for a user
// @route   GET /api/users/referral-stats
// @access  Private/Member
const getReferralStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const referredUsers = await User.find({ referredBy: userId }).select('firstName lastName createdAt phoneNumber');
  const user = await User.findById(userId).select('referralCode referralCount referralEarnings');
  
  res.json({
    referralCode: user.referralCode,
    referralCount: user.referralCount,
    referralEarnings: user.referralEarnings,
    referredUsers
  });
});


// Add this to your userController.js
// @desc    Get referral stats for a user
// @route   GET /api/send-whatsapp
// @access  Private/Member
const sendWhatsAppInvite = asyncHandler(async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user._id;

    // Get user's referral code
    const user = await User.findById(userId).select('referralCode firstName lastName');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Validate phone number format (basic validation)
    const cleanedPhoneNumber = phoneNumber.replace(/\s/g, '');
    if (!/^\d{10,15}$/.test(cleanedPhoneNumber)) {
      res.status(400);
      throw new Error('Invalid phone number format');
    }

    // Create referral link
    const referralLink = `https://fantasyleague7.com/register?ref=${user.referralCode}`;
    
    // Create personalized message
    const message = `
🌟 *You're Invited to FantasyLeague7!* 🌟

Hi there!

${user.firstName} ${user.lastName} has invited you to join FantasyLeague7, the ultimate fantasy cricket platform.

🎁 *Special Offer:* Sign up using this link and get bonus credits!
🔗 ${referralLink}

🏏 Play matches
💰 Win real money
👑 Compete with friends

Tap the link above to join now!

- The FantasyLeague7 Team
    `.trim();

    // Send via your WhatsApp queue service
    await addToWhatsappQueue('+91', cleanedPhoneNumber, message); // Change country code if needed

    res.json({
      success: true,
      message: 'WhatsApp invitation sent successfully',
      data: {
        phoneNumber: cleanedPhoneNumber,
        referralLink
      }
    });

  } catch (error) {
    console.error('Error sending WhatsApp invite:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send WhatsApp invite'
    });
  }
});





module.exports = { forgotPassword, verifyOTP, resetPassword, registerUser, loginUser, changePassword, getUsers, getUserById, addMember, registerMember, getMembers, addCredit, removeMember, deductCredit, getUserProfile, getMembersbyClub, AdminaddMember, AdminregisterMember, getUserByReferralCode, getReferralStats, sendWhatsAppInvite};