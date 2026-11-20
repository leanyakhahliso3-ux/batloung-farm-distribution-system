const saleModel = require('../models/saleModel');
const { findFruitByName } = require('../models/purchaseModel');
const { toFiniteNumber, isValidId, isPackagingSize, isValidPaymentMethod, isValidDateString, describeNumberIssue } = require('../utils/validation');

const listSales = async (req, res, next) => {
  try {
    const data = await saleModel.getAllSales();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const parseSaleDate = (value) => {
  if (!value) return { date: null };
  const text = String(value).slice(0, 10);
  if (!isValidDateString(text)) {
    return { error: 'Sale date must be a valid YYYY-MM-DD date' };
  }
  return { date: text };
};

const validateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'At least one sale item is required' };
  }
  for (const item of items) {
    if (!isValidId(item.fruit_id)) return { error: 'Each item requires a valid fruit_id' };
    if (!isPackagingSize(item.packaging_size)) {
      return { error: 'Packaging size must be small, medium, or large' };
    }
    const quantityIssue = describeNumberIssue('Quantity', item.quantity, { min: 0, allowZero: false });
    if (quantityIssue) return { error: quantityIssue };
    if (!Number.isInteger(toFiniteNumber(item.quantity))) {
      return { error: 'Quantity must be a whole number' };
    }
  }
  return { items: items.map((item) => ({
    fruit_id: Number(item.fruit_id),
    packaging_size: item.packaging_size,
    quantity: Number(item.quantity),
  })) };
};

const buildSalePayload = async (body) => {
  let vendorId = isValidId(body.vendor_id) ? Number(body.vendor_id) : null;
  const vendorName = body.vendor_name || body.customer_name || body.vendor || '';
  if (vendorId === null && vendorName) {
    const vendor = await saleModel.findVendorByName(vendorName);
    if (!vendor) {
      return { error: `Vendor "${vendorName}" was not found. Add the vendor first on the Vendors page.` };
    }
    vendorId = vendor.vendor_id;
  }
  if (vendorId === null) {
    return { error: 'Select a vendor or enter a vendor name that already exists' };
  }

  let items = body.items;
  if (!Array.isArray(items) && (body.fruit_name || body.name || body.item_name || body.fruit_id)) {
    let fruitId = isValidId(body.fruit_id) ? Number(body.fruit_id) : null;
    if (fruitId === null) {
      const fruitName = body.fruit_name || body.name || body.item_name;
      const fruit = await findFruitByName(fruitName);
      if (!fruit) {
        return { error: `Fruit "${fruitName}" was not found. Add the fruit first on the Fruits & Stock page.` };
      }
      fruitId = fruit.fruit_id;
    }
    const quantity = toFiniteNumber(body.quantity ?? body.quantity_kg ?? body.boxes);
    if (quantity === null || !Number.isInteger(quantity) || quantity <= 0) {
      return { error: 'Quantity must be a whole number greater than zero' };
    }
    items = [{
      fruit_id: fruitId,
      packaging_size: body.packaging_size || body.size || 'medium',
      quantity,
    }];
  }

  const checkedItems = validateItems(items);
  if (checkedItems.error) return { error: checkedItems.error };

  const paymentMethod = body.payment_method || 'CASH';
  if (!isValidPaymentMethod(paymentMethod)) {
    return { error: 'Payment method must be CASH, MOBILE_MONEY, or CREDIT' };
  }

  const amountPaid = toFiniteNumber(body.amount_paid ?? body.amount_paid_now ?? 0) ?? 0;
  if (amountPaid < 0) return { error: 'Amount paid cannot be negative' };

  const parsedDate = parseSaleDate(body.sale_date || body.date);
  if (parsedDate.error) return { error: parsedDate.error };

  return {
    payload: {
      vendor_id: vendorId,
      payment_method: paymentMethod,
      amount_paid: amountPaid,
      items: checkedItems.items,
      sale_date: parsedDate.date,
    },
  };
};

const createSale = async (req, res, next) => {
  try {
    const result = await buildSalePayload(req.body);
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }
    const created = await saleModel.createSaleTransaction(result.payload);
    res.status(201).json({
      success: true,
      message: 'Sale completed, stock updated, and payment recorded.',
      data: created,
    });
  } catch (err) {
    next(err);
  }
};

const recordPayment = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid sale ID' });
    }
    if (req.body.payment_method !== undefined && !isValidPaymentMethod(req.body.payment_method)) {
      return res.status(400).json({ success: false, message: 'Payment method must be CASH, MOBILE_MONEY, or CREDIT' });
    }
    const updated = await saleModel.updateSalePayment(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const listPaymentHistory = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid sale ID' });
    }
    const entries = await saleModel.getPaymentHistory(req.params.id);
    if (!entries) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    res.status(200).json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
};

const recordPaymentEntry = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid sale ID' });
    }
    if (req.body.payment_method !== undefined && !isValidPaymentMethod(req.body.payment_method)) {
      return res.status(400).json({ success: false, message: 'Payment method must be CASH, MOBILE_MONEY, or CREDIT' });
    }
    const amount = toFiniteNumber(req.body.amount);
    if (amount === null || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }
    const updated = await saleModel.addSalePayment(req.params.id, {
      amount,
      payment_method: req.body.payment_method,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    res.status(201).json({ success: true, message: 'Payment recorded.', data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = { listSales, createSale, recordPayment, listPaymentHistory, recordPaymentEntry };
