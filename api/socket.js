// socket.js
const { getTxtById, setTxt, deleteTxt, generateRandomString } = require('./cache');

const ID_PATTERN = /^s_[a-z0-9]{7}$/;

// Per-socket rate limiter: max events per window per event type
const socketRateLimits = new Map();

function isRateLimited(socketId, event, maxPerWindow = 60, windowMs = 60000) {
    const key = `${socketId}:${event}`;
    const now = Date.now();
    const entry = socketRateLimits.get(key);

    if (!entry || now > entry.resetAt) {
        socketRateLimits.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }

    if (entry.count >= maxPerWindow) return true;

    entry.count++;
    return false;
}

function validateId(id) {
    return typeof id === 'string' && ID_PATTERN.test(id);
}

function validateTxt(txt) {
    if (typeof txt !== 'string') return false;
    if (/\x00/.test(txt)) return false;  // no null bytes
    return true;
}

function setupSocket(io) {
    console.log('Socket.IO initialized');

    // Cleanup stale rate limit entries every 60 seconds
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of socketRateLimits.entries()) {
            if (now > entry.resetAt) socketRateLimits.delete(key);
        }
        if (socketRateLimits.size > 10000) {
            socketRateLimits.clear();
            console.warn('socketRateLimits flushed: exceeded 10000 entries');
        }
    }, 60 * 1000);
    // unref so the interval doesn't prevent process exit (e.g. in tests)
    cleanupInterval.unref();

    io.on('connection', (socket) => {
        console.log(`Client connected. ID: ${socket.id} Total: ${io.engine.clientsCount}`);

        socket.on('startTXT', (data, callback) => {
            if (isRateLimited(socket.id, 'startTXT', 10, 60000)) {
                callback?.({ success: false, error: 'Rate limit exceeded' });
                return;
            }
            startTXT(socket, data, callback);
        });

        socket.on('updateTXT', (data, callback) => {
            if (isRateLimited(socket.id, 'updateTXT', 30, 60000)) {
                callback?.({ success: false, error: 'Rate limit exceeded' });
                return;
            }
            updateTXT(socket, data, callback);
        });

        socket.on('deleteTXT', (data, callback) => {
            if (isRateLimited(socket.id, 'deleteTXT', 5, 60000)) {
                callback?.({ success: false, error: 'Rate limit exceeded' });
                return;
            }
            deleteTXT(socket, data, callback);
        });

        socket.on('renewTXT', (data, callback) => {
            if (isRateLimited(socket.id, 'renewTXT', 10, 60000)) {
                callback?.({ success: false, error: 'Rate limit exceeded' });
                return;
            }
            renewTXT(socket, data, callback);
        });

        socket.on('disconnect', (reason) => {
            console.log(`Client disconnected: ${socket.id} Reason: ${reason}`);
            // Cleanup rate limit entries for this socket
            for (const key of socketRateLimits.keys()) {
                if (key.startsWith(socket.id)) socketRateLimits.delete(key);
            }
        });

        socket.on('error', (error) => {
            console.error(`Socket error for client ${socket.id}:`, error);
        });
    });

    io.engine.on('connection_error', (err) => {
        console.error('Connection error:', err);
    });
}

async function startTXT(socket, data, callback) {
    try {
        const { id } = data || {};
        let obj;

        if (id !== undefined) {
            if (!validateId(id)) {
                callback?.({ success: false, error: 'Invalid ID format' });
                return;
            }
            obj = getTxtById(id);
            if (!obj) {
                socket.emit('_txtNotExist', { id });
                callback?.({ success: false, error: 'TXT not found' });
                return;
            }
        } else {
            obj = {
                id: `s_${generateRandomString(7)}`,
                createdAt: new Date().toISOString(),
                validUntil: new Date(Date.now() + 3600000).toISOString(),
                locked: false,
                txt: 'Type something here ...',
            };

            if (!setTxt(obj.id, obj)) {
                throw new Error('Failed to save TXT');
            }
        }

        await socket.join(obj.id);
        // Re-verify after await: another client may have deleted it
        const current = getTxtById(obj.id);
        if (!current && id !== undefined) {
            socket.emit('_txtNotExist', { id: obj.id });
            callback?.({ success: false, error: 'TXT was deleted' });
            return;
        }
        const toSend = current || obj;
        socket.emit('_startTXT', toSend);
        callback?.({ success: true, data: toSend });

    } catch (error) {
        console.error('Error in startTXT:', error);
        socket.emit('_error', { message: 'Failed to start TXT' });
        callback?.({ success: false, error: error.message });
    }
}

async function updateTXT(socket, data, callback) {
    try {
        const { id, txt } = data || {};

        if (!validateId(id) || !validateTxt(txt)) {
            callback?.({ success: false, error: 'Missing or invalid required fields' });
            return;
        }

        const obj = getTxtById(id);
        if (!obj) {
            socket.emit('_txtNotExist', { id });
            callback?.({ success: false, error: 'TXT not found' });
            return;
        }

        const size = Buffer.byteLength(txt, 'utf8');
        if (size > 100 * 1024) {
            socket.emit('_sizeExceeded', { maxSize: 100 * 1024, currentSize: size });
            callback?.({ success: false, error: 'Size exceeded' });
            return;
        }

        obj.txt = txt;
        obj.lastUpdated = new Date().toISOString();

        if (!setTxt(id, obj)) {
            throw new Error('Failed to update TXT');
        }

        socket.to(obj.id).emit('_updateTXT', obj);
        callback?.({ success: true, data: obj });

    } catch (error) {
        console.error('Error in updateTXT:', error);
        socket.emit('_error', { message: 'Failed to update TXT' });
        callback?.({ success: false, error: error.message });
    }
}

async function deleteTXT(socket, data, callback) {
    try {
        const { id } = data || {};

        if (!validateId(id)) {
            callback?.({ success: false, error: 'Missing or invalid ID' });
            return;
        }

        const obj = getTxtById(id);
        if (!obj) {
            socket.emit('_deleteTXT', { success: false });
            callback?.({ success: false, error: 'TXT not found' });
            return;
        }

        if (deleteTxt(id)) {
            socket.emit('_deleteTXT', { success: true });
            socket.to(id).emit('_deleteTXT', { success: true });
            callback?.({ success: true });
        } else {
            throw new Error('Failed to delete TXT');
        }

    } catch (error) {
        console.error('Error in deleteTXT:', error);
        socket.emit('_error', { message: 'Failed to delete TXT' });
        callback?.({ success: false, error: error.message });
    }
}

async function renewTXT(socket, data, callback) {
    try {
        const { id } = data || {};

        if (!validateId(id)) {
            callback?.({ success: false, error: 'Missing or invalid ID' });
            return;
        }

        const obj = getTxtById(id);
        if (!obj) {
            socket.emit('_txtNotExist', { id });
            callback?.({ success: false, error: 'TXT not found' });
            return;
        }

        obj.validUntil = new Date(Date.now() + 3600000).toISOString();
        obj.lastRenewed = new Date().toISOString();

        if (!setTxt(id, obj)) {
            throw new Error('Failed to renew TXT');
        }

        socket.emit('_updateTXT', obj);
        socket.to(obj.id).emit('_updateTXT', obj);
        callback?.({ success: true, data: obj });

    } catch (error) {
        console.error('Error in renewTXT:', error);
        socket.emit('_error', { message: 'Failed to renew TXT' });
        callback?.({ success: false, error: error.message });
    }
}

module.exports = { setupSocket, validateId, validateTxt, isRateLimited, socketRateLimits };
