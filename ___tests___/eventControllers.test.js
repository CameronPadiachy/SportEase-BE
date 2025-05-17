const request = require('supertest');
const app = require('./appForTests'); // test Express app
const pool = require('../db');

jest.mock('../db');

const testEventId = 123;
const testUserId = 'user123';
const duplicateUserId = 'duplicate_user';
const nonParticipantId = 'ghost_user';

beforeEach(() => {
  jest.clearAllMocks();

  pool.query.mockImplementation((text, params) => {
    const normalized = text.replace(/\s+/g, ' ').toLowerCase();

    if (normalized.includes('insert into events') && normalized.includes('returning')) {
      return Promise.resolve({ rows: [{ event_id: testEventId }] });
    }

    if (normalized.startsWith('select * from events')) {
      return Promise.resolve({ rows: [{ event_id: testEventId, title: 'Mock Event', fac_id: 1 }] });
    }

    if (normalized.includes('from events where event_id')) {
      return Promise.resolve({ rows: [{ event_id: testEventId, title: 'Mock Event', description: 'desc', date: '2025-01-01', fac_id: 1, max_p: 10, curr_p: 1 }] });
    }

    if (normalized.startsWith('update events')) {
      return Promise.resolve({ rowCount: 1 });
    }

    if (normalized.startsWith('delete from events where event_id')) {
      return Promise.resolve({ rowCount: 1 });
    }

    if (normalized.includes('insert into event_participants')) {
      return Promise.resolve({ rowCount: 1 });
    }

    if (normalized.includes('select uid from event_participants')) {
      return Promise.resolve({ rows: [] });
    }

    if (normalized.includes('delete from event_participants where uid')) {
      if (params[0] === nonParticipantId) return Promise.resolve({ rowCount: 0 });
      return Promise.resolve({ rowCount: 0 });
    }

    return Promise.resolve({ rows: [] });
  });
});

describe('Event Controller Tests (Mocked DB)', () => {
  test('POST /api/events → creates a new event', async () => {
    const res = await request(app).post('/api/events').send({
      title: 'Test Event',
      desc: 'Description',
      date: '2025-01-01',
      fac_id: 1,
      max_p: 10,
      curr_p: 0
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/created/i);
    expect(res.body.res).toHaveProperty('event_id');
  });

  test('GET /api/events → returns list of events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/events/:id → fetches specific event', async () => {
    const res = await request(app).get(`/api/events/${testEventId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body[0].title).toBe('Mock Event');
  });

  test('PATCH /api/events/:id → updates the event', async () => {
    const res = await request(app).patch(`/api/events/${testEventId}`).send({ title: 'Updated Event' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });

  test('DELETE /api/events/:id → deletes the event', async () => {
    const res = await request(app).delete(`/api/events/${testEventId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  test('POST /api/events/:id/join → allows user to join event', async () => {
    const res = await request(app).post(`/api/events/${testEventId}/join`).send({ uid: testUserId });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/joined/i);
  });

  test('POST /api/events/:id/leave → handles non-participant gracefully', async () => {
    const res = await request(app).post(`/api/events/${testEventId}/leave`).send({ uid: nonParticipantId });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not registered/i);
  });
});
