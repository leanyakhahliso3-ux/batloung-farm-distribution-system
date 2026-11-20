const express = require('express');
const router = express.Router();

const controller = require('../controllers/fruitsController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateIdParam } = require('../middleware/validation');

const validateFruitId = validateIdParam('id', 'fruit ID');

router.get('/', asyncHandler(controller.list));
router.get('/:id', validateFruitId, asyncHandler(controller.getById));
router.post('/', asyncHandler(controller.create));
router.put('/:id', validateFruitId, asyncHandler(controller.update));
router.delete('/:id', validateFruitId, asyncHandler(controller.remove));

module.exports = router;
