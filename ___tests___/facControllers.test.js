// __tests__/facControllers.test.js
const { getFac, getFacById } = require('../controllers/facControllers'); // ✅ FIXED IMPORT

describe('facControllers', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('getFac should return success message', () => {
    mockReq = {};
    getFac(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'getFac called successfully'
    });
  });

  test('getFacById should return message with ID', () => {
    mockReq = { params: { id: '123' } };
    getFacById(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'getFacById called for ID: 123'
    });
  });
});
