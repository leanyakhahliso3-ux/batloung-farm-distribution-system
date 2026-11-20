const salesModel = require('../models/salesModel');
const stockModel = require('../models/stockModel');
const paymentService = require('../services/paymentService');
const { withTransaction } = require('../middleware/transaction');
const {
    PACKAGING_SIZES,
    PAYMENT_METHODS,
    MAX_MONEY_CENTS,
    isValidId,
    isValidDate,
    isValidQuantity,
    parseMoneyToCents,
    calculatePaymentStatus,
    handleDbError
} = require('../utils/apiHelpers');

function fail(status, message) {
    const error = new Error(message);
    error.statusCode = status;
    return error;
}

function sendFailure(res, error, extraMessages) {
    if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
    }

    return handleDbError(res, error, extraMessages);
}

function validateHeader(body) {
    if (!isValidId(body.vendor_id)) {
        return 'Please select a valid vendor.';
    }

    if (!isValidDate(body.sale_date)) {
        return 'Please provide a valid sale date.';
    }

    if (!PAYMENT_METHODS.includes(body.payment_method)) {
        return 'Payment method must be CASH, MOBILE_MONEY or CREDIT.';
    }

    if (parseMoneyToCents(body.amount_paid) === null) {
        return 'Amount paid must be zero or more with at most two decimal places.';
    }

    return null;
}

function validateItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return 'Add at least one fruit line to the sale.';
    }

    for (const item of items) {
        if (!isValidId(item.fruit_id)) {
            return 'Each line must have a valid fruit.';
        }

        if (!PACKAGING_SIZES.includes(item.packaging_size)) {
            return 'Packaging size must be SMALL, MEDIUM or LARGE.';
        }

        if (!isValidQuantity(item.quantity)) {
            return 'Quantity must be a whole number greater than zero.';
        }

        if (parseMoneyToCents(item.unit_price) === null) {
            return 'Unit price must be zero or more with at most two decimal places.';
        }
    }

    return null;
}

function normaliseBody(body) {
    return {
        vendor_id: Number(body.vendor_id),
        sale_date: body.sale_date,
        payment_method: body.payment_method || 'CREDIT',
        amount_paid_cents: parseMoneyToCents(
            body.amount_paid === undefined || body.amount_paid === '' ? 0 : body.amount_paid
        ),
        amount_paid_supplied: body.amount_paid !== undefined,
        items: (body.items || []).map(item => ({
            fruit_id: Number(item.fruit_id),
            packaging_size: item.packaging_size,
            quantity: Number(item.quantity),
            unit_price_cents: parseMoneyToCents(item.unit_price)
        }))
    };
}

function calculateTotalCents(items) {
    const total = items.reduce(
        (sum, item) => sum + item.unit_price_cents * item.quantity,
        0
    );

    if (!Number.isSafeInteger(total) || total > MAX_MONEY_CENTS) {
        return null;
    }

    return total;
}

function rejectInvalidPayload(values) {
    const invalid = validateHeader(values) || validateItems(values.items);

    if (invalid) {
        return invalid;
    }

    const totalCents = calculateTotalCents(values.items);

    if (totalCents === null) {
        return 'The sale total is too large.';
    }

    if (values.amount_paid_cents > totalCents) {
        return 'Amount paid cannot be more than the sale total.';
    }

    return null;
}

async function validateRelations(connection, values) {
    if (!await salesModel.vendorExists(connection, values.vendor_id)) {
        return 'The selected vendor does not exist.';
    }

    const fruitIds = [...new Set(values.items.map(item => item.fruit_id))];

    if (!await salesModel.fruitsExist(connection, fruitIds)) {
        return 'One of the selected fruits does not exist.';
    }

    return null;
}

function movementMeta(type, id, req) {
    return {
        movementType: type,
        referenceId: id,
        recordedBy: req.user && req.user.user_id
    };
}

async function list(req, res) {
    try {
        const sales = await salesModel.list();
        return res.status(200).json({
            success: true,
            count: sales.length,
            data: sales
        });
    } catch (error) {
        return sendFailure(res, error);
    }
}

async function getById(req, res) {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid sale ID.' });
    }

    try {
        const sale = await salesModel.findById(req.params.id);

        if (!sale) {
            return res.status(404).json({ success: false, message: 'Sale not found.' });
        }

        const items = await salesModel.findItems(req.params.id);
        return res.status(200).json({ success: true, data: { ...sale, items } });
    } catch (error) {
        return sendFailure(res, error);
    }
}

async function create(req, res) {
    try {
        const values = normaliseBody(req.body || {});
        const invalid = rejectInvalidPayload(values);

        if (invalid) {
            return res.status(400).json({ success: false, message: invalid });
        }

        const totalCents = calculateTotalCents(values.items);

        const saleId = await withTransaction(async connection => {
            const relationError = await validateRelations(connection, values);

            if (relationError) {
                throw fail(400, relationError);
            }

            const id = await salesModel.insert(connection, values, totalCents, 0, 'UNPAID');
            await salesModel.insertItems(connection, id, values.items);
            await stockModel.applyDelta(
                connection,
                stockModel.buildDelta([], values.items, 1),
                movementMeta('SALE', id, req)
            );
            await paymentService.recordInitialPayment(connection, {
                type: 'sale',
                id,
                amountCents: values.amount_paid_cents,
                totalCents,
                paymentMethod: values.payment_method,
                recordedBy: req.user && req.user.user_id
            });
            return id;
        });

        return res.status(201).json({
            success: true,
            message: 'Sale recorded successfully. Stock levels were decreased.',
            sale_id: saleId
        });
    } catch (error) {
        return sendFailure(res, error);
    }
}

async function update(req, res) {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid sale ID.' });
    }

    try {
        const values = normaliseBody(req.body || {});
        const invalid = rejectInvalidPayload(values);

        if (invalid) {
            return res.status(400).json({ success: false, message: invalid });
        }

        const totalCents = calculateTotalCents(values.items);

        await withTransaction(async connection => {
            const existing = await salesModel.findByIdForUpdate(connection, req.params.id);

            if (!existing) {
                throw fail(404, 'Sale not found.');
            }

            if (values.amount_paid_supplied) {
                const requestedPaidCents = values.amount_paid_cents;
                const existingPaidCents = parseMoneyToCents(existing.amount_paid) || 0;

                if (requestedPaidCents !== existingPaidCents) {
                    throw fail(400, 'Use the payment endpoints to change amount paid.');
                }
            }

            const paidCents = parseMoneyToCents(existing.amount_paid) || 0;

            if (paidCents > totalCents) {
                throw fail(400, 'The new total cannot be less than the amount already paid.');
            }

            const relationError = await validateRelations(connection, values);

            if (relationError) {
                throw fail(400, relationError);
            }

            const previousItems = await salesModel.findRawItems(connection, req.params.id);

            await salesModel.update(
                connection,
                req.params.id,
                values,
                totalCents,
                paidCents,
                calculatePaymentStatus(paidCents, totalCents)
            );
            await salesModel.replaceItems(connection, req.params.id, values.items);
            await stockModel.applyDelta(
                connection,
                stockModel.buildDelta(previousItems, values.items, 1),
                movementMeta('SALE_UPDATE', req.params.id, req)
            );
        });

        return res.status(200).json({
            success: true,
            message: 'Sale updated successfully. Stock levels were adjusted.'
        });
    } catch (error) {
        return sendFailure(res, error);
    }
}

async function remove(req, res) {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid sale ID.' });
    }

    try {
        await withTransaction(async connection => {
            const existing = await salesModel.findByIdForUpdate(connection, req.params.id);

            if (!existing) {
                throw fail(404, 'Sale not found.');
            }

            const previousItems = await salesModel.findRawItems(connection, req.params.id);
            const affected = await salesModel.remove(connection, req.params.id);

            if (affected === 0) {
                throw fail(404, 'Sale not found.');
            }

            await stockModel.applyDelta(
                connection,
                stockModel.buildDelta(previousItems, [], 1),
                movementMeta('SALE_DELETE', req.params.id, req)
            );
        });

        return res.status(200).json({
            success: true,
            message: 'Sale deleted successfully. Stock levels were restored.'
        });
    } catch (error) {
        return sendFailure(res, error, {
            ER_ROW_IS_REFERENCED_2: {
                status: 409,
                message: 'This sale has payment records and cannot be deleted.'
            }
        });
    }
}

module.exports = {
    list,
    getById,
    create,
    update,
    remove
};
