const express = require('express');
const router = express.Router();

const controller = require('../controllers/salesController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateIdParam } = require('../middleware/validation');

const validateSaleId = validateIdParam('id', 'sale ID');

router.get('/', asyncHandler(controller.list));
router.get('/:id', validateSaleId, asyncHandler(controller.getById));
router.post('/', asyncHandler(controller.create));
router.put('/:id', validateSaleId, asyncHandler(controller.update));
router.delete('/:id', validateSaleId, asyncHandler(controller.remove));

module.exports = router;
