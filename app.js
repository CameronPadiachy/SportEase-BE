const express = require('express');
const cors = require('cors');

const facRoutes = require('./routes/facRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); 

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/fac', facRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes); 

module.exports = app;
