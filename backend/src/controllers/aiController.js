/**
 * Python AI API integration.
 */
const axios = require('axios');
const FormData = require('form-data');
const { log } = require('../utils/logger');

function getChatApiUrl() {
  const AIURL = process.env.PYTHON_AI_API_URL || 'http://0.0.0.0:8010/api/v1/chat';
  // const AIURL = process.env.PYTHON_AI_API_URL || 'http://localhost:8010/api/v1/chat';
  return AIURL;
}

function getUploadBillApiUrl() {
  if (process.env.PYTHON_AI_UPLOAD_URL) {
    return process.env.PYTHON_AI_UPLOAD_URL;
  }

  const chatUrl = getChatApiUrl().replace(/\/$/, '');
  if (chatUrl.endsWith('/chat')) {
    return `${chatUrl}/upload-bill`;
  }

  return `${chatUrl}/upload-bill`;
}

function getAiTimeoutMs() {
  const configured = Number(process.env.PYTHON_AI_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : 120000;
}

/**
 * Call the Python AI chat API with text only.
 * @param {string} sessionId
 * @param {string} message - latest user input
 */
async function callAIApi(sessionId, message) {
  // Always return a valid payload so widget flow never breaks.
  const fallback = () => {
    log('Using fallback AI response for session', sessionId);
    return {
      response:
        'AI is temporarily unavailable. Here is a fallback response from backend.',
    };
  };

  const baseUrl = getChatApiUrl();
  //  const baseUrl = process.env.PYTHON_AI_API_URL || 'http://localhost:8010/api/v1/chat';
  const useMock = process.env.USE_MOCK_AI === 'true';

  try {
    if (useMock) {
      return fallback();
    }

    log(`Calling Python AI API at: ${baseUrl} for session: ${sessionId}`);

    const response = await axios.post(
      baseUrl,
      {
        message: message,
        session_id: sessionId,
      },
      {
        timeout: getAiTimeoutMs(),
      }
    );

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


/**
 * Call the Python AI upload-bill API with multipart file upload.
 * This is the only AI API path that sends binary file data.
 * POST /api/v1/chat/upload-bill
 *   - session_id (form field)
 *   - file (multipart file)
 * @param {string} sessionId
 * @param {{ buffer: Buffer, originalname: string, mimetype: string }} file
 */
async function callAIApiWithFile(sessionId, file) {
  const fallback = () => {
    log('Using fallback AI response for file upload, session', sessionId);
    return {
      response: 'File received. AI is temporarily unavailable.',
      ask_upload: false,
    };
  };

  const uploadUrl = getUploadBillApiUrl();
  const useMock = process.env.USE_MOCK_AI === 'true';

  try {
    if (useMock) {
      return fallback();
    }

    log(`Calling Python AI upload-bill API at: ${uploadUrl} for session: ${sessionId}`);

    const form = new FormData();
    form.append('session_id', sessionId);
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const response = await axios.post(uploadUrl, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: getAiTimeoutMs(),
    });

    if (response.data && response.data.response) {
      return response.data;
    }

    return fallback();
  } catch (error) {
    console.error('AI file upload API call failed:', error.message);
    return fallback();
  }
}

module.exports = { callAIApi, callAIApiWithFile };
