const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/fruitStockController');

router.get('/', ctrl.listFruits);
router.get('/stock', ctrl.viewStock);
router.get('/stock/low', ctrl.viewLowStock);
router.post('/', ctrl.addFruit);
router.put('/stock/:stockId', ctrl.editStockPrice);
router.put('/stock/:stockId/quantity', ctrl.editStockQuantity);
router.put('/stock/:stockId/details', ctrl.editStockDetails);
router.put('/:id', ctrl.editFruit);
router.delete('/:id', ctrl.removeFruit);

module.exports = router;
