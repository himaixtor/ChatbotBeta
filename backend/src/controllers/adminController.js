/**
 * Admin dashboard: stats, chat list, CSV exports.
 */
const prisma = require('../utils/prisma');
const { parseIntSafe } = require('../utils/validators');
const { rowsToCsv } = require('../utils/csv');
const { maskEmail, maskText } = require('../utils/masking');

function buildChatWhere(query) {
  const { search, language, lead_status, date_from, date_to } = query;
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { session_id: { contains: search, mode: 'insensitive' } },
      { interested_in: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (language && language !== 'All') {
    where.chat_language = language;
  }

  if (lead_status === 'generated') {
    where.lead_generated = true;
  } else if (lead_status === 'not_generated') {
    where.lead_generated = false;
  }

  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) where.created_at.gte = new Date(date_from);
    if (date_to) {
      const end = new Date(date_to);
      end.setHours(23, 59, 59, 999);
      where.created_at.lte = end;
    }
  }

  return where;
}

async function listChats(req, res, next) {
  try {
    const page = Math.max(1, parseIntSafe(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, parseIntSafe(req.query.limit, 20)));
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
    const where = buildChatWhere(req.query);

    const allowedSort = ['created_at', 'name', 'email', 'chat_language', 'lead_generated'];
    const orderField = allowedSort.includes(sortBy) ? sortBy : 'created_at';

    const [total, data] = await Promise.all([
      prisma.chatBot.count({ where }),
      prisma.chatBot.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderField]: sortOrder },
        select: {
          session_id: true,
          name: true,
          email: true,
          chat_language: true,
          interested_in: true,
          lead_generated: true,
          created_at: true,
        },
      }),
    ]);

    const isViewer = req.user?.role === 'viewer';
    const chats = isViewer
      ? data.map((chat) => ({
          ...chat,
          email: chat.email ? maskEmail(chat.email) : chat.email,
        }))
      : data;

    res.json({ data: chats, total, page, limit });
  } catch (error) {
    next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const [totalChats, leadsGenerated, languageGroups, dailyRaw, usersByLang] =
      await Promise.all([
        prisma.chatBot.count(),
        prisma.chatBot.count({ where: { lead_generated: true } }),
        prisma.chatBot.groupBy({
          by: ['chat_language'],
          where: { chat_language: { not: null } },
          _count: { chat_language: true },
        }),
        prisma.$queryRaw`
          SELECT 
            DATE(created_at) as date,
            COUNT(*)::int as total,
            COUNT(CASE WHEN lead_generated = true THEN 1 END)::int as leads,
            COUNT(CASE WHEN chat_language = 'English' THEN 1 END)::int as english,
            COUNT(CASE WHEN chat_language = 'Hindi' THEN 1 END)::int as hindi,
            COUNT(CASE WHEN chat_language = 'Gujarati' THEN 1 END)::int as gujarati
          FROM "ChatBot"
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `,
        prisma.chatBot.groupBy({
          by: ['chat_language'],
          where: { chat_language: { not: null }, email: { not: null } },
          _count: { email: true },
        }),
      ]);

    const language_breakdown = {};
    for (const row of languageGroups) {
      language_breakdown[row.chat_language || 'Unknown'] = row._count.chat_language;
    }

    const users_by_language = {};
    for (const row of usersByLang) {
      users_by_language[row.chat_language || 'Unknown'] = row._count.email;
    }

    const daily_stats = dailyRaw.map((row) => ({
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date),
      total: Number(row.total),
      leads: Number(row.leads),
      languages: {
        English: Number(row.english),
        Hindi: Number(row.hindi),
        Gujarati: Number(row.gujarati),
      },
    }));

    res.json({
      total_chats: totalChats,
      leads_generated: leadsGenerated,
      language_breakdown,
      users_by_language,
      daily_stats,
    });
  } catch (error) {
    next(error);
  }
}

async function exportSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await prisma.chatBot.findUnique({
      where: { session_id: sessionId },
      include: {
        chats: { where: { is_visible: true }, orderBy: { timestamp: 'asc' } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const headers = ['session_id', 'response_type', 'message_text', 'timestamp'];
    const rows = session.chats.map((c) => ({
      session_id: session.session_id,
      response_type: c.response_type,
      message_text: c.message_text,
      timestamp: c.timestamp.toISOString(),
    }));

    const csv = rowsToCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="chat-${sessionId.slice(0, 8)}.csv"`
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

async function exportAll(req, res, next) {
  try {
    const where = buildChatWhere(req.query);
    const sessions = await prisma.chatBot.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    const headers = [
      'session_id',
      'name',
      'email',
      'chat_language',
      'interested_in',
      'lead_generated',
      'created_at',
    ];
    const rows = sessions.map((s) => ({
      session_id: s.session_id,
      name: s.name || '',
      email: s.email || '',
      chat_language: s.chat_language || '',
      interested_in: s.interested_in || '',
      lead_generated: s.lead_generated,
      created_at: s.created_at.toISOString(),
    }));

    const dateStr = new Date().toISOString().slice(0, 10);
    const csv = rowsToCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="chatbot-all-sessions-${dateStr}.csv"`
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

async function getSessionMessages(req, res, next) {
  try {
    const { sessionId } = req.params;
    const chats = await prisma.chat.findMany({
      where: { session_id: sessionId, is_visible: true },
      orderBy: { timestamp: 'asc' },
    });
    if (!chats.length) {
      const exists = await prisma.chatBot.findUnique({
        where: { session_id: sessionId },
      });
      if (!exists) return res.status(404).json({ error: 'Session not found' });
    }
    const isViewer = req.user?.role === 'viewer';
    const messages = isViewer
      ? chats.map((c) => ({
          ...c,
          message_text: maskText(c.message_text),
        }))
      : chats;

    res.json({ messages });
  } catch (error) {
    next(error);
  }
}

async function deleteSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    await prisma.chatBot.delete({ where: { session_id: sessionId } });
    res.json({ message: 'Session deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Session not found' });
    }
    next(error);
  }
}

module.exports = {
  listChats,
  getStats,
  exportSession,
  exportAll,
  getSessionMessages,
  deleteSession,
};
