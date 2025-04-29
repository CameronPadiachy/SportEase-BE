const { sql, poolPromise } = require('../db');

exports.makeEvent =  async (req, res)=>{
    try{
        const pool = await poolPromise;
        const{ title, desc, date, fac_id, max_p, curr_p } = req.body;
        const result = await pool.request()
            .input('title', title)
            .input('desc', desc)
            .input('date', sql.DateTime, date)
            .input('fac_id', fac_id)
            .input('max_p', sql.Int, max_p)
            .input('curr_p', sql.Int, curr_p)
            .query('INSERT INTO Events (title, description, date, facility_id, max_participants, current_participants) VALUES (@title, @desc, @date, @fac_id, @max_p, @curr_p);');
        res.status(201).json({message : 'Event created succesfully'});
    }catch(err){
        console.error('SQL error: ', err);
        res.status(500).json({error : 'Internal server error.'});
    }
}