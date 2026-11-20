const reportsModel = require('../models/reportsModel');
const {
    DEFAULT_LOW_STOCK_THRESHOLD,
    isValidDate,
    isValidNonNegativeInteger,
    handleDbError
} = require('../utils/apiHelpers');

function defaultRange() {
    const now = new Date();
    const endDate = now.toISOString().slice(0, 10);
    const startDate = `${endDate.slice(0, 7)}-01`;
    return { startDate, endDate };
}

async function summary(req, res) {
    const requested = req.query.threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;

    if (!isValidNonNegativeInteger(requested)) {
        return res.status(400).json({
            success: false,
            message: 'Stock threshold must be a non-negative whole number.'
        });
    }

    const threshold = Number(requested);

    try {
        const [summaryRow, transactions, stockAlerts] = await Promise.all([
            reportsModel.getSummary(threshold),
            reportsModel.getRecentTransactions(),
            reportsModel.getStockAlerts(threshold)
        ]);

        return res.status(200).json({
            success: true,
            data: {
                summary: summaryRow,
                transactions,
                stock_alerts: stockAlerts,
                low_stock_threshold: threshold
            }
        });
    } catch (error) {
        return handleDbError(res, error);
    }
}

async function topFruits(req, res) {
    const requestedLimit = Number(req.query.limit ?? 5);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 && requestedLimit <= 20
        ? requestedLimit
        : 5;

    try {
        const fruits = await reportsModel.topFruits(limit);
        res.status(200).json({ success: true, count: fruits.length, data: fruits });
    } catch (error) {
        handleDbError(res, error);
    }
}

async function salesRevenue(req, res) {
    const defaults = defaultRange();
    const startDate = req.query.startDate || defaults.startDate;
    const endDate = req.query.endDate || defaults.endDate;

    if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
        return res.status(400).json({
            success: false,
            message: 'Provide a valid start date and end date, with the start date first.'
        });
    }

    try {
        const result = await reportsModel.salesRevenue(startDate, endDate);
        res.status(200).json({
            success: true,
            data: {
                start_date: startDate,
                end_date: endDate,
                total_sales: Number(result.total_sales),
                total_revenue: Number(result.total_revenue),
                total_received: Number(result.total_received)
            }
        });
    } catch (error) {
        handleDbError(res, error);
    }
}

async function topVendor(req, res) {
    try {
        const vendor = await reportsModel.topVendor();
        res.status(200).json({ success: true, data: vendor });
    } catch (error) {
        handleDbError(res, error);
    }
}

async function stockLevels(req, res) {
    try {
        const stock = await reportsModel.stockLevels();
        res.status(200).json({ success: true, count: stock.length, data: stock });
    } catch (error) {
        handleDbError(res, error);
    }
}

module.exports = {
    summary,
    topFruits,
    salesRevenue,
    topVendor,
    stockLevels
};
