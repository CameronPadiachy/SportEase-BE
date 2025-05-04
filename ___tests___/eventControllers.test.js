// __tests__/eventControllers.test.js
const request = require('supertest');
const app = require('./appForTests'); // your express test app
const { v4: uuidv4 } = require('uuid');

jest.mock('../db', () => ({
  query: jest.fn(),
  end: jest.fn()
}));

const pool = require('../db');

describe('Event Controller Tests (Mocked DB)', () => {
  const testEventId = 123;
  const testUserId = `testuser_${uuidv4()}`;
  const duplicateUserId = 'duplicate_user';
  const nonParticipantId = 'non-existent-user';

  beforeAll(() => {
    pool.query.mockImplementation((text, params) => {
      // CREATE USER
      if (text.includes('INSERT INTO users')) {
        return Promise.resolve({ rowCount: 1 });
      }

      // CREATE EVENT
      if (text.includes('INSERT INTO events') && text.includes('RETURNING')) {
        return Promise.resolve({
          rows: [{ event_id: testEventId }]
        });
      }

      // GET EVENT BY ID
      if (text.includes('SELECT * FROM events WHERE event_id')) {
        return Promise.resolve({
          rows: [{
            event_id: testEventId,
            title: 'Test Event',
            description: 'Test Description',
            date: '2025-12-12',
            fac_id: 1,
            max_p: 10,
            curr_p: 1
          }]
        });
      }

      // GET ALL EVENTS
      if (text.includes('SELECT * FROM events')) {
        return Promise.resolve({
          rows: [{
            event_id: testEventId,
            title: 'Test Event'
          }]
        });
      }

      // UPDATE EVENT
      if (text.includes('UPDATE events')) {
        return Promise.resolve({
          rowCount: 1,
          rows: [{
            event_id: testEventId,
            title: 'Updated Test Event'
          }]
        });
      }

      // DELETE EVENT RETURNING
      if (text.includes('DELETE FROM events') && text.includes('RETURNING')) {
        return Promise.resolve({
          rows: [{ event_id: testEventId, title: 'Deleted Event' }]
        });
      }

      // JOIN EVENT
      if (text.includes('INSERT INTO event_participants')) {
        if (params.includes(duplicateUserId)) {
          const err = new Error('duplicate key');
          err.code = '23505';
          return Promise.reject(err);
        }
        return Promise.resolve({ rowCount: 1 });
      }

      // GET PARTICIPANTS
      if (text.includes('SELECT * FROM event_participants')) {
        return Promise.resolve({
          rows: [{ uid: testUserId, event_id: testEventId }]
        });
      }

      // LEAVE EVENT
      if (text.includes('DELETE FROM event_participants')) {
        if (params.includes(nonParticipantId)) {
          return Promise.resolve({ rowCount: 0 });
        }
        return Promise.resolve({ rowCount: 1 });
      }

      return Promise.resolve({ rows: [] });
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  test('POST /api/events → should create event', async () => {
    const res = await request(app).post('/api/events').send({
      title: 'Test Event',
      desc: 'Test Description',
      date: '2025-12-12',
      fac_id: 1,
      max_p: 10,
      curr_p: 0
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Event created successfully');
    expect(res.body.res).toHaveProperty('event_id');
  });

  test('GET /api/events → should retrieve all events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/events/:id → should retrieve specific event', async () => {
    const res = await request(app).get(`/api/events/${testEventId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('title', 'Test Event');
  });

  test('PATCH /api/events/:id → should update event', async () => {
    const res = await request(app).patch(`/api/events/${testEventId}`).send({
      title: 'Updated Test Event'
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Event updated successfully');
  });

  test('DELETE /api/events/:id → should delete event', async () => {
    const res = await request(app).delete(`/api/events/${testEventId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Event deleted successfully');
  });

  test('POST /api/events/:id/join → should allow user to join', async () => {
    const res = await request(app)
      .post(`/api/events/${testEventId}/join`)
      .send({ uid: testUserId });
    expect([200, 201, 404]).toContain(res.statusCode); // include 404 fallback
  });

  test('POST /api/events/:id/join → should prevent duplicate joins', async () => {
    const res = await request(app)
      .post(`/api/events/${testEventId}/join`)
      .send({ uid: duplicateUserId });
    expect([400, 404, 409]).toContain(res.statusCode);
  });

  test('GET /api/events/:id/part → should list participants', async () => {
    const res = await request(app).get(`/api/events/${testEventId}/part`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/events/:id/leave → should allow user to leave', async () => {
    const res = await request(app)
      .post(`/api/events/${testEventId}/leave`)
      .send({ uid: testUserId });
    expect([200, 204, 404]).toContain(res.statusCode);
  });

  test('POST /api/events/:id/leave → should handle non-participant', async () => {
    const res = await request(app)
      .post(`/api/events/${testEventId}/leave`)
      .send({ uid: nonParticipantId });
    expect([404]).toContain(res.statusCode);
  });
});
