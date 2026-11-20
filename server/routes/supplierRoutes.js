const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/supplierController');

router.get('/', ctrl.listSuppliers);
router.get('/:id', ctrl.getSupplier);
router.post('/', ctrl.addSupplier);
router.put('/:id', ctrl.editSupplier);
router.delete('/:id', ctrl.removeSupplier);

module.exports = router;
