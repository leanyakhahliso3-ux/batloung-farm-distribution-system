const vendorModel = require('../models/vendorModel');
const { isValidId } = require('../utils/validation');


const listVendors = async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim();
    const data = await vendorModel.getAllVendors(search);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const addVendor = async (req, res, next) => {
  try {
    const { vendor_name, phone_number, location, registration_date } = req.body;
    if (!vendor_name || !phone_number || !location) {
      return res.status(400).json({
        success: false,
        message: 'Vendor name, phone number, and location are required',
      });
    }
    const created = await vendorModel.createVendor({
      vendor_name, phone_number, location, registration_date,
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

const editVendor = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
    }
    const { vendor_name, phone_number, location, registration_date } = req.body;
    if (!vendor_name || !phone_number || !location) {
      return res.status(400).json({
        success: false,
        message: 'Vendor name, phone number, and location are required',
      });
    }
    const updated = await vendorModel.updateVendor(req.params.id, {
      vendor_name, phone_number, location, registration_date,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const removeVendor = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
    }
    const deleted = await vendorModel.deleteVendor(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    res.status(200).json({ success: true, message: 'Vendor deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listVendors, addVendor, editVendor, removeVendor };
