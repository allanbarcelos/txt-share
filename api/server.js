// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cron = require('node-cron');

const { setupSocket } = require('./socket');
const { cleanupExpiredTXT } = require('./cron');
const { cache } = require('./cache');

const app = express();
const server = http.createServer(app);

// Configuração mais robusta do Socket.IO
const io = socketIO(server, {
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e6 // 1MB
});

// Middlewares
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    clients: io.engine.clientsCount
  });
});

app.get('/', (req, res) => {
  res.send('API TXT Share');
});

// Configuração do Socket.IO
setupSocket(io, cache);

// Cron job para limpeza periódica com tratamento de erro
cron.schedule('*/5 * * * *', () => { // A cada 5 minutos
  try {
    const cleanedCount = cleanupExpiredTXT();
    console.log(`Cron cleanup completed. Removed ${cleanedCount} items.`);
  } catch (error) {
    console.error('Cron job failed:', error);
  }
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Não sair do processo, apenas logar
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
function gracefulShutdown() {
  console.log('Received shutdown signal, closing server...');

  server.close((err) => {
    if (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }

    console.log('Server closed successfully');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log('Forcing shutdown...');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});