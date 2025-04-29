const express =  require('express');
const router = express.Router();


const{
    makeEvent,
    updateEvent,
    delEvent,
    getAllEvents
} = require('../controllers/eventControllers');

router.post('/', makeEvent);
router.patch('/:id', updateEvent);
router.delete('/:id', delEvent);
router.get('/', getAllEvents);

module.exports = router;