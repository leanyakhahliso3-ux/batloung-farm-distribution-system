const paymentsModel = require('../models/paymentsModel');
const { calculatePaymentStatus, centsToDecimalString } = require('../utils/apiHelpers');

async function recordInitialPayment(connection, values) {
    if (!values.amountCents || values.amountCents <= 0) {
        return null;
    }

    const amount = centsToDecimalString(values.amountCents);
    const paymentStatus = calculatePaymentStatus(values.amountCents, values.totalCents);
    const reference = `INIT-${values.type.toUpperCase()}-${values.id}`;

    const paymentId = await paymentsModel.recordPayment(connection, {
        type: values.type,
        id: values.id,
        amount,
        payment_method: values.paymentMethod,
        payment_reference: reference,
        recorded_by: values.recordedBy || null
    });

    await paymentsModel.setHeaderPayment(
        connection,
        values.type,
        values.id,
        amount,
        paymentStatus,
        values.paymentMethod
    );

    return paymentId;
}

module.exports = {
    recordInitialPayment
};
