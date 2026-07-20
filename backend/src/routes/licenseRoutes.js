/**
 * License Management Routes
 */
const express = require('express');
const multer = require('multer');
const authenticate = require('../middleware/authenticate');
const licenseController = require('../controllers/licenseController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 }, // 1MB limit
});

// Public route - check license activation status (no auth required)
router.get('/check-activation', licenseController.checkLicenseActivation);

// Protected routes - require authentication
router.post('/create', authenticate, licenseController.createLicense);
router.get('/details', authenticate, licenseController.getLicenseDetails);
router.get('/status', authenticate, licenseController.getLicenseStatus);
router.post('/renew', authenticate, licenseController.renewLicense);
router.put('/:id', authenticate, licenseController.updateLicense);
router.get('/download', authenticate, licenseController.downloadLicense);
router.delete('/:id/revoke', authenticate, licenseController.revokeLicense);

// File upload - decrypt license file (Super Admin only)
router.post('/decrypt-file', authenticate, upload.single('file'), licenseController.decryptFile);

// Debug: Test decryption with detailed info (Super Admin only)
router.post('/debug-decrypt-file', authenticate, upload.single('file'), licenseController.debugDecryptFile);

// Save encrypted license file (Super Admin only)
router.post('/save-encrypted-file', authenticate, licenseController.saveEncryptedFile);

// Get current license file for testing (Super Admin only)
router.get('/current-file', authenticate, licenseController.getCurrentLicenseFile);

module.exports = router;
