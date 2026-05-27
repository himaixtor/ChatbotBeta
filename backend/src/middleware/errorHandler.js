/**
 * Global error handler — consistent JSON error responses.
 */
const { logError } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logError(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
