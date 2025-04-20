const { sql, poolPromise } = require('../db');

exports.getAllBookings = async (req, res) =>{
    try{
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Bookings');

        res.status(200).json(result.recordset);
    }catch(err){
        console.error('SQL error: ', err);
        res.status(500).json({error : 'Internal server error.'});
    }
};

exports.getUnapprovedBookings = async (req, res) =>{
    try{
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Bookings WHERE approved IS NULL');

        res.status(200).json(result.recordset);
    }catch(err){
        console.error('SQL error: ', err);
        res.status(500).json({error : 'Internal server error.'});
    }
};

exports.getBookingById = async (req, res) =>{
    try{
        const pool = await poolPromise;
        const { id } = req.params;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Bookings WHERE booking_id = @id');

        res.status(200).json(result.recordset);
    }catch(err){
        console.error('SQL error: ', err);
        res.status(500).json({error : 'Internal server error.'});
    }
};

exports.makeBooking = async (req, res) => {
    try {
        const { facility_id, start_time, end_time } = req.body;

        // Validate required fields
        if (!facility_id || !start_time || !end_time) {
            return res.status(400).json({ error: 'Missing required fields: facility_id, start_time, end_time' });
        }

        // Validate date format (basic check)
        if (isNaN(new Date(start_time)) || isNaN(new Date(end_time))) {
            return res.status(400).json({ error: 'Invalid date format for start_time or end_time' });
        }

        // Validate time range
        if (new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({ error: 'end_time must be after start_time' });
        }

        const pool = await poolPromise;

        // Check for overlapping bookings
        const overlapCheck = await pool.request()
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

        if (overlapCheck.recordset.length > 0) {
            return res.status(409).json({ error: 'Time slot conflicts with existing booking' });
        }

        // Create the booking
        const result = await pool.request()
            .input('facility_id', sql.Int, facility_id)
            .input('start_time', sql.DateTime, start_time)
            .input('end_time', sql.DateTime, end_time)
            .query(`
                INSERT INTO Bookings (facility_id, start_time, end_time) 
                VALUES (@facility_id, @start_time, @end_time);
                SELECT SCOPE_IDENTITY() AS booking_id;
            `);

        const bookingId = result.recordset[0].booking_id;

        res.status(201).json({ 
            message: 'Booking successfully created',
            booking_id: bookingId
        });

    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ 
            error: 'Internal server error',
            details: err.message 
        });
    }
};

exports.delBooking = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate booking ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'Invalid booking ID' });
        }

        const pool = await poolPromise;

        // First check if booking exists
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT 1 FROM Bookings WHERE booking_id = @id');

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Delete the booking
        const deleteResult = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Bookings WHERE booking_id = @id');

        // Verify deletion
        if (deleteResult.rowsAffected[0] === 0) {
            return res.status(500).json({ error: 'Failed to delete booking' });
        }

        res.status(200).json({ 
            message: `Booking ${id} deleted successfully`,
            booking_id: parseInt(id)
        });

    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ 
            error: 'Internal server error',
            details: err.message 
        });
    }
};

exports.updateBooking = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const updates = req.body;

        // Validate if there's something to update
        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No fields provided to update' });
        }

        // Build SET clause dynamically
        const setClauses = [];
        const request = pool.request();

        Object.entries(updates).forEach(([key, value], index) => {
            const paramName = `param${index}`;
            setClauses.push(`${key} = @${paramName}`);
            request.input(paramName, value); // let mssql auto-infer type
        });

        request.input('id', sql.Int, id);

        const query = `
            UPDATE Bookings
            SET ${setClauses.join(', ')}
            WHERE booking_id = @id
        `;

        await request.query(query);

        res.status(200).json({ booking_id : id , status : updates.status});

    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
