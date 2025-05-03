const pool = require('../db'); // Your new PostgreSQL pool

exports.getAllBookings = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM Bookings');
        res.status(200).json(rows); // Note: 'rows' instead of 'recordset'
    } catch (err) {
        console.error('PostgreSQL error: ', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.getUnapprovedBookings = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Bookings WHERE approved IS NULL');
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.getBookingById = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Bookings WHERE booking_id = @id');

        res.status(200).json(result.recordset); // Return as array to match test
    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.makeBooking = async (req, res) => {
    try {
        const { facility_id, start_time, end_time } = req.body;

        if (!facility_id || !start_time || !end_time) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const pool = await poolPromise;

        // Check for time slot conflicts 
        const conflictCheck = await pool.request()
            .input('facility_id', sql.Int, facility_id)
            .input('start_time', sql.DateTime, start_time)
            .input('end_time', sql.DateTime, end_time)
            .query(`
                SELECT * FROM Bookings 
                WHERE facility_id = @facility_id
                AND (
                    (start_time < @end_time AND end_time > @start_time)
                    OR (approved IS NULL)
                )
            `);

        if (conflictCheck.recordset.length > 0) {
            return res.status(409).json({ error: 'Time slot conflicts with existing booking' });
        }

        // Insert booking and return the booking ID in one query
        const result = await pool.request()
            .input('facility_id', sql.Int, facility_id)
            .input('start_time', sql.DateTime, start_time)
            .input('end_time', sql.DateTime, end_time)
            .query(`
                INSERT INTO Bookings (facility_id, start_time, end_time) 
                VALUES (@facility_id, @start_time, @end_time);
                SELECT SCOPE_IDENTITY() AS booking_id;
            `);

        res.status(201).json({
            message: 'Booking successfully created',
            booking_id: result.recordset[0].booking_id
        });
    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


exports.delBooking = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid booking ID' });
        }

        const pool = await poolPromise;
        
        // Check if booking exists 
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT 1 FROM Bookings WHERE booking_id = @id');
            
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Bookings WHERE booking_id = @id');

        res.status(200).json({
            message: `Booking ${id} deleted successfully`,
            booking_id: parseInt(id)
        });
    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error.' });
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

        // Check if booking exists
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT 1 FROM Bookings WHERE booking_id = @id');

        if (!checkResult.recordset || checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Update the booking
        const setClauses = [];
        const request = pool.request();

        Object.entries(updates).forEach(([key, value], index) => {
            const paramName = `param${index}`;
            setClauses.push(`${key} = @${paramName}`);
            request.input(paramName, value);
        });

        request.input('id', sql.Int, id);

        const query = `
            UPDATE Bookings
            SET ${setClauses.join(', ')}
            WHERE booking_id = @id
        `;

        await request.query(query);

        // Return the updated fields
        res.status(200).json({
            booking_id: id.toString(),
            ...updates
        });

    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};



exports.approveBooking = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;

        const bookingResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT user_id FROM Bookings WHERE booking_id = @id');

        if (bookingResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const userId = bookingResult.recordset[0].user_id;

        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Bookings SET approved = 1, status = 'approved' WHERE booking_id = @id");

        await pool.request()
            .input('userId', sql.VarChar(255), userId)
            .input('message', sql.NVarChar(500), 'Your booking was approved!')
            .query('INSERT INTO Notifications (user_id, message, created_at) VALUES (@userId, @message, GETDATE())');

        res.status(200).json({ message: 'Booking approved and notification sent' });

    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.rejectBooking = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;

        const bookingResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT user_id FROM Bookings WHERE booking_id = @id');

        if (bookingResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const userId = bookingResult.recordset[0].user_id;

        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Bookings SET approved = 0, status = 'rejected' WHERE booking_id = @id");

        await pool.request()
            .input('userId', sql.VarChar(255), userId)
            .input('message', sql.NVarChar(500), 'Your booking was rejected.')
            .query('INSERT INTO Notifications (user_id, message, created_at) VALUES (@userId, @message, GETDATE())');

        res.status(200).json({ message: 'Booking rejected and notification sent' });

    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};