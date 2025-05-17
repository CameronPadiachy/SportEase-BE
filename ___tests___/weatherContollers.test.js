const axios = require('axios');
const db = require('../db');
const {
  getWeatherForAllFacilities,
  checkWeatherForAllFacilities
} = require('../controllers/weatherControllers'); // 

jest.mock('axios');
jest.mock('../db');

describe('Weather Controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeatherForAllFacilities (GET endpoint)', () => {
    const mockReq = {};
    const mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    it('returns weather data for all facilities', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { name: 'Padel Court', latitude: -26.2, longitude: 28.0 },
          { name: 'Tennis Court', latitude: -26.1, longitude: 28.1 }
        ]
      });

      axios.get.mockResolvedValue({
        data: {
          weather: [{ description: 'clear sky' }],
          main: { temp: 23.7 }
        }
      });

      await getWeatherForAllFacilities(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        'Padel Court': { description: 'clear sky', temp: 24 },
        'Tennis Court': { description: 'clear sky', temp: 24 }
      });
    });

    it('handles errors and responds with 500', async () => {
      db.query.mockRejectedValueOnce(new Error('DB failure'));

      await getWeatherForAllFacilities(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch weather'
      });
    });
  });

  describe('checkWeatherForAllFacilities (cron task)', () => {
    it('inserts new weather notification if not already exists', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [
            {
              facility_id: 1,
              name: 'Soccer Field',
              latitude: -26.3,
              longitude: 28.2
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [] }) // no matching notifications
        .mockResolvedValueOnce({}); // insert successful

      axios.get.mockResolvedValue({
        data: {
          weather: [{ description: 'sunny' }],
          main: { temp: 25.4 }
        }
      });

      await checkWeatherForAllFacilities();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "notifications"'),
        expect.any(Array)
      );
    });

    it('does not insert if notification already exists', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [
            {
              facility_id: 1,
              name: 'Soccer Field',
              latitude: -26.3,
              longitude: 28.2
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ message: "Today's weather at Soccer Field: sunny, 25°C" }]
        });

      axios.get.mockResolvedValue({
        data: {
          weather: [{ description: 'sunny' }],
          main: { temp: 25 }
        }
      });

      await checkWeatherForAllFacilities();

      expect(db.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "notifications"')
      );
    });

    it('logs error when something fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      db.query.mockRejectedValueOnce(new Error('Bad DB'));

      await checkWeatherForAllFacilities();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error in checkWeatherForAllFacilities:'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
