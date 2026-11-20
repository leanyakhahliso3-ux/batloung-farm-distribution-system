const express = require('express');
const router = express.Router();

const controller = require('../controllers/suppliersController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateIdParam } = require('../middleware/validation');

const validateSupplierId = validateIdParam('id', 'supplier ID');

router.get('/', asyncHandler(controller.list));
router.get('/:id', validateSupplierId, asyncHandler(controller.getById));
router.post('/', asyncHandler(controller.create));
router.put('/:id', validateSupplierId, asyncHandler(controller.update));
router.delete('/:id', validateSupplierId, asyncHandler(controller.remove));

module.exports = router;
