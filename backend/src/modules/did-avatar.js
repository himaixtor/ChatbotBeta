/**
 * D-ID Avatar Module
 * WebRTC + TTS Implementation (based on Integrari pattern)
 * Uses AWS Signature V4 Authentication
 */

const axios = require('axios');

const DID_BASE_URL = 'https://api.d-id.com';
const DID_USERNAME_ENCODED = process.env.DID_USERNAME || 'aGltLmJoYXZzYXJAYWl4dG9yLmNvbQ';
let DID_USERNAME_DECODED = DID_USERNAME_ENCODED;
const DID_PASSWORD = process.env.DID_PASSWORD || 'O5c47xKNHpY2cR84RvYl6';
const DID_PRESENTER_ID = process.env.DID_PRESENTER_ID || 'v2_agt_1jqzZB8J';

// Try to decode username if it looks like base64
try {
  const decoded = Buffer.from(DID_USERNAME_ENCODED, 'base64').toString('utf-8');
  if (decoded.includes('@') || decoded.includes('.')) {
    DID_USERNAME_DECODED = decoded;
  }
} catch (e) {
  // Not base64, use as-is
}

console.log('[DID] Initialized - Agent:', DID_PRESENTER_ID);

// Helper: Get stream path for Agents API
function getStreamPath(streamId = null, action = null) {
  let path = `/agents/${DID_PRESENTER_ID}/streams`;
  if (streamId) {
    path += `/${streamId}`;
  }
  if (action) {
    path += `/${action}`;
  }
  return path;
}

// Helper: Axios config with Basic Auth
function getAxiosConfig() {
  const credentials = `${DID_USERNAME_ENCODED}:${DID_PASSWORD}`;
  const auth = `Basic ` + Buffer.from(credentials).toString('base64');

  return {
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
  };
}

/**
 * Create WebRTC Stream with retry for max sessions
 * Based on Integrari pattern
 */
async function createStream(retryCount = 0) {
  try {
    const streamPath = getStreamPath();
    const url = DID_BASE_URL + streamPath;
    const data = { source_url: '' };
    const config = getAxiosConfig();

    const response = await axios.post(url, data, config);

    console.log('[DID] ✅ Stream created:', response.data.id);
    return response.data;
  } catch (error) {
    const isMaxSessionsError = error.response?.status === 403 &&
      error.response?.data?.description?.includes('Max sessions');

    if (isMaxSessionsError && retryCount < 2) {
      console.warn('[DID] ⚠️ Max sessions, retrying...');
      await new Promise(resolve => setTimeout(resolve, 2000 + (retryCount * 1000)));
      return createStream(retryCount + 1);
    }

    console.error('[DID] ❌ Stream creation failed:', error.response?.data?.description || error.message);
    throw error;
  }
}

/**
 * Send SDP Answer
 */
async function sendSdpAnswer(streamId, sessionId, answer) {
  try {
    if (!streamId || !sessionId) {
      throw new Error(`Missing required parameters: streamId=${streamId}, sessionId=${sessionId}`);
    }

    const sdpPath = getStreamPath(streamId, 'sdp');
    const url = DID_BASE_URL + sdpPath;
    const data = { answer, session_id: sessionId };
    const config = getAxiosConfig();

    const response = await axios.post(url, data, config);
    console.log('[DID] ✅ SDP answer sent');
    return response.data;
  } catch (error) {
    console.error('[DID] ❌ SDP answer failed:', error.response?.data?.description || error.message);
    throw error;
  }
}

/**
 * Send ICE Candidate
 */
async function sendIceCandidate(streamId, sessionId, candidate) {
  try {
    const icePath = getStreamPath(streamId, 'ice');
    const url = DID_BASE_URL + icePath;
    const data = {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      session_id: sessionId,
    };
    const config = getAxiosConfig();

    const response = await axios.post(url, data, config);
    return response.data;
  } catch (error) {
    console.warn('[DID] ⚠️ ICE candidate failed (non-critical)');
    return null;
  }
}

/**
 * Send TalkStream (Text → Avatar speaks)
 */
async function sendTalkstream(streamId, sessionId, text) {
  try {
    const talkPath = getStreamPath(streamId);
    const url = DID_BASE_URL + talkPath;
    const data = {
      script: {
        type: 'text',
        input: text,
        provider: {
          type: 'microsoft',
          voice_id: 'en-US-EmmaNeural',
        },
      },
      session_id: sessionId,
    };
    const config = getAxiosConfig();

    const response = await axios.post(url, data, config);
    console.log('[DID] ✅ Avatar speaking');
    return response.data;
  } catch (error) {
    console.error('[DID] ❌ Talkstream failed:', error.response?.data?.description || error.message);
    throw error;
  }
}

/**
 * Close Stream
 */
async function closeStream(streamId, sessionId) {
  try {
    const closePath = getStreamPath(streamId);
    const url = DID_BASE_URL + closePath;
    const data = { session_id: sessionId };
    const config = getAxiosConfig();
    config.data = data;

    const response = await axios.delete(url, config);
    console.log('[DID] ✅ Stream closed');
    return response.data;
  } catch (error) {
    console.warn('[DID] ⚠️ Close failed (non-critical)');
    return null;
  }
}

module.exports = {
  createStream,
  sendSdpAnswer,
  sendIceCandidate,
  sendTalkstream,
  closeStream,
};
