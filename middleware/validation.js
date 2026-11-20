const { isValidId } = require('../utils/apiHelpers');

function validateIdParam(param, label) {
    return (req, res, next) => {
        if (!isValidId(req.params[param])) {
            return res.status(400).json({
                success: false,
                message: `Invalid ${label}.`
            });
        }

        next();
    };
}

module.exports = {
    validateIdParam
};
