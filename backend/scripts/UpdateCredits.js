const mongoose = require('mongoose');
const User = require('../models/User');  // Ensure correct path to your User model

mongoose.connect('mongodb://127.0.0.1:27017/fantasyLeagueDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Database connected'))
  .catch((err) => console.log('Database connection error: ', err));

async function updateCredits() {
  try {
    // Find all users who don't have the credits field
    const users = await User.find();

    console.log(`Found ${users.length} users`);

    // Loop through users to add credits if not already present
    for (const user of users) {
      if (!user.hasOwnProperty('credits')) {  // Check if 'credits' field is missing
        user.credits = 0;  // Set default value for missing 'credits'
        await user.save();  // Save the user with updated credits
        console.log(`Updated credits for user ${user._id}`);
      }
    }

    console.log('Credits updated for all users');
  } catch (err) {
    console.error('Error updating credits:', err);
  } finally {
    mongoose.connection.close();  // Close the database connection
  }
}

updateCredits();
