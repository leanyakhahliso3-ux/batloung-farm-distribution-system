const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/saleController');

router.get('/', ctrl.listSales);
router.post('/', ctrl.createSale);
router.get('/:id/payments', ctrl.listPaymentHistory);
router.post('/:id/payments', ctrl.recordPaymentEntry);
router.patch('/:id/payment', ctrl.recordPayment);

module.exports = router;
