const crypto = require('crypto');
const paymentsModel = require('../models/paymentsModel');
const { withTransaction } = require('../middleware/transaction');
const {
    PAYMENT_METHODS,
    PAYMENT_STATUSES,
    isValidId,
    parseMoneyToCents,
    centsToDecimalString,
    calculatePaymentStatus,
    isValidText,
    handleDbError
} = require('../utils/apiHelpers');

function requestError(status, message) {
    const error = new Error(message);
    error.statusCode = status;
    return error;
}

function normaliseType(value) {
    const type = String(value || '').toLowerCase();
    return type === 'purchase' || type === 'sale' ? type : null;
}

async function list(req, res) {
    const requestedStatus = req.query.status;

    if (requestedStatus && !PAYMENT_STATUSES.includes(requestedStatus)) {
        return res.status(400).json({
            success: false,
            message: 'Status must be PAID, PARTIALLY_PAID or UNPAID.'
        });
    }

    try {
        const payments = await paymentsModel.list(requestedStatus);
        return res.status(200).json({
            success: true,
            count: payments.length,
            data: payments
        });
    } catch (error) {
        return handleDbError(res, error);
    }
}

async function create(req, res) {
    const body = req.body || {};
    const type = normaliseType(body.type);
    const id = body.id;
    const amountCents = parseMoneyToCents(body.amount);
    const paymentMethod = body.payment_method || 'CREDIT';
    const reference = body.payment_reference
        ? String(body.payment_reference).trim()
        : `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    try {
        if (!type) {
            throw requestError(400, 'Payment type must be purchase or sale.');
        }

        if (!isValidId(id)) {
            throw requestError(400, 'A valid purchase or sale ID is required.');
        }

        if (amountCents === null || amountCents <= 0) {
            throw requestError(400, 'Payment amount must be greater than zero.');
        }

        if (!PAYMENT_METHODS.includes(paymentMethod)) {
            throw requestError(400, 'Payment method must be CASH, MOBILE_MONEY or CREDIT.');
        }

        if (!isValidText(reference, 100)) {
            throw requestError(400, 'Payment reference must be between 1 and 100 characters.');
        }

        const result = await withTransaction(async connection => {
            const existing = await paymentsModel.findByReference(connection, reference);

            if (existing) {
                const matches = String(existing.payment_reference) === reference &&
                    Number(existing.id || existing.purchase_id || existing.sale_id) === Number(id) &&
                    parseMoneyToCents(existing.amount) === amountCents &&
                    existing.payment_method === paymentMethod &&
                    ((type === 'purchase' && existing.purchase_id) ||
                     (type === 'sale' && existing.sale_id));

                if (!matches) {
                    throw requestError(409, 'This payment reference has already been used.');
                }

                return { duplicate: true, payment_id: existing.payment_id };
            }

            const record = await paymentsModel.lockRecord(connection, type, id);

            if (!record) {
                throw requestError(404, 'The related purchase or sale was not found.');
            }

            const totalCents = parseMoneyToCents(record.total_amount);
            const paidCents = parseMoneyToCents(record.amount_paid) || 0;
            const nextCents = paidCents + amountCents;

            if (nextCents > totalCents) {
                throw requestError(
                    400,
                    `This payment would exceed the total. Only ${centsToDecimalString(totalCents - paidCents)} remains.`
                );
            }

            const paymentId = await paymentsModel.recordPayment(connection, {
                type,
                id: Number(id),
                amount: centsToDecimalString(amountCents),
                payment_method: paymentMethod,
                payment_reference: reference,
                recorded_by: req.user && req.user.user_id
            });

            await paymentsModel.setHeaderPayment(
                connection,
                type,
                id,
                centsToDecimalString(nextCents),
                calculatePaymentStatus(nextCents, totalCents),
                paymentMethod
            );

            return {
                duplicate: false,
                payment_id: paymentId,
                amount_paid: centsToDecimalString(nextCents),
                balance: centsToDecimalString(totalCents - nextCents),
                payment_status: calculatePaymentStatus(nextCents, totalCents)
            };
        });

        return res.status(result.duplicate ? 200 : 201).json({
            success: true,
            message: result.duplicate
                ? 'This payment has already been recorded.'
                : 'Payment recorded successfully.',
            ...result
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return handleDbError(res, error);
    }
}

async function history(req, res) {
    const type = normaliseType(req.params.type);

    try {
        if (!type) {
            throw requestError(400, 'Payment type must be purchase or sale.');
        }

        if (!isValidId(req.params.id)) {
            throw requestError(400, 'A valid purchase or sale ID is required.');
        }

        const rows = await paymentsModel.history(type, req.params.id);
        return res.status(200).json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return handleDbError(res, error);
    }
}

async function vendorBalances(req, res) {
    try {
        const balances = await paymentsModel.vendorBalances();
        return res.status(200).json({ success: true, count: balances.length, data: balances });
    } catch (error) {
        return handleDbError(res, error);
    }
}

async function supplierBalances(req, res) {
    try {
        const balances = await paymentsModel.supplierBalances();
        return res.status(200).json({ success: true, count: balances.length, data: balances });
    } catch (error) {
        return handleDbError(res, error);
    }
}

module.exports = {
    list,
    create,
    history,
    vendorBalances,
    supplierBalances
};
