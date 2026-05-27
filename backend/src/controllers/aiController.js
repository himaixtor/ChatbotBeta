/**
 * Python AI API integration (placeholder until service is ready).
 */
const axios = require('axios');
const { log } = require('../utils/logger');

/**
 * @param {string} sessionId
 * @param {Array<{role: string, content: string}>} messages
 */
async function callAIApi(sessionId, messages) {
  try {
    const baseUrl = process.env.PYTHON_AI_API_URL;
    if (baseUrl && process.env.USE_MOCK_AI !== 'true') {
      const response = await axios.post(`${baseUrl}/ai/respond`, {
        session_id: sessionId,
        messages,
      });
      return response.data;
    }

    log('Using mock AI response for session', sessionId);
    return {
      response:
        'This is a mock AI response. The actual AI API will be integrated later.',
      extracted_leads: {
        name: null,
        email: null,
        interested_in: null,
        language: 'English',
        lead_complete: false,
      },
    };
  } catch (error) {
    console.error('AI API call failed:', error.message);
    throw new Error('AI service unavailable');
  }
}

module.exports = { callAIApi };
