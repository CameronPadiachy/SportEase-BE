const { sql, poolPromise } = require('../db');

exports.getAllBookings = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Bookings');

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('SQL error: ', err);
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

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.makeBooking = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { facility_id, start_time, end_time } = req.body;
        const result = await pool.request()
            .input('facility_id', sql.Int, facility_id)
            .input('start_time', sql.DateTime, start_time)
            .input('end_time', sql.DateTime, end_time)
            .query('INSERT INTO Bookings (facility_id, start_time, end_time) VALUES (@facility_id, @start_time, @end_time)');

        res.status(200).json({ message: result });
    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.delBooking = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Bookings WHERE booking_id = @id');

        res.status(200).json({ message: `Booking ${id} deleted successfully`, res: result });
    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.updateBooking = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const updates = req.body;

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No fields provided to update' });
        }

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

        res.status(200).json({ message: 'Booking updated successfully' });

    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ✅ Now, separate approveBooking and rejectBooking:

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
        console.error('SQL error: ', err);
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
