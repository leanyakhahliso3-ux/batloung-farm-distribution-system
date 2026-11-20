const express = require('express');
const router = express.Router();

const controller = require('../controllers/vendorsController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateIdParam } = require('../middleware/validation');

const validateVendorId = validateIdParam('id', 'vendor ID');

router.get('/', asyncHandler(controller.list));
router.get('/search/:keyword', asyncHandler(controller.search));
router.get('/:id', validateVendorId, asyncHandler(controller.getById));
router.post('/', asyncHandler(controller.create));
router.put('/:id', validateVendorId, asyncHandler(controller.update));
router.delete('/:id', validateVendorId, asyncHandler(controller.remove));

module.exports = router;
