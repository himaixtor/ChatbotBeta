/**
 * Avatar Controller
 * Handles D-ID WebRTC streaming and TTS (Integrari pattern)
 */

const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prisma');
const didAvatar = require('../modules/did-avatar');


/**
 * Create new WebRTC stream
 */
const createStream = async (req, res, next) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const streamData = await didAvatar.createStream();
    const streamId = streamData.id;
    const sessionToken = streamData.session_id;

    console.log('[Avatar] ✅ Stream created, sending to frontend');

    prisma.avatarStream.create({
      data: {
        id: uuidv4(),
        session_id,
        stream_id: streamId,
        session_token: sessionToken,
        avatar_mode: 'webrtc',
        is_active: true,
      },
    }).catch((err) => {
      console.warn('[Avatar] DB logging error (non-critical)');
    });

    return res.json({
      stream_id: streamId,
      session_token: sessionToken,
      offer: streamData.offer,
      ice_servers: streamData.ice_servers,
    });
  } catch (error) {
    console.error('[Avatar] ❌ Stream creation failed:', error.message);
    return res.status(500).json({
      error: 'Failed to create stream',
      details: error.message,
    });
  }
};

/**
 * Send SDP Answer
 */
const sendSdp = async (req, res, next) => {
  try {
    const { stream_id, session_token, answer } = req.body;

    if (!stream_id || !session_token || !answer) {
      return res.status(400).json({ error: 'stream_id, session_token, and answer are required' });
    }

    await didAvatar.sendSdpAnswer(stream_id, session_token, answer);
    return res.json({ success: true });
  } catch (error) {
    console.error('[Avatar] ❌ SDP failed:', error.message);
    return res.status(500).json({
      error: 'Failed to send SDP answer',
      details: error.message,
    });
  }
};

/**
 * Send ICE Candidate
 */
const sendIce = async (req, res, next) => {
  try {
    const { stream_id, session_token, candidate } = req.body;

    if (!stream_id || !session_token || !candidate) {
      return res.status(400).json({ error: 'stream_id, session_token, and candidate are required' });
    }

    await didAvatar.sendIceCandidate(stream_id, session_token, candidate);

    return res.json({ success: true });
  } catch (error) {
    console.warn('[Avatar] ICE error (non-critical):', error.message);
    return res.json({ success: true });
  }
};

/**
 * Send talkstream (Text → Avatar speaks)
 */
const sendTalk = async (req, res, next) => {
  try {
    const { stream_id, session_token, text, session_id } = req.body;

    if (!stream_id || !session_token || !text) {
      return res.status(400).json({ error: 'stream_id, session_token, and text are required' });
    }

    console.log(`[Avatar] Sending talk for stream ${stream_id}`);

    await didAvatar.sendTalkstream(stream_id, session_token, text);

    // Log event (non-blocking)
    if (session_id) {
      prisma.avatarEvent.create({
        data: {
          id: uuidv4(),
          stream_id,
          session_id,
          event_type: 'avatar_speaks',
          event_data: JSON.stringify({ text }),
        },
      }).catch((err) => {
        console.warn('[Avatar] Event logging error:', err.message);
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[Avatar] Talk failed:', error.message);
    return res.status(500).json({ error: 'Failed to send talk request' });
  }
};

/**
 * Close stream
 */
const closeStream = async (req, res, next) => {
  try {
    const { stream_id, session_token, session_id } = req.body;

    if (!stream_id || !session_token) {
      return res.status(400).json({ error: 'stream_id and session_token are required' });
    }

    console.log(`[Avatar] Closing stream ${stream_id}`);

    await didAvatar.closeStream(stream_id, session_token);

    // Update database (non-blocking)
    if (session_id) {
      prisma.avatarStream.updateMany({
        where: { stream_id },
        data: { is_active: false, closed_at: new Date() },
      }).catch((err) => {
        console.warn('[Avatar] DB update error:', err.message);
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.warn('[Avatar] Close error (non-critical):', error.message);
    return res.json({ success: true });
  }
};

module.exports = {
  createStream,
  sendSdp,
  sendIce,
  sendTalk,
  closeStream,
};
