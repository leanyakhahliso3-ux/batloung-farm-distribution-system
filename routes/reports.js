const express = require('express');
const router = express.Router();

const controller = require('../controllers/reportsController');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/summary', asyncHandler(controller.summary));
router.get('/top-fruits', asyncHandler(controller.topFruits));
router.get('/sales-revenue', asyncHandler(controller.salesRevenue));
router.get('/top-vendor', asyncHandler(controller.topVendor));
router.get('/stock-levels', asyncHandler(controller.stockLevels));

module.exports = router;
