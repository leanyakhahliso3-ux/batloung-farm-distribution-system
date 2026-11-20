const express = require('express');
const router = express.Router();

const controller = require('../controllers/purchasesController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateIdParam } = require('../middleware/validation');

const validatePurchaseId = validateIdParam('id', 'purchase ID');

router.get('/', asyncHandler(controller.list));
router.get('/:id', validatePurchaseId, asyncHandler(controller.getById));
router.post('/', asyncHandler(controller.create));
router.put('/:id', validatePurchaseId, asyncHandler(controller.update));
router.delete('/:id', validatePurchaseId, asyncHandler(controller.remove));

module.exports = router;
