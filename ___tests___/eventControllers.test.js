const request = require('supertest');
const app = require('./appForTests');
const pool = require('../db');

jest.mock('../db');

describe('Event Controller Tests (Mocked DB)', () => {
  const testEventId = 123;
  const testUserId = 'user1';
  const fullEventId = 999;

  beforeEach(() => {
    jest.clearAllMocks();

    pool.query.mockImplementation((text, params) => {
      const sql = text.toLowerCase().replace(/\s+/g, ' ').trim();

      if (sql.includes('insert into events') && sql.includes('returning')) {
        return Promise.resolve({ rows: [{ event_id: testEventId }] });
      }

      if (sql.startsWith('select * from events') && !sql.includes('where')) {
        return Promise.resolve({ rows: [{ event_id: testEventId, title: 'Test Event' }] });
      }

      if (sql.includes('from events where event_id')) {
        const id = params[0];
        if (id === 999) return Promise.resolve({ rows: [] });
        if (id === fullEventId) {
          return Promise.resolve({
            rows: [{ event_id: fullEventId, title: 'Full Event', max_p: 1, curr_p: 1 }]
          });
        }
        return Promise.resolve({
          rows: [{ event_id: testEventId, title: 'Test Event', max_p: 2, curr_p: 1 }]
        });
      }

      if (sql.startsWith('update events set')) {
        return Promise.resolve({ rowCount: 1 });
      }

      if (sql.startsWith('delete from events where event_id')) {
        return Promise.resolve({ rowCount: 1 });
      }

      if (sql.includes('insert into event_participants')) {
        return Promise.resolve({ rowCount: 1 });
      }

      if (sql.includes('delete from event_participants where uid =')) {
        const uid = params[0];
        if (uid === testUserId) return Promise.resolve({ rowCount: 1 });
        return Promise.resolve({ rowCount: 0 });
      }

      return Promise.resolve({ rows: [] });
    });
  });

  test('POST /api/events → creates a new event', async () => {
    const res = await request(app).post('/api/events').send({
      title: 'Test Event',
      desc: 'Mock',
      date: '2025-01-01',
      fac_id: 1,
      max_p: 10,
      curr_p: 0
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.res).toHaveProperty('event_id');
  });

  test('GET /api/events → returns all events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/events/:id → fetch specific event', async () => {
    const res = await request(app).get(`/api/events/${testEventId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body[0]).toHaveProperty('title');
  });

  test('DELETE /api/events/:id → deletes the event', async () => {
    const res = await request(app).delete(`/api/events/${testEventId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  test('POST /api/events/:id/join → allows user to join event', async () => {
    const res = await request(app).post(`/api/events/${testEventId}/join`).send({ uid: 'newuser' });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/joined/i);
  });

  test('POST /api/events/:id/join → returns 404 if event not found', async () => {
    const res = await request(app).post(`/api/events/999/join`).send({ uid: testUserId });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('POST /api/events/:id/leave → handles non-participant gracefully', async () => {
    const res = await request(app).post(`/api/events/${testEventId}/leave`).send({ uid: 'ghost' });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not registered/i);
  });
});
