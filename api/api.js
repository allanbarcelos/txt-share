const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const NodeCache = require('node-cache');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
  }
});

const port = 3000;

app.use(cors({ origin: '*', credentials: true }));

const cache = new NodeCache();
const txtDBPrefixKey = 'TXT_';

app.get('/', (req, res) => {
  res.send('API TXT Share');
});

// SOCKET
io.on('connection', (socket) => {

  // DATA ABOUT CONNECTION
  const clientId = socket.id;
  console.log('A client connected. ID:', clientId);

  // 
  socket.on('startTXT', ({ id }) => {
    let obj = {
      id: generateRandomString(12),
      createdAt: new Date(),
      validUntil: new Date(new Date().setHours(new Date().getHours() + 1)),
      locked: false, txt: 'Type something here ...'
    };

    const keys = cache.keys();
    const txtKeys = keys.filter((key) => key.startsWith(txtDBPrefixKey));
    const txtDB = txtKeys.map((key) => cache.get(key));

    if (id) {
      if (txtDB.some(x => x.id === id))
        obj = txtDB.find(x => x.id === id)
      else
        socket.emit('_txtNotExist', true);
    } else cache.set(`${txtDBPrefixKey}${obj.id}`, obj);

    socket.join(obj.id);
    socket.emit('_startTXT', obj);
  });

  // 
  socket.on('updateTXT', ({ id, txt }) => {

    const keys = cache.keys();
    const txtKeys = keys.filter((key) => key.startsWith(txtDBPrefixKey));
    const txtDB = txtKeys.map((key) => cache.get(key));
    const obj = txtDB.find(x => x.id === id);

    const size = Buffer.byteLength(txt, 'utf8');

    if (size > (100 * 1024))
      socket.emit('_sizeExceeded', true);
    else {
      obj.txt = txt;
      cache.set(`${txtDBPrefixKey}${id}`, obj);
      socket.to(obj.id).emit('_updateTXT', obj);
    }

  });

  // 
  socket.on('deleteTXT', ({ id }) => {
    const keys = cache.keys();
    const txtKeys = keys.filter((key) => key.startsWith(txtDBPrefixKey));
    const txtDB = txtKeys.map((key) => cache.get(key));
    const obj = txtDB.some(x => x.id === id);

    if (obj) {
      cache.del(`${txtDBPrefixKey}${id}`);
      socket.to(obj.id).emit('_deleteTXT', true);
    } else {
      socket.to(obj.id).emit('_deleteTXT', false);
    }
  });

  // 
  socket.on('renewTXT', ({ id }) => {
    const keys = cache.keys();
    const txtKeys = keys.filter((key) => key.startsWith(txtDBPrefixKey));
    const txtDB = txtKeys.map((key) => cache.get(key));
    const obj = txtDB.find(x => x.id === id);

    if (obj) {
      obj.validUntil = new Date(new Date().setHours(new Date().getHours() + 1));
      socket.to(obj.id).emit('_updateTXT', obj);
    } else {
      socket.emit('_txtNotExist', true);
    }
  });

  // -------------------------------------------------------------------------------------------------
  socket.on('disconnect', () => {
    console.log('A client disconnected.');
  });
});

// Cron para excluir os registros vencidos do cache --------------------------------------------------
cron.schedule('* * * * *', async () => {
  const keys = cache.keys();
  const txtKeys = keys.filter((key) => key.startsWith(txtDBPrefixKey));
  await Promise.all(
    txtKeys
      .map((key) => cache.get(key))
      .filter(({ createdAt }) => new Date(createdAt) < new Date(new Date().setHours(new Date().getHours() - 1)))
      .map(({ id }) => cache.del(`${txtDBPrefixKey}${id}`))
  );
});

// NODEJS START -------------------------------------------------------------------------------------
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// FUNCTIONS ----------------------------------------------------------------------------------------
function generateRandomString(length) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }
  return randomString;
}
