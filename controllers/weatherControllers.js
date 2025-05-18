const axios = require('axios');
const pool = require('../db');
require('dotenv').config();

const API_KEY = process.env.OPENWEATHER_API_KEY;
if (!API_KEY) {
  console.warn('⚠ OPENWEATHER_API_KEY is not set in .env');
}

exports.checkWeatherForAllFacilities = async () => {
  try {
    const { rows: facilities } = await pool.query(`
      SELECT facility_id, name, latitude, longitude
      FROM "facilities"
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `);

    for (const { facility_id, name, latitude, longitude } of facilities) {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`;
      const resp = await axios.get(url);
      const data = resp.data;

      const description = data.weather[0].description;
      const temp = Math.round(data.main.temp);
      const summary = `Today's weather at ${name}: ${description}, ${temp}°C`;

      const { rows: existing } = await pool.query(
        `SELECT * FROM "notifications"
         WHERE message = $1 AND uid IS NULL
         AND DATE(created_at) = CURRENT_DATE`,
        [summary]
      );

      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO "notifications" (uid, message, created_at)
           VALUES (NULL, $1, NOW())`,
          [summary]
        );
      }
    }

    console.log('✅ Weather notifications inserted.');
  } catch (err) {
    console.error('❌ Error in checkWeatherForAllFacilities:', err);
  }
};

exports.getWeatherForAllFacilities = async (req, res) => {
  try {
    const { rows: facilities } = await pool.query(`
      SELECT facility_id, name, latitude, longitude
      FROM "facilities"
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `);

    const results = {}; // ✅ Define the results object

    for (const { name, latitude, longitude } of facilities) {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`;
      const resp = await axios.get(url);
      const description = resp.data.weather[0].description;
      const temp = Math.round(resp.data.main.temp);

      results[name] = { description, temp };
    }

    res.json(results);
  } catch (err) {
    console.error('❌ Error in getWeatherForAllFacilities:', err);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
};
