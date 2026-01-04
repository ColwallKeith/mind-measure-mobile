// Field-Level PHI Encryption Service
// Medical-grade security implementation for HIPAA compliance
// Conditional crypto import - only available server-side
let createCipher: any, createDecipher: any, randomBytes: any, createHash: any;
if (typeof window === 'undefined') {
  try {
    const crypto = require('crypto');
    createCipher = crypto.createCipher;
    createDecipher = crypto.createDecipher;
    randomBytes = crypto.randomBytes;
    createHash = crypto.createHash;
  } catch (error) {
    console.warn('Crypto module not available - PHI encryption will not work in browser');
  }
}
export interface EncryptionResult {
  encryptedData: string;
  keyId: string;
  algorithm: string;
  iv?: string;
}
export interface DecryptionResult {
  decryptedData: string;
  success: boolean;
  error?: string;
}
export class PHIEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private masterKey: Buffer;
  private keyId: string;
  constructor(masterKey?: string) {
    // Use provided key or environment variable
    const keyString = masterKey || process.env.PHI_ENCRYPTION_KEY || this.generateMasterKey();
    this.masterKey = Buffer.from(keyString, 'hex');
    this.keyId = this.generateKeyId();
  }
  /**
   * Encrypt sensitive PHI data
   */
  encrypt(plaintext: string, context?: Record<string, string>): EncryptionResult {
    try {
      const iv = randomBytes(PHIEncryption.IV_LENGTH);
      const cipher = createCipher(PHIEncryption.ALGORITHM, this.masterKey);
      // Add additional authenticated data (AAD) for context
      if (context) {
        const contextString = JSON.stringify(context);
        cipher.setAAD(Buffer.from(contextString));
      }
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      // Combine IV, auth tag, and encrypted data
      const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]);
      return {
        encryptedData: combined.toString('base64'),
        keyId: this.keyId,
        algorithm: PHIEncryption.ALGORITHM,
        iv: iv.toString('hex'),
      };
    } catch (error) {
      console.error('PHI encryption failed:', error);
      throw new Error('Failed to encrypt PHI data');
    }
  }
  /**
   * Decrypt PHI data
   */
  decrypt(encryptedData: string, keyId?: string, context?: Record<string, string>): DecryptionResult {
    try {
      // Verify key ID if provided
      if (keyId && keyId !== this.keyId) {
        return {
          decryptedData: '',
          success: false,
          error: 'Invalid key ID',
        };
      }
      const combined = Buffer.from(encryptedData, 'base64');
      // Extract IV, auth tag, and encrypted data
      const iv = combined.subarray(0, PHIEncryption.IV_LENGTH);
      const authTag = combined.subarray(PHIEncryption.IV_LENGTH, PHIEncryption.IV_LENGTH + 16);
      const encrypted = combined.subarray(PHIEncryption.IV_LENGTH + 16);
      const decipher = createDecipher(PHIEncryption.ALGORITHM, this.masterKey);
      decipher.setAuthTag(authTag);
      // Set additional authenticated data (AAD) if context provided
      if (context) {
        const contextString = JSON.stringify(context);
        decipher.setAAD(Buffer.from(contextString));
      }
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      return {
        decryptedData: decrypted,
        success: true,
      };
    } catch (error) {
      console.error('PHI decryption failed:', error);
      return {
        decryptedData: '',
        success: false,
        error: 'Failed to decrypt PHI data',
      };
    }
  }
  /**
   * Encrypt multiple fields in an object
   */
  encryptFields(data: Record<string, any>, fieldsToEncrypt: string[]): Record<string, any> {
    const result = { ...data };
    const context = { timestamp: new Date().toISOString() };
    for (const field of fieldsToEncrypt) {
      if (result[field] && typeof result[field] === 'string') {
        const encrypted = this.encrypt(result[field], context);
        result[field] = {
          encrypted: encrypted.encryptedData,
          keyId: encrypted.keyId,
          algorithm: encrypted.algorithm,
        };
      }
    }
    return result;
  }
  /**
   * Decrypt multiple fields in an object
   */
  decryptFields(data: Record<string, any>, fieldsToDecrypt: string[]): Record<string, any> {
    const result = { ...data };
    const context = { timestamp: new Date().toISOString() };
    for (const field of fieldsToDecrypt) {
      if (result[field] && typeof result[field] === 'object' && result[field].encrypted) {
        const decrypted = this.decrypt(result[field].encrypted, result[field].keyId, context);
        if (decrypted.success) {
          result[field] = decrypted.decryptedData;
        } else {
          console.error(`Failed to decrypt field ${field}:`, decrypted.error);
          result[field] = '[DECRYPTION_FAILED]';
        }
      }
    }
    return result;
  }
  /**
   * Generate a secure hash for data integrity verification
   */
  generateHash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
  /**
   * Verify data integrity using hash
   */
  verifyHash(data: string, hash: string): boolean {
    const computedHash = this.generateHash(data);
    return computedHash === hash;
  }
  /**
   * Generate a new master key (for initial setup)
   */
  private generateMasterKey(): string {
    const key = randomBytes(PHIEncryption.KEY_LENGTH);
    console.warn('Generated new PHI encryption key. Store securely:', key.toString('hex'));
    return key.toString('hex');
  }
  /**
   * Generate key ID for key management
   */
  private generateKeyId(): string {
    const hash = createHash('sha256').update(this.masterKey).digest('hex');
    return hash.substring(0, 16); // First 16 characters of hash
  }
  /**
   * Rotate encryption key (for key management)
   */
  rotateKey(newMasterKey: string): PHIEncryption {
    return new PHIEncryption(newMasterKey);
  }
}
// Predefined PHI fields that should always be encrypted
export const PHI_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'dateOfBirth',
  'socialSecurityNumber',
  'medicalRecordNumber',
  'address',
  'emergencyContact',
  'insuranceNumber',
  'conversationTranscript',
  'assessmentResults',
  'medicalNotes',
  'diagnosticData',
];
// Factory function to create PHI encryption service
export function createPHIEncryption(masterKey?: string): PHIEncryption {
  return new PHIEncryption(masterKey);
}
// Utility function to check if a field contains PHI
export function isPHIField(fieldName: string): boolean {
  return PHI_FIELDS.includes(fieldName) ||
         fieldName.toLowerCase().includes('name') ||
         fieldName.toLowerCase().includes('email') ||
         fieldName.toLowerCase().includes('phone') ||
         fieldName.toLowerCase().includes('address') ||
         fieldName.toLowerCase().includes('medical') ||
         fieldName.toLowerCase().includes('health');
}