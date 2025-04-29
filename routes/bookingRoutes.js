
const express = require('express');
const router = express.Router();

const{
    getAllBookings,
    getUnapprovedBookings,
    getBookingById,
    makeBooking,
    delBooking,
    updateBooking,
    approveBooking, 
    rejectBooking,
} =  require('../controllers/bookingControllers');

router.get('/', getAllBookings);
router.get('/una', getUnapprovedBookings);
router.get('/:id', getBookingById);
router.post('/', makeBooking);
router.delete('/:id', delBooking);
router.patch('/:id', updateBooking);

router.put('/approve/:id', approveBooking);
router.put('/reject/:id', rejectBooking);



module.exports = router;

