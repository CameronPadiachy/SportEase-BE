const request = require('supertest');
const app = require('./appForTests');
const db = require('../db');

jest.mock('../db');

describe('Notification API tests (PostgreSQL)', () => {
  describe('GET /api/notifications/:userId', () => {
    it('Fetches both user-specific and general notifications', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { notification_id: 1, uid: 'user123', message: 'Hello User', created_at: '2025-05-04T00:00:00Z' },
          { notification_id: 2, uid: null, message: 'General Announcement', created_at: '2025-05-03T00:00:00Z' }
        ]
      });

      const res = await request(app).get('/api/notifications/user123');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([
        { notification_id: 1, uid: 'user123', message: 'Hello User', created_at: '2025-05-04T00:00:00Z' },
        { notification_id: 2, uid: null, message: 'General Announcement', created_at: '2025-05-03T00:00:00Z' }
      ]);
    });
  });

  describe('POST /api/notifications/general', () => {
    it('Creates a general announcement successfully', async () => {
      db.query.mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/notifications/general')
        .send({ message: 'Test general announcement' });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('General announcement created');
    });

    it('Fails to create general announcement with empty message', async () => {
      const res = await request(app)
        .post('/api/notifications/general')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Message is required');
    });
  });
});
