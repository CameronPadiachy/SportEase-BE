const express =  require('express');
const router = express.Router();


const{
    makeEvent,
    updateEvent,
    delEvent,
    getAllEvents,
    getEventById,
    joinEvent,
    leaveEvent,
    getEventParticipants
} = require('../controllers/eventControllers');

router.post('/', makeEvent);
router.patch('/:id', updateEvent);
router.delete('/:id', delEvent);
router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.post('/:event_id/join', joinEvent);
router.post('/:event_id/leave', leaveEvent);
router.get('/:event_id/part', getEventParticipants);


module.exports = router;