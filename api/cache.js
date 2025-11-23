// cache.js
const NodeCache = require('node-cache');

// Configuração mais robusta do cache
const cache = new NodeCache({
    stdTTL: 3600, // 1 hora padrão
    checkperiod: 600, // Verificar expirados a cada 10 minutos
    useClones: false, // Melhor performance
    deleteOnExpire: true // Limpar automaticamente
});

const txtDBPrefixKey = 'TXT_';

function getTxtDB() {
    try {
        const keys = cache.keys();
        return keys
            .filter((key) => key.startsWith(txtDBPrefixKey))
            .map((key) => cache.get(key))
            .filter(Boolean); // Remove valores undefined/null
    } catch (error) {
        console.error('Error getting TXT DB:', error);
        return [];
    }
}

function getTxtById(id) {
    try {
        return cache.get(`${txtDBPrefixKey}${id}`);
    } catch (error) {
        console.error(`Error getting TXT by ID ${id}:`, error);
        return null;
    }
}

function setTxt(id, data) {
    try {
        return cache.set(`${txtDBPrefixKey}${id}`, data);
    } catch (error) {
        console.error(`Error setting TXT ${id}:`, error);
        return false;
    }
}

function deleteTxt(id) {
    try {
        return cache.del(`${txtDBPrefixKey}${id}`);
    } catch (error) {
        console.error(`Error deleting TXT ${id}:`, error);
        return false;
    }
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
    getTxtById,
    setTxt,
    deleteTxt,
    generateRandomString,
};