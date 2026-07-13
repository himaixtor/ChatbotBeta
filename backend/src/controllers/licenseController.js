/**
 * License Management Controller
 * Handles all license-related API endpoints
 */
const LicenseService = require('../services/licenseService');
const prisma = require('../utils/prisma');

/**
 * Check if user is Super Admin (handles multiple role formats)
 */
function isSuperAdmin(userRole) {
  return userRole === 'Super Admin' ||
         userRole === 'super_admin' ||
         userRole === 'SuperAdmin';
}

/**
 * Create a new license (Super Admin only)
 */
async function createLicense(req, res, next) {
  try {
    // Verify Super Admin role
    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Only Super Admin can create licenses' });
    }

    const {
      client_name,
      company_address,
      company_contact,
      company_email,
      product_name,
      deployment_type,
      max_users,
      max_admin_users,
      max_token_usage_charge,
      license_type,
      environment,
      remarks,
      valid_from,
      valid_till,
    } = req.body;

    // Validate required fields
    if (!client_name || !product_name || !deployment_type || !license_type || !environment) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    if (!max_users || !max_admin_users || max_token_usage_charge === undefined || max_token_usage_charge === null || max_token_usage_charge === '') {
      return res.status(400).json({
        error: 'Limit fields (max_users, max_admin_users, max_token_usage_charge) are required',
      });
    }

    if (!valid_from || !valid_till) {
      return res.status(400).json({
        error: 'valid_from and valid_till dates are required',
      });
    }

    const licenseData = {
      client_name,
      company_address,
      company_contact,
      company_email,
      product_name,
      deployment_type,
      max_users: parseInt(max_users),
      max_admin_users: parseInt(max_admin_users),
      max_token_usage_charge: parseFloat(max_token_usage_charge),
      license_type,
      environment,
      remarks,
      valid_from: new Date(valid_from),
      valid_till: new Date(valid_till),
    };

    // Photo capture removed

    // Create license
    const result = await LicenseService.createLicense(licenseData, {
      name: req.user.name || req.user.email,
      email: req.user.email,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({
      success: true,
      message: 'License created successfully',
      license: result.license,
      hardwareFingerprint: result.hardwareFingerprint,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get license details (Super Admin only)
 */
async function getLicenseDetails(req, res, next) {
  try {
    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Only Super Admin can view license details' });
    }

    const result = await LicenseService.getLicenseInfo();

    if (!result.success) {
      return res.status(404).json({ error: 'License not found' });
    }

    return res.json({
      success: true,
      license: result.data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get license status (for display/warning)
 */
async function getLicenseStatus(req, res, next) {
  try {
    const status = await LicenseService.getLicenseStatus();

    return res.json({
      success: true,
      status,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Renew/extend license (Super Admin only)
 */
async function renewLicense(req, res, next) {
  try {
    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Only Super Admin can renew licenses' });
    }

    const { new_valid_till } = req.body;

    if (!new_valid_till) {
      return res.status(400).json({ error: 'new_valid_till date is required' });
    }

    // Get current license
    const currentLicense = await prisma.license.findFirst({
      orderBy: { created_timestamp: 'desc' },
    });

    if (!currentLicense) {
      return res.status(404).json({ error: 'No license found' });
    }

    const result = await LicenseService.renewLicense(currentLicense.id, new_valid_till);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: 'License renewed successfully',
      license: result.license,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update license details (Super Admin only)
 */
async function updateLicense(req, res, next) {
  try {
    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Only Super Admin can update licenses' });
    }

    const { id } = req.params;
    const updates = req.body;

    // Validate that we don't update critical security fields
    const protectedFields = ['machine_fingerprint', 'hardware_id', 'digital_signature'];
    for (const field of protectedFields) {
      if (field in updates) {
        return res.status(400).json({
          error: `Cannot update protected field: ${field}`,
        });
      }
    }

    const updated = await prisma.license.update({
      where: { id },
      data: {
        ...updates,
        last_modified_timestamp: new Date(),
      },
    });

    return res.json({
      success: true,
      message: 'License updated successfully',
      license: updated,
    });
  } catch (error) {
    next(error);
  }
}


/**
 * Download license file (Super Admin only)
 */
async function downloadLicense(req, res, next) {
  try {
    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Only Super Admin can download license' });
    }

    const fs = require('fs');
    const path = require('path');

    const LICENSE_FILE = path.join(process.cwd(), 'license', 'license.txt');

    if (!fs.existsSync(LICENSE_FILE)) {
      return res.status(404).json({ error: 'License file not found' });
    }

    res.download(LICENSE_FILE, 'license.txt');
  } catch (error) {
    next(error);
  }
}

/**
 * Check if license exists and get activation status
 */
async function checkLicenseActivation(req, res, next) {
  try {
    const exists = LicenseService.licenseExists();

    if (!exists) {
      return res.json({
        activated: false,
        requiresActivation: true,
        message: 'License activation required',
      });
    }

    const validation = await LicenseService.validateLicenseStartup();

    return res.json({
      activated: validation.valid,
      requiresActivation: !validation.valid,
      status: validation.reason || 'ACTIVE',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Revoke license (Super Admin only)
 */
async function revokeLicense(req, res, next) {
  try {
    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Only Super Admin can revoke licenses' });
    }

    const { id } = req.params;

    const license = await prisma.license.findUnique({ where: { id } });
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    const result = await LicenseService.revokeLicense(id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: 'License revoked successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Decrypt uploaded license file (Super Admin only)
 */
async function decryptFile(req, res, next) {
  try {
    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Only Super Admin can decrypt license files' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const fileContent = req.file.buffer.toString('utf8');
      const encryptedData = JSON.parse(fileContent);

      if (!encryptedData || !encryptedData.iv || !encryptedData.encrypted || !encryptedData.authTag) {
        return res.status(400).json({
          error: 'Invalid encrypted file format. Make sure it is a valid license file.'
        });
      }

      // Decrypt the license file
      const encryptionKey = LicenseService.getEncryptionKey();

      const LicenseXmlService = require('../services/licenseXmlService');
      const decryptedData = await LicenseXmlService.decryptAndParseLicense(
        encryptedData,
        encryptionKey,
        null
      );

      return res.json({
        success: true,
        licenseData: decryptedData,
      });
    } catch (parseError) {
      // If JSON parse fails
      if (parseError instanceof SyntaxError) {
        return res.status(400).json({
          error: 'File is not valid JSON. Make sure the file is a valid encrypted license file.'
        });
      }
      throw parseError;
    }
  } catch (error) {
    console.error('[License] File decrypt error:', error.message);
    res.status(400).json({
      error: 'Failed to decrypt file: ' + error.message
    });
  }
}

/**
 * Debug: Test decryption with detailed error info (Super Admin only)
 */
async function debugDecryptFile(req, res, next) {
  try {
    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Only Super Admin can access this' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const fileContent = req.file.buffer.toString('utf8');
      const encryptedData = JSON.parse(fileContent);

      console.log('[Debug] Encrypted file structure:', {
        hasIv: !!encryptedData.iv,
        hasEncrypted: !!encryptedData.encrypted,
        hasAuthTag: !!encryptedData.authTag,
        hasAlgorithm: !!encryptedData.algorithm,
        hasSalt: !!encryptedData.salt,
        algorithm: encryptedData.algorithm,
        ivLength: encryptedData.iv?.length,
        encryptedLength: encryptedData.encrypted?.length,
        authTagLength: encryptedData.authTag?.length,
      });

      const encryptionKey = LicenseService.getEncryptionKey();

      console.log('[Debug] Decryption key derived');

      const EncryptionService = require('../services/encryptionService');
      const xmlString = EncryptionService.decryptDocument(encryptedData, encryptionKey, null);

      console.log('[Debug] Document decrypted successfully');

      const LicenseXmlService = require('../services/licenseXmlService');
      const decryptedData = await LicenseXmlService.decryptAndParseLicense(
        encryptedData,
        encryptionKey,
        null
      );

      return res.json({
        success: true,
        licenseData: decryptedData,
        debug: {
          fileStructureValid: true,
          decryptionSuccess: true,
        },
      });
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        return res.status(400).json({
          error: 'File is not valid JSON',
          debug: { stage: 'JSON_PARSE' },
        });
      }
      console.error('[Debug] Decryption error:', parseError.message);
      throw parseError;
    }
  } catch (error) {
    console.error('[License] Debug decrypt error:', error.message);
    res.status(400).json({
      error: error.message,
      debug: { errorType: error.constructor.name },
    });
  }
}

/**
 * Get current encrypted license file for testing (Super Admin only)
 */
async function getCurrentLicenseFile(req, res, next) {
  try {
    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Only Super Admin can access this' });
    }

    const fs = require('fs');
    const path = require('path');
    const LICENSE_FILE = path.join(process.cwd(), 'license', 'license.txt');

    if (!fs.existsSync(LICENSE_FILE)) {
      return res.status(404).json({ error: 'License file not found' });
    }

    const fileContent = fs.readFileSync(LICENSE_FILE, 'utf8');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="license.txt"');
    res.send(fileContent);
  } catch (error) {
    next(error);
  }
}

/**
 * Save and encrypt updated license file (Super Admin only)
 */
async function saveEncryptedFile(req, res, next) {
  try {
    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Only Super Admin can save license files' });
    }

    const licenseData = req.body;

    if (!licenseData || !licenseData.license_id) {
      return res.status(400).json({ error: 'Invalid license data' });
    }

    const fs = require('fs');
    const path = require('path');
    const LICENSE_FILE = path.join(process.cwd(), 'license', 'license.txt');

    // Ensure license directory exists
    const licenseDir = path.dirname(LICENSE_FILE);
    if (!fs.existsSync(licenseDir)) {
      fs.mkdirSync(licenseDir, { recursive: true });
    }

    // Get encryption components
    const { key: encryptionKey, salt } = LicenseService.getEncryptionKeyAndSalt();
    const signingKey = LicenseService.getSigningKey();

    // Generate signature
    const signatureData = {
      licenseId: licenseData.license_id,
      clientName: licenseData.client_name,
      validFrom: licenseData.valid_from,
      validTill: licenseData.valid_till,
      machineFingerprint: licenseData.machine_fingerprint,
    };

    const EncryptionService = require('../services/encryptionService');
    licenseData.digital_signature = EncryptionService.generateSignature(
      signatureData,
      signingKey
    );

    // Generate encrypted XML
    const LicenseXmlService = require('../services/licenseXmlService');
    const xmlData = LicenseXmlService.generateEncryptedLicense(
      licenseData,
      encryptionKey,
      signingKey,
      salt
    );

    // Write to file
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(xmlData.encrypted), 'utf8');

    // Clear cache
    const licenseCache = {
      valid: null,
      data: null,
      lastValidated: null,
      validationInterval: 5 * 60 * 1000,
    };

    return res.json({
      success: true,
      message: 'License file updated and encrypted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createLicense,
  getLicenseDetails,
  getLicenseStatus,
  renewLicense,
  updateLicense,
  downloadLicense,
  checkLicenseActivation,
  revokeLicense,
  decryptFile,
  debugDecryptFile,
  saveEncryptedFile,
  getCurrentLicenseFile,
};
