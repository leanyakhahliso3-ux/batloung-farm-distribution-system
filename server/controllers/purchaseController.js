const purchaseModel = require('../models/purchaseModel');
const { toFiniteNumber, isValidId, isPackagingSize, isValidDateString, describeNumberIssue } = require('../utils/validation');

const listPurchases = async (req, res, next) => {
  try {
    const data = await purchaseModel.getAllPurchases();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const parsePurchaseDate = (value) => {
  if (!value) return { date: null };
  const text = String(value).slice(0, 10);
  if (!isValidDateString(text)) {
    return { error: 'Purchase date must be a valid YYYY-MM-DD date' };
  }
  return { date: text };
};

const buildSimplePayload = async (body) => {
  let supplierId = isValidId(body.supplier_id) ? Number(body.supplier_id) : null;
  if (supplierId === null && body.supplier_name) {
    const supplier = await purchaseModel.findSupplierByName(body.supplier_name);
    if (!supplier) {
      return { error: `Supplier "${body.supplier_name}" was not found. Add the supplier first on the Suppliers page.` };
    }
    supplierId = supplier.supplier_id;
  }
  if (supplierId === null) {
    return { error: 'Select a supplier or enter a supplier name that already exists' };
  }

  let fruitId = isValidId(body.fruit_id) ? Number(body.fruit_id) : null;
  const fruitName = body.fruit_name || body.name || body.item_name || '';
  if (fruitId === null && fruitName) {
    const fruit = await purchaseModel.findFruitByName(fruitName);
    if (!fruit) {
      return { error: `Fruit "${fruitName}" was not found. Add the fruit first on the Fruits & Stock page.` };
    }
    fruitId = fruit.fruit_id;
  }
  if (fruitId === null) {
    return { error: 'Select a fruit that already exists' };
  }

  const quantity = toFiniteNumber(body.quantity ?? body.quantity_kg ?? body.boxes);
  if (quantity === null || !Number.isInteger(quantity) || quantity <= 0) {
    return { error: 'Quantity must be a whole number greater than zero' };
  }

  const packagingSize = body.packaging_size || body.size || 'medium';
  if (!isPackagingSize(packagingSize)) {
    return { error: 'Packaging size must be small, medium, or large' };
  }

  let unitCost = toFiniteNumber(body.unit_cost);
  if (unitCost === null) {
    const total = toFiniteNumber(body.total_amount ?? body.total ?? body.amount);
    if (total === null) {
      return { error: 'Enter a unit cost or a total amount' };
    }
    unitCost = total / quantity;
  }
  if (unitCost < 0) {
    return { error: 'Unit cost cannot be negative' };
  }

  const parsedDate = parsePurchaseDate(body.purchase_date || body.date);
  if (parsedDate.error) return { error: parsedDate.error };

  return {
    payload: {
      supplier_id: supplierId,
      purchase_date: parsedDate.date,
      items: [{ fruit_id: fruitId, packaging_size: packagingSize, quantity, unit_cost: unitCost }],
    },
  };
};

const validateNativePayload = (body) => {
  if (!isValidId(body.supplier_id)) {
    return { error: 'A valid supplier_id is required' };
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return { error: 'At least one purchase item is required' };
  }

  for (const item of body.items) {
    if (!isValidId(item.fruit_id)) return { error: 'Each item requires a valid fruit_id' };
    if (!isPackagingSize(item.packaging_size)) {
      return { error: 'Packaging size must be small, medium, or large' };
    }
    const quantityIssue = describeNumberIssue('Quantity', item.quantity, { min: 0, allowZero: false });
    if (quantityIssue) return { error: quantityIssue };
    if (!Number.isInteger(toFiniteNumber(item.quantity))) {
      return { error: 'Quantity must be a whole number' };
    }
    const costIssue = describeNumberIssue('Unit cost', item.unit_cost);
    if (costIssue) return { error: costIssue };
  }

  const parsedDate = parsePurchaseDate(body.purchase_date || body.date);
  if (parsedDate.error) return { error: parsedDate.error };

  return {
    payload: {
      supplier_id: Number(body.supplier_id),
      purchase_date: parsedDate.date,
      items: body.items.map((item) => ({
        fruit_id: Number(item.fruit_id),
        packaging_size: item.packaging_size,
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost),
      })),
    },
  };
};

const createPurchase = async (req, res, next) => {
  try {
    const hasNativeShape = isValidId(req.body.supplier_id) && Array.isArray(req.body.items);
    const result = hasNativeShape
      ? validateNativePayload(req.body)
      : await buildSimplePayload(req.body);

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const created = await purchaseModel.createPurchaseTransaction(result.payload);
    res.status(201).json({
      success: true,
      message: 'Purchase recorded and stock levels updated.',
      data: created,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { listPurchases, createPurchase };
