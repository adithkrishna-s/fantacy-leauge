const asyncHandler = require("express-async-handler");
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const axios = require('axios');

// @desc    Add a new club
// @route   POST /api/clubs
// @access  Private/Admin
const addClub = asyncHandler(async (req, res) => {
  try {
    console.log("Received Data:", req.body); // Log request body

    const { clubName, managerFirstName, managerLastName, managerEmail, countryCode, managerPhone, managerShare, adminShare, managerPassword } = req.body;

    if (!clubName || !managerFirstName || !managerLastName || !managerEmail || !countryCode || !managerPhone || !managerShare || !adminShare || !managerPassword) {
      console.log("Validation Error: Missing fields");
      return res.status(400).json({ error: "All fields are required." });
    }

    // Check if the manager already exists
    let manager = await prisma.user.findUnique({ where: { phoneNumber: managerPhone } });

    if (!manager) {
      console.log("Manager not found, creating a new user...");
      const hashedPassword = await bcrypt.hash(managerPassword, 10);
      const managerUserId = require('crypto').randomUUID();
      manager = await prisma.user.create({
        data: {
          id: managerUserId,
          firstName: managerFirstName,
          lastName: managerLastName,
          email: managerEmail,
          countryCode: countryCode,
          phoneNumber: managerPhone,
          password: hashedPassword,
          userType: "Manager",
        }
      });
    } else {
      console.log("Manager exists, updating user type if necessary...");
      if (manager.userType !== "Manager") {
        manager = await prisma.user.update({
          where: { id: manager.id },
          data: { userType: "Manager" }
        });
      }
    }

    console.log("Creating new club...");
    const clubId = require('crypto').randomUUID();
    const club = await prisma.club.create({
      data: {
        id: clubId,
        clubName,
        managerFirstName,
        managerLastName,
        managerEmail,
        managerPhone,
        managerShare: parseFloat(managerShare), // Ensure number type
        adminShare: parseFloat(adminShare), // Ensure number type
        user: manager.id,
      }
    });

    console.log("Club created successfully!", club);

    // Remove '+' from countryCode if it exists
    const cleanedCountryCode = countryCode.replace('+', '');

    // Send WhatsApp Message
    const receiverNumber = `${cleanedCountryCode}${managerPhone}`;

    const message = `
### **1️⃣ 🎉 Welcome to FantasyLeague7!**

📢 Congratulations! You have been added as the **Manager** of **${clubName}**.

🔑 **Login Details:**
👤 Username: *${managerPhone}*
🔒 Password: *${managerPassword}*

🔗 **Access Your Dashboard:** https://fantacyleauge.com/dashboard

🏏 Lead your team to victory and dominate the league!
    `.trim();

    // Credentials come from the environment — never hard-code secrets.
    const apiUrl = process.env.WHATSAPP_API_URL || 'https://websender.eappcloud.in/api/create-message';
    const whatsappData = {
      appkey: process.env.WHATSAPP_APPKEY,
      authkey: process.env.WHATSAPP_AUTHKEY,
      to: receiverNumber,
      message: message,
    };

    try {
      if (!whatsappData.appkey || !whatsappData.authkey) {
        throw new Error('WhatsApp credentials not configured (set WHATSAPP_APPKEY and WHATSAPP_AUTHKEY)');
      }
      const whatsappResponse = await axios.post(apiUrl, whatsappData);
      console.log("WhatsApp Message Sent Successfully:", whatsappResponse.data);
    } catch (waError) {
      console.error("Failed to Send WhatsApp Message:", waError.response?.data || waError.message);
    }

    res.status(201).json({ message: "Club added successfully!", club: { ...club, _id: club.id } });
  } catch (error) {
    console.error("Error adding club:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// @desc    Get all clubs with manager details
// @route   GET /api/clubs
// @access  Private/Admin
const getClubs = asyncHandler(async (req, res) => {
  const clubs = await prisma.club.findMany({
    include: {
      User_Club_userToUser: {
        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true }
      }
    }
  });

  const formattedClubs = clubs.map(club => ({
    ...club,
    _id: club.id,
    user: club.User_Club_userToUser ? {
      ...club.User_Club_userToUser,
      _id: club.User_Club_userToUser.id
    } : null
  }));

  res.json(formattedClubs);
});

// @desc    Get a single club by ID
// @route   GET /api/clubs/:id
// @access  Private/Admin
const getClubById = asyncHandler(async (req, res) => {
  const club = await prisma.club.findUnique({
    where: { id: req.params.id },
    include: {
      User_Club_userToUser: {
        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true }
      }
    }
  });

  if (!club) {
    res.status(404);
    throw new Error("Club not found");
  }

  res.json({
    ...club,
    _id: club.id,
    user: club.User_Club_userToUser ? {
      ...club.User_Club_userToUser,
      _id: club.User_Club_userToUser.id
    } : null
  });
});

// @desc    Update club details
// @route   PUT /api/clubs/:id
// @access  Private/Admin
const updateClub = asyncHandler(async (req, res) => {
  const club = await prisma.club.findUnique({ where: { id: req.params.id } });
  if (!club) {
    res.status(404);
    throw new Error("Club not found");
  }

  const { clubName, managerFirstName, managerLastName, managerEmail, managerPhone, managerShare, adminShare } = req.body;

  let manager = null;
  if (managerEmail) {
    manager = await prisma.user.findUnique({ where: { email: managerEmail } });
  }

  if (!manager && managerEmail) {
    console.log("Manager not found, creating a new user...");
    const hashedPassword = await bcrypt.hash("defaultpassword", 10);
    const managerUserId = require('crypto').randomUUID();
    manager = await prisma.user.create({
      data: {
        id: managerUserId,
        firstName: managerFirstName || '',
        lastName: managerLastName || '',
        email: managerEmail,
        phoneNumber: managerPhone || '',
        password: hashedPassword,
        userType: "Manager",
      }
    });
  }

  const updatedClub = await prisma.club.update({
    where: { id: req.params.id },
    data: {
      clubName: clubName || club.clubName,
      managerFirstName: manager ? manager.firstName : club.managerFirstName,
      managerLastName: manager ? manager.lastName : club.managerLastName,
      managerEmail: manager ? manager.email : club.managerEmail,
      managerPhone: manager ? manager.phoneNumber : club.managerPhone,
      managerShare: managerShare ? parseFloat(managerShare) : club.managerShare,
      adminShare: adminShare ? parseFloat(adminShare) : club.adminShare,
      user: manager ? manager.id : club.user,
    }
  });

  res.json({ message: "Club updated successfully!", updatedClub: { ...updatedClub, _id: updatedClub.id } });
});

// @desc    Delete a club
// @route   DELETE /api/clubs/:id
// @access  Private/Admin
const deleteClub = asyncHandler(async (req, res) => {
  const club = await prisma.club.findUnique({ where: { id: req.params.id } });
  if (!club) {
    res.status(404);
    throw new Error("Club not found");
  }
  await prisma.club.delete({ where: { id: req.params.id } });
  res.json({ message: "Club deleted successfully" });
});

module.exports = { addClub, getClubs, getClubById, updateClub, deleteClub };
