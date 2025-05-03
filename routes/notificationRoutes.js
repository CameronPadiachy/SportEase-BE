const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationControllers');

// Get notifications for a specific user (including general announcements)
router.get('/:userId', notificationController.getNotificationsByUser);

// Create a general announcement
router.post('/general', notificationController.createGeneralAnnouncement);

module.exports = router;
