const pool = require('../db');

exports.makeEvent = async (req, res) => {
    try {
        const { title, desc, date, fac_id, max_p, curr_p } = req.body;
        const result = await pool.query(
            `INSERT INTO events 
             (title, description, date, facility_id, max_p, curr_p) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [title, desc, date, fac_id, max_p, curr_p]
        );
        
        res.status(201).json({
            message: 'Event created successfully', 
            res: result.rows[0]
        });
    } catch(err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No fields provided to update' });
        }

        // Build SET clause dynamically
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
            setClauses.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        });

        values.push(id); // Add ID as the last parameter

        const query = `
            UPDATE events
            SET ${setClauses.join(', ')}
            WHERE event_id = $${paramIndex}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        res.status(200).json({ 
            message: 'Event updated successfully',
            res: result.rows[0]
        });

    } catch(err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.delEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM events WHERE event_id = $1 RETURNING *',
            [id]
        );
        
        res.status(200).json({
            message: 'Event deleted successfully',
            res: result.rows[0]
        });
    } catch(err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getAllEvents = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events');
        res.status(200).json(result.rows);
    } catch(err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};