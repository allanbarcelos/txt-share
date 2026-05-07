require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');

const { setupSocket } = require('./socket');
const { cleanupExpiredTXT } = require('./cron');
const { cache } = require('./cache');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) allowedOrigins.push('http://localhost');

const io = socketIO(server, {
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 200 * 1024,
});

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    clients: io.engine.clientsCount,
    cache: { entries: cache.keys().length },
  });
});

app.get('/', (req, res) => {
  res.send('API TXT Share');
});

setupSocket(io);

cron.schedule('*/5 * * * *', () => {
  try {
    const cleanedCount = cleanupExpiredTXT();
    console.log(`Cron cleanup completed. Removed ${cleanedCount} items.`);
  } catch (error) {
    console.error('Cron job failed:', error);
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

function gracefulShutdown() {
  console.log('Received shutdown signal, closing server...');
  io.close();
  server.close((err) => {
    if (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
    console.log('Server closed successfully');
    process.exit(0);
  });
  setTimeout(() => {
    console.log('Forcing shutdown...');
    process.exit(0);
  }, 10000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
