const express = require('express');
const cors = require('cors');

const facRoutes = require('./routes/facRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const eventsRoutes = require('./routes/eventsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Mount routes with appropriate base paths
app.use('/api/fac', facRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/event', eventsRoutes);
app.use('/api/notif', notificationRoutes); // General + personal notifications

module.exports = app;
