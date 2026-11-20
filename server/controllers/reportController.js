const reportModel = require('../models/reportModel');
const { isValidDateString } = require('../utils/validation');

const currentYearRange = () => {
  const year = new Date().getFullYear();
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
};

const topFruits = async (req, res, next) => {
  try {
    const data = await reportModel.getTopSoldFruits();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const revenueByRange = async (req, res, next) => {
  try {
    const defaults = currentYearRange();
    const startDate = req.query.startDate || defaults.startDate;
    const endDate = req.query.endDate || defaults.endDate;
    if (!isValidDateString(startDate) || !isValidDateString(endDate) || startDate > endDate) {
      return res.status(400).json({ success: false, message: 'Enter a valid date range (start date before end date)' });
    }
    const data = await reportModel.getRevenueByDateRange(startDate, endDate);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const topVendor = async (req, res, next) => {
  try {
    const data = await reportModel.getTopVendorByBoxes();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const stockLevels = async (req, res, next) => {
  try {
    const data = await reportModel.getCurrentStockLevels();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { topFruits, revenueByRange, topVendor, stockLevels };
