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

exports.getEventById = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM events WHERE event_id = $1', [id]);
        res.status(200).json(rows);
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Join an event (with capacity check)
exports.joinEvent = async (req, res) => {
    try {
        const { event_id } = req.params;
        const { uid } = req.body;
        const event_id_int = parseInt(event_id);

        console.log(`Join request - Event: ${event_id_int}, User: ${uid}`);

        // Validate inputs
        if (isNaN(event_id_int)) {
            return res.status(400).json({ 
                error: 'Invalid event ID',
                details: 'Event ID must be a number',
                received: event_id
            });
        }

        if (!uid?.trim()) {
            return res.status(400).json({ 
                error: 'User ID required',
                details: 'uid cannot be empty'
            });
        }

        // Verify database connection
        await pool.query('SELECT 1');

        // Check event exists and get capacity
        const eventCheck = await pool.query(
            'SELECT event_id, title, max_p, curr_p FROM events WHERE event_id = $1',
            [event_id_int]
        );

        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Event not found',
                event_id: event_id_int
            });
        }

        const { max_p, curr_p, title } = eventCheck.rows[0];
        
        // Check capacity
        if (curr_p >= max_p) {
            return res.status(400).json({ 
                error: 'Event full',
                current: curr_p,
                max: max_p
            });
        }

        // Check if already joined
        const existingJoin = await pool.query(
            'SELECT 1 FROM event_participants WHERE event_id = $1 AND user_id = $2',
            [event_id_int, uid]
        );

        if (existingJoin.rows.length > 0) {
            return res.status(409).json({ 
                error: 'Already joined',
                details: 'User has already joined this event'
            });
        }

        // Start transaction
        await pool.query('BEGIN');

        try {
            // 1. Add participant
            await pool.query(
                'INSERT INTO event_participants (event_id, user_id, joined_at) VALUES ($1, $2, NOW())',
                [event_id_int, uid]
            );

            // 2. Update participant count
            await pool.query(
                'UPDATE events SET curr_p = curr_p + 1 WHERE event_id = $1',
                [event_id_int]
            );

            // 3. Create notification
            const message = `You joined: ${title}`;
            await pool.query(
                'INSERT INTO notifications (uid, message, created_at, event_id) VALUES ($1, $2, NOW(), $3)',
                [uid, message, event_id_int]
            );

            await pool.query('COMMIT');

            res.status(201).json({
                message: 'Successfully joined event',
                event_id: event_id_int,
                title: title,
                new_participant_count: curr_p + 1
            });

        } catch (txErr) {
            await pool.query('ROLLBACK');
            console.error('Transaction failed:', txErr);
            throw txErr;
        }

    } catch (err) {
        console.error('Error in joinEvent:', {
            error: err.message,
            params: req.params,
            body: req.body,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
        
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Leave an event
exports.leaveEvent = async (req, res) => {
    try {
        const { event_id } = req.params;
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({ error: 'User ID (uid) is required' });
        }

        // Check if participation exists
        const participation = await pool.query(
            'SELECT 1 FROM event_participants WHERE event_id = $1 AND user_id = $2',
            [event_id, uid]
        );

        if (participation.rows.length === 0) {
            return res.status(404).json({ error: 'User is not registered for this event' });
        }

        // Start transaction
        await pool.query('BEGIN');

        try {
            // Remove participant
            await pool.query(
                'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
                [event_id, uid]
            );

            // Update participant count
            await pool.query(
                'UPDATE events SET curr_p = curr_p - 1 WHERE event_id = $1',
                [event_id]
            );

            await pool.query('COMMIT');

            res.status(200).json({ 
                message: 'Successfully left event',
                event_id: parseInt(event_id)
            });

        } catch (err) {
            await pool.query('ROLLBACK');
            throw err;
        }

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get event participants
exports.getEventParticipants = async (req, res) => {
    try {
        const { event_id } = req.params;
        
        const result = await pool.query(
            `SELECT u.uid, u.created_at, u.last_login, ep.joined_at
             FROM event_participants ep
             JOIN users u ON ep.user_id = u.uid
             WHERE ep.event_id = $1`,
            [event_id]
        );

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};