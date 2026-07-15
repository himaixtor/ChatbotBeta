/**
 * Weather Routes — Proxy weather API calls to avoid exposing API key
 */

const express = require('express');
const router = express.Router();

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

/**
 * GET /api/weather?latitude=X&longitude=Y
 * Fetches weather data from OpenWeatherMap and returns it
 */
router.get('/', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    console.log(`[Weather] Fetching weather for: ${latitude}, ${longitude}`);

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API returned status ${response.status}`);
    }

    const data = await response.json();

    const condition = data.weather?.[0]?.main?.toLowerCase() || 'clear';
    const temp = Math.round(data.main?.temp || 20);
    const description = data.weather?.[0]?.description || '';

    console.log(`[Weather] Condition: ${condition}, Temp: ${temp}°C`);

    res.json({
      temp: temp,
      condition: condition,
      description: description,
      city: data.name || null
    });
  } catch (error) {
    console.error('Weather fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

module.exports = router;
