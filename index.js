const express = require('express');
const cors = require('cors');
const notificationRoutes=require('./routes/notificationRoutes');
const facRoutes = require('./routes/facRoutes');
const bookingRoutes =  require('./routes/bookingRoutes');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/fac', facRoutes);
app.use('/api/notif',notificationRoutes);
app.use('/api/booking', bookingRoutes);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

