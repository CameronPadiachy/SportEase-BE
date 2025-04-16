const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
require('dotenv').config();

const app = express();
const port = process.env.port || 5000;

app.use(cors());
app.use(express.json());

app.use('api/users', userRoutes);

app.listen(port, () => {
    console.log('Server is runnin on por ${port}');
});
