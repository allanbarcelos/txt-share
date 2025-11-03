// cron.js
const { getTxtDB, txtDBPrefixKey } = require('./cache');

function cleanupExpiredTXT(cache) {
    const txtDB = getTxtDB();
    const now = new Date();
    txtDB
        .filter(({ createdAt }) => new Date(createdAt) < new Date(now.setHours(now.getHours() - 1)))
        .forEach(({ id }) => cache.del(`${txtDBPrefixKey}${id}`));
}

module.exports = { cleanupExpiredTXT };
