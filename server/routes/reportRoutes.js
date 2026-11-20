const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');

router.get('/top-fruits', ctrl.topFruits);
router.get('/revenue', ctrl.revenueByRange);
router.get('/top-vendor', ctrl.topVendor);
router.get('/stock-levels', ctrl.stockLevels);

module.exports = router;
