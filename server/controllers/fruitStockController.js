const fruitStockModel = require('../models/fruitStockModel');
const { toFiniteNumber, isValidId, isPackagingSize, isValidFruitStatus, describeNumberIssue } = require('../utils/validation');

const pickFruitName = (body) => body.fruit_name || body.name || body.fruit || '';
const pickDescription = (body) => body.description ?? body.category ?? body.variety ?? '';

const parsePrices = (body) => {
  const source = body.prices && typeof body.prices === 'object' ? body.prices : body;
  const single = toFiniteNumber(body.unit_price ?? body.price ?? body.selling_price);
  const result = {};

  for (const size of ['small', 'medium', 'large']) {
    const raw = source[size] ?? (single !== null ? single : undefined);
    if (raw === undefined || raw === '') continue;
    const price = toFiniteNumber(raw);
    if (price === null || price < 0) {
      return { error: `The ${size} price must be a non-negative number` };
    }
    result[size] = price;
  }
  return { prices: result };
};

const listFruits = async (req, res, next) => {
  try {
    const data = await fruitStockModel.getAllFruits();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const addFruit = async (req, res, next) => {
  try {
    const fruitName = String(pickFruitName(req.body)).trim();
    if (!fruitName) {
      return res.status(400).json({ success: false, message: 'Fruit name is required' });
    }

    const status = req.body.status || 'AVAILABLE';
    if (!isValidFruitStatus(status)) {
      return res.status(400).json({ success: false, message: 'Status must be AVAILABLE or UNAVAILABLE' });
    }

    const parsed = parsePrices(req.body);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const created = await fruitStockModel.createFruitWithStock({
      fruit_name: fruitName,
      description: String(pickDescription(req.body)).trim(),
      status,
      prices: parsed.prices,
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

const editFruit = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid fruit ID' });
    }

    const payload = {};
    if (pickFruitName(req.body)) {
      payload.fruit_name = String(pickFruitName(req.body)).trim();
    }
    if (req.body.description !== undefined || req.body.category !== undefined || req.body.variety !== undefined) {
      payload.description = String(pickDescription(req.body)).trim();
    }
    if (req.body.status !== undefined) {
      if (!isValidFruitStatus(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status must be AVAILABLE or UNAVAILABLE' });
      }
      payload.status = req.body.status;
    }

    const updated = await fruitStockModel.updateFruit(req.params.id, payload);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Fruit not found' });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const removeFruit = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid fruit ID' });
    }
    const updated = await fruitStockModel.deactivateFruit(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Fruit not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Fruit marked as UNAVAILABLE. Existing stock and history were preserved.',
    });
  } catch (err) {
    next(err);
  }
};

const viewStock = async (req, res, next) => {
  try {
    const size = req.query.size;
    if (size && !isPackagingSize(size)) {
      return res.status(400).json({ success: false, message: 'Packaging size must be small, medium, or large' });
    }
    const data = await fruitStockModel.getStockByPackaging(size);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const viewLowStock = async (req, res, next) => {
  try {
    const threshold = toFiniteNumber(req.query.threshold) ?? 10;
    if (threshold < 0) {
      return res.status(400).json({ success: false, message: 'Threshold cannot be negative' });
    }
    const data = await fruitStockModel.getLowStock(threshold);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const editStockPrice = async (req, res, next) => {
  try {
    if (!isValidId(req.params.stockId)) {
      return res.status(400).json({ success: false, message: 'Invalid stock ID' });
    }
    const issue = describeNumberIssue('Selling price', req.body.selling_price);
    if (issue) {
      return res.status(400).json({ success: false, message: issue });
    }
    const updated = await fruitStockModel.updateStockPrice(req.params.stockId, toFiniteNumber(req.body.selling_price));
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Stock record not found' });
    }
    res.status(200).json({ success: true, message: 'Selling price updated' });
  } catch (err) {
    next(err);
  }
};

const editStockQuantity = async (req, res, next) => {
  try {
    if (!isValidId(req.params.stockId)) {
      return res.status(400).json({ success: false, message: 'Invalid stock ID' });
    }
    const quantity = toFiniteNumber(req.body.available_quantity ?? req.body.quantity);
    if (quantity === null || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a whole number of zero or more' });
    }
    const updated = await fruitStockModel.updateStockQuantity(req.params.stockId, quantity);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Stock record not found' });
    }
    res.status(200).json({ success: true, message: 'Stock quantity updated' });
  } catch (err) {
    next(err);
  }
};

const editStockDetails = async (req, res, next) => {
  try {
    if (!isValidId(req.params.stockId)) {
      return res.status(400).json({ success: false, message: 'Invalid stock ID' });
    }

    const hasPrice = Object.prototype.hasOwnProperty.call(req.body, 'selling_price');
    const hasQuantity = Object.prototype.hasOwnProperty.call(req.body, 'available_quantity')
      || Object.prototype.hasOwnProperty.call(req.body, 'quantity');

    if (!hasPrice && !hasQuantity) {
      return res.status(400).json({ success: false, message: 'Selling price or available quantity is required' });
    }

    const updates = {};

    if (hasPrice) {
      const issue = describeNumberIssue('Selling price', req.body.selling_price);
      if (issue) {
        return res.status(400).json({ success: false, message: issue });
      }
      updates.sellingPrice = toFiniteNumber(req.body.selling_price);
    }

    if (hasQuantity) {
      const quantity = toFiniteNumber(req.body.available_quantity ?? req.body.quantity);
      if (quantity === null || !Number.isInteger(quantity) || quantity < 0) {
        return res.status(400).json({ success: false, message: 'Quantity must be a whole number of zero or more' });
      }
      updates.quantity = quantity;
    }

    const updated = await fruitStockModel.updateStockDetails(req.params.stockId, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Stock record not found' });
    }

    res.status(200).json({ success: true, message: 'Stock details updated', data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listFruits,
  addFruit,
  editFruit,
  removeFruit,
  viewStock,
  viewLowStock,
  editStockPrice,
  editStockQuantity,
  editStockDetails,
};
