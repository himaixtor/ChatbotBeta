/**
 * Chat session lifecycle: create and validate.
 */
const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prisma');

const SESSION_HOURS = 24;

async function createSession(req, res, next) {
  try {
    console.log('[session/create] hit');

    const session_id = uuidv4();
    const expires_at = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

    console.log('[session/create] creating in DB', { session_id, expires_at });

    await prisma.chatBot.create({
      data: { session_id, expires_at },
    });

    // Insert welcome message into Chat table and mark it as welcome.
    // This is required for schedulerRunner cleanup logic which relies on `Chat.is_welcome`.
    // Note: timestamp will be auto-set by Prisma (default now()).
    await prisma.chat.create({
      data: {
        session_id,
        response_type: 'bot',
        message_text: 'Hi! How can I help you today?',
        is_welcome: true,
      },
    });

    console.log('[session/create] created OK', { session_id });

    res.status(201).json({ session_id, expires_at });
  } catch (error) {
    console.error('[session/create] failed', error);
    next(error);
  }
}

async function validateSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await prisma.chatBot.findUnique({
      where: { session_id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ valid: false, error: 'Session not found' });
    }

    if (session.expires_at < new Date()) {
      return res.status(410).json({ valid: false, error: 'Session expired' });
    }

    res.json({ valid: true, session_id: session.session_id, expires_at: session.expires_at });
  } catch (error) {
    next(error);
  }
}

module.exports = { createSession, validateSession };
