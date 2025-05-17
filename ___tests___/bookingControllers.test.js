const request = require('supertest');
const app = require('./appForTests');
const pool = require('../db');

jest.mock('../db');

describe('Booking Controllers (Mocked)', () => {
  beforeEach(() => jest.clearAllMocks());

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };

  test('GET /bookings → returns all bookings', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ booking_id: 1, facility_id: 2 }] });
    const req = {};
    const { getAllBookings } = require('../controllers/bookingControllers');
    await getAllBookings(req, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([{ booking_id: 1, facility_id: 2 }]);
  });

  test('GET /bookings/unapproved → returns unapproved bookings', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const req = {};
    const { getUnapprovedBookings } = require('../controllers/bookingControllers');
    await getUnapprovedBookings(req, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });

  test('GET /bookings/:id → returns booking by id', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ booking_id: 1 }] });
    const req = { params: { id: 1 } };
    const { getBookingById } = require('../controllers/bookingControllers');
    await getBookingById(req, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([{ booking_id: 1 }]);
  });

  test('POST /bookings → makes booking', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // conflict check
      .mockResolvedValueOnce({ rows: [{ booking_id: 10 }] }); // insert
    const req = {
      body: {
        facility_id: 1,
        start_time: '2025-01-01T10:00',
        end_time: '2025-01-01T11:00',
        uid: 'user1'
      }
    };
    const { makeBooking } = require('../controllers/bookingControllers');
    await makeBooking(req, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Booking successfully created',
      booking_id: 10
    });
  });

  test('DELETE /bookings/:id → deletes booking', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{}] })
      .mockResolvedValueOnce({});
    const req = { params: { id: 2 } };
    const { delBooking } = require('../controllers/bookingControllers');
    await delBooking(req, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Booking deleted', booking_id: 2 });
  });

  test('PATCH /bookings/:id → updates booking', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{}] })
      .mockResolvedValueOnce({});
    const req = {
      params: { id: 3 },
      body: { facility_id: 99 }
    };
    const { updateBooking } = require('../controllers/bookingControllers');
    await updateBooking(req, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ booking_id: 3, facility_id: 99 });
  });

  test('PUT /bookings/:id/approve → approves booking', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ uid: 'u1', start_time: new Date(), end_time: new Date(), facility_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Padel' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const req = { params: { id: 5 } };
    const { approveBooking } = require('../controllers/bookingControllers');
    await approveBooking(req, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test('PUT /bookings/:id/reject → rejects booking', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ uid: 'u1', start_time: new Date(), end_time: new Date(), facility_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Tennis' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const req = { params: { id: 6 } };
    const { rejectBooking } = require('../controllers/bookingControllers');
    await rejectBooking(req, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test('POST /events/:id/participation → approves participation', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ title: 'Mock Event', max_p: 10, curr_p: 5 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const req = {
      params: { id: 7 },
      body: { action: 'approve', uid: 'userA' }
    };
    const { handleEventParticipation } = require('../controllers/bookingControllers');
    await handleEventParticipation(req, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test('POST /events/:id/participation → rejects participation', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ title: 'Mock Event', max_p: 10, curr_p: 5 }] })
      .mockResolvedValueOnce({});
    const req = {
      params: { id: 8 },
      body: { action: 'reject', uid: 'userB' }
    };
    const { handleEventParticipation } = require('../controllers/bookingControllers');
    await handleEventParticipation(req, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test('POST /events/:id/participation → invalid action', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ title: 'Mock Event', max_p: 10, curr_p: 5 }] });
    const req = {
      params: { id: 9 },
      body: { action: 'unknown', uid: 'userC' }
    };
    const { handleEventParticipation } = require('../controllers/bookingControllers');
    await handleEventParticipation(req, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
