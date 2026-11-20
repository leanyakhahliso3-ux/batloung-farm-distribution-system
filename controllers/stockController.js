const stockModel = require('../models/stockModel');
const { withTransaction } = require('../middleware/transaction');
const {
    PACKAGING_SIZES,
    isValidId,
    isValidNonNegativeInteger,
    handleDbError
} = require('../utils/apiHelpers');

function normaliseSize(value, fallback) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return String(value).toUpperCase();
}

async function list(req, res) {
    try {
        const stock = await stockModel.list();
        return res.status(200).json({ success: true, data: stock });
    } catch (error) {
        return handleDbError(res, error);
    }
}

async function listByFruit(req, res) {
    const fruitId = req.params.fruitId;

    if (!isValidId(fruitId)) {
        return res.status(400).json({ success: false, message: 'Invalid fruit ID.' });
    }

    try {
        const stock = await stockModel.listByFruit(Number(fruitId));
        return res.status(200).json({ success: true, data: stock });
    } catch (error) {
        return handleDbError(res, error);
    }
}

async function listByPackagingSize(req, res) {
    const packagingSize = normaliseSize(req.params.packagingSize);

    if (!PACKAGING_SIZES.includes(packagingSize)) {
        return res.status(400).json({
            success: false,
            message: 'Packaging size must be SMALL, MEDIUM or LARGE.'
        });
    }

    try {
        const stock = await stockModel.listByPackagingSize(packagingSize);
        return res.status(200).json({ success: true, data: stock });
    } catch (error) {
        return handleDbError(res, error);
    }
}

async function listLowStock(req, res) {
    const requested = req.query.threshold ?? 10;

    if (!isValidNonNegativeInteger(requested)) {
        return res.status(400).json({
            success: false,
            message: 'Stock threshold must be a non-negative whole number.'
        });
    }

    const threshold = Number(requested);

    try {
        const stock = await stockModel.listLowStock(threshold);
        return res.status(200).json({
            success: true,
            threshold,
            count: stock.length,
            data: stock
        });
    } catch (error) {
        return handleDbError(res, error);
    }
}

async function create(req, res) {
    const body = req.body || {};
    const fruitId = body.fruit_id;
    const packagingSize = normaliseSize(body.packaging_size);
    const quantity = body.available_quantity;

    if (!isValidId(fruitId)) {
        return res.status(400).json({ success: false, message: 'Please select a valid fruit.' });
    }

    if (!PACKAGING_SIZES.includes(packagingSize)) {
        return res.status(400).json({
            success: false,
            message: 'Packaging size must be SMALL, MEDIUM or LARGE.'
        });
    }

    if (!isValidNonNegativeInteger(quantity)) {
        return res.status(400).json({
            success: false,
            message: 'Available boxes must be a whole number of zero or more.'
        });
    }

    try {
        const stockId = await withTransaction(async connection => {
            const exists = await stockModel.fruitExists(connection, Number(fruitId));

            if (!exists) {
                const error = new Error('The selected fruit does not exist.');
                error.statusCode = 400;
                throw error;
            }

            const id = await stockModel.insert(connection, Number(fruitId), packagingSize, Number(quantity));

            if (Number(quantity) > 0) {
                await stockModel.recordMovement(connection, {
                    stockId: id,
                    fruitId: Number(fruitId),
                    packagingSize,
                    quantityChange: Number(quantity),
                    balanceAfter: Number(quantity),
                    movementType: 'MANUAL_ADJUSTMENT',
                    referenceId: id,
                    recordedBy: req.user && req.user.user_id
                });
            }

            return id;
        });

        return res.status(201).json({
            success: true,
            message: 'Stock record added successfully.',
            stock_id: stockId
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }

        return handleDbError(res, error, {
            ER_DUP_ENTRY: {
                status: 409,
                message: 'Stock for this fruit and packaging size already exists. Edit it instead.'
            }
        });
    }
}

async function update(req, res) {
    const stockId = req.params.id;

    if (!isValidId(stockId)) {
        return res.status(400).json({ success: false, message: 'Invalid stock ID.' });
    }

    const body = req.body || {};
    const packagingSize = normaliseSize(body.packaging_size);

    if (packagingSize && !PACKAGING_SIZES.includes(packagingSize)) {
        return res.status(400).json({
            success: false,
            message: 'Packaging size must be SMALL, MEDIUM or LARGE.'
        });
    }

    if (body.available_quantity !== undefined && !isValidNonNegativeInteger(body.available_quantity)) {
        return res.status(400).json({
            success: false,
            message: 'Available boxes must be a whole number of zero or more.'
        });
    }

    try {
        await withTransaction(async connection => {
            const current = await stockModel.findByIdForUpdate(connection, Number(stockId));

            if (!current) {
                const error = new Error('Stock record not found.');
                error.statusCode = 404;
                throw error;
            }

            const fruitId = body.fruit_id === undefined
                ? current.fruit_id
                : body.fruit_id;
            const size = packagingSize || current.packaging_size;
            const quantity = body.available_quantity === undefined
                ? current.available_quantity
                : Number(body.available_quantity);

            if (!isValidId(fruitId)) {
                const error = new Error('Please select a valid fruit.');
                error.statusCode = 400;
                throw error;
            }

            const exists = await stockModel.fruitExists(connection, Number(fruitId));

            if (!exists) {
                const error = new Error('The selected fruit does not exist.');
                error.statusCode = 400;
                throw error;
            }

            await stockModel.update(connection, Number(stockId), Number(fruitId), size, quantity);

            const change = quantity - Number(current.available_quantity);

            if (change !== 0) {
                await stockModel.recordMovement(connection, {
                    stockId: Number(stockId),
                    fruitId: Number(fruitId),
                    packagingSize: size,
                    quantityChange: change,
                    balanceAfter: quantity,
                    movementType: 'MANUAL_ADJUSTMENT',
                    referenceId: Number(stockId),
                    recordedBy: req.user && req.user.user_id
                });
            }
        });

        return res.status(200).json({ success: true, message: 'Stock record updated successfully.' });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }

        return handleDbError(res, error, {
            ER_DUP_ENTRY: {
                status: 409,
                message: 'Stock for this fruit and packaging size already exists.'
            }
        });
    }
}

async function remove(req, res) {
    const stockId = req.params.id;

    if (!isValidId(stockId)) {
        return res.status(400).json({ success: false, message: 'Invalid stock ID.' });
    }

    try {
        await withTransaction(async connection => {
            const current = await stockModel.findByIdForUpdate(connection, Number(stockId));

            if (!current) {
                const error = new Error('Stock record not found.');
                error.statusCode = 404;
                throw error;
            }

            if (Number(current.available_quantity) > 0) {
                await stockModel.recordMovement(connection, {
                    stockId: Number(stockId),
                    fruitId: current.fruit_id,
                    packagingSize: current.packaging_size,
                    quantityChange: -Number(current.available_quantity),
                    balanceAfter: 0,
                    movementType: 'MANUAL_ADJUSTMENT',
                    referenceId: Number(stockId),
                    recordedBy: req.user && req.user.user_id
                });
            }

            await stockModel.remove(connection, Number(stockId));
        });

        return res.status(200).json({ success: true, message: 'Stock record deleted successfully.' });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }

        return handleDbError(res, error);
    }
}

module.exports = {
    list,
    listByFruit,
    listByPackagingSize,
    listLowStock,
    create,
    update,
    remove
};
