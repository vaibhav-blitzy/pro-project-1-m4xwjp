import { randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { promisify } from 'util';

// Encryption configuration constants
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || (() => { throw new Error('Encryption key must be provided'); })();
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM mode
const KEY_LENGTH = 32; // 32 bytes (256 bits) for AES-256

// Convert callback-based scrypt to Promise-based
const scryptAsync = promisify(scrypt);

/**
 * Custom error class for encryption-related errors
 */
class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Encrypts sensitive data using AES-256-GCM with a unique initialization vector
 * and authentication tag for each operation.
 * 
 * @param {string} data - The data to encrypt
 * @returns {Promise<string>} Base64 encoded string containing IV, encrypted data, and authentication tag
 * @throws {EncryptionError} If encryption fails or input is invalid
 */
export async function encrypt(data: string): Promise<string> {
  try {
    if (!data) {
      throw new EncryptionError('Data to encrypt must be provided');
    }

    // Generate a random initialization vector
    const iv = randomBytes(IV_LENGTH);

    // Derive encryption key using scrypt
    const key = await scryptAsync(ENCRYPTION_KEY, 'salt', KEY_LENGTH);

    // Create cipher with algorithm, key and IV
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    // Encrypt the data
    const encryptedData = Buffer.concat([
      cipher.update(Buffer.from(data, 'utf8')),
      cipher.final()
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted data and auth tag
    const combined = Buffer.concat([iv, encryptedData, authTag]);

    // Encode to base64
    const result = combined.toString('base64');

    // Clear sensitive data from memory
    key.fill(0);
    
    return result;
  } catch (error) {
    throw new EncryptionError(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypts data that was encrypted using the encrypt function, verifying
 * the authentication tag for data integrity.
 * 
 * @param {string} encryptedData - The encrypted data to decrypt (base64 encoded)
 * @returns {Promise<string>} The original decrypted string
 * @throws {EncryptionError} If decryption fails or input is invalid
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    if (!encryptedData) {
      throw new EncryptionError('Encrypted data must be provided');
    }

    // Decode the base64 input
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract IV, encrypted data and auth tag
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(combined.length - AUTH_TAG_LENGTH);
    const encryptedContent = combined.slice(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

    // Derive encryption key using scrypt
    const key = await scryptAsync(ENCRYPTION_KEY, 'salt', KEY_LENGTH);

    // Create decipher
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    const decrypted = Buffer.concat([
      decipher.update(encryptedContent),
      decipher.final()
    ]);

    // Convert to string
    const result = decrypted.toString('utf8');

    // Clear sensitive data from memory
    key.fill(0);

    return result;
  } catch (error) {
    throw new EncryptionError(`Decryption failed: ${error.message}`);
  }
}

/**
 * Generates a cryptographically secure random encryption key of specified length.
 * 
 * @param {number} length - The desired key length in bytes
 * @returns {Promise<string>} Base64 encoded random key
 * @throws {EncryptionError} If key generation fails
 */
export async function generateKey(length: number = KEY_LENGTH): Promise<string> {
  try {
    if (length < KEY_LENGTH) {
      throw new EncryptionError(`Key length must be at least ${KEY_LENGTH} bytes`);
    }

    const key = randomBytes(length);
    return key.toString('base64');
  } catch (error) {
    throw new EncryptionError(`Key generation failed: ${error.message}`);
  }
}

/**
 * Validates encryption key length and format.
 * 
 * @param {string} key - The encryption key to validate
 * @returns {Promise<boolean>} True if key is valid
 * @throws {EncryptionError} If key is invalid
 */
export async function validateKey(key: string): Promise<boolean> {
  try {
    if (!key) {
      throw new EncryptionError('Encryption key must be provided');
    }

    // Decode base64 key
    const keyBuffer = Buffer.from(key, 'base64');

    // Validate key length
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new EncryptionError(`Key must be exactly ${KEY_LENGTH} bytes when decoded`);
    }

    // Verify key is valid base64
    if (keyBuffer.toString('base64') !== key) {
      throw new EncryptionError('Key must be valid base64');
    }

    return true;
  } catch (error) {
    throw new EncryptionError(`Key validation failed: ${error.message}`);
  }
}