/**
 * Chatbot Backend API — Express entry point.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const { log } = require('./utils/logger');

const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const roleRoutes = require('./routes/roleRoutes');
const userRoutes = require('./routes/userRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const trainChatbotRoutes = require('./routes/trainChatbotRoutes');
const trainChatbotUrlRoutes = require('./routes/trainChatbotUrlRoutes');
const avatarRoutes = require('./routes/avatarRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const { startSchedulerRunner } = require('./services/schedulerRunner');


const app = express();
const PORT = process.env.PORT || 5000;
const corsOrigins = (
  process.env.CORS_ORIGIN ||
  'http://localhost:3000,http://localhost:5173,http://localhost:8090,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:8090,http://172.16.1.67:3000,http://172.16.1.67:5173,http://172.16.1.67:8090,http://0.0.0.0:3000,http://0.0.0.0:5173,http://0.0.0.0:8090'
)
  .split(',')
  .map((o) => o.trim());

function isPrivateLanHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function isAllowedDevOrigin(origin) {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol) && isPrivateLanHost(url.hostname);
  } catch {
    return false;
  }
}

app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const corsOptionsDelegate = (req, callback) => {
  const origin = req.header('Origin');
  let corsOptions = {
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'content-type', 'Authorization'],
    preflightContinue: false, // Handle CORS preflight in this middleware and end response
    optionsSuccessStatus: 204,
  };

  // 1. If no Origin (server-to-server, curl, Postman)
  if (!origin) {
    corsOptions.origin = true;
    corsOptions.credentials = true;
  }
  // 2. If 'null' Origin (local file:// testing in widget-test/index.html)
  // Browsers reject Access-Control-Allow-Origin: null (or *) if Access-Control-Allow-Credentials is true.
  // Hence, credentials MUST be set to false and origin set to '*' to pass browser policies.
  else if (origin === 'null') {
    corsOptions.origin = '*';
    corsOptions.credentials = false;
  }
  // 3. If dynamic localhost/LAN development origins (admin panel or widgets)
  else if (isAllowedDevOrigin(origin)) {
    corsOptions.origin = origin;
    corsOptions.credentials = true;
  }
  // 4. If explicit production domains configured in .env
  else {
    const allowed = corsOrigins.includes(origin);
    corsOptions.origin = allowed ? origin : false;
    corsOptions.credentials = allowed;
  }

  callback(null, corsOptions);
};

app.use(cors(corsOptionsDelegate));


app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/train-chatbot', trainChatbotRoutes);
app.use('/api/train-chatbot-url', trainChatbotUrlRoutes);
app.use('/api/avatar', avatarRoutes);
app.use('/api/weather', weatherRoutes);


app.use(errorHandler);

app.listen(PORT, () => {
  log(`Server running on http://172.16.1.67:${PORT}`);
  log(`LAN access available at http://172.16.1.67:${PORT}`);
  // start scheduler after server boot
  startSchedulerRunner();
});

