const vendorsModel = require('../models/vendorsModel');
const {
    isValidDate,
    isValidText,
    handleDbError
} = require('../utils/apiHelpers');

function validate(body) {
    const values = {
        vendor_name: typeof body.vendor_name === 'string' ? body.vendor_name.trim() : '',
        phone_number: typeof body.phone_number === 'string' ? body.phone_number.trim() : '',
        location: typeof body.location === 'string' ? body.location.trim() : '',
        registration_date: body.registration_date
    };

    if (!values.vendor_name || !values.phone_number ||
        !values.location || !values.registration_date) {
        return { error: 'All vendor fields are required.' };
    }

    if (!isValidText(values.vendor_name, 100) ||
        !isValidText(values.phone_number, 15) ||
        !isValidText(values.location, 100)) {
        return { error: 'One or more fields exceed the allowed length.' };
    }

    if (!isValidDate(values.registration_date)) {
        return { error: 'Please provide a valid registration date.' };
    }

    return { values };
}

async function list(req, res) {
    try {
        const vendors = await vendorsModel.list();
        res.status(200).json({
            success: true,
            count: vendors.length,
            data: vendors
        });
    } catch (error) {
        handleDbError(res, error);
    }
}

async function search(req, res) {
    const keyword = String(req.params.keyword || '').trim();

    if (!keyword) {
        return res.status(400).json({
            success: false,
            message: 'Search keyword is required.'
        });
    }

    try {
        const vendors = await vendorsModel.search(keyword);
        res.status(200).json({
            success: true,
            count: vendors.length,
            data: vendors
        });
    } catch (error) {
        handleDbError(res, error);
    }
}

async function getById(req, res) {
    try {
        const vendor = await vendorsModel.findById(req.params.id);

        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found.' });
        }

        res.status(200).json({ success: true, data: vendor });
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
        const vendorId = await vendorsModel.insert(values);
        res.status(201).json({
            success: true,
            message: 'Vendor registered successfully.',
            vendor_id: vendorId
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
        const existing = await vendorsModel.findById(req.params.id);

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Vendor not found.' });
        }

        await vendorsModel.update(req.params.id, values);
        res.status(200).json({ success: true, message: 'Vendor updated successfully.' });
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
        const affected = await vendorsModel.remove(req.params.id);

        if (affected === 0) {
            return res.status(404).json({ success: false, message: 'Vendor not found.' });
        }

        res.status(200).json({ success: true, message: 'Vendor deleted successfully.' });
    } catch (error) {
        handleDbError(res, error, {
            ER_ROW_IS_REFERENCED_2: {
                status: 409,
                message: 'This vendor has sales records and cannot be deleted.'
            }
        });
    }
}

module.exports = {
    list,
    search,
    getById,
    create,
    update,
    remove
};
