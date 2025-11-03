// socket.js
const { getTxtDB, generateRandomString, txtDBPrefixKey } = require('./cache');

function setupSocket(io, cache) {
    io.on('connection', (socket) => {
        console.log('A client connected. ID:', socket.id);

        socket.on('startTXT', ({ id }) => startTXT(socket, id, cache));
        socket.on('updateTXT', ({ id, txt }) => updateTXT(socket, id, txt, cache));
        socket.on('deleteTXT', ({ id }) => deleteTXT(socket, id, cache));
        socket.on('renewTXT', ({ id }) => renewTXT(socket, id, cache));

        socket.on('disconnect', () => {
            console.log('A client disconnected.');
        });
    });
}

function startTXT(socket, id, cache) {
    let obj = {
        id: generateRandomString(12),
        createdAt: new Date(),
        validUntil: new Date(new Date().setHours(new Date().getHours() + 1)),
        locked: false,
        txt: 'Type something here ...'
    };

    const txtDB = getTxtDB();
    if (id) {
        const existingObj = txtDB.find(x => x.id === id);
        if (existingObj) obj = existingObj;
        else socket.emit('_txtNotExist', true);
    } else {
        cache.set(`${txtDBPrefixKey}${obj.id}`, obj);
    }

    socket.join(obj.id);
    socket.emit('_startTXT', obj);
}

function updateTXT(socket, id, txt, cache) {
    const txtDB = getTxtDB();
    const obj = txtDB.find(x => x.id === id);

    if (!obj) return socket.emit('_txtNotExist', true);

    const size = Buffer.byteLength(txt, 'utf8');
    if (size > 100 * 1024) socket.emit('_sizeExceeded', true);
    else {
        obj.txt = txt;
        cache.set(`${txtDBPrefixKey}${id}`, obj);
        socket.to(obj.id).emit('_updateTXT', obj);
    }
}

function deleteTXT(socket, id, cache) {
    const txtDB = getTxtDB();
    const objIndex = txtDB.findIndex(x => x.id === id);

    if (objIndex !== -1) {
        cache.del(`${txtDBPrefixKey}${id}`);
        socket.to(id).emit('_deleteTXT', true);
    } else {
        socket.emit('_deleteTXT', false);
    }
}

function renewTXT(socket, id, cache) {
    const txtDB = getTxtDB();
    const obj = txtDB.find(x => x.id === id);

    if (obj) {
        obj.validUntil = new Date(new Date().setHours(new Date().getHours() + 1));
        socket.to(obj.id).emit('_updateTXT', obj);
    } else {
        socket.emit('_txtNotExist', true);
    }
}

module.exports = { setupSocket };
