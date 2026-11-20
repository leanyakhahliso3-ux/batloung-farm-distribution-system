const PACKAGING_SIZES = ['SMALL', 'MEDIUM', 'LARGE'];
const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'CREDIT'];
const PAYMENT_STATUSES = ['PAID', 'PARTIALLY_PAID', 'UNPAID'];
const PROVINCES = [
    'Gauteng',
    'Free State',
    'KwaZulu-Natal',
    'Western Cape',
    'Eastern Cape',
    'Limpopo',
    'Mpumalanga',
    'North West',
    'Northern Cape'
];

const MAX_MONEY_CENTS = 9999999999;
const DEFAULT_LOW_STOCK_THRESHOLD = 10;

function isValidId(value) {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return /^[1-9]\d*$/.test(trimmed) && Number.isSafeInteger(Number(trimmed));
    }

    return false;
}

function isValidDate(value, options = {}) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return false;
    }

    if (options.allowFuture !== true) {
        const today = new Date().toISOString().slice(0, 10);
        return value <= today;
    }

    return true;
}

function parseMoneyToCents(value) {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return null;
    }

    if (typeof value === 'number' && !Number.isFinite(value)) {
        return null;
    }

    const text = String(value).trim();

    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
        return null;
    }

    const [whole, fraction = ''] = text.split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));

    if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_MONEY_CENTS) {
        return null;
    }

    return cents;
}

function centsToMoney(cents) {
    return Math.round(cents) / 100;
}

function centsToDecimalString(cents) {
    return centsToMoney(cents).toFixed(2);
}

function isValidMoney(value) {
    return parseMoneyToCents(value) !== null;
}

function isValidQuantity(value) {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 && value <= 2147483647;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return /^[1-9]\d*$/.test(trimmed) &&
            Number.isSafeInteger(Number(trimmed)) &&
            Number(trimmed) <= 2147483647;
    }

    return false;
}

function isValidNonNegativeInteger(value) {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value >= 0 && value <= 2147483647;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return /^\d+$/.test(trimmed) &&
            Number.isSafeInteger(Number(trimmed)) &&
            Number(trimmed) <= 2147483647;
    }

    return false;
}

function isValidText(value, maxLength) {
    return typeof value === 'string' && value.trim().length > 0 &&
        value.trim().length <= maxLength;
}

function roundMoney(value) {
    const cents = parseMoneyToCents(value);

    if (cents !== null) {
        return centsToMoney(cents);
    }

    const amount = Number(value);
    return Number.isFinite(amount)
        ? Math.round((amount + Number.EPSILON) * 100) / 100
        : 0;
}

function calculatePaymentStatus(amountPaid, totalAmount) {
    const paidCents = parseMoneyToCents(amountPaid) ?? Math.round(Number(amountPaid) * 100);
    const totalCents = parseMoneyToCents(totalAmount) ?? Math.round(Number(totalAmount) * 100);

    if (paidCents >= totalCents) {
        return 'PAID';
    }

    if (paidCents <= 0) {
        return 'UNPAID';
    }

    return 'PARTIALLY_PAID';
}

function handleDbError(res, error, extraMessages = {}) {
    if (error && error.name === 'InsufficientStockError') {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    const defaultMessages = {
        ER_NO_REFERENCED_ROW_2: {
            status: 400,
            message: 'A related supplier, vendor, fruit or user does not exist.'
        },
        ER_ROW_IS_REFERENCED_2: {
            status: 409,
            message: 'This record is linked to other records and cannot be deleted.'
        },
        ER_DUP_ENTRY: {
            status: 409,
            message: 'A record with these details already exists.'
        },
        ER_CHECK_CONSTRAINT_VIOLATED: {
            status: 400,
            message: 'The values entered do not satisfy the database rules.'
        },
        ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: {
            status: 400,
            message: 'One of the values has an invalid format.'
        },
        ER_TRUNCATED_WRONG_VALUE: {
            status: 400,
            message: 'One of the values has an invalid format.'
        },
        ER_DATA_TOO_LONG: {
            status: 400,
            message: 'One of the values is too long.'
        },
        ER_OUT_OF_RANGE: {
            status: 400,
            message: 'One of the numbers is outside the allowed range.'
        },
        ER_WARN_DATA_OUT_OF_RANGE: {
            status: 400,
            message: 'One of the numbers is outside the allowed range.'
        },
        ER_LOCK_DEADLOCK: {
            status: 409,
            message: 'The request conflicted with another update. Please try again.'
        },
        ER_LOCK_WAIT_TIMEOUT: {
            status: 409,
            message: 'The request timed out waiting for another update. Please try again.'
        }
    };

    const messages = { ...defaultMessages, ...extraMessages };
    const details = messages[error && error.code];

    if (details) {
        return res.status(details.status).json({
            success: false,
            message: details.message
        });
    }

    console.error('Database error:', error && error.message);

    return res.status(500).json({
        success: false,
        message: 'A database error occurred. Please try again.'
    });
}

module.exports = {
    PACKAGING_SIZES,
    PAYMENT_METHODS,
    PAYMENT_STATUSES,
    PROVINCES,
    MAX_MONEY_CENTS,
    DEFAULT_LOW_STOCK_THRESHOLD,
    isValidId,
    isValidDate,
    parseMoneyToCents,
    centsToMoney,
    centsToDecimalString,
    isValidMoney,
    isValidQuantity,
    isValidNonNegativeInteger,
    isValidText,
    roundMoney,
    calculatePaymentStatus,
    handleDbError
};
