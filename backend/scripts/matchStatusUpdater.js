const Match = require('../models/Match');
const moment = require('moment');

const updateMatchStatuses = async () => {
  try {
    const now = new Date();
    
    // Find matches where:
    // - dateTime is less than or equal to current time
    // - status is not already 'Ongoing' or 'Announced'
    const matchesToUpdate = await Match.find({
      dateTime: { $lte: now },
      status: { $nin: ['Ongoing', 'Announced'] }
    });

    if (matchesToUpdate.length > 0) {
      const updatePromises = matchesToUpdate.map(match => {
        match.status = 'Ongoing';
        return match.save();
      });

      await Promise.all(updatePromises);
      console.log(`Updated ${matchesToUpdate.length} matches to Ongoing status`);
    }
  } catch (error) {
    console.error('Error updating match statuses:', error);
  }
};

module.exports = { updateMatchStatuses };