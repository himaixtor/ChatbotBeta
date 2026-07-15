/**
 * Weather Routes — Proxy weather API calls to avoid exposing API key
 */

const express = require('express');
const router = express.Router();

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

/**
 * GET /api/weather?latitude=X&longitude=Y
 * Fetches weather data from WeatherAPI.com and returns it
 */
router.get('/', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    if (!WEATHER_API_KEY) {
      return res.status(500).json({
        error: 'API key not configured',
        details: 'WEATHER_API_KEY is missing from .env file'
      });
    }
    const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&aqi=no`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Weather API returned status ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const condition = data.current?.condition?.text?.toLowerCase() || 'clear';
    const temp = Math.round(data.current?.temp_c || 20);
    const description = data.current?.condition?.text || '';
    const city = data.location?.name || null;

    res.json({
      temp: temp,
      condition: condition,
      description: description,
      city: city
    });
  } catch (error) {
    console.error('[Weather] ❌ Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch weather data',
    });
  }
});

module.exports = router;
