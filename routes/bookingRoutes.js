const express = require('express');
const router = express.Router();

const {
    getAllBookings,
    getUnapprovedBookings,
    getBookingById,
    makeBooking,
    delBooking,
    updateBooking,
    approveBooking,
    rejectBooking,
    handleEventParticipation
} = require('../controllers/bookingControllers');

// Booking routes
router.get('/', getAllBookings);
router.get('/una', getUnapprovedBookings);
router.get('/:id', getBookingById);
router.post('/', makeBooking);
router.delete('/:id', delBooking);
router.patch('/:id', updateBooking);
router.put('/approve/:id', approveBooking);
router.put('/reject/:id', rejectBooking);

// Event participation (approve/reject)
router.post('/event/:id', handleEventParticipation);

module.exports = router;
