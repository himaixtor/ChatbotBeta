const express = require('express');
const sessionController = require('../controllers/sessionController');
const axios = require('axios');

const router = express.Router();

router.post('/create', sessionController.createSession);
router.get('/validate/:sessionId', sessionController.validateSession);

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
