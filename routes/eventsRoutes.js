const express =  require('express');
const router = express.Router();


const{
    makeEvent,
    updateEvent,
    delEvent
} = require('../controllers/eventControllers');

router.post('/', makeEvent);
router.patch('/:id', updateEvent);
router.delete('/:id', delEvent);

module.exports = router;