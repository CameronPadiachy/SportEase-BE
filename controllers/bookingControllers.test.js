const request = require('supertest');
const app = require('../app');

// Mocking the database connection
jest.mock('../db', () => {
  const sql = {
    Int: 'Int',
    DateTime: 'DateTime'
  };
  
  const mockRequest = {
    input: jest.fn().mockReturnThis(),
    query: jest.fn()
  };
  
  return {
    sql,
    poolPromise: Promise.resolve({
      request: jest.fn().mockReturnValue(mockRequest)
    })
  };
});

describe('Booking API tests', () => {
  let db;
  let mockRequest;

  beforeEach(async () => {
    db = require('../db');
    mockRequest = (await db.poolPromise).request();
    jest.clearAllMocks();
  });

  describe('Get requests:', () => {
    it('Fetches all bookings', async () => {
      mockRequest.query.mockResolvedValue({ 
        recordset: [{ booking_id: 1, facility_id: 1, start_time: '2025-04-27', end_time: '2025-04-28' }] 
      });
      
      const res = await request(app).get('/api/booking');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([{ booking_id: 1, facility_id: 1, start_time: '2025-04-27', end_time: '2025-04-28' }]);
      expect(mockRequest.query).toHaveBeenCalledWith('SELECT * FROM Bookings');
    });

    it('Fetches unapproved bookings', async () => {
      mockRequest.query.mockResolvedValue({ recordset: [] });
      
      const res = await request(app).get('/api/booking/una');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
      expect(mockRequest.query).toHaveBeenCalledWith('SELECT * FROM Bookings WHERE approved IS NULL');
    });

    it('Fetches a booking by ID', async () => {
      mockRequest.query.mockResolvedValue({ 
        recordset: [{ booking_id: 1, facility_id: 1, start_time: '2025-04-27', end_time: '2025-04-28' }] 
      });
      
      const res = await request(app).get('/api/booking/1');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([{ booking_id: 1, facility_id: 1, start_time: '2025-04-27', end_time: '2025-04-28' }]);
      expect(mockRequest.input).toHaveBeenCalledWith('id', 'Int', '1');
      expect(mockRequest.query).toHaveBeenCalledWith('SELECT * FROM Bookings WHERE booking_id = @id');
    });
  });

  describe('Post requests:', () => {
    it('Creates a new booking successfully', async () => {
      // Mock the overlap check (no conflicts)
      mockRequest.query.mockResolvedValueOnce({ recordset: [] });
      
      // Mock the insert response
      mockRequest.query.mockResolvedValueOnce({ 
        recordset: [{ booking_id: 1 }] 
      });
      
      const res = await request(app)
        .post('/api/booking')
        .send({
          facility_id: 1,
          start_time: '2025-04-27T10:00:00',
          end_time: '2025-04-27T12:00:00'
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({
        message: 'Booking successfully created',
        booking_id: 1
      });
      
      // Verify the overlap check query
      expect(mockRequest.query).toHaveBeenNthCalledWith(1, `
                SELECT * FROM Bookings 
                WHERE facility_id = @facility_id
                AND (
                    (start_time < @end_time AND end_time > @start_time)
                    OR (approved IS NULL)
                )
            `);
      
      // Verify the insert query
      expect(mockRequest.query).toHaveBeenNthCalledWith(2, `
                INSERT INTO Bookings (facility_id, start_time, end_time) 
                VALUES (@facility_id, @start_time, @end_time);
                SELECT SCOPE_IDENTITY() AS booking_id;
            `);
    });

    it('Fails to create booking with missing fields', async () => {
      const res = await request(app)
        .post('/api/booking')
        .send({ start_time: '2025-04-27' });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
    });

    it('Fails when time slot is already booked', async () => {
      // Mock the overlap check (conflict exists)
      mockRequest.query.mockResolvedValueOnce({ 
        recordset: [{ booking_id: 1 }] 
      });
      
      const res = await request(app)
        .post('/api/booking')
        .send({
          facility_id: 1,
          start_time: '2025-04-27T10:00:00',
          end_time: '2025-04-27T12:00:00'
        });
      
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe('Time slot conflicts with existing booking');
    });
  });

  describe('Delete requests:', () => {
    it('Deletes a booking successfully', async () => {
      // Mock exists check
      mockRequest.query.mockResolvedValueOnce({ 
        recordset: [{}] // Booking exists
      });
      
      // Mock delete result
      mockRequest.query.mockResolvedValueOnce({ 
        rowsAffected: [1] // 1 row deleted
      });
      
      const res = await request(app)
        .delete('/api/booking/1');
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        message: 'Booking 1 deleted successfully',
        booking_id: 1
      });
      
      // Verify the queries
      expect(mockRequest.query).toHaveBeenNthCalledWith(1, 'SELECT 1 FROM Bookings WHERE booking_id = @id');
      expect(mockRequest.query).toHaveBeenNthCalledWith(2, 'DELETE FROM Bookings WHERE booking_id = @id');
    });

    it('Fails to delete non-existent booking', async () => {
      // Mock exists check (no booking)
      mockRequest.query.mockResolvedValueOnce({ 
        recordset: [] 
      });
      
      const res = await request(app)
        .delete('/api/booking/999');
      
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Booking not found');
    });

    it('Fails with invalid booking ID', async () => {
      const res = await request(app)
        .delete('/api/booking/abc');
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Invalid booking ID');
    });
  });

  describe('Patch requests:', () => {
    it('Updates a booking successfully', async () => {
      // Mock the booking existence check
      mockRequest.query.mockResolvedValueOnce({ recordset: [{}] });
    
      // Mock the update query
      mockRequest.query.mockResolvedValueOnce({ rowsAffected: [1] });
    
      const res = await request(app)
        .patch('/api/booking/1')
        .send({ status: 'approved' });
    
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        booking_id: "1",
        status: 'approved'
      });
    
      // Optional: check that correct queries were called
      expect(mockRequest.query).toHaveBeenNthCalledWith(1, 'SELECT 1 FROM Bookings WHERE booking_id = @id');
    });
    

    it('Fails to update with no fields', async () => {
      const res = await request(app)
        .patch('/api/booking/1')
        .send({});
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('No fields provided to update');
    });
  });
});