/**
 * D-ID Avatar Module
 * Simple session & database logging layer
 * SDK now runs on frontend in avatar-rtc.js
 */

const { v4: uuidv4 } = require('uuid');

console.log('[DID] Initialized - Sessions-only mode (SDK on frontend)');

/**
 * Create a session for avatar streaming
 * Backend just allocates a session ID - SDK handles D-ID communication on frontend
 */
async function createStream(sessionIdFromRequest) {
  try {
    console.log('[DID] Creating session for avatar streaming');

    // Generate session token for frontend to use with SDK
    const sessionToken = uuidv4();
    const streamId = uuidv4();

    console.log('[DID] ✅ Session created:', sessionToken);

    // Return session info for frontend
    return {
      id: streamId,
      session_id: sessionToken,
      // These will be provided by SDK on frontend, but we return placeholders
      offer: null,
      ice_servers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };
  } catch (error) {
    console.error('[DID] ❌ Session creation failed:', error.message);
    throw error;
  }
}

/**
 * Placeholder - SDK handles SDP on frontend
 */
async function sendSdpAnswer(streamId, sessionId, answer) {
  console.log('[DID] SDP Answer received (frontend SDK handled negotiation)');
  return { success: true, stream_id: streamId };
}

/**
 * Placeholder - SDK handles ICE on frontend
 */
async function sendIceCandidate(streamId, sessionId, candidate) {
  console.log('[DID] ICE Candidate received (frontend SDK handled negotiation)');
  return { success: true };
}

/**
 * Placeholder - SDK sends talk directly on frontend
 */
async function sendTalkstream(streamId, sessionId, text, voiceConfig = null) {
  console.log('[DID] Talkstream received (frontend SDK handled)');
  return {
    id: streamId,
    status: 'started',
    talk_data: {
      script: { type: 'text', input: text },
      stream_id: streamId,
    },
  };
}

/**
 * Placeholder - SDK cleanup on frontend
 */
async function closeStream(streamId, sessionId) {
  console.log('[DID] Close stream (frontend SDK handled cleanup)');
  return { success: true };
}

module.exports = {
  createStream,
  sendSdpAnswer,
  sendIceCandidate,
  sendTalkstream,
  closeStream,
};
