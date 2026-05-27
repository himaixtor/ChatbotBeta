/**
 * Rate limiters for chat, auth, and registration endpoints.
 */
const rateLimit = require('express-rate-limit');

/** 30 requests per minute per session (keyed by session_id in body) */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many messages. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.session_id || req.ip,
});

/** 10 login attempts per minute per IP */
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** 5 registrations per minute per IP */
const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { chatLimiter, loginLimiter, registerLimiter };
