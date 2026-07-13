/**
 * Encryption Service for License Management
 * Implements AES-256-GCM with PBKDF2 key derivation
 */
const crypto = require('crypto');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const HASH_ALGORITHM = 'sha256';
const KEY_DERIVATION = 'pbkdf2';
const ITERATIONS = 100000;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

class EncryptionService {
  /**
   * Derive encryption key from master password using PBKDF2
   */
  static deriveKey(password, salt = null) {
    const saltBuffer = salt || crypto.randomBytes(SALT_LENGTH);
    const derivedKey = crypto.pbkdf2Sync(
      password,
      saltBuffer,
      ITERATIONS,
      32,
      HASH_ALGORITHM
    );
    return { key: derivedKey, salt: saltBuffer };
  }

  /**
   * Encrypt a single value
   */
  static encryptValue(plaintext, encryptionKey) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);

      let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      const result = {
        iv: iv.toString('hex'),
        encrypted,
        authTag: authTag.toString('hex'),
        algorithm: ENCRYPTION_ALGORITHM,
      };

      return JSON.stringify(result);
    } catch (error) {
      throw new Error(`Value encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a single value
   */
  static decryptValue(encryptedData, encryptionKey) {
    try {
      const data = JSON.parse(encryptedData);
      const decipher = crypto.createDecipheriv(
        data.algorithm,
        encryptionKey,
        Buffer.from(data.iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Value decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt entire XML document (double encryption)
   * Also includes the salt so decryption can use the same key derivation
   */
  static encryptDocument(xmlContent, encryptionKey, salt = null) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);

      let encrypted = cipher.update(xmlContent, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        encrypted,
        authTag: authTag.toString('hex'),
        algorithm: ENCRYPTION_ALGORITHM,
        salt: salt ? salt.toString('hex') : null,
      };
    } catch (error) {
      throw new Error(`Document encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt entire XML document
   * The encryption key should already be properly derived with the correct salt
   */
  static decryptDocument(encryptedData, encryptionKey, masterPassword = null) {
    try {
      const decipher = crypto.createDecipheriv(
        encryptedData.algorithm,
        encryptionKey,
        Buffer.from(encryptedData.iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Document decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate digital signature for license data
   */
  static generateSignature(data, signingKey) {
    try {
      const hash = crypto.createHmac(HASH_ALGORITHM, signingKey);
      hash.update(JSON.stringify(data));
      return hash.digest('hex');
    } catch (error) {
      throw new Error(`Signature generation failed: ${error.message}`);
    }
  }

  /**
   * Verify digital signature
   */
  static verifySignature(data, signature, signingKey) {
    try {
      const expectedSignature = this.generateSignature(data, signingKey);
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate secure random hash for hardware fingerprint
   */
  static generateHash(data) {
    try {
      const hash = crypto.createHash(HASH_ALGORITHM);
      hash.update(JSON.stringify(data));
      return hash.digest('hex');
    } catch (error) {
      throw new Error(`Hash generation failed: ${error.message}`);
    }
  }

  /**
   * Verify data integrity via hash
   */
  static verifyHash(data, expectedHash) {
    try {
      const hash = crypto.createHash(HASH_ALGORITHM);
      hash.update(JSON.stringify(data));
      const computedHash = hash.digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(computedHash),
        Buffer.from(expectedHash)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract salt from encrypted data
   */
  static getSaltFromEncrypted(encryptedWithSalt) {
    try {
      const data = JSON.parse(encryptedWithSalt);
      return Buffer.from(data.salt, 'hex');
    } catch (error) {
      throw new Error('Failed to extract salt');
    }
  }
}

module.exports = EncryptionService;
