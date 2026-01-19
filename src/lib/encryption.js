/**
 * Encryption utilities for secure API key storage
 * Uses Web Crypto API for encryption/decryption
 */

/**
 * Derive encryption key from user session
 * @param {string} userId - User ID to derive key from
 * @returns {Promise<CryptoKey>} Encryption key
 */
async function deriveKey(userId) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`window-depot-${userId}-encryption-key`);
  
  // Import key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive key using PBKDF2
  const salt = encoder.encode('window-depot-salt-v1');
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Encrypt API key
 * @param {string} apiKey - API key to encrypt
 * @param {string} userId - User ID for key derivation
 * @returns {Promise<string>} Encrypted API key (base64 encoded)
 */
export async function encryptApiKey(apiKey, userId) {
  try {
    if (!apiKey || !userId) {
      throw new Error('API key and user ID are required');
    }

    const key = await deriveKey(userId);
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt API key');
  }
}

/**
 * Decrypt API key
 * @param {string} encryptedApiKey - Encrypted API key (base64 encoded)
 * @param {string} userId - User ID for key derivation
 * @returns {Promise<string>} Decrypted API key
 */
export async function decryptApiKey(encryptedApiKey, userId) {
  try {
    if (!encryptedApiKey || !userId) {
      throw new Error('Encrypted API key and user ID are required');
    }

    const key = await deriveKey(userId);

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedApiKey), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt API key');
  }
}

/**
 * Check if encryption is supported
 * @returns {boolean} True if Web Crypto API is available
 */
export function isEncryptionSupported() {
  return typeof crypto !== 'undefined' && 
         crypto.subtle !== undefined &&
         typeof crypto.subtle.encrypt === 'function';
}
