const pool = require('../db'); 

exports.addUser = async (req, res) => {
    try {
        const { uid } = req.body; 

        
        const result = await pool.query(
            'INSERT INTO users (uid) VALUES ($1) RETURNING *',
            [uid]
        );
        
        res.status(201).json({ 
            message: 'User added successfully',
            user: result.rows[0] // Returns the inserted record
        });
    } catch (err) {
        console.error('Database error:', err);
        
       
        if (err.code === '23505') {
            return res.status(409).json({ 
                error: 'User already exists',
                details: err.detail
            });
        }
        
        res.status(500).json({ 
            error: 'Internal server error',
            details: err.message 
        });
    }
};