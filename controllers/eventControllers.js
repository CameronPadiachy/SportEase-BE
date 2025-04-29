const { sql, poolPromise } = require('../db');

exports.makeEvent =  async (req, res)=>{
    try{
        const pool = await poolPromise;
        const{ title, desc, date, fac_id, max_p, curr_p } = req.body;
        const result = await pool.request()
            .input('title', title)
            .input('description', desc)
            .input('date', sql.DateTime, date)
            .input('facility_id', fac_id)
            .input('max_participants', sql.Int, max_p)
            .input('current_participants', sql.Int, curr_p)
            .query('INSERT INTO Events (title, description, date, facility_id, max_participants, current_participants) VALUES (@title, @desc, @date, @fac_id, @max_p, @curr_p);');
        res.status(201).json({message : 'Event created succesfully', res : result});
    }catch(err){
        console.error('SQL error: ', err);
        res.status(500).json({error : 'Internal server error.'});
    }
};

exports.updateEvent = async (req,res) =>{
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
            UPDATE Events
            SET ${setClauses.join(', ')}
            WHERE event_id = @id
        `;

        await request.query(query);

        res.status(200).json({ message: 'Event updated successfully' });

    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.delEvent = async (req, res) =>{
    try{
        const pool = await poolPromise;
        const{ id } = req.params;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Events WHERE event_id = @id');
        res.status(200).json({message : 'Event deleted successfully', res: result});
    }catch(err){
        console.error('SQL error ', err);
        res.status(500).json({message: 'Internal server error'});
    }
};

exports.getAllEvents = async (req, res) => {
    try{
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Events');

        res.status(200).json(result.recordset);
    }catch(err){
        console.error('SQL error: ', err);
        res.status(500).json({error : 'Internal server error.'});
    }
}