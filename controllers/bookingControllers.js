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

exports.makeBooking = async (req, res) =>{
    try{
        const pool = await poolPromise;
        const { facility_id, start_time, end_time } = req.body;
        const result = await pool.request()
            .input('facility_id', sql.Int, facility_id)
            .input('start_time', sql.DateTime, start_time)
            .input('end_time', sql.DateTime, end_time)
            .query('INSERT INTO Bookings (facility_id, start_time, end_time) VALUES (@facility_id, @start_time, @end_time)');

        res.status(200).json({ message : result});
    }catch(err){
        console.error('SQL error: ', err);
        res.status(500).json({error : 'Internal server error.'});
    }
};

exports.delBooking = async (req, res) =>{
    try{
        const pool = await poolPromise;
        const { id } = req.params;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Bookings WHERE booking_id = @id');

        res.status(200).json({message : 'booking ${id} deleted successfully', res : result });
    }catch(err){
        console.error('SQL error: ', err);
        res.status(500).json({error : 'Internal server error.'});
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
