const pool = require('../db'); // PostgreSQL connection

// GET all bookings
exports.getAllBookings = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM "Bookings"');
        res.status(200).json(rows);
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET all unapproved bookings
exports.getUnapprovedBookings = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM "Bookings" WHERE approved IS NULL');
        res.status(200).json(rows);
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET booking by ID
exports.getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM "Bookings" WHERE booking_id = $1', [id]);
        res.status(200).json(rows);
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST make a booking
exports.makeBooking = async (req, res) => {
    try {
        const { facility_id, start_time, end_time } = req.body;

        if (!facility_id || !start_time || !end_time) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const conflictCheck = await pool.query(
            `SELECT * FROM "Bookings" 
             WHERE facility_id = $1
             AND ((start_time < $3 AND end_time > $2) OR approved IS NULL)`,
            [facility_id, start_time, end_time]
        );

        if (conflictCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Time slot conflicts with existing booking' });
        }

        const result = await pool.query(
            `INSERT INTO "Bookings" (facility_id, start_time, end_time) 
             VALUES ($1, $2, $3) RETURNING booking_id`,
            [facility_id, start_time, end_time]
        );

        res.status(201).json({
            message: 'Booking successfully created',
            booking_id: result.rows[0].booking_id
        });
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE booking
exports.delBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const check = await pool.query('SELECT 1 FROM "Bookings" WHERE booking_id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        await pool.query('DELETE FROM "Bookings" WHERE booking_id = $1', [id]);
        res.status(200).json({ message: 'Booking deleted', booking_id: parseInt(id) });
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// PATCH update a booking
exports.updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No fields provided to update' });
        }

        const check = await pool.query('SELECT 1 FROM "Bookings" WHERE booking_id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const keys = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = keys.map((key, i) => `"${key}" = $${i + 1}`).join(', ');

        await pool.query(
            `UPDATE "Bookings" SET ${setClause} WHERE booking_id = $${keys.length + 1}`,
            [...values, id]
        );

        res.status(200).json({ booking_id: id, ...updates });
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// PUT approve booking
exports.approveBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await pool.query(
            'SELECT user_id, start_time, end_time, facility_id FROM "Bookings" WHERE booking_id = $1',
            [id]
        );
        if (booking.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });

        const { user_id, start_time, end_time, facility_id } = booking.rows[0];
        const facility = await pool.query('SELECT name FROM "Facilities" WHERE facility_id = $1', [facility_id]);
        const facilityName = facility.rows.length ? facility.rows[0].name : 'Unknown Facility';

        const message = `Your booking at ${facilityName} from ${new Date(start_time).toLocaleString()} to ${new Date(end_time).toLocaleString()} was approved!`;
        await pool.query('UPDATE "Bookings" SET approved = TRUE, status = $1 WHERE booking_id = $2', ['approved', id]);
        await pool.query('INSERT INTO "Notifications" (user_id, message, created_at) VALUES ($1, $2, NOW())', [user_id, message]);

        res.status(200).json({ message: 'Booking approved and notification sent' });
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// PUT reject booking
exports.rejectBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await pool.query(
            'SELECT user_id, start_time, end_time, facility_id FROM "Bookings" WHERE booking_id = $1',
            [id]
        );
        if (booking.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });

        const { user_id, start_time, end_time, facility_id } = booking.rows[0];
        const facility = await pool.query('SELECT name FROM "Facilities" WHERE facility_id = $1', [facility_id]);
        const facilityName = facility.rows.length ? facility.rows[0].name : 'Unknown Facility';

        const message = `Your booking at ${facilityName} from ${new Date(start_time).toLocaleString()} to ${new Date(end_time).toLocaleString()} was rejected.`;
        await pool.query('UPDATE "Bookings" SET approved = FALSE, status = $1 WHERE booking_id = $2', ['rejected', id]);
        await pool.query('INSERT INTO "Notifications" (user_id, message, created_at) VALUES ($1, $2, NOW())', [user_id, message]);

        res.status(200).json({ message: 'Booking rejected and notification sent' });
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST handle event participation (approve/reject)
exports.handleEventParticipation = async (req, res) => {
    const { id } = req.params;
    const { action, user_id } = req.body;

    try {
        const event = await pool.query('SELECT event_name, max_participants, current_participants FROM "Events" WHERE event_id = $1', [id]);
        if (event.rows.length === 0) return res.status(404).json({ error: 'Event not found' });

        const { event_name, max_participants, current_participants } = event.rows[0];

        if (action === 'approve') {
            if (current_participants >= max_participants) return res.status(400).json({ error: 'Event full' });

            await pool.query('INSERT INTO "EventParticipants" (user_id, event_id) VALUES ($1, $2)', [user_id, id]);
            await pool.query('UPDATE "Events" SET current_participants = current_participants + 1 WHERE event_id = $1', [id]);
            await pool.query('INSERT INTO "Notifications" (user_id, message, created_at) VALUES ($1, $2, NOW())', [user_id, `You have been approved for the event: ${event_name}`]);
            res.status(200).json({ message: 'Event participation approved and notification sent' });
        } else if (action === 'reject') {
            await pool.query('INSERT INTO "Notifications" (user_id, message, created_at) VALUES ($1, $2, NOW())', [user_id, `Your participation in the event ${event_name} was rejected.`]);
            res.status(200).json({ message: 'Event participation rejected and notification sent' });
        } else {
            res.status(400).json({ error: 'Invalid action. Use "approve" or "reject".' });
        }
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
