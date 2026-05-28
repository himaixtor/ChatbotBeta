/**
 * Public chat messaging and history for widget sessions.
 */
const prisma = require('../utils/prisma');
const { callAIApi } = require('./aiController');

async function getValidSession(sessionId) {
  const session = await prisma.chatBot.findUnique({
    where: { session_id: sessionId },
  });
  if (!session || session.expires_at < new Date()) {
    return null;
  }
  return session;
}

async function sendMessage(req, res, next) {
  try {
    const { session_id, message } = req.body;
    if (!session_id || !message?.trim()) {
      return res.status(400).json({ error: 'session_id and message are required' });
    }

    const session = await getValidSession(session_id);
    if (!session) {
      return res.status(410).json({ error: 'Session invalid or expired' });
    }

    await prisma.chat.create({
      data: {
        session_id,
        response_type: 'user',
        message_text: message.trim(),
      },
    });

    const history = await prisma.chat.findMany({
      where: { session_id, is_visible: true },
      orderBy: { timestamp: 'asc' },
    });

    const messages = history.map((c) => ({
      role: c.response_type === 'user' ? 'user' : 'assistant',
      content: c.message_text,
    }));

    const aiResult = await callAIApi(session_id, message, messages);

    await prisma.chat.create({
      data: {
        session_id,
        response_type: 'AI',
        message_text: aiResult.response,
      },
    });

    const leads = aiResult.extracted_leads;
    if (leads) {
      const updateData = {};
      if (leads.name) updateData.name = leads.name;
      if (leads.email) updateData.email = leads.email;
      if (leads.interested_in) updateData.interested_in = leads.interested_in;
      if (leads.language) updateData.chat_language = leads.language;
      if (leads.lead_complete) updateData.lead_generated = true;

      if (Object.keys(updateData).length > 0) {
        await prisma.chatBot.update({
          where: { session_id },
          data: updateData,
        });
      }
    }

    res.json({
      response: aiResult.response,
      extracted_leads: aiResult.extracted_leads,
    });
  } catch (error) {
    if (error.message === 'AI service unavailable') {
      return res.status(503).json({ error: error.message });
    }
    next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await getValidSession(sessionId);
    if (!session) {
      return res.status(410).json({ error: 'Session invalid or expired' });
    }

    const chats = await prisma.chat.findMany({
      where: { session_id: sessionId, is_visible: true },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        response_type: true,
        message_text: true,
        timestamp: true,
      },
    });

    res.json({ messages: chats });
  } catch (error) {
    next(error);
  }
}

module.exports = { sendMessage, getHistory };
