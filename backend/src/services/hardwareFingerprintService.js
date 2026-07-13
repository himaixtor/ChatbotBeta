/**
 * Hardware Fingerprinting Service
 * Generates unique machine identifier based on multiple hardware components
 */
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

class HardwareFingerprintService {
  /**
   * Get CPU model name and cores
   */
  static getCPUInfo() {
    try {
      const cpus = os.cpus();
      if (cpus.length === 0) return 'UNKNOWN_CPU';
      return {
        model: cpus[0].model,
        cores: cpus.length,
        speed: cpus[0].speed,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get motherboard/BIOS info
   */
  static getMotherboardInfo() {
    try {
      if (process.platform === 'win32') {
        const output = execSync('wmic csproduct get UUID /format:value', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        const match = output.match(/UUID=(.+)/);
        return match ? match[1].trim() : 'UNKNOWN_MB';
      } else if (process.platform === 'linux') {
        const output = execSync('cat /sys/class/dmi/id/product_uuid', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        return output.trim() || 'UNKNOWN_MB';
      } else if (process.platform === 'darwin') {
        const output = execSync(
          'ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID',
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
        );
        const match = output.match(/"IOPlatformUUID" = "(.+)"/);
        return match ? match[1].trim() : 'UNKNOWN_MB';
      }
      return 'UNKNOWN_MB';
    } catch (error) {
      return 'UNKNOWN_MB';
    }
  }

  /**
   * Get disk serial number
   */
  static getDiskInfo() {
    try {
      if (process.platform === 'win32') {
        const output = execSync('wmic logicaldisk get VolumeSerialNumber /format:value', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        const match = output.match(/VolumeSerialNumber=(.+)/);
        return match ? match[1].trim() : 'UNKNOWN_DISK';
      } else if (process.platform === 'linux') {
        const output = execSync("lsblk -d -n -o SERIAL | head -1", {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        return output.trim() || 'UNKNOWN_DISK';
      } else if (process.platform === 'darwin') {
        const output = execSync(
          "diskutil info / | grep 'Device Identifier' | awk '{print $NF}'",
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
        );
        return output.trim() || 'UNKNOWN_DISK';
      }
      return 'UNKNOWN_DISK';
    } catch (error) {
      return 'UNKNOWN_DISK';
    }
  }

  /**
   * Get MAC address from network interfaces
   */
  static getMACAddress() {
    try {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.mac;
          }
        }
      }
      return 'UNKNOWN_MAC';
    } catch (error) {
      return 'UNKNOWN_MAC';
    }
  }

  /**
   * Get Machine GUID (Windows) or UUID (Linux/Mac)
   */
  static getMachineGUID() {
    try {
      if (process.platform === 'win32') {
        const output = execSync('wmic os get SerialNumber /format:value', {
          encoding: 'utf-8',
        });
        const match = output.match(/SerialNumber=(.+)/);
        return match ? match[1].trim() : 'UNKNOWN_GUID';
      } else {
        const output = execSync('cat /etc/machine-id', { encoding: 'utf-8' });
        return output.trim() || 'UNKNOWN_GUID';
      }
    } catch (error) {
      return 'UNKNOWN_GUID';
    }
  }

  /**
   * Generate combined hardware fingerprint
   */
  static generateFingerprint() {
    try {
      const fingerprint = {
        cpu: this.getCPUInfo(),
        motherboard: this.getMotherboardInfo(),
        disk: this.getDiskInfo(),
        mac: this.getMACAddress(),
        guid: this.getMachineGUID(),
        platform: process.platform,
        arch: os.arch(),
      };

      const fingerprintString = JSON.stringify(fingerprint);
      const hash = crypto.createHash('sha256');
      hash.update(fingerprintString);
      const hashedFingerprint = hash.digest('hex');

      return {
        fingerprint: hashedFingerprint,
        components: fingerprint,
      };
    } catch (error) {
      throw new Error(`Fingerprint generation failed: ${error.message}`);
    }
  }

  /**
   * Verify hardware fingerprint (check if machine is the same)
   */
  static verifyFingerprint(storedFingerprint) {
    try {
      const current = this.generateFingerprint();
      return current.fingerprint === storedFingerprint;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get detailed fingerprint info for debugging
   */
  static getFingerprintDetails() {
    try {
      const data = this.generateFingerprint();
      return data;
    } catch (error) {
      throw new Error(`Failed to get fingerprint details: ${error.message}`);
    }
  }
}

module.exports = HardwareFingerprintService;
