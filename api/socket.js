// socket.js
const { getTxtById, setTxt, deleteTxt, generateRandomString } = require('./cache');

// Timeout para operações
const SOCKET_TIMEOUT = 10000;

function setupSocket(io, cache) {
    io.on('connection', (socket) => {
        console.log('Client connected. ID:', socket.id, 'Total clients:', io.engine.clientsCount);

        // Configurar timeout para operações
        socket.setTimeout(SOCKET_TIMEOUT);

        socket.on('startTXT', (data, callback) => startTXT(socket, data, callback));
        socket.on('updateTXT', (data, callback) => updateTXT(socket, data, callback));
        socket.on('deleteTXT', (data, callback) => deleteTXT(socket, data, callback));
        socket.on('renewTXT', (data, callback) => renewTXT(socket, data, callback));

        // Heartbeat para detectar conexões mortas
        let heartbeatInterval = setInterval(() => {
            if (socket.connected) {
                socket.emit('ping');
            }
        }, 30000);

        socket.on('pong', () => {
            // Cliente respondeu ao ping
        });

        socket.on('disconnect', (reason) => {
            console.log('Client disconnected:', socket.id, 'Reason:', reason);
            clearInterval(heartbeatInterval);
        });

        socket.on('error', (error) => {
            console.error('Socket error for client', socket.id, ':', error);
        });
    });

    // Monitorar eventos de nível de servidor
    io.engine.on("connection_error", (err) => {
        console.error('Connection error:', err);
    });
}

async function startTXT(socket, data, callback) {
    try {
        const { id } = data || {};
        let obj;

        if (id) {
            obj = getTxtById(id);
            if (!obj) {
                socket.emit('_txtNotExist', { id });
                callback?.({ success: false, error: 'TXT not found' });
                return;
            }
        } else {
            obj = {
                id: generateRandomString(12),
                createdAt: new Date().toISOString(),
                validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora
                locked: false,
                txt: 'Type something here ...'
            };

            if (!setTxt(obj.id, obj)) {
                throw new Error('Failed to save TXT');
            }
        }

        await socket.join(obj.id);
        socket.emit('_startTXT', obj);
        callback?.({ success: true, data: obj });

    } catch (error) {
        console.error('Error in startTXT:', error);
        socket.emit('_error', { message: 'Failed to start TXT' });
        callback?.({ success: false, error: error.message });
    }
}

async function updateTXT(socket, data, callback) {
    try {
        const { id, txt } = data || {};

        if (!id || txt === undefined) {
            callback?.({ success: false, error: 'Missing required fields' });
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

        if (!id) {
            callback?.({ success: false, error: 'Missing ID' });
            return;
        }

        const obj = getTxtById(id);
        if (!obj) {
            socket.emit('_deleteTXT', { success: false });
            callback?.({ success: false, error: 'TXT not found' });
            return;
        }

        if (deleteTxt(id)) {
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

        if (!id) {
            callback?.({ success: false, error: 'Missing ID' });
            return;
        }

        const obj = getTxtById(id);
        if (!obj) {
            socket.emit('_txtNotExist', { id });
            callback?.({ success: false, error: 'TXT not found' });
            return;
        }

        obj.validUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        obj.lastRenewed = new Date().toISOString();

        if (!setTxt(id, obj)) {
            throw new Error('Failed to renew TXT');
        }

        socket.to(obj.id).emit('_updateTXT', obj);
        callback?.({ success: true, data: obj });

    } catch (error) {
        console.error('Error in renewTXT:', error);
        socket.emit('_error', { message: 'Failed to renew TXT' });
        callback?.({ success: false, error: error.message });
    }
}

module.exports = { setupSocket };