const { sql, poolPromise } = require('../db');

exports.addUser = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { uid } = req.body; // Destructure uid from body

        const addU = await pool.request()
            .input('uid', uid)
            .query('INSERT INTO Users (user_id) Values (@uid);');
        
        res.status(201).json({ message: 'User added successfully', uid });
    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ 
            error: 'Internal server error',
            details: err.message 
        });
    }
};

//redeploy