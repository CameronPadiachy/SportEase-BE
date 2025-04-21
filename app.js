const express = require('express');
const cors = require('cors');
const facRoutes = require('./routes/facRoutes');
const bookingRoutes =  require('./routes/bookingRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/fac', facRoutes);
app.use('/api/booking', bookingRoutes);

module.exports = app;