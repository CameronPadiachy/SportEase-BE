const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationcontrollers');

router.get('/:userId', notificationController.getNotificationsByUser);

module.exports = router;