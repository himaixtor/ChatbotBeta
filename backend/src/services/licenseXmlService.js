/**
 * License XML Generation and Parsing Service
 * Handles XML generation with double encryption
 */
const EncryptionService = require('./encryptionService');
const xml2js = require('xml2js');

class LicenseXmlService {
  /**
   * Generate encrypted license XML
   */
  static generateEncryptedLicense(licenseData, encryptionKey, signingKey, salt = null) {
    try {
      // Step 1: Create XML structure with encrypted values
      const xmlData = {
        License: {
          Header: {
            LicenseID: EncryptionService.encryptValue(licenseData.license_id, encryptionKey),
            Version: EncryptionService.encryptValue(licenseData.license_version || '1.0', encryptionKey),
            CreatedDate: EncryptionService.encryptValue(licenseData.created_date.toISOString(), encryptionKey),
            CreatedBy: EncryptionService.encryptValue(licenseData.created_by, encryptionKey),
            CreatedByEmail: EncryptionService.encryptValue(licenseData.created_by_email, encryptionKey),
          },
          Client: {
            Name: EncryptionService.encryptValue(licenseData.client_name, encryptionKey),
            Address: EncryptionService.encryptValue(licenseData.company_address || '', encryptionKey),
            Contact: EncryptionService.encryptValue(licenseData.company_contact || '', encryptionKey),
            Email: EncryptionService.encryptValue(licenseData.company_email || '', encryptionKey),
          },
          Product: {
            Name: EncryptionService.encryptValue(licenseData.product_name, encryptionKey),
            DeploymentType: EncryptionService.encryptValue(licenseData.deployment_type, encryptionKey),
            Environment: EncryptionService.encryptValue(licenseData.environment, encryptionKey),
          },
          Limits: {
            MaxUsers: EncryptionService.encryptValue(String(licenseData.max_users), encryptionKey),
            MaxAdminUsers: EncryptionService.encryptValue(String(licenseData.max_admin_users), encryptionKey),
            MaxTokenUsageCharge: EncryptionService.encryptValue(String(licenseData.max_token_usage_charge), encryptionKey),
          },
          License: {
            Type: EncryptionService.encryptValue(licenseData.license_type, encryptionKey),
            ValidFrom: EncryptionService.encryptValue(licenseData.valid_from.toISOString(), encryptionKey),
            ValidTill: EncryptionService.encryptValue(licenseData.valid_till.toISOString(), encryptionKey),
            AssignedDate: EncryptionService.encryptValue(licenseData.assigned_date.toISOString(), encryptionKey),
          },
          Hardware: {
            MachineFingerprintHash: EncryptionService.encryptValue(licenseData.machine_fingerprint, encryptionKey),
            HardwareID: EncryptionService.encryptValue(licenseData.hardware_id, encryptionKey),
          },
          Security: {
            DigitalSignature: EncryptionService.encryptValue(licenseData.digital_signature, encryptionKey),
            HashAlgorithm: EncryptionService.encryptValue('SHA256', encryptionKey),
            EncryptionAlgorithm: EncryptionService.encryptValue('AES-256-GCM', encryptionKey),
          },
          Metadata: {
            Remarks: EncryptionService.encryptValue(licenseData.remarks || '', encryptionKey),
            Status: EncryptionService.encryptValue(licenseData.status, encryptionKey),
          },
        },
      };

      // Step 2: Convert to XML string
      const builder = new xml2js.Builder({ rootName: 'LicenseDocument' });
      const xmlString = builder.buildObject(xmlData);

      // Step 3: Encrypt entire XML document (double protection) with salt
      const encryptedDocument = EncryptionService.encryptDocument(xmlString, encryptionKey, salt);

      return {
        xml: xmlString,
        encrypted: encryptedDocument,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to generate encrypted license: ${error.message}`);
    }
  }

  /**
   * Decrypt and parse license XML
   * Mirror of encryption: decrypt document first (double layer) → then decrypt individual values
   */
  static async decryptAndParseLicense(encryptedData, encryptionKey, masterPassword = null) {
    try {
      const LicenseService = require('./licenseService');

      // STEP 1: Decrypt entire document
      // If masterPassword provided, derive key from it (for backward compat with old decryption flows)
      // Otherwise use the passed encryptionKey directly (already properly derived)
      let valueDecryptionKey = encryptionKey;
      if (masterPassword) {
        let salt;
        if (encryptedData.salt) {
          salt = Buffer.from(encryptedData.salt, 'hex');
        } else {
          salt = LicenseService.getConsistentSalt();
        }
        const derived = EncryptionService.deriveKey(masterPassword, salt);
        valueDecryptionKey = derived.key;
      }

      const xmlString = EncryptionService.decryptDocument(encryptedData, valueDecryptionKey, masterPassword);

      // STEP 2: Parse XML (now contains encrypted individual values)
      const parser = new xml2js.Parser();
      const parsedXml = await parser.parseStringPromise(xmlString);

      // STEP 3: Get encryption key for decrypting individual values
      // Use the same key we derived for document decryption

      // STEP 4: Decrypt individual values (same key used during encryption)
      const license = parsedXml.LicenseDocument.License[0];

      const decryptedData = {
        license_id: EncryptionService.decryptValue(license.Header[0].LicenseID[0], valueDecryptionKey),
        license_version: EncryptionService.decryptValue(license.Header[0].Version[0], valueDecryptionKey),
        created_date: new Date(EncryptionService.decryptValue(license.Header[0].CreatedDate[0], valueDecryptionKey)),
        created_by: EncryptionService.decryptValue(license.Header[0].CreatedBy[0], valueDecryptionKey),
        created_by_email: EncryptionService.decryptValue(license.Header[0].CreatedByEmail[0], valueDecryptionKey),

        client_name: EncryptionService.decryptValue(license.Client[0].Name[0], valueDecryptionKey),
        company_address: EncryptionService.decryptValue(license.Client[0].Address[0], valueDecryptionKey),
        company_contact: EncryptionService.decryptValue(license.Client[0].Contact[0], valueDecryptionKey),
        company_email: EncryptionService.decryptValue(license.Client[0].Email[0], valueDecryptionKey),

        product_name: EncryptionService.decryptValue(license.Product[0].Name[0], valueDecryptionKey),
        deployment_type: EncryptionService.decryptValue(license.Product[0].DeploymentType[0], valueDecryptionKey),
        environment: EncryptionService.decryptValue(license.Product[0].Environment[0], valueDecryptionKey),

        max_users: parseInt(EncryptionService.decryptValue(license.Limits[0].MaxUsers[0], valueDecryptionKey)),
        max_admin_users: parseInt(EncryptionService.decryptValue(license.Limits[0].MaxAdminUsers[0], valueDecryptionKey)),
        max_token_usage_charge: parseFloat(EncryptionService.decryptValue(license.Limits[0].MaxTokenUsageCharge[0], valueDecryptionKey)),

        license_type: EncryptionService.decryptValue(license.License[0].Type[0], valueDecryptionKey),
        valid_from: new Date(EncryptionService.decryptValue(license.License[0].ValidFrom[0], valueDecryptionKey)),
        valid_till: new Date(EncryptionService.decryptValue(license.License[0].ValidTill[0], valueDecryptionKey)),
        assigned_date: new Date(EncryptionService.decryptValue(license.License[0].AssignedDate[0], valueDecryptionKey)),

        machine_fingerprint: EncryptionService.decryptValue(license.Hardware[0].MachineFingerprintHash[0], valueDecryptionKey),
        hardware_id: EncryptionService.decryptValue(license.Hardware[0].HardwareID[0], valueDecryptionKey),

        digital_signature: EncryptionService.decryptValue(license.Security[0].DigitalSignature[0], valueDecryptionKey),

        remarks: EncryptionService.decryptValue(license.Metadata[0].Remarks[0], valueDecryptionKey),
        status: EncryptionService.decryptValue(license.Metadata[0].Status[0], valueDecryptionKey),
      };

      return decryptedData;
    } catch (error) {
      throw new Error(`Failed to decrypt and parse license: ${error.message}`);
    }
  }
}

module.exports = LicenseXmlService;
