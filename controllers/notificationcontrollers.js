const  pool  = require('../db');

// Get both personal and general notifications for a user
exports.getNotificationsByUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM "notifications"
             WHERE uid = $1 OR uid IS NULL
             ORDER BY created_at DESC`,
            [userId]
        );

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create a general announcement (no user_id)
exports.createGeneralAnnouncement = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        await pool.query(
            'INSERT INTO "Notifications" (user_id, message, created_at) VALUES (NULL, $1, NOW())',
            [message]
        );

        res.status(201).json({ message: 'General announcement created' });
    } catch (err) {
        console.error('PostgreSQL error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
