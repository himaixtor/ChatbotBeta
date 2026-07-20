/**
 * License Validator Middleware
 * Enforces license requirements on all API endpoints
 */
const LicenseService = require('../services/licenseService');
const { log, error: logError } = require('../utils/logger');

let lastValidation = 0;
const VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function licenseValidator(req, res, next) {
  try {
    // Allow login and auth endpoints
    if (req.path === '/api/auth/login' || req.path === '/api/auth/refresh') {
      return next();
    }

    // Allow health check
    if (req.path === '/health') {
      return next();
    }

    // Allow license creation - this is needed to create the first license
    if (req.path === '/api/license/create' && req.method === 'POST') {
      return next();
    }

    // Allow license status check - this is public endpoint
    if (req.path === '/api/license/check-activation') {
      return next();
    }

    // Allow license debug/utility endpoints (for Super Admin debugging)
    if (req.path === '/api/license/current-file' ||
        req.path === '/api/license/decrypt-file' ||
        req.path === '/api/license/debug-decrypt-file' ||
        req.path === '/api/license/save-encrypted-file') {
      return next();
    }

    // Validate license periodically for all other endpoints
    if (Date.now() - lastValidation > VALIDATION_INTERVAL) {
      const validation = await LicenseService.validateLicenseRuntime();

      if (!validation.valid) {
        if (validation.reason === 'LICENSE_EXPIRED') {
          const message = validation.tokenCostExceeded
            ? 'Token usage cost limit exceeded. License expired due to cost limit.'
            : 'The license has expired. Please contact administrator to renew.';
          return res.status(403).json({
            error: 'License Expired',
            reason: 'LICENSE_EXPIRED',
            message: message,
            tokenCostExceeded: validation.tokenCostExceeded,
          });
        }

        if (validation.reason === 'LICENSE_FILE_MISSING') {
          return res.status(403).json({
            error: 'License Required',
            reason: 'LICENSE_NOT_FOUND',
            message: 'No license found. Please contact administrator to activate license.',
            requiresActivation: true,
          });
        }

        if (validation.tampered) {
          return res.status(403).json({
            error: 'License Invalid',
            reason: 'TAMPERING_DETECTED',
            message: 'License has been tampered with or corrupted.',
          });
        }

        return res.status(403).json({
          error: 'License Invalid',
          reason: validation.reason,
          message: 'License validation failed.',
        });
      }

      lastValidation = Date.now();
    }

    next();
  } catch (err) {
    logError(`[License] Middleware error: ${err.message}`);
    return res.status(500).json({
      error: 'License Validation Error',
      message: 'An error occurred during license validation.',
    });
  }
}

/**
 * Middleware to check for license on protected routes
 */
function requireValidLicense(req, res, next) {
  return licenseValidator(req, res, next);
}

module.exports = { licenseValidator, requireValidLicense };
