const request = require('supertest');
const db = require('../db');
const app = require('./appForTests'); // This must mount /api/users route

jest.mock('../db');

describe('User API tests (PostgreSQL)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/users', () => {
    it('adds a user successfully', async () => {
      const mockUser = { uid: 'user123' };
      db.query.mockResolvedValueOnce({
        rows: [{ uid: 'user123' }]
      });

      const res = await request(app).post('/api/users').send(mockUser);

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({
        message: 'User added successfully',
        user: { uid: 'user123' }
      });
    });

    it('returns conflict if user already exists', async () => {
      db.query.mockRejectedValueOnce({
        code: '23505',
        detail: 'Key (uid)=(user123) already exists.'
      });

      const res = await request(app).post('/api/users').send({ uid: 'user123' });

      expect(res.statusCode).toBe(409);
      expect(res.body).toEqual({
        error: 'User already exists',
        details: 'Key (uid)=(user123) already exists.'
      });
    });

    it('returns 500 for other database errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Connection lost'));

      const res = await request(app).post('/api/users').send({ uid: 'user123' });

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        error: 'Internal server error',
        details: 'Connection lost'
      });
    });
  });
});
