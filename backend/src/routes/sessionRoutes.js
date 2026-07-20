const express = require('express');
const sessionController = require('../controllers/sessionController');
const axios = require('axios');

const router = express.Router();

router.post('/create', sessionController.createSession);
router.get('/validate/:sessionId', sessionController.validateSession);
router.post('/feedback', sessionController.submitFeedback);

// Avatar configuration endpoint (D-ID Client SDK)
router.get('/avatar-config', (req, res) => {
  try {
    const didClientKey = process.env.DID_CLIENT_KEY;
    const didAgentId = process.env.DID_AGENT_ID || 'v2_agt_hOsF1A8R';

    if (!didClientKey) {
      console.warn('[Avatar Config] DID_CLIENT_KEY not found in environment');
      return res.status(503).json({
        error: 'Avatar service not configured',
        message: 'DID_CLIENT_KEY is missing from server configuration'
      });
    }

    console.log('[Avatar Config] Returning D-ID configuration to frontend');
    res.json({
      clientKey: didClientKey,
      agentId: didAgentId,
      apiBaseUrl: process.env.DID_API_BASE_URL || 'https://api.d-id.com',
      configured: true
    });
  } catch (error) {
    console.error('[Avatar Config] Error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve avatar configuration' });
  }
});

// IP location endpoint (proxy for browser CORS issue)
router.get('/ip-location', async (req, res, next) => {
  try {
    const response = await axios.get('https://freeipapi.com/api/json');
    if (response.data.latitude && response.data.longitude) {
      return res.json({
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        city: response.data.cityName || null
      });
    }
    res.json({ error: 'Could not fetch location' });
  } catch (error) {
    console.error('IP location fetch failed:', error.message);
    res.status(500).json({ error: 'IP location service unavailable' });
  }
});

module.exports = router;
