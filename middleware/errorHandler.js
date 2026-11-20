function notFoundHandler(req, res) {
    console.log('Unknown API request:', req.method, req.originalUrl);

    res.status(404).json({
        success: false,
        message: 'API route not found',
        requestedRoute: req.originalUrl
    });
}

function errorHandler(err, req, res, next) {
    console.error('Server error:', err.message);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        success: false,
        message: 'An unexpected server error occurred.'
    });
}

module.exports = {
    notFoundHandler,
    errorHandler
};
