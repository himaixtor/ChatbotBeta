/**
 * Weather Routes — Proxy weather API calls to avoid CORS issues
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/weather?latitude=X&longitude=Y
 * Fetches weather data from open-meteo and returns it
 */
router.get('/', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API returned status ${response.status}`);
    }

    const data = await response.json();

    res.json({
      temp: data.current.temperature_2m,
      code: data.current.weather_code,
    });
  } catch (error) {
    console.error('Weather fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

module.exports = router;
