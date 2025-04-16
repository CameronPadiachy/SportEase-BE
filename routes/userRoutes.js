const express = require('express');
const router = express.Router();
const {
    getFac,
    getFacById
} = require('../controllers/userControllers.js');

router.get('/', getFac);
router.get('/:id', getFacById);

module.exports = router;
