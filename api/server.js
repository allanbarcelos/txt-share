// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const NodeCache = require('node-cache');
const cron = require('node-cron');

const { setupSocket } = require('./socket');
const { cleanupExpiredTXT } = require('./cron');
const { cache } = require('./cache');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middlewares
app.get('/', (req, res) => {
  res.send('API TXT Share');
});

// Configuração do Socket.IO
setupSocket(io, cache);

// Cron job para limpeza periódica
cron.schedule('* * * * *', () => cleanupExpiredTXT(cache));

// Inicialização do servidor
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
