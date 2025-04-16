const express = require('express');
const router = express.Router();
const {
    getFac,
    getFacById
} = require('../controllers/userControllers');

router.get('/', getFac);
router.get('/:id', getFacById);

module.exports = router;
