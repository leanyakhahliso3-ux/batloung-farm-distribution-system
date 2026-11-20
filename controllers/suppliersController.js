const suppliersModel = require('../models/suppliersModel');
const {
    PROVINCES,
    isValidText,
    handleDbError
} = require('../utils/apiHelpers');

function validate(body) {
    const values = {
        business_name: typeof body.business_name === 'string' ? body.business_name.trim() : '',
        contact_person: typeof body.contact_person === 'string' ? body.contact_person.trim() : '',
        phone: typeof body.phone === 'string' ? body.phone.trim() : '',
        province: body.province,
        address: typeof body.address === 'string' ? body.address.trim() : ''
    };

    if (!values.business_name || !values.contact_person || !values.phone ||
        !values.province || !values.address) {
        return { error: 'Please complete all supplier fields.' };
    }

    if (!PROVINCES.includes(values.province)) {
        return { error: 'Please select a valid province.' };
    }

    if (!isValidText(values.business_name, 100) ||
        !isValidText(values.contact_person, 100) ||
        !isValidText(values.phone, 15) ||
        !isValidText(values.address, 255)) {
        return { error: 'One or more fields exceed the allowed length.' };
    }

    return { values };
}

async function list(req, res) {
    try {
        const suppliers = await suppliersModel.list();
        res.status(200).json({ success: true, data: suppliers });
    } catch (error) {
        handleDbError(res, error);
    }
}

async function getById(req, res) {
    try {
        const supplier = await suppliersModel.findById(req.params.id);

        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found.' });
        }

        res.status(200).json({ success: true, data: supplier });
    } catch (error) {
        handleDbError(res, error);
    }
}

async function create(req, res) {
    const { error, values } = validate(req.body || {});

    if (error) {
        return res.status(400).json({ success: false, message: error });
    }

    try {
        const supplierId = await suppliersModel.insert(values);
        res.status(201).json({
            success: true,
            message: 'Supplier added successfully.',
            supplier_id: supplierId
        });
    } catch (dbError) {
        handleDbError(res, dbError, {
            ER_DUP_ENTRY: {
                status: 409,
                message: 'This phone number is already registered.'
            }
        });
    }
}

async function update(req, res) {
    const { error, values } = validate(req.body || {});

    if (error) {
        return res.status(400).json({ success: false, message: error });
    }

    try {
        const existing = await suppliersModel.findById(req.params.id);

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Supplier not found.' });
        }

        await suppliersModel.update(req.params.id, values);
        res.status(200).json({ success: true, message: 'Supplier updated successfully.' });
    } catch (dbError) {
        handleDbError(res, dbError, {
            ER_DUP_ENTRY: {
                status: 409,
                message: 'This phone number is already registered.'
            }
        });
    }
}

async function remove(req, res) {
    try {
        const affected = await suppliersModel.remove(req.params.id);

        if (affected === 0) {
            return res.status(404).json({ success: false, message: 'Supplier not found.' });
        }

        res.status(200).json({ success: true, message: 'Supplier deleted successfully.' });
    } catch (error) {
        handleDbError(res, error, {
            ER_ROW_IS_REFERENCED_2: {
                status: 409,
                message: 'This supplier has purchase records and cannot be deleted.'
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
