const express = require('express');
const router = express.Router();
const { identify } = require('../controllers/customerController');

router.post('/identify', identify);

module.exports = router;
