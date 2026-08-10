const prisma = require('../config/prisma');

const updateMatchStatuses = async () => {
  try {
    const now = new Date();
    
    const matchesToUpdate = await prisma.match.updateMany({
      where: {
        dateTime: { lte: now },
        status: { notIn: ['Ongoing', 'Announced'] }
      },
      data: {
        status: 'Ongoing'
      }
    });

    if (matchesToUpdate.count > 0) {
      console.log(`Updated ${matchesToUpdate.count} matches to Ongoing status`);
    }
  } catch (error) {
    console.error('Error updating match statuses:', error);
  }
};

module.exports = { updateMatchStatuses };