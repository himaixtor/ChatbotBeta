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
    console.log('[🎬 AVATAR STREAM] POST /api/avatar/stream');
    console.log('[🎬 AVATAR STREAM] Request body:', JSON.stringify(req.body));

    const { session_id } = req.body;

    if (!session_id) {
      console.error('[🎬 AVATAR STREAM] ❌ Missing session_id');
      return res.status(400).json({ error: 'session_id is required' });
    }

    console.log('[🎬 AVATAR STREAM] Creating stream for session:', session_id);

    const streamData = await didAvatar.createStream();
    const streamId = streamData.id;
    const sessionToken = streamData.session_id;

    console.log('[🎬 AVATAR STREAM] ✅ Stream created');
    console.log('[🎬 AVATAR STREAM] Stream ID:', streamId);
    console.log('[🎬 AVATAR STREAM] Session Token:', sessionToken);
    console.log('[🎬 AVATAR STREAM] Offer received:', !!streamData.offer);
    console.log('[🎬 AVATAR STREAM] ICE servers:', streamData.ice_servers?.length || 0);

    prisma.avatarStream.create({
      data: {
        id: uuidv4(),
        session_id,
        stream_id: streamId,
        session_token: sessionToken,
        avatar_mode: 'sdk',
        is_active: true,
      },
    }).catch((err) => {
      console.warn('[🎬 AVATAR STREAM] DB logging error (non-critical)');
    });

    const response = {
      stream_id: streamId,
      session_token: sessionToken,
      offer: streamData.offer,
      ice_servers: streamData.ice_servers,
    };

    console.log('[🎬 AVATAR STREAM] Sending response:', JSON.stringify(response, null, 2));
    return res.json(response);
  } catch (error) {
    console.error('[🎬 AVATAR STREAM] ❌ Stream creation failed:', error.message);
    console.error('[🎬 AVATAR STREAM] Stack:', error.stack);
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
    console.log('[📤 AVATAR SDP] POST /api/avatar/sdp');
    const { stream_id, session_token, answer } = req.body;

    console.log('[📤 AVATAR SDP] Stream ID:', stream_id);
    console.log('[📤 AVATAR SDP] Session Token:', session_token);
    console.log('[📤 AVATAR SDP] Answer type:', answer?.type);

    if (!stream_id || !session_token || !answer) {
      console.error('[📤 AVATAR SDP] ❌ Missing required fields');
      return res.status(400).json({ error: 'stream_id, session_token, and answer are required' });
    }

    await didAvatar.sendSdpAnswer(stream_id, session_token, answer);
    console.log('[📤 AVATAR SDP] ✅ SDP answer processed');
    return res.json({ success: true });
  } catch (error) {
    console.error('[📤 AVATAR SDP] ❌ SDP failed:', error.message);
    console.error('[📤 AVATAR SDP] Stack:', error.stack);
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
    console.log('[🧊 AVATAR ICE] POST /api/avatar/ice');
    const { stream_id, session_token, candidate } = req.body;

    console.log('[🧊 AVATAR ICE] Stream ID:', stream_id);
    console.log('[🧊 AVATAR ICE] Candidate:', candidate?.candidate?.substring(0, 80) + '...');

    if (!stream_id || !session_token || !candidate) {
      console.warn('[🧊 AVATAR ICE] ⚠️ Missing fields, ignoring');
      return res.status(400).json({ error: 'stream_id, session_token, and candidate are required' });
    }

    await didAvatar.sendIceCandidate(stream_id, session_token, candidate);
    console.log('[🧊 AVATAR ICE] ✅ ICE candidate processed');

    return res.json({ success: true });
  } catch (error) {
    console.warn('[🧊 AVATAR ICE] ⚠️ ICE error (non-critical):', error.message);
    return res.json({ success: true });
  }
};

/**
 * Send talkstream (Text → Avatar speaks)
 */
const sendTalk = async (req, res, next) => {
  try {
    console.log('[🎤 AVATAR TALK] POST /api/avatar/talk');
    const { stream_id, session_token, text, session_id } = req.body;

    console.log('[🎤 AVATAR TALK] Stream ID:', stream_id);
    console.log('[🎤 AVATAR TALK] Text:', text?.substring(0, 100) + '...');

    if (!stream_id || !session_token || !text) {
      console.error('[🎤 AVATAR TALK] ❌ Missing required fields');
      return res.status(400).json({ error: 'stream_id, session_token, and text are required' });
    }

    console.log('[🎤 AVATAR TALK] Processing talkstream...');

    // Default voice config
    const voiceConfig = {
      provider: 'microsoft',
      voice_id: 'en-US-EmmaNeural',
    };

    const isAgentStream = true;

    // Get talkstream response
    const talkstreamResponse = await didAvatar.sendTalkstream(
      stream_id,
      session_token,
      text,
      voiceConfig,
      isAgentStream
    );

    console.log('[🎤 AVATAR TALK] ✅ Talkstream processed');
    console.log('[🎤 AVATAR TALK] Response:', JSON.stringify(talkstreamResponse, null, 2));

    return res.json({
      success: true,
      answer: text,
      stream_status: talkstreamResponse.status || 'started',
      talk_data: talkstreamResponse,
      video_id: talkstreamResponse.id || null,
      audio: null,
    });
  } catch (error) {
    console.error('[🎤 AVATAR TALK] ❌ Talk failed:', error.message);
    console.error('[🎤 AVATAR TALK] Stack:', error.stack);
    return res.status(500).json({ error: 'Failed to send talk request' });
  }
};

/**
 * Close stream
 */
const closeStream = async (req, res, next) => {
  try {
    console.log('[❌ AVATAR CLOSE] POST /api/avatar/close');
    const { stream_id, session_token, session_id } = req.body;

    console.log('[❌ AVATAR CLOSE] Stream ID:', stream_id);

    if (!stream_id || !session_token) {
      console.warn('[❌ AVATAR CLOSE] ⚠️ Missing required fields');
      return res.status(400).json({ error: 'stream_id and session_token are required' });
    }

    console.log('[❌ AVATAR CLOSE] Closing stream...');

    await didAvatar.closeStream(stream_id, session_token);

    // Update database (non-blocking)
    if (session_id) {
      prisma.avatarStream.updateMany({
        where: { stream_id },
        data: { is_active: false, closed_at: new Date() },
      }).catch((err) => {
        console.warn('[❌ AVATAR CLOSE] DB update error:', err.message);
      });
    }

    console.log('[❌ AVATAR CLOSE] ✅ Stream closed');
    return res.json({ success: true });
  } catch (error) {
    console.warn('[❌ AVATAR CLOSE] ⚠️ Close error (non-critical):', error.message);
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
