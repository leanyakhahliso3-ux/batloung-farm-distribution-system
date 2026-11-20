const supplierModel = require('../models/supplierModel');
const { isValidId } = require('../utils/validation');


const VALID_PROVINCES = [
  'Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape',
  'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape',
];

const listSuppliers = async (req, res, next) => {
  try {
    const data = await supplierModel.getAllSuppliers();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getSupplier = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }
    const supplier = await supplierModel.getSupplierById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};

const addSupplier = async (req, res, next) => {
  try {
    const { business_name, contact_person, phone, province, address } = req.body;
    if (!business_name || !contact_person || !phone || !province || !address) {
      return res.status(400).json({ success: false, message: 'All supplier fields are required' });
    }
    if (!VALID_PROVINCES.includes(province)) {
      return res.status(400).json({ success: false, message: 'Invalid South African province' });
    }
    const created = await supplierModel.createSupplier({ business_name, contact_person, phone, province, address });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

const editSupplier = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }
    const { business_name, contact_person, phone, province, address } = req.body;
    if (!business_name || !contact_person || !phone || !province || !address) {
      return res.status(400).json({ success: false, message: 'All supplier fields are required' });
    }
    if (!VALID_PROVINCES.includes(province)) {
      return res.status(400).json({ success: false, message: 'Invalid South African province' });
    }
    const updated = await supplierModel.updateSupplier(req.params.id, {
      business_name, contact_person, phone, province, address,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const removeSupplier = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }
    const deleted = await supplierModel.deleteSupplier(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listSuppliers, getSupplier, addSupplier, editSupplier, removeSupplier };
