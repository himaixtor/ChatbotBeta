/**
 * D-ID Module
 * Handles D-ID API interactions with proper authentication
 */

const axios = require('axios');

const DID_API_BASE = process.env.DID_API_BASE_URL || 'https://api.d-id.com';
const DID_CLIENT_KEY = process.env.DID_API_KEY || '';
const DID_AGENT_ID = process.env.DID_PRESENTER_ID || '';

console.log('[DID] Initializing with Agent ID:', DID_AGENT_ID);

// Create axios instance with D-ID authentication
const didClient = axios.create({
  baseURL: DID_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth header
didClient.interceptors.request.use((config) => {
  if (DID_CLIENT_KEY) {
    config.headers['Authorization'] = `Client-Key ${DID_CLIENT_KEY}`;
  }
  return config;
});

/**
 * Check if D-ID is properly configured
 */
function isConfigured() {
  return Boolean(DID_CLIENT_KEY && DID_AGENT_ID);
}

/**
 * Get configuration for frontend
 */
function getConfig() {
  return {
    clientKey: DID_CLIENT_KEY,
    agentId: DID_AGENT_ID,
  };
}

/**
 * Create a new WebRTC stream
 */
async function createStream(agentId = DID_AGENT_ID) {
  try {
    console.log('[DID] Creating stream for agent:', agentId);

    const response = await didClient.post(
      `/agents/${agentId}/streams`,
      {
        sdp: null,
      }
    );

    const { stream_id, session_id, offer, ice_servers } = response.data;

    if (!stream_id || !session_id || !offer) {
      throw new Error('Missing required fields in D-ID response');
    }

    console.log('[DID] Stream created:', stream_id);

    return {
      stream_id,
      session_id,
      offer,
      ice_servers: ice_servers || [],
    };
  } catch (error) {
    console.error('[DID] Create stream failed:', error.message);
    if (error.response) {
      console.error('[DID] Status:', error.response.status);
      console.error('[DID] Data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Send SDP Answer to D-ID
 */
async function sendSdpAnswer(streamId, sessionId, answer, agentId = DID_AGENT_ID) {
  try {
    console.log('[DID] Sending SDP answer for stream:', streamId);

    const response = await didClient.patch(
      `/agents/${agentId}/streams/${streamId}`,
      {
        session_id: sessionId,
        answer: answer,
      }
    );

    console.log('[DID] SDP answer sent');
    return response.data;
  } catch (error) {
    console.error('[DID] Send SDP answer failed:', error.message);
    throw error;
  }
}

/**
 * Send ICE Candidate to D-ID
 */
async function sendIceCandidate(streamId, sessionId, candidate, agentId = DID_AGENT_ID) {
  try {
    await didClient.post(
      `/agents/${agentId}/streams/${streamId}/ice`,
      {
        session_id: sessionId,
        candidate: candidate,
      }
    );

    return true;
  } catch (error) {
    console.warn('[DID] Send ICE candidate failed:', error.message);
    // Don't throw - ICE failures shouldn't break connection
    return false;
  }
}

/**
 * Send text to avatar (TTS + video response)
 */
async function sendTalk(streamId, sessionId, text, agentId = DID_AGENT_ID) {
  try {
    console.log('[DID] Sending talk request:', { stream_id: streamId, text_length: text.length });

    const response = await didClient.post(
      `/agents/${agentId}/streams/${streamId}/talk`,
      {
        session_id: sessionId,
        script: {
          type: 'text',
          provider: {
            type: 'microsoft',
            voice_id: 'en-US-EmmaNeural',
          },
          input: text,
        },
      }
    );

    console.log('[DID] Talk request sent');
    return response.data;
  } catch (error) {
    console.error('[DID] Send talk failed:', error.message);
    throw error;
  }
}

/**
 * Close stream
 */
async function closeStream(streamId, sessionId, agentId = DID_AGENT_ID) {
  try {
    console.log('[DID] Closing stream:', streamId);

    await didClient.delete(
      `/agents/${agentId}/streams/${streamId}`,
      {
        data: {
          session_id: sessionId,
        },
      }
    );

    console.log('[DID] Stream closed');
    return true;
  } catch (error) {
    console.warn('[DID] Close stream failed:', error.message);
    // Don't throw - cleanup failures shouldn't be critical
    return false;
  }
}

module.exports = {
  isConfigured,
  getConfig,
  createStream,
  sendSdpAnswer,
  sendIceCandidate,
  sendTalk,
  closeStream,
};
