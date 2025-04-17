const express = require('express');
const router = express.Router();

const{
    getAllBookings,
    getUnapprovedBookings,
    getBookingById,
    makeBooking,
    delBooking,
    updateBooking
} =  require('../controllers/bookingControllers');

router.get('/', getAllBookings);
router.get('/una', getUnapprovedBookings);
router.get('/:id', getBookingById);
router.post('/', makeBooking);
router.delete('/:id', delBooking);
router.patch('/:id', updateBooking);

module.exports = router;
