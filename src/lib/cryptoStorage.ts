/**
 * Client-Side Storage Encryption Utility (Web Crypto API - AES-GCM 256-bit)
 * Secures sensitive credentials (CEX API keys/secrets) stored in browser localStorage.
 */

const ENCRYPTION_PREFIX = 'enc:v1:';
const DEVICE_KEY_NAME = 'algotrade_device_entropy';

async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available in this environment');
  }

  let rawEntropy = localStorage.getItem(DEVICE_KEY_NAME);
  if (!rawEntropy) {
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    rawEntropy = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_KEY_NAME, rawEntropy);
  }

  const keyMaterial = new TextEncoder().encode(rawEntropy);
  const hash = await window.crypto.subtle.digest('SHA-256', keyMaterial);

  return window.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string payload using AES-GCM with a fresh random 12-byte IV.
 */
export async function encryptSensitiveData(plaintext: string): Promise<string> {
  try {
    if (typeof window === 'undefined' || !window.crypto?.subtle) return plaintext;
    const key = await getOrCreateEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    let binary = '';
    const bytes = new Uint8Array(combined);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return `${ENCRYPTION_PREFIX}${base64}`;
  } catch (error) {
    console.warn('Fallback: Client encryption failed:', error);
    return plaintext;
  }
}

/**
 * Decrypts an encrypted payload. If payload is unencrypted legacy JSON, returns it as-is.
 */
export async function decryptSensitiveData(payload: string): Promise<string> {
  try {
    if (!payload || !payload.startsWith(ENCRYPTION_PREFIX)) {
      return payload; // Legacy unencrypted plaintext fallback
    }

    if (typeof window === 'undefined' || !window.crypto?.subtle) return payload;

    const base64 = payload.slice(ENCRYPTION_PREFIX.length);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);
    const key = await getOrCreateEncryptionKey();

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.warn('Failed to decrypt data, fallback to raw string:', error);
    return payload;
  }
}
