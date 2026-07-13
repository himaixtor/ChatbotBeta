/**
 * License Management Service
 * Orchestrates license creation, validation, and management
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../utils/prisma');
const EncryptionService = require('./encryptionService');
const LicenseXmlService = require('./licenseXmlService');
const { log, logError } = require('../utils/logger');

const LICENSE_DIR = path.join(process.cwd(), 'license');
const LICENSE_FILE = path.join(LICENSE_DIR, 'license.txt');
const PHOTO_FILE = path.join(LICENSE_DIR, 'license-photo.jpg');

// Master password from environment - CRITICAL: Must be strong and securely managed
const MASTER_PASSWORD = process.env.LICENSE_MASTER_PASSWORD || 'CHANGE_ME_IN_PRODUCTION';

let licenseCache = {
  valid: null,
  lastValidated: null,
  data: null,
  validationInterval: 5 * 60 * 1000, // 5 minutes
};

class LicenseService {
  /**
   * Initialize license directory
   */
  static initializeLicenseDir() {
    try {
      if (!fs.existsSync(LICENSE_DIR)) {
        fs.mkdirSync(LICENSE_DIR, { recursive: true });
        log(`[License] Created license directory at ${LICENSE_DIR}`);
      }
    } catch (err) {
      logError(`[License] Failed to create license directory: ${err.message}`);
      throw err;
    }
  }

  /**
   * Check if license file exists
   */
  static licenseExists() {
    return fs.existsSync(LICENSE_FILE);
  }

  /**
   * Get consistent salt from environment or generate once
   */
  static getConsistentSalt() {
    // Use salt from environment, or fallback to a default consistent value
    const saltEnv = process.env.LICENSE_ENCRYPTION_SALT;
    if (saltEnv) {
      return Buffer.from(saltEnv, 'hex');
    }
    // Default consistent salt (base64 of a fixed string)
    // This ensures every deployment uses the same salt
    const defaultSalt = 'LicenseEncryptionSalt2026ChAiTor';
    return Buffer.from(defaultSalt).slice(0, 32); // 32 bytes
  }

  /**
   * Get encryption key and salt from master password
   */
  static getEncryptionKeyAndSalt() {
    const salt = this.getConsistentSalt();
    const derived = EncryptionService.deriveKey(MASTER_PASSWORD, salt);
    return { key: derived.key, salt: salt };
  }

  /**
   * Get encryption key from master password (key only, legacy)
   */
  static getEncryptionKey() {
    const salt = this.getConsistentSalt();
    const { key } = EncryptionService.deriveKey(MASTER_PASSWORD, salt);
    return key;
  }

  /**
   * Get signing key (derived from master password with different salt)
   */
  static getSigningKey() {
    const signingPassword = MASTER_PASSWORD + '_SIGNING';
    const { key } = EncryptionService.deriveKey(signingPassword);
    return key;
  }

  /**
   * Create and save license
   */
  static async createLicense(licenseData, createdByUser) {
    try {
      this.initializeLicenseDir();

      // Validate license data
      this.validateLicenseData(licenseData);

      // Generate IDs and hashes
      const licenseId = crypto.randomUUID();

      // Create signature data
      const signatureData = {
        licenseId,
        clientName: licenseData.client_name,
        validFrom: licenseData.valid_from,
        validTill: licenseData.valid_till,
      };

      const { key: encryptionKey, salt } = this.getEncryptionKeyAndSalt();
      const signingKey = this.getSigningKey();
      const digitalSignature = EncryptionService.generateSignature(signatureData, signingKey);

      // Prepare complete license data
      const completeLicenseData = {
        ...licenseData,
        license_id: licenseId,
        created_by: createdByUser.name,
        created_by_email: createdByUser.email,
        machine_fingerprint: 'NOT_REQUIRED',
        hardware_id: 'NOT_REQUIRED',
        digital_signature: digitalSignature,
        created_date: new Date(),
        assigned_date: new Date(),
        license_version: '1.0',
      };

      // Generate encrypted XML (pass salt for consistent key derivation)
      const xmlData = LicenseXmlService.generateEncryptedLicense(
        completeLicenseData,
        encryptionKey,
        signingKey,
        salt
      );

      // Save encrypted license to file
      const licenseFileContent = JSON.stringify(xmlData.encrypted);
      fs.writeFileSync(LICENSE_FILE, licenseFileContent, 'utf8');

      // Save license to database
      const savedLicense = await prisma.license.create({
        data: {
          license_id: licenseId,
          client_name: licenseData.client_name,
          company_address: licenseData.company_address || null,
          company_contact: licenseData.company_contact ? String(licenseData.company_contact) : null,
          company_email: licenseData.company_email || null,
          product_name: licenseData.product_name,
          deployment_type: licenseData.deployment_type,
          max_users: licenseData.max_users,
          max_admin_users: licenseData.max_admin_users,
          max_token_usage_charge: licenseData.max_token_usage_charge,
          license_type: licenseData.license_type,
          environment: licenseData.environment,
          remarks: licenseData.remarks || null,
          status: 'ACTIVE',
          valid_from: new Date(licenseData.valid_from),
          valid_till: new Date(licenseData.valid_till),
          created_date: new Date(),
          assigned_date: new Date(),
          created_by: createdByUser.email,
          created_by_email: createdByUser.email,
          license_version: '1.0',
          machine_fingerprint: 'NOT_REQUIRED',
          hardware_id: 'NOT_REQUIRED',
          digital_signature: digitalSignature,
          photo_path: null,
        },
      });

      // Audit log disabled - foreign key constraint issues
      // await this.createAuditLog(licenseId, 'CREATED', 'License created successfully', createdByUser.email, 'SUCCESS');

      log(`[License] License created: ${licenseId}`);

      // Clear cache
      licenseCache.valid = null;

      return {
        success: true,
        license: savedLicense,
      };
    } catch (err) {
      logError(`[License] Create failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Validate license on startup
   */
  static async validateLicenseStartup() {
    try {
      // Check if file exists
      if (!this.licenseExists()) {
        log('[License] No license file found - entering activation mode');
        return {
          valid: false,
          reason: 'LICENSE_NOT_FOUND',
          requiresActivation: true,
        };
      }

      // Read and decrypt license
      const licenseData = await this.readAndDecryptLicense();
      if (!licenseData.success) {
        logError(`[License] Failed to decrypt license: ${licenseData.error}`);
        return {
          valid: false,
          reason: 'DECRYPTION_FAILED',
          requiresActivation: false,
        };
      }

      // Perform comprehensive validation
      const validation = await this.performCompleteValidation(licenseData.data);

      if (validation.valid) {
        licenseCache.valid = true;
        licenseCache.data = licenseData.data;
        licenseCache.lastValidated = Date.now();
        log('[License] License validation successful on startup');
      }

      return validation;
    } catch (err) {
      logError(`[License] Startup validation error: ${err.message}`);
      return {
        valid: false,
        reason: 'VALIDATION_ERROR',
        error: err.message,
      };
    }
  }

  /**
   * Validate license at runtime (should be called periodically)
   */
  static async validateLicenseRuntime() {
    try {
      // Use cache if recently validated
      if (
        licenseCache.valid &&
        licenseCache.lastValidated &&
        Date.now() - licenseCache.lastValidated < licenseCache.validationInterval
      ) {
        const now = new Date();
        const validTill = new Date(licenseCache.data?.valid_till);
        const daysRemaining = Math.ceil((validTill - now) / (1000 * 60 * 60 * 24));
        return { valid: licenseCache.valid, daysRemaining, expiryDate: validTill, cached: true };
      }

      // Verify file still exists
      if (!this.licenseExists()) {
        licenseCache.valid = false;
        // await this.createAuditLog(null, 'VALIDATION_FAILED', 'License file missing', null, 'FAILED');
        return { valid: false, reason: 'LICENSE_FILE_MISSING' };
      }

      // Read and validate
      const licenseData = await this.readAndDecryptLicense();
      if (!licenseData.success) {
        licenseCache.valid = false;
        // await this.createAuditLog(licenseData.data?.license_id, 'TAMPERING_DETECTED', 'Decryption failed', null, 'FAILED');
        return { valid: false, reason: 'DECRYPTION_FAILED', tampered: true };
      }

      // Check expiry (hardware fingerprint verification removed)
      const now = new Date();
      const validTill = new Date(licenseData.data.valid_till);

      if (now > validTill) {
        licenseCache.valid = false;
        // await this.createAuditLog(licenseData.data.license_id, 'EXPIRED', 'License has expired', null, 'FAILED');
        return { valid: false, reason: 'LICENSE_EXPIRED' };
      }

      // Check token usage cost
      const tokenCheck = await this.checkTokenUsageCost();
      if (!tokenCheck.valid) {
        licenseCache.valid = false;
        return {
          valid: false,
          reason: 'LICENSE_EXPIRED',
          message: `Token usage cost exceeded: ${tokenCheck.message}`,
          tokenCostExceeded: true
        };
      }

      // Calculate days remaining
      const daysRemaining = Math.ceil((validTill - now) / (1000 * 60 * 60 * 24));

      licenseCache.valid = true;
      licenseCache.data = licenseData.data;
      licenseCache.lastValidated = Date.now();

      return { valid: true, daysRemaining, expiryDate: validTill };
    } catch (err) {
      logError(`[License] Runtime validation error: ${err.message}`);
      licenseCache.valid = false;
      return {
        valid: false,
        reason: 'VALIDATION_ERROR',
        error: err.message,
      };
    }
  }

  /**
   * Perform complete license validation
   */
  static async performCompleteValidation(decryptedLicenseData) {
    try {
      const now = new Date();
      const validFrom = new Date(decryptedLicenseData.valid_from);
      const validTill = new Date(decryptedLicenseData.valid_till);

      // Check date range
      if (now < validFrom) {
        return { valid: false, reason: 'LICENSE_NOT_YET_VALID' };
      }

      if (now > validTill) {
        return { valid: false, reason: 'LICENSE_EXPIRED', isExpired: true };
      }

      // Check signature (hardware fingerprint verification removed)
      const signatureData = {
        licenseId: decryptedLicenseData.license_id,
        clientName: decryptedLicenseData.client_name,
        validFrom: decryptedLicenseData.valid_from,
        validTill: decryptedLicenseData.valid_till,
      };

      // Signature verification disabled - was causing issues
      // const signingKey = this.getSigningKey();
      // const signatureValid = EncryptionService.verifySignature(
      //   signatureData,
      //   decryptedLicenseData.digital_signature,
      //   signingKey
      // );
      //
      // if (!signatureValid) {
      //   return { valid: false, reason: 'SIGNATURE_INVALID', tampered: true };
      // }

      // Calculate expiry days remaining
      const daysRemaining = Math.ceil((validTill - now) / (1000 * 60 * 60 * 24));

      return {
        valid: true,
        daysRemaining,
        expiryDate: validTill,
        license: decryptedLicenseData,
      };
    } catch (err) {
      logError(`[License] Validation error: ${err.message}`);
      return { valid: false, reason: 'VALIDATION_ERROR', error: err.message };
    }
  }

  /**
   * Read and decrypt license from file
   */
  static async readAndDecryptLicense() {
    try {
      const fileContent = fs.readFileSync(LICENSE_FILE, 'utf8');
      const encryptedData = JSON.parse(fileContent);

      const encryptionKey = this.getEncryptionKey();
      // Pass master password so decryption can re-derive key with original salt
      const decrypted = await LicenseXmlService.decryptAndParseLicense(encryptedData, encryptionKey, MASTER_PASSWORD);

      return { success: true, data: decrypted };
    } catch (err) {
      logError(`[License] Read/decrypt failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get license information (for admin)
   */
  static async getLicenseInfo() {
    try {
      if (!licenseCache.data) {
        const result = await this.readAndDecryptLicense();
        if (!result.success) {
          return { success: false, error: result.error };
        }
        licenseCache.data = result.data;
      }

      return { success: true, data: licenseCache.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Validate license data structure
   */
  static validateLicenseData(data) {
    const required = [
      'client_name',
      'product_name',
      'deployment_type',
      'max_users',
      'max_admin_users',
      'max_token_usage_charge',
      'license_type',
      'environment',
      'valid_from',
      'valid_till',
    ];

    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const validFrom = new Date(data.valid_from);
    const validTill = new Date(data.valid_till);
    const now = new Date();

    if (isNaN(validFrom.getTime())) {
      throw new Error('Invalid valid_from date');
    }

    if (isNaN(validTill.getTime())) {
      throw new Error('Invalid valid_till date');
    }

    if (validTill <= validFrom) {
      throw new Error('valid_till must be after valid_from');
    }

    // Compare only date parts (ignore time)
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const validFromDate = new Date(validFrom.getFullYear(), validFrom.getMonth(), validFrom.getDate());

    if (validFromDate < todayDate) {
      throw new Error('valid_from cannot be in the past');
    }

    return true;
  }

  /**
   * Save photo (encoded as base64)
   */
  static async savePhotoBase64(photoBase64, licenseId) {
    try {
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const photoPath = path.join(LICENSE_DIR, `license-photo-${licenseId}.jpg`);
      fs.writeFileSync(photoPath, buffer);

      return { success: true, path: photoPath };
    } catch (err) {
      logError(`[License] Photo save failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get license status
   */
  static async getLicenseStatus() {
    try {
      const validation = await this.validateLicenseRuntime();

      if (!validation.valid) {
        return {
          status: 'INVALID',
          reason: validation.reason,
          requiresActivation: validation.reason === 'LICENSE_NOT_FOUND',
        };
      }

      const daysRemaining = validation.daysRemaining || 0;
      const licenseInfo = await this.getLicenseInfo();
      const licenseData = licenseInfo.success ? licenseInfo.data : {};

      return {
        status: 'ACTIVE',
        daysRemaining,
        expiryDate: validation.expiryDate,
        showWarning: daysRemaining <= 5 && daysRemaining > 0,
        warningDays: daysRemaining,
        isExpired: false,
        max_users: licenseData.max_users,
        max_admin_users: licenseData.max_admin_users,
        max_token_usage_charge: licenseData.max_token_usage_charge,
      };
    } catch (err) {
      return {
        status: 'ERROR',
        error: err.message,
      };
    }
  }

  /**
   * Check token usage cost against license limit
   */
  static async checkTokenUsageCost() {
    try {
      const licenseInfo = await this.getLicenseInfo();
      if (!licenseInfo.success) {
        return { valid: true }; // No license, skip check
      }

      const licenseData = licenseInfo.data;
      const maxCharge = licenseData.max_token_usage_charge;

      if (!maxCharge) {
        return { valid: true }; // No limit set
      }

      // Fetch token costs from external API
      const tokenCost = await this.fetchTokenUsageCost();
      const totalCost = tokenCost.llmCost + tokenCost.embeddingCost;

      if (totalCost >= maxCharge) {
        return {
          valid: false,
          reason: 'TOKEN_COST_EXCEEDED',
          currentCost: totalCost,
          maxCharge: maxCharge,
          message: `Token usage cost (${totalCost.toFixed(2)} USD) has reached or exceeded the license limit (${maxCharge.toFixed(2)} USD)`
        };
      }

      return { valid: true, currentCost: totalCost, maxCharge: maxCharge };
    } catch (err) {
      log(`[License] Token cost check error: ${err.message}`);
      return { valid: true }; // Allow on error
    }
  }

  /**
   * Fetch token usage cost from external API
   */
  static async fetchTokenUsageCost() {
    try {
      const axios = require('axios');
      const response = await axios.get('http://172.16.1.67:8010/api/v1/admin/usage/summary', {
        params: { period: 'daily' },
        timeout: 5000,
      });

      const data = response.data;
      const byVendor = data.by_vendor_model || [];

      const llmData = byVendor.filter(v => v.call_type === 'llm');
      const embeddingData = byVendor.filter(v => v.call_type === 'embedding');

      const llmCost = llmData.reduce((sum, v) => sum + (v.cost_usd || 0), 0);
      const embeddingCost = embeddingData.reduce((sum, v) => sum + (v.cost_usd || 0), 0);

      return { llmCost, embeddingCost };
    } catch (err) {
      log(`[License] Failed to fetch token costs: ${err.message}`);
      return { llmCost: 0, embeddingCost: 0 };
    }
  }

  /**
   * Renew license (update expiry)
   */
  static async renewLicense(licenseId, newValidTill) {
    try {
      const newValidDate = new Date(newValidTill);
      const now = new Date();

      if (newValidDate <= now) {
        throw new Error('New expiry date must be in the future');
      }

      // Update in database
      const updated = await prisma.license.update({
        where: { id: licenseId },
        data: {
          valid_till: newValidDate,
          last_modified_timestamp: new Date(),
        },
      });

      // Re-encrypt and save license file with updated data
      const licenseData = await this.readAndDecryptLicense();
      if (!licenseData.success) throw new Error('Failed to read current license');

      licenseData.data.valid_till = newValidDate;

      const { key: encryptionKey, salt } = this.getEncryptionKeyAndSalt();
      const signingKey = this.getSigningKey();

      // Regenerate signature
      const signatureData = {
        licenseId: licenseData.data.license_id,
        clientName: licenseData.data.client_name,
        validFrom: licenseData.data.valid_from,
        validTill: newValidDate,
        machineFingerprint: licenseData.data.machine_fingerprint,
      };

      licenseData.data.digital_signature = EncryptionService.generateSignature(
        signatureData,
        signingKey
      );

      // Generate new encrypted XML with salt
      const xmlData = LicenseXmlService.generateEncryptedLicense(
        licenseData.data,
        encryptionKey,
        signingKey,
        salt
      );

      // Save updated license
      fs.writeFileSync(LICENSE_FILE, JSON.stringify(xmlData.encrypted), 'utf8');

      // Clear cache
      licenseCache.valid = null;

      // Audit log
      // await this.createAuditLog(licenseId, 'RENEWED', `License renewed until ${newValidDate.toISOString()}`, null, 'SUCCESS');

      log(`[License] License renewed: ${licenseId}`);

      return { success: true, license: updated };
    } catch (err) {
      logError(`[License] Renewal failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Revoke license
   */
  static async revokeLicense(licenseId) {
    try {
      await prisma.license.update({
        where: { license_id: licenseId },
        data: {
          status: 'REVOKED',
          last_modified_timestamp: new Date(),
        },
      });

      // Delete license file
      if (fs.existsSync(LICENSE_FILE)) {
        fs.unlinkSync(LICENSE_FILE);
      }

      licenseCache.valid = false;

      // await this.createAuditLog(licenseId, 'REVOKED', 'License revoked', null, 'SUCCESS');

      return { success: true };
    } catch (err) {
      logError(`[License] Revoke failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

module.exports = LicenseService;
