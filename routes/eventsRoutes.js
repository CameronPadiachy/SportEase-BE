const express =  require('express');
const router = express.Router();


const{
    makeEvent,
    updateEvent,
    delEvent,
    getAllEvents,
    getEventById
} = require('../controllers/eventControllers');

router.post('/', makeEvent);
router.patch('/:id', updateEvent);
router.delete('/:id', delEvent);
router.get('/', getAllEvents);
router.get('/:id', getEventById);


module.exports = router;