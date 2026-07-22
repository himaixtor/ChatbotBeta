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
    const didClientKey = process.env.DID_CLIENT_KEY || 'ck_k-4TlZBe0ltKyhI6MYIG7';
    const didAgentId = process.env.DID_AGENT_ID || 'v2_agt_qlftkgx6';

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

// D-ID API proxy (handles CORS for frontend SDK)
router.use('/proxy/did', async (req, res) => {
  try {
    const didUsername = process.env.DID_API_USERNAME;
    const didPassword = process.env.DID_API_PASSWORD;

    if (!didUsername || !didPassword) {
      return res.status(503).json({
        error: 'D-ID credentials not configured',
        message: 'Set DID_API_USERNAME and DID_API_PASSWORD in .env'
      });
    }

    // Reconstruct the D-ID API URL from the remaining path
    const didPath = req.path.replace('/proxy/did', '');
    const didUrl = `https://api.d-id.com${didPath}`;

    // Create Basic Auth header: Base64(username:password)
    const credentials = Buffer.from(`${didUsername}:${didPassword}`).toString('base64');
    const authHeader = `Basic ${credentials}`;

    console.log(`[D-ID Proxy] ${req.method} ${didUrl}`);
    console.log(`[D-ID Proxy] Using Basic Auth`);

    const response = await axios({
      method: req.method,
      url: didUrl,
      data: req.method !== 'GET' ? req.body : undefined,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
      validateStatus: () => true, // Allow all status codes
    });

    console.log(`[D-ID Proxy] Response Status: ${response.status}`);
    if (response.status !== 200 && response.status !== 201) {
      console.error(`[D-ID Proxy] Error:`, JSON.stringify(response.data));
    }

    res.status(response.status);
    res.json(response.data);
  } catch (error) {
    console.error(`[D-ID Proxy] ❌ Error:`, error.message);
    res.status(500).json({
      error: 'D-ID proxy failed',
      message: error.message,
    });
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
