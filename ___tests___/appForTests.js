const express = require('express');
const app = express();

app.use(express.json());

// Notification routes
const notificationRoutes = require('../routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

// Event routes
const eventRoutes = require('../routes/eventsRoutes');
app.use('/api/events', eventRoutes); // ✅ This fixes your 404s

// User routes ✅ Added here
const userRoutes = require('../routes/userRoutes');
app.use('/api/users', userRoutes);

module.exports = app;
