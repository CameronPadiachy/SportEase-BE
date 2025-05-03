const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationControllers');

router.get('/:userId', notificationController.getNotificationsByUser);
router.post('/general', notificationController.createGeneralAnnouncement);

module.exports = router;