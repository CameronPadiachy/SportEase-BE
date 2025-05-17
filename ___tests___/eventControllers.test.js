const request = require('supertest');
const app = require('./appForTests'); // your Express test app
const pool = require('../db');

jest.mock('../db');

const testEventId = 123;
const testUserId = 'user123';
const nonParticipantId = 'ghost_user';

beforeEach(() => {
  jest.clearAllMocks();

  pool.query.mockImplementation((text, params) => {
    const normalized = text.replace(/\s+/g, ' ').toLowerCase();

    // ✅ Bulletproof match for getEventParticipants
    if (
      normalized.includes('from event_participants ep') &&
      normalized.includes('join users u') &&
      normalized.includes('on ep.user_id = u.uid') &&
      normalized.includes('where ep.event_id =')
    ) {
      return Promise.resolve({
        rows: [{
          uid: 'user123',
          created_at: '2025-01-01',
          last_login: '2025-05-01',
          joined_at: '2025-05-10'
        }]
      });
    }

    // Create event
    if (normalized.includes('insert into events') && normalized.includes('returning')) {
      return Promise.resolve({ rows: [{ event_id: testEventId, title: 'Test Event', curr_p: 1, max_p: 10 }] });
    }

    // Fetch specific event
    if (normalized.includes('select * from events where event_id')) {
      return Promise.resolve({
        rows: [{
          event_id: testEventId,
          title: 'Test Event',
          description: 'desc',
          date: '2025-01-01',
          fac_id: 1,
          max_p: 10,
          curr_p: 1
        }]
      });
    }

    // Fetch all events
    if (normalized.startsWith('select * from events')) {
      return Promise.resolve({ rows: [{ event_id: testEventId, title: 'Mock Event', fac_id: 1 }] });
    }

    // Event capacity check
    if (normalized.includes('select event_id, title, max_p, curr_p from events where event_id')) {
      if (params && params[0] === -999) {
        return Promise.resolve({ rows: [] }); // simulate not found
      }
      return Promise.resolve({
        rows: [{ event_id: testEventId, title: 'Test Event', max_p: 10, curr_p: 2 }]
      });
    }

    // Check if user joined event
    if (normalized.includes('select 1 from event_participants where event_id') && normalized.includes('user_id')) {
      if (params.includes(nonParticipantId)) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    }

    // Join participant insert
    if (normalized.includes('insert into event_participants')) {
      return Promise.resolve({ rowCount: 1 });
    }

    // Increment participant count
    if (normalized.includes('update events set curr_p = curr_p + 1')) {
      return Promise.resolve({ rowCount: 1 });
    }

    // Notification insert
    if (normalized.includes('insert into notifications')) {
      return Promise.resolve({ rowCount: 1 });
    }

    // General DB check
    if (normalized === 'select 1') {
      return Promise.resolve({ rows: [{ '?column?': 1 }] });
    }

    // Update event
    if (normalized.includes('update events') && normalized.includes('set')) {
      return Promise.resolve({ rows: [{ event_id: testEventId, title: 'Updated Event' }] });
    }

    // Delete event
    if (normalized.includes('delete from events')) {
      return Promise.resolve({ rows: [{ event_id: testEventId }] });
    }

    // Leave: remove participation
    if (normalized.includes('delete from event_participants where event_id') && normalized.includes('user_id')) {
      return Promise.resolve({ rowCount: 1 });
    }

    // Leave: decrement count
    if (normalized.includes('update events set curr_p = curr_p - 1')) {
      return Promise.resolve({ rowCount: 1 });
    }

    // Fallback
    return Promise.resolve({ rows: [] });
  });
});

describe('Event Controller Tests (Full Coverage)', () => {
  test('POST /api/events → creates a new event', async () => {
    const res = await request(app).post('/api/events').send({
      title: 'Test Event', desc: 'Description', date: '2025-01-01', fac_id: 1, max_p: 10, curr_p: 0
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/created/i);
  });

  test('POST /api/events → handles DB error on event creation', async () => {
    pool.query.mockRejectedValueOnce(new Error('Insert event failed'));
    const res = await request(app).post('/api/events').send({
      title: 'Fail Event', desc: 'desc', date: '2025-01-01', fac_id: 1, max_p: 5, curr_p: 0
    });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/internal/i);
  });

  test('GET /api/events → returns list of events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/events/:id → fetches specific event', async () => {
    const res = await request(app).get(`/api/events/${testEventId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body[0].title).toBe('Test Event');
  });

  test('PATCH /api/events/:id → updates the event', async () => {
    const res = await request(app).patch(`/api/events/${testEventId}`).send({ title: 'Updated Event' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });

  test('PATCH /api/events/:id → rejects empty update', async () => {
    const res = await request(app).patch(`/api/events/${testEventId}`).send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/no fields/i);
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

  test('POST /api/events/:id/join → invalid event ID', async () => {
    const res = await request(app).post('/api/events/abc/join').send({ uid: testUserId });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid event id/i);
  });

  test('POST /api/events/:id/join → missing uid', async () => {
    const res = await request(app).post(`/api/events/${testEventId}/join`).send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/user id required/i);
  });

  test('POST /api/events/:id/join → event not found', async () => {
    const fakeId = -999;
    const res = await request(app).post(`/api/events/${fakeId}/join`).send({ uid: testUserId });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/event not found/i);
  });

  test('POST /api/events/:id/leave → handles non-participant gracefully', async () => {
    const res = await request(app).post(`/api/events/${testEventId}/leave`).send({ uid: nonParticipantId });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not registered/i);
  });

  test('POST /api/events/:id/leave → missing uid', async () => {
    const res = await request(app).post(`/api/events/${testEventId}/leave`).send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('User ID (uid) is required');
  });

 /* test('GET /api/events/:id/participants → returns participants', async () => {
    const res = await request(app).get(`/api/events/${testEventId}/participants`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('uid');
  }); */
});
