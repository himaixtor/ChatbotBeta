/**
 * Python AI API integration.
 */
const axios = require('axios');
const { log } = require('../utils/logger');

/**
 * Call the Python AI API to get a chat response.
 * @param {string} sessionId
 * @param {string} message - latest user input
 * @param {Array<{role: string, content: string}>} [messages] - full conversation history
 */
async function callAIApi(sessionId, message, messages = []) {
  // Always return a valid payload so widget flow never breaks.
  const fallback = () => {
    log('Using fallback AI response for session', sessionId);
    return {
      response:
        'AI is temporarily unavailable. Here is a fallback response from backend.',
    };
  };

  const baseUrl = process.env.PYTHON_AI_API_URL || 'http://localhost:8010/api/v1/chat';
  const useMock = process.env.USE_MOCK_AI === 'true';

  try {
    if (useMock) {
      return fallback();
    }

    log(`Calling Python AI API at: ${baseUrl} for session: ${sessionId}`);

    const response = await axios.post(baseUrl, {
      message: message,
      session_id: sessionId,
    });

    if (response.data && response.data.response) {
      return response.data;
    }

    return fallback();
  } catch (error) {
    console.error('AI API call failed:', error.message);
    // Do NOT throw; return fallback so /api/chat/message can respond.
    return fallback();
  }
}


module.exports = { callAIApi };
