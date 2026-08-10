// controllers/userController.js
const prisma = require('../config/prisma');
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
  const phoneNumberExists = await prisma.user.findUnique({ where: { phoneNumber: cleanedPhoneNumber } });
  if (phoneNumberExists) {
    res.status(400);
    throw new Error('Phone number already exists');
  }

  let referredBy = null;
  if (referralCode) {
    const referrer = await prisma.user.findFirst({ where: { referralCode, userType: 'Member' } });
    if (!referrer) {
      res.status(400);
      throw new Error('Invalid referral code');
    }
    referredBy = referrer.id;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = require('crypto').randomUUID();

  const user = await prisma.user.create({
    data: {
      id: userId,
      firstName,
      lastName: lastName || '',
      email: email || null,
      countryCode: countryCode || '+91',
      phoneNumber: cleanedPhoneNumber,
      password: hashedPassword,
      referredBy: referredBy || null,
      userType: 'Member',
    }
  });

  if (user) {
    try {
      // Update referrer's count if applicable
      if (referredBy) {
        await prisma.user.update({
          where: { id: referredBy },
          data: { referralCount: { increment: 1 } }
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
- Explore the platform at https://fantacyleauge.com

📌 *Important:*
- Do not share your password with anyone
- Contact support if you need any assistance

We wish you the best of luck in your fantasy cricket journey!

🏏 *The Fantasy League 7 Team*
      `.trim();

      await addToWhatsappQueue(countryCode || '+91', cleanedPhoneNumber, welcomeMessage);

      // Send notification to admin
      const admin = await prisma.user.findFirst({ where: { userType: 'Admin' } });
      if (admin) {
        const adminNotification = `
🆕 *New User Registration Alert*

A new user has registered on Fantasy League 7:

👤 *Name:* ${firstName} ${lastName || ''}
📱 *Phone:* ${countryCode || '+91'}${cleanedPhoneNumber}
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

        await addToWhatsappQueue(admin.countryCode || '+91', admin.phoneNumber, adminNotification);
      }

    } catch (error) {
      console.error('Error sending welcome messages:', error);
      // Don't fail the registration if messaging fails
    }

    res.status(201).json({
      _id: user.id,
      email: user.email,
      userType: user.userType,
      token: generateToken(user.id),
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
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400);
      throw new Error('Current password is incorrect');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

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

🔗 Login: https://fantacyleauge.com/login
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

  if (!phoneNumber || !password) {
    res.status(400);
    throw new Error('Please provide phone number and password');
  }

  // Remove spaces from phone number
  const cleanedPhoneNumber = phoneNumber.replace(/\s/g, '');

  const user = await prisma.user.findUnique({
    where: { phoneNumber: cleanedPhoneNumber }
  });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id,
      firstName: user.firstName,
      email: user.email,
      userType: user.userType,
      credits: user.credits,
      token: generateToken(user.id),
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
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const formattedUsers = users.map(u => {
    const { password, ...rest } = u;
    return { ...rest, _id: u.id };
  });
  res.json(formattedUsers);
});

// @desc    Add existing user as member
// @route   POST /api/users/add-member
// @access  Private/Manager
const addMember = asyncHandler(async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const managerId = req.user._id;

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.userType !== 'Member') {
      res.status(400);
      throw new Error('User is not a member');
    }

    let club = await prisma.club.findUnique({ where: { user: managerId } });
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
          data: { user: managerId }
        }).catch(console.error);
      }
    }
    if (!club) {
      res.status(400);
      throw new Error('Club not found for this manager. Please contact Admin to assign a club.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { memberOf: club.id }
    });

    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    const ManagerNumber = club.managerPhone;

    const message = `
🎉 **Hello ${user.firstName},** you have been added to **${club.clubName}** by **${manager ? manager.firstName + ' ' + manager.lastName : ''}**.

🚀 Get ready to build your dream team and start winning!

🔗 **Login now & explore**: https://fantacyleauge.com/dashboard

Manager Phone Number: *${ManagerNumber}*

🏏 Let the game begin!
    `.trim();

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

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.userType !== 'Member') {
      res.status(400);
      throw new Error('User is not a member');
    }

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      res.status(404);
      throw new Error('Club not found');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { memberOf: club.id }
    });

    const ManagerNumber = club.managerPhone;

    const message = `
🎉 **Hello ${user.firstName},** you have been added to **${club.clubName}** by **${club.managerFirstName}**.

🚀 Get ready to build your dream team and start winning!

🔗 **Login now & explore**: https://fantacyleauge.com/dashboard

Manager Phone Number: *${ManagerNumber}*

🏏 Let the game begin!
    `.trim();

    try {
      await addToWhatsappQueue(user.countryCode, user.phoneNumber, message);
      console.log("Admin member addition WhatsApp message added to queue successfully");
    } catch (waError) {
      console.error("Failed to add WhatsApp message to queue:", waError.message);
    }

    res.json({ 
      message: 'Member added successfully',
      memberId: user.id,
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

    if (email) {
      const userExists = await prisma.user.findUnique({ where: { email } });
      if (userExists) {
        res.status(400);
        throw new Error('User already exists');
      }
    }

    const phoneExists = await prisma.user.findUnique({ where: { phoneNumber } });
    if (phoneExists) {
      res.status(400);
      throw new Error('Phone number already exists');
    }

    const club = await prisma.club.findUnique({ where: { user: managerId } });
    if (!club) {
      res.status(404);
      throw new Error('Club not found for this manager');
    }

    const ManagerNumber = club.managerPhone;
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = require('crypto').randomUUID();

    const user = await prisma.user.create({
      data: {
        id: userId,
        firstName,
        lastName: lastName || '',
        email: email || null,
        countryCode: countryCode || '+91',
        phoneNumber,
        password: hashedPassword,
        userType: 'Member',
        memberOf: club.id,
      }
    });

    const manager = await prisma.user.findUnique({ where: { id: managerId } });

    const message = `
🎉 **Hello ${firstName},** you have been added to **${club.clubName}** by **${manager ? manager.firstName + ' ' + manager.lastName : ''}**.

🚀 Get ready to build your dream team and start winning!

🔑 **Login Details:**
👤 Username: *${phoneNumber}*
🔒 Password: *${password}*

🔗 **Login now & explore**: https://fantacyleauge.com/dashboard

Manager Phone Number: *${ManagerNumber}*

🏏 Let the game begin!
    `.trim();

    try {
      await addToWhatsappQueue(countryCode || '+91', phoneNumber, message);
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
  const user = await prisma.user.findUnique({ where: { id: memberId } });
  if (user) {
    res.json({
      _id: user.id,
      firstName: user.firstName,
      email: user.email,
      phone: user.phoneNumber,
      userType: user.userType,
      credits: user.credits,
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

    const userExists = await prisma.user.findUnique({ where: { phoneNumber } });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      res.status(404);
      throw new Error('Club not found');
    }

    const ManagerNumber = club.managerPhone;
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = require('crypto').randomUUID();

    const user = await prisma.user.create({
      data: {
        id: userId,
        firstName,
        lastName: lastName || '',
        email: email || null,
        countryCode: countryCode || '+91',
        phoneNumber,
        password: hashedPassword,
        userType: 'Member',
        memberOf: club.id,
      }
    });

    const message = `
🎉 **Hello ${firstName},** you have been added to **${club.clubName}** by **${club.managerFirstName}**.

🚀 Get ready to build your dream team and start winning!

🔑 **Login Details:**
👤 Username: *${phoneNumber}*
🔒 Password: **${password}**
🔗 **Login now & explore**: https://fantacyleauge.com/dashboard

Manager Phone Number: *${ManagerNumber}*

🏏 Let the game begin!
    `.trim();

    try {
      await addToWhatsappQueue(countryCode || '+91', phoneNumber, message);
      console.log("Admin member registration WhatsApp message added to queue successfully");
    } catch (waError) {
      console.error("Failed to add WhatsApp message to queue:", waError.message);
    }

    res.status(201).json({ 
      message: 'Member registered successfully',
      memberId: user.id,
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

  const club = await prisma.club.findUnique({ where: { user: managerId } });
  if (!club) {
    res.status(404);
    throw new Error('Club not found for this manager');
  }

  const members = await prisma.user.findMany({
    where: { memberOf: club.id }
  });
  const formattedMembers = members.map(m => {
    const { password, ...rest } = m;
    return { ...rest, _id: m.id };
  });
  res.json(formattedMembers);
});

// @desc    Get all members of the manager's club
// @route   GET /api/users/members/:clubId
// @access  Private/Manager
const getMembersbyClub = asyncHandler(async (req, res) => {
  const clubId = req.params.clubId;

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) {
    res.status(404);
    throw new Error('Club not found for this manager');
  }

  const members = await prisma.user.findMany({
    where: { memberOf: club.id }
  });
  const formattedMembers = members.map(m => {
    const { password, ...rest } = m;
    return { ...rest, _id: m.id };
  });
  res.json(formattedMembers);
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

    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member) {
      res.status(404);
      throw new Error('Member not found');
    }

    const amount = parseFloat(creditAmount);
    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: { credits: { increment: amount } }
    });

    const txnCode = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const transaction = await prisma.transaction.create({
      data: {
        id: require('crypto').randomUUID(),
        transactionId: txnCode,
        user: memberId,
        amount: amount,
        type: "Credit",
        description: `₹${creditAmount} Credited by Manager`,
      }
    });

    const message = `
💰 **Credit Added to Your Account**

💳 *Transaction Type:* Credit
➕ *Amount Credited:* +₹${amount.toFixed(2)}
🏦 *New Wallet Balance:* ₹${updatedMember.credits.toFixed(2)}
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

    try {
      await addToWhatsappQueue(member.countryCode || '+91', member.phoneNumber, message);
      console.log("Credit notification added to WhatsApp queue successfully");
    } catch (waError) {
      console.error("Failed to add credit notification to queue:", waError.message);
    }

    res.json({ 
      message: 'Credit added successfully',
      newBalance: updatedMember.credits,
      transactionId: transaction.id 
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

  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }

  await prisma.user.update({
    where: { id: memberId },
    data: { memberOf: null }
  });

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

    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member) {
      res.status(404);
      throw new Error('Member not found');
    }

    const amount = parseFloat(creditAmount);
    if (member.credits < amount) {
      res.status(400);
      throw new Error('Insufficient credits for deduction');
    }

    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: { credits: { decrement: amount } }
    });

    const txnCode = `DEDUCT-${Date.now()}`;
    const transaction = await prisma.transaction.create({
      data: {
        id: require('crypto').randomUUID(),
        transactionId: txnCode,
        user: memberId,
        amount: amount,
        type: "Debit",
        description: `₹${amount.toFixed(2)} Debited by Manager`,
      }
    });

    const message = `
⚠️ **Credit Deduction Notification**

Dear ${member.firstName},

💸 *Transaction Type:* Debit
➖ *Amount Deducted:* ₹${amount.toFixed(2)}
💰 *Remaining Balance:* ₹${updatedMember.credits.toFixed(2)}
📝 *Reason:* Manager adjustment

📅 *Date:* ${new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}

🔢 *Transaction ID:* ${transaction.id}

For any queries, please contact your manager.
    `.trim();

    try {
      await addToWhatsappQueue(member.countryCode || '+91', member.phoneNumber, message);
      console.log(`Deduction notification queued for ${member.phoneNumber}`);
    } catch (queueError) {
      console.error('Failed to queue deduction notification:', queueError);
    }

    res.json({
      success: true,
      message: 'Credit deduction processed successfully',
      data: {
        memberId: member.id,
        amountDeducted: amount,
        newBalance: updatedMember.credits,
        transactionId: transaction.id,
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
  const user = await prisma.user.findUnique({
    where: { id: req.user._id },
    include: {
      Club_User_memberOfToClub: {
        select: { id: true, clubName: true }
      }
    }
  });

  if (user) {
    const { password, ...userWithoutPassword } = user;
    res.json({
      ...userWithoutPassword,
      _id: user.id,
      memberOf: user.Club_User_memberOfToClub 
        ? { _id: user.Club_User_memberOfToClub.id, id: user.Club_User_memberOfToClub.id, clubName: user.Club_User_memberOfToClub.clubName } 
        : null
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Forgot password - send OTP via WhatsApp
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const cleanedPhoneNumber = phoneNumber.replace(/\s/g, '');

    const user = await prisma.user.findUnique({ where: { phoneNumber: cleanedPhoneNumber } });
    if (!user) {
      res.status(404);
      throw new Error('User not found with this phone number');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

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

    try {
      await addToWhatsappQueue(user.countryCode || '+91', cleanedPhoneNumber, message);
      
      res.json({ 
        success: true,
        message: 'OTP sent successfully to your WhatsApp',
        data: {
          phoneNumber: cleanedPhoneNumber,
          otpExpiresAt: new Date(otpExpiry).toISOString(),
          userFirstName: user.firstName
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
  const cleanedPhoneNumber = phoneNumber.replace(/\s/g, '');

  const user = await prisma.user.findUnique({ where: { phoneNumber: cleanedPhoneNumber } });
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
  const cleanedPhoneNumber = phoneNumber.replace(/\s/g, '');

  const user = await prisma.user.findUnique({ where: { phoneNumber: cleanedPhoneNumber } });
  if (!user) {
    res.status(400);
    throw new Error('Invalid OTP or OTP has expired');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  res.json({ message: 'Password reset successfully' });
});

// @desc    Get user by referral code
// @route   GET /api/users/referral/:code
// @access  Public
const getUserByReferralCode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const user = await prisma.user.findFirst({ where: { referralCode: code, userType: 'Member' } });
  
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
  
  const referredUsers = await prisma.user.findMany({
    where: { referredBy: userId },
    select: { firstName: true, lastName: true, createdAt: true, phoneNumber: true }
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, referralCount: true, referralEarnings: true }
  });
  
  res.json({
    referralCode: user ? user.referralCode : null,
    referralCount: user ? user.referralCount : 0,
    referralEarnings: user ? user.referralEarnings : 0,
    referredUsers
  });
});

// @desc    Send WhatsApp invite
// @route   POST /api/users/send-whatsapp
// @access  Private/Member
const sendWhatsAppInvite = asyncHandler(async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user._id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, firstName: true, lastName: true }
    });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const cleanedPhoneNumber = phoneNumber.replace(/\s/g, '');
    if (!/^\d{10,15}$/.test(cleanedPhoneNumber)) {
      res.status(400);
      throw new Error('Invalid phone number format');
    }

    const referralLink = `https://fantacyleauge.com/register?ref=${user.referralCode}`;
    
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

    await addToWhatsappQueue('+91', cleanedPhoneNumber, message);

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

module.exports = { 
  forgotPassword, 
  verifyOTP, 
  resetPassword, 
  registerUser, 
  loginUser, 
  changePassword, 
  getUsers, 
  getUserById, 
  addMember, 
  registerMember, 
  getMembers, 
  addCredit, 
  removeMember, 
  deductCredit, 
  getUserProfile, 
  getMembersbyClub, 
  AdminaddMember, 
  AdminregisterMember, 
  getUserByReferralCode, 
  getReferralStats, 
  sendWhatsAppInvite
};