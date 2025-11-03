// cache.js
const NodeCache = require('node-cache');

const cache = new NodeCache();
const txtDBPrefixKey = 'TXT_';

function getTxtDB() {
    const keys = cache.keys();
    return keys
        .filter((key) => key.startsWith(txtDBPrefixKey))
        .map((key) => cache.get(key));
}

function generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let str = '';
    for (let i = 0; i < length; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return str;
}

module.exports = {
    cache,
    txtDBPrefixKey,
    getTxtDB,
    generateRandomString,
};
