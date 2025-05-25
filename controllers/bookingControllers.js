const pool = require('../db');

// GET all bookings
exports.getAllBookings = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM bookings');
        res.status(200).json(rows);
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET all unapproved bookings
exports.getUnapprovedBookings = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM bookings WHERE approved IS NULL');
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
        const { rows } = await pool.query('SELECT * FROM bookings WHERE booking_id = $1', [id]);
        res.status(200).json(rows);
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST make a booking
exports.makeBooking = async (req, res) => {
    try {
        const { facility_id, start_time, end_time, uid } = req.body;

        if (!facility_id || !start_time || !end_time || !uid) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Fixed query with proper parentheses
        const conflictCheck = await pool.query(
            `SELECT * FROM bookings 
             WHERE facility_id = $1
             AND ((start_time < $3 AND end_time > $2) OR approved IS NULL)`,
            [facility_id, start_time, end_time]
        );

        if (conflictCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Time slot conflicts with existing booking' });
        }

        const result = await pool.query(
            `INSERT INTO bookings (facility_id, start_time, end_time, uid) 
             VALUES ($1, $2, $3, $4) RETURNING booking_id`,
            [facility_id, start_time, end_time, uid]
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

        const check = await pool.query('SELECT 1 FROM bookings WHERE booking_id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        await pool.query('DELETE FROM bookings WHERE booking_id = $1', [id]);
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

        const check = await pool.query('SELECT 1 FROM bookings WHERE booking_id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const keys = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

        await pool.query(
            `UPDATE bookings SET ${setClause} WHERE booking_id = $${keys.length + 1}`,
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
      'SELECT uid, start_time, end_time, facility_id FROM bookings WHERE booking_id = $1',
      [id]
    );
    if (booking.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });

    const { uid, start_time, facility_id } = booking.rows[0];

    const facility = await pool.query(
      'SELECT name FROM facilities WHERE facility_id = $1',
      [facility_id]
    );
    const facilityName = facility.rows.length ? facility.rows[0].name : 'Unknown Facility';

    // 🕒 Add 2-hour shift to compensate for browser timezone offset
    const localStart = new Date(start_time);
    localStart.setUTCHours(localStart.getUTCHours() + 2);
    const timeStr = localStart.toISOString().substring(11, 16); // "HH:MM"

    const message = `Your booking at ${facilityName} is confirmed for ${timeStr}`;

    await pool.query(
      'UPDATE bookings SET approved = TRUE, status = $1 WHERE booking_id = $2',
      ['approved', id]
    );
    await pool.query(
      'INSERT INTO notifications (uid, message, created_at) VALUES ($1, $2, NOW())',
      [uid, message]
    );

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
      'SELECT uid, start_time, end_time, facility_id FROM bookings WHERE booking_id = $1',
      [id]
    );
    if (booking.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });

    const { uid, start_time, facility_id } = booking.rows[0];

    const facility = await pool.query(
      'SELECT name FROM facilities WHERE facility_id = $1',
      [facility_id]
    );
    const facilityName = facility.rows.length ? facility.rows[0].name : 'Unknown Facility';

    //  Add 2-hour shift to match approveBooking logic
    const localStart = new Date(start_time);
    localStart.setUTCHours(localStart.getUTCHours() + 2);
    const timeStr = localStart.toISOString().substring(11, 16);

    const message = `Your booking at ${facilityName} for ${timeStr} was rejected.`;

    await pool.query(
      'UPDATE bookings SET approved = FALSE, status = $1 WHERE booking_id = $2',
      ['rejected', id]
    );
    await pool.query(
      'INSERT INTO notifications (uid, message, created_at) VALUES ($1, $2, NOW())',
      [uid, message]
    );

    res.status(200).json({ message: 'Booking rejected and notification sent' });
  } catch (err) {
    console.error('PostgreSQL error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// POST handle event participation (approve/reject)
exports.handleEventParticipation = async (req, res) => {
    const { id } = req.params;
    const { action, uid } = req.body;

    try {
        const event = await pool.query('SELECT title, max_p, curr_p FROM events WHERE event_id = $1', [id]);
        if (event.rows.length === 0) return res.status(404).json({ error: 'Event not found' });

        const { title, max_p, curr_p } = event.rows[0];

        if (action === 'approve') {
            if (curr_p >= max_p) return res.status(400).json({ error: 'Event full' });

            await pool.query('INSERT INTO event_participants (user_id, event_id) VALUES ($1, $2)', [uid, id]);
            await pool.query('UPDATE events SET curr_p = curr_p + 1 WHERE event_id = $1', [id]);
            await pool.query('INSERT INTO notifications (uid, message, created_at, event_id) VALUES ($1, $2, NOW(), $3)', 
                [uid, `You have been approved for the event: ${title}`, id]);
            res.status(200).json({ message: 'Event participation approved and notification sent' });
        } else if (action === 'reject') {
            await pool.query('INSERT INTO notifications (uid, message, created_at, event_id) VALUES ($1, $2, NOW(), $3)', 
                [uid, `Your participation in the event ${title} was rejected.`, id]);
            res.status(200).json({ message: 'Event participation rejected and notification sent' });
        } else {
            res.status(400).json({ error: 'Invalid action. Use "approve" or "reject".' });
        }
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

//redeploy