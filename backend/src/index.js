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

const app = express();
const PORT = process.env.PORT || 5000;

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

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
  // 3. If dynamic localhost/127.0.0.1 (development admin panel or widgets)
  else if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
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
app.use('/api/roles', roleRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  log(`Server running on http://localhost:${PORT}`);
});
