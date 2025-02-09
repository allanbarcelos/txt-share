// API.JS
// Develop
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const NodeCache = require('node-cache');
// const cors = require('cors');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);

// const io = socketIO(server, {
//   path: '/api/socket.io',
//   // cors: {
//   //   origin: "*",
//   // }
// });

const io = socketIO(server);

// Configuração do cache
const cache = new NodeCache();
const txtDBPrefixKey = 'TXT_';

// Configuração do CORS
// app.use(cors({ origin: '*', credentials: true }));

// Rota inicial
app.get('/', (req, res) => {
  res.send('API TXT Share');
});

// Conexão do Socket.IO
io.on('connection', (socket) => {
  const clientId = socket.id;
  console.log('A client connected. ID:', clientId);

  // Início do compartilhamento de texto
  socket.on('startTXT', ({ id }) => {
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
      if (existingObj)
        obj = existingObj;
      else
        socket.emit('_txtNotExist', true);
    } else {
      cache.set(`${txtDBPrefixKey}${obj.id}`, obj);
    }

    socket.join(obj.id);
    socket.emit('_startTXT', obj);
  });

  // Atualização do texto compartilhado
  socket.on('updateTXT', ({ id, txt }) => {
    const txtDB = getTxtDB();
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

  // Exclusão do texto compartilhado
  socket.on('deleteTXT', ({ id }) => {
    const txtDB = getTxtDB();
    const objIndex = txtDB.findIndex(x => x.id === id);

    if (objIndex !== -1) {
      cache.del(`${txtDBPrefixKey}${id}`);
      socket.to(id).emit('_deleteTXT', true);
    } else {
      socket.emit('_deleteTXT', false);
    }
  });

  // Renovação do texto compartilhado
  socket.on('renewTXT', ({ id }) => {
    const txtDB = getTxtDB();
    const obj = txtDB.find(x => x.id === id);

    if (obj) {
      obj.validUntil = new Date(new Date().setHours(new Date().getHours() + 1));
      socket.to(obj.id).emit('_updateTXT', obj);
    } else {
      socket.emit('_txtNotExist', true);
    }
  });

  // Desconexão do cliente
  socket.on('disconnect', () => {
    console.log('A client disconnected.');
  });
});

// Cron job para excluir registros vencidos do cache
cron.schedule('* * * * *', async () => {
  const txtDB = getTxtDB();
  await Promise.all(
    txtDB
      .filter(({ createdAt }) => new Date(createdAt) < new Date(new Date().setHours(new Date().getHours() - 1)))
      .map(({ id }) => cache.del(`${txtDBPrefixKey}${id}`))
  );
});

// Inicialização do servidor Node.js
server.listen(3000, () => {
  console.log(`Server is running on port ${3000}`);
});

// Função para gerar uma string aleatória
function generateRandomString(length) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }
  return randomString;
}

// Função auxiliar para obter os dados do cache
function getTxtDB() {
  const keys = cache.keys();
  const txtKeys = keys.filter((key) => key.startsWith(txtDBPrefixKey));
  return txtKeys.map((key) => cache.get(key));
}
