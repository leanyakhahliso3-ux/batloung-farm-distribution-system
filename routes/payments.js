const router = require('express').Router();
const controller = require('../controllers/paymentsController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateIdParam } = require('../middleware/validation');

router.get('/', asyncHandler(controller.list));
router.get('/vendor-balances', asyncHandler(controller.vendorBalances));
router.get('/supplier-balances', asyncHandler(controller.supplierBalances));
router.post('/', asyncHandler(controller.create));
router.get(
    '/:type/:id',
    validateIdParam('id', 'payment reference ID'),
    asyncHandler(controller.history)
);

module.exports = router;
