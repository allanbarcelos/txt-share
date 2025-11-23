// cron.js
const { getTxtDB, deleteTxt } = require('./cache');

function cleanupExpiredTXT() {
    try {
        const txtDB = getTxtDB();
        const now = new Date();
        const oneHourAgo = new Date(now.setHours(now.getHours() - 1));

        const expiredItems = txtDB.filter(({ createdAt }) => {
            try {
                return new Date(createdAt) < oneHourAgo;
            } catch (error) {
                console.error('Error parsing date in cleanup:', error);
                return false;
            }
        });

        console.log(`Cleaning up ${expiredItems.length} expired TXT records`);

        expiredItems.forEach(({ id }) => {
            deleteTxt(id);
        });

        return expiredItems.length;
    } catch (error) {
        console.error('Error in cleanupExpiredTXT:', error);
        return 0;
    }
}

module.exports = { cleanupExpiredTXT };