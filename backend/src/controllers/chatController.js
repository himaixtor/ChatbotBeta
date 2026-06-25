/**
 * Public chat messaging and history for widget sessions.
 */
const prisma = require('../utils/prisma');
const { callAIApi, callAIApiWithFile } = require('./aiController');

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

    const aiResult = await callAIApi(session_id, message.trim());

    await prisma.chat.create({
      data: {
        session_id,
        response_type: 'AI',
        message_text: aiResult.response,
      },
    });

    const leads = aiResult.extracted_leads;
    if (leads) {
      // Don't overwrite existing non-empty values in the session.
      const currentSession = await prisma.chatBot.findUnique({
        where: { session_id },
        select: { name: true, email: true, chat_language: true, interested_in: true, lead_generated: true },
      });

      if (currentSession) {
        const updateData = {};

        if (leads.name && !currentSession.name) updateData.name = leads.name;
        if (leads.email && !currentSession.email) updateData.email = leads.email;
        if (leads.interested_in && !currentSession.interested_in) updateData.interested_in = leads.interested_in;
        if (leads.language && !currentSession.chat_language) updateData.chat_language = leads.language;
        if (leads.lead_complete && !currentSession.lead_generated) updateData.lead_generated = true;

        if (Object.keys(updateData).length > 0) {
          await prisma.chatBot.update({
            where: { session_id },
            data: updateData,
          });
        }
      }
    }


    res.json({
      response: aiResult.response,
      extracted_leads: aiResult.extracted_leads,
      ask_upload: Boolean(aiResult.ask_upload),
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
        file_name: true,
        file_mime_type: true,
      },
    });

    res.json({ messages: chats });
  } catch (error) {
    next(error);
  }
}

async function getMessageAttachment(req, res, next) {
  try {
    const { sessionId, messageId } = req.params;
    const id = Number(messageId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid message id' });
    }

    const session = await getValidSession(sessionId);
    if (!session) {
      return res.status(410).json({ error: 'Session invalid or expired' });
    }

    const chat = await prisma.chat.findFirst({
      where: {
        id,
        session_id: sessionId,
        is_visible: true,
        file_data: { not: null },
      },
      select: {
        file_name: true,
        file_mime_type: true,
        file_data: true,
      },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const safeName = (chat.file_name || 'attachment').replace(/[^\w.\-() ]+/g, '_');
    res.setHeader('Content-Type', chat.file_mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.send(Buffer.from(chat.file_data));
  } catch (error) {
    next(error);
  }
}

async function uploadFile(req, res, next) {
  try {
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'A file is required' });
    }

    const session = await getValidSession(session_id);
    if (!session) {
      return res.status(410).json({ error: 'Session invalid or expired' });
    }

    const fileLabel = `[Uploaded file: ${req.file.originalname}]`;

    const uploadedChat = await prisma.chat.create({
      data: {
        session_id,
        response_type: 'user',
        message_text: fileLabel,
        file_name: req.file.originalname,
        file_mime_type: req.file.mimetype,
        file_data: req.file.buffer,
      },
    });

    const aiResult = await callAIApiWithFile(session_id, req.file);

    await prisma.chat.create({
      data: {
        session_id,
        response_type: 'AI',
        message_text: aiResult.response,
      },
    });

    res.json({
      response: aiResult.response,
      ask_upload: Boolean(aiResult.ask_upload),
      file_message: {
        id: uploadedChat.id,
        file_name: uploadedChat.file_name,
        file_mime_type: uploadedChat.file_mime_type,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { sendMessage, getHistory, getMessageAttachment, uploadFile };
