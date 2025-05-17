const request = require('supertest');
const app = require('./appForTests');
const db = require('../db');

jest.mock('../db');

describe('Notification API tests (PostgreSQL)', () => {
  describe('GET /api/notifications/:userId', () => {
    it('returns user and general notifications', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { notification_id: 1, uid: 'user123', message: 'User-specific message', created_at: '2025-05-16T10:00:00Z' },
          { notification_id: 2, uid: null, message: 'General message', created_at: '2025-05-15T10:00:00Z' }
        ]
      });

      const res = await request(app).get('/api/notifications/user123');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([
        expect.objectContaining({ uid: 'user123', message: 'User-specific message' }),
        expect.objectContaining({ uid: null, message: 'General message' })
      ]);
    });

    it('returns 500 if DB read fails', async () => {
      db.query.mockRejectedValueOnce(new Error('DB read error'));

      const res = await request(app).get('/api/notifications/user123');
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('POST /api/notifications/general', () => {
    it('creates a general announcement', async () => {
      db.query.mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/notifications/general')
        .send({ message: 'This is a general announcement' });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('General announcement created');
    });

    it('returns 400 if message is missing', async () => {
      const res = await request(app)
        .post('/api/notifications/general')
        .send({}); // no message

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Message is required' });
    });

    it('returns 500 if DB insert fails', async () => {
      db.query.mockRejectedValueOnce(new Error('DB write error'));

      const res = await request(app)
        .post('/api/notifications/general')
        .send({ message: 'Failure case' });

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
    });
  });
});
