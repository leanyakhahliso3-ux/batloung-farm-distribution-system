const router = require('express').Router();
const controller = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate } = require('../middleware/auth');

router.post('/login', asyncHandler(controller.login));
router.post('/logout', authenticate, asyncHandler(controller.logout));
router.get('/me', authenticate, asyncHandler(controller.me));

module.exports = router;
