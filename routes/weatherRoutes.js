const express = require('express');
const router = express.Router();

const {
    checkWeatherForAllFacilities,
    getWeatherForAllFacilities
} = require('../controllers/weatherControllers');


router.get('/', async (req, res) => {
    try {
        await getWeatherForAllFacilities(req, res);
    } catch (err) {
        console.error('Error fetching current weather:', err);
        res.status(500).json({ error: 'Failed to fetch weather', details: err.message });
    }
});


router.post('/check', async (req, res) => {
    try {
        await checkWeatherForAllFacilities();
        res.status(200).json({ message: 'Weather check completed' });
    } catch (err) {
        console.error('Manual weather check failed:', err);
        res.status(500).json({ error: 'Weather check failed', details: err.message });
    }
});

module.exports = router;
