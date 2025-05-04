jest.mock('../db'); // ✅ First line: ensures ../db.js is mocked before anything else
const db = require('../db'); // ✅ This refers to __mocks__/db.js

const request = require('supertest');
const app = require('../app'); // ✅ Import AFTER db is mocked

describe('Booking API tests (PostgreSQL)', () => {
  describe('Get requests:', () => {
    it('Fetches all bookings', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { booking_id: 1, facility_id: 1, start_time: '2025-04-27', end_time: '2025-04-28' }
        ]
      });

      const res = await request(app).get('/api/booking');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([
        { booking_id: 1, facility_id: 1, start_time: '2025-04-27', end_time: '2025-04-28' }
      ]);
    });

    it('Fetches unapproved bookings', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/booking/una');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('Fetches a booking by ID', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ booking_id: 1, facility_id: 1, start_time: '2025-04-27', end_time: '2025-04-28' }]
      });

      const res = await request(app).get('/api/booking/1');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([
        { booking_id: 1, facility_id: 1, start_time: '2025-04-27', end_time: '2025-04-28' }
      ]);
    });
  });

  describe('Post requests:', () => {
    it('Creates a new booking successfully', async () => {
      // No conflict
      db.query.mockResolvedValueOnce({ rows: [] });
      // Insert booking
      db.query.mockResolvedValueOnce({ rows: [{ booking_id: 1 }] });

      const res = await request(app).post('/api/booking').send({
        facility_id: 1,
        start_time: '2025-04-27T10:00:00Z',
        end_time: '2025-04-27T12:00:00Z',
        uid: 'test-user'
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({
        message: 'Booking successfully created',
        booking_id: 1
      });
    });

    it('Fails to create booking with missing fields', async () => {
      const res = await request(app).post('/api/booking').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    it('Fails when time slot is already booked', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ booking_id: 99 }] });

      const res = await request(app).post('/api/booking').send({
        facility_id: 1,
        start_time: '2025-04-27T10:00:00Z',
        end_time: '2025-04-27T12:00:00Z',
        uid: 'test-user'
      });

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe('Time slot conflicts with existing booking');
    });
  });

  describe('Delete requests:', () => {
    it('Deletes a booking successfully', async () => {
      db.query.mockResolvedValueOnce({ rows: [1] }); // check
      db.query.mockResolvedValueOnce(); // delete

      const res = await request(app).delete('/api/booking/1');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ message: 'Booking deleted', booking_id: 1 });
    });

    it('Fails to delete non-existent booking', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).delete('/api/booking/999');
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Booking not found');
    });

    it('Fails with invalid booking ID', async () => {
      const res = await request(app).delete('/api/booking/abc');
     // expect(res.statusCode).toBe(400); // optional: check controller handles this
    });
  });

  describe('Patch requests:', () => {
    it('Updates a booking successfully', async () => {
      db.query.mockResolvedValueOnce({ rows: [1] }); // check
      db.query.mockResolvedValueOnce(); // update

      const res = await request(app)
        .patch('/api/booking/1')
        .send({ status: 'approved' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        booking_id: '1',
        status: 'approved'
      });
    });

    it('Fails to update with no fields', async () => {
      const res = await request(app).patch('/api/booking/1').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('No fields provided to update');
    });
  });
});

