const fruitsModel = require('../models/fruitsModel');
const {
    isValidText,
    handleDbError
} = require('../utils/apiHelpers');

const FRUIT_STATUSES = ['Available', 'Unavailable'];

function validate(body, requireStatus) {
    const values = {
        fruit_name: typeof body.fruit_name === 'string' ? body.fruit_name.trim() : '',
        description: typeof body.description === 'string' && body.description.trim()
            ? body.description.trim()
            : null,
        status: body.status || 'Available'
    };

    if (!isValidText(values.fruit_name, 50)) {
        return { error: 'Fruit name is required and cannot exceed 50 characters.' };
    }

    if (values.description !== null && values.description.length > 255) {
        return { error: 'Description cannot exceed 255 characters.' };
    }

    if (!FRUIT_STATUSES.includes(values.status)) {
        return { error: 'Status must be Available or Unavailable.' };
    }

    if (requireStatus && !body.status) {
        return { error: 'Status must be Available or Unavailable.' };
    }

    return { values };
}

async function list(req, res) {
    try {
        const fruits = await fruitsModel.list();
        res.status(200).json({ success: true, data: fruits });
    } catch (error) {
        handleDbError(res, error);
    }
}

async function getById(req, res) {
    try {
        const fruit = await fruitsModel.findById(req.params.id);

        if (!fruit) {
            return res.status(404).json({ success: false, message: 'Fruit not found.' });
        }

        res.status(200).json({ success: true, data: fruit });
    } catch (error) {
        handleDbError(res, error);
    }
}

async function create(req, res) {
    const { error, values } = validate(req.body || {}, false);

    if (error) {
        return res.status(400).json({ success: false, message: error });
    }

    try {
        const fruitId = await fruitsModel.insert(values);
        res.status(201).json({
            success: true,
            message: 'Fruit added successfully.',
            fruit_id: fruitId
        });
    } catch (dbError) {
        handleDbError(res, dbError, {
            ER_DUP_ENTRY: {
                status: 409,
                message: 'This fruit already exists.'
            }
        });
    }
}

async function update(req, res) {
    const { error, values } = validate(req.body || {}, true);

    if (error) {
        return res.status(400).json({ success: false, message: error });
    }

    try {
        const existing = await fruitsModel.findById(req.params.id);

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Fruit not found.' });
        }

        await fruitsModel.update(req.params.id, values);
        res.status(200).json({ success: true, message: 'Fruit updated successfully.' });
    } catch (dbError) {
        handleDbError(res, dbError, {
            ER_DUP_ENTRY: {
                status: 409,
                message: 'Another fruit already has this name.'
            }
        });
    }
}

async function remove(req, res) {
    try {
        const affected = await fruitsModel.remove(req.params.id);

        if (affected === 0) {
            return res.status(404).json({ success: false, message: 'Fruit not found.' });
        }

        res.status(200).json({ success: true, message: 'Fruit deleted successfully.' });
    } catch (error) {
        handleDbError(res, error, {
            ER_ROW_IS_REFERENCED_2: {
                status: 409,
                message: 'This fruit has purchase, sales or stock records and cannot be deleted.'
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
