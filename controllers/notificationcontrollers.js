const { sql, poolPromise } = require('../db');

exports.getNotificationsByUser = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { userId } = req.params;

        const result = await pool.request()
            .input('userId', sql.VarChar(255), userId)
            .query('SELECT * FROM Notifications WHERE user_id = @userId ORDER BY created_at DESC');

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('SQL error: ', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};