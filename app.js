const express = require('express');
const cors = require('cors');

const facRoutes = require('./routes/facRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const eventsRoutes = require('./routes/eventsRoutes');
const notificationRoutes= require('./routes/notificationRoutes');
const weatherRoutes = require('./routes/weatherRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Route mounts
app.use('/api/fac', facRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/event', eventsRoutes);
app.use('/api/notif', notificationRoutes);
app.use('/api/weather', weatherRoutes);

module.exports = app;
