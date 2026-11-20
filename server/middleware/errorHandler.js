const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err.message);

  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable. Please ensure MySQL is running.',
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      success: false,
      message: 'A record with that unique value already exists.',
    });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete record because it is referenced by existing purchases or sales.',
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode >= 500 ? 'Internal Server Error' : err.message || 'Request failed';
  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
