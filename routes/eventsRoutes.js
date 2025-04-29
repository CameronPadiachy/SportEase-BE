const express =  require('express');
const router = express.Router();

const{
    makeEvent
} = require('../controllers/eventControllers');

router.post('/', makeEvent);

module.exports = router;