const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vendorController');

router.get('/', ctrl.listVendors);
router.post('/', ctrl.addVendor);
router.put('/:id', ctrl.editVendor);
router.delete('/:id', ctrl.removeVendor);


module.exports = router;
