const asyncHandler = require("express-async-handler");
const Club = require("../models/Club");
const User = require("../models/User");
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
      let manager = await User.findOne({ phoneNumber: managerPhone });

      if (!manager) {
          console.log("Manager not found, creating a new user...");
          manager = await User.create({
              firstName: managerFirstName,
              lastName: managerLastName,
              email: managerEmail,
              countryCode: countryCode,
              phoneNumber: managerPhone,
              password: managerPassword,
              userType: "Manager",
          });
      } else {
          console.log("Manager exists, updating user type if necessary...");
          if (manager.userType !== "Manager") {
              manager.userType = "Manager";
              await manager.save();
          }
      }

      console.log("Creating new club...");
      const club = await Club.create({
          clubName,
          managerFirstName,
          managerLastName,
          managerEmail,
          managerPhone,
          managerShare: parseFloat(managerShare), // Ensure number type
          adminShare: parseFloat(adminShare), // Ensure number type
          user: manager._id,
      });

      console.log("Club created successfully!", club);

      // Remove '+' from countryCode if it exists
      const cleanedCountryCode = countryCode.replace('+', '');

      // Send WhatsApp Message
      const receiverNumber = `${cleanedCountryCode}${managerPhone}`; // Concatenate country code and phone number

      const message = `
### **1️⃣ 🎉 Welcome to FantasyLeague7!**

📢 Congratulations! You have been added as the **Manager** of **${clubName}**.

🔑 **Login Details:**
👤 Username: *${managerPhone}*
🔒 Password: *${managerPassword}*

🔗 **Access Your Dashboard:** https://fantasyleague7.com/dashboard

🏏 Lead your team to victory and dominate the league!
      `;

      const whatsappData = {
          appkey: 'fef8a455-a06c-46f4-b2fd-1c71f173f95e',
          authkey: 'zgWIgQmncta53mAurWa6WPRk7KI3BjMSqiX10HaBPPW67U9p3s',
          to: receiverNumber,
          message: message.trim(), // Removing extra spaces
      };

      try {
          const whatsappResponse = await axios.post('https://websender.eappcloud.in/api/create-message', whatsappData);
          console.log("WhatsApp Message Sent Successfully:", whatsappResponse.data);
      } catch (waError) {
          console.error("Failed to Send WhatsApp Message:", waError.response?.data || waError.message);
      }

      res.status(201).json({ message: "Club added successfully!", club });
  } catch (error) {
      console.error("Error adding club:", error);
      res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

  

// @desc    Get all clubs with manager details
// @route   GET /api/clubs
// @access  Private/Admin
const getClubs = asyncHandler(async (req, res) => {
  const clubs = await Club.find({}).populate("user", "firstName lastName email phoneNumber"); // Populate User Details
  res.json(clubs);
});



// @desc    Get a single club by ID
// @route   GET /api/clubs/:id
// @access  Private/Admin
const getClubById = asyncHandler(async (req, res) => {
  const club = await Club.findById(req.params.id);
  if (!club) {
    res.status(404);
    throw new Error("Club not found");
  }
  res.json(club);
});


// @desc    Update club details
// @route   PUT /api/clubs/:id
// @access  Private/Admin
// const updateClub = asyncHandler(async (req, res) => {
//   const club = await Club.findById(req.params.id);
//   if (!club) {
//     res.status(404);
//     throw new Error("Club not found");
//   }

//   const { clubName, managerEmail, managerPhone, managerShare, adminShare } = req.body;

//   club.clubName = clubName || club.clubName;
//   club.managerEmail = managerEmail || club.managerEmail;
//   club.managerPhone = managerPhone || club.managerPhone;
//   club.managerShare = managerShare || club.managerShare;
//   club.adminShare = adminShare || club.adminShare;

//   const updatedClub = await club.save();
//   res.json(updatedClub);
// });

const updateClub = asyncHandler(async (req, res) => {
  const club = await Club.findById(req.params.id);
  if (!club) {
    res.status(404);
    throw new Error("Club not found");
  }

  const { clubName, managerFirstName, managerLastName, managerEmail, managerPhone, managerShare, adminShare } = req.body;

  let manager = await User.findOne({ email: managerEmail });

  if (!manager) {
    console.log("Manager not found, creating a new user...");
    manager = await User.create({
      firstName: managerFirstName,
      lastName: managerLastName,
      email: managerEmail,
      phoneNumber: managerPhone,
      password: "defaultpassword", // You may want to hash this later
      userType: "Manager",
    });
  }

  club.clubName = clubName || club.clubName;
  club.managerFirstName = manager.firstName;
  club.managerLastName = manager.lastName;
  club.managerEmail = manager.email;
  club.managerPhone = manager.phoneNumber;
  club.managerShare = parseFloat(managerShare) || club.managerShare;
  club.adminShare = parseFloat(adminShare) || club.adminShare;
  club.user = manager._id; // Link the manager to the club

  const updatedClub = await club.save();
  res.json({ message: "Club updated successfully!", updatedClub });
});


// @desc    Delete a club
// @route   DELETE /api/clubs/:id
// @access  Private/Admin
const deleteClub = asyncHandler(async (req, res) => {
  const club = await Club.findById(req.params.id);
  if (!club) {
    res.status(404);
    throw new Error("Club not found");
  }
  await club.deleteOne();
  res.json({ message: "Club deleted successfully" });
});

module.exports = { addClub, getClubs, getClubById, updateClub, deleteClub };
