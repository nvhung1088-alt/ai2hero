import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.SIM_ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY) {
  throw new Error('CRITICAL CONFIG FAILURE: SIM_ENCRYPTION_KEY environment variable is not defined!');
}

if (Buffer.from(ENCRYPTION_KEY).length !== 32) {
  throw new Error(`CRITICAL CONFIG FAILURE: SIM_ENCRYPTION_KEY must be exactly 32 bytes/characters (got ${Buffer.from(ENCRYPTION_KEY).length} bytes)!`);
}

const IV_LENGTH = 16;

/**
 * Mã hóa chuỗi PII hoặc khóa cấu hình.
 * Hỗ trợ nhận null/undefined và trả về tương ứng.
 */
export function encryptField(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  if (text === '') return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    console.error('Encryption failed:', err);
    return text;
  }
}

/**
 * Giải mã chuỗi PII hoặc khóa cấu hình.
 * Hỗ trợ nhận null/undefined và trả về tương ứng.
 * Nếu chuỗi không hợp lệ (plaintext cũ), trả về nguyên bản để tương thích ngược.
 */
export function decryptField(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  if (text === '') return '';
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return text; // Dữ liệu cũ dạng cleartext
    const iv = Buffer.from(textParts.shift() || '', 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    // Nếu giải mã lỗi (do key thay đổi hoặc plaintext chứa dấu hai chấm ngẫu nhiên), trả về bản gốc để tránh crash
    return text;
  }
}
