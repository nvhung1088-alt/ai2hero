// HeroSim Extension — lib/crypto.js
// Web Crypto API (AES-256-GCM) cho mã hóa client-side
// Mật khẩu chỉ giải mã trong RAM, không bao giờ lưu plaintext

/**
 * Tạo derived key từ Master PIN bằng PBKDF2-SHA-256
 * @param {string} pin - Master PIN do người dùng nhập
 * @param {Uint8Array} salt - Salt ngẫu nhiên 16 bytes
 * @returns {Promise<CryptoKey>} AES-256-GCM key
 */
export async function deriveKey(pin, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Mã hóa plaintext bằng AES-256-GCM
 * @param {string} plaintext
 * @param {CryptoKey} key
 * @returns {Promise<string>} base64(iv):base64(ciphertext)
 */
export async function encrypt(plaintext, key) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `${ivB64}:${ctB64}`;
}

/**
 * Giải mã ciphertext bằng AES-256-GCM
 * @param {string} encrypted - base64(iv):base64(ciphertext)
 * @param {CryptoKey} key
 * @returns {Promise<string>} plaintext
 */
export async function decrypt(encrypted, key) {
  const [ivB64, ctB64] = encrypted.split(':');
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

/**
 * Sinh salt ngẫu nhiên 16 bytes, encode base64
 * @returns {string} base64 salt
 */
export function generateSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...salt));
}

/**
 * Parse base64 salt về Uint8Array
 * @param {string} saltB64
 * @returns {Uint8Array}
 */
export function parseSalt(saltB64) {
  return Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
}
