// cron.js
const { getTxtDB, deleteTxt } = require('./cache');

function cleanupExpiredTXT() {
    try {
        const txtDB = getTxtDB();
        const now = new Date();

        const expiredItems = txtDB.filter(({ validUntil }) => {
            try {
                return validUntil && new Date(validUntil) < now;
            } catch { return false; }
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