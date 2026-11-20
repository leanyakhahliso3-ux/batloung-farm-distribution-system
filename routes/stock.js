const express = require('express');
const router = express.Router();

const controller = require('../controllers/stockController');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/', asyncHandler(controller.list));
router.get('/fruit/:fruitId', asyncHandler(controller.listByFruit));
router.get('/size/:packagingSize', asyncHandler(controller.listByPackagingSize));
router.get('/low-stock', asyncHandler(controller.listLowStock));
router.post('/', asyncHandler(controller.create));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
