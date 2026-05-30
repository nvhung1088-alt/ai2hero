import crypto from 'crypto';

console.log('\n======================================================');
console.log('🛡️  MILITARY-GRADE SECURITY KEYS GENERATOR  🛡️');
console.log('======================================================\n');

// 1. Generate SIM_ENCRYPTION_KEY (must be exactly 32 bytes/characters in UTF-8 for aes-256-cbc check)
// 16 bytes of random data formatted as a 32-character hex string.
const simEncryptionKey = crypto.randomBytes(16).toString('hex');

// 2. Generate AUTH_SECRET (32 bytes random hex string, standard for NextAuth/Auth.js)
const authSecret = crypto.randomBytes(32).toString('hex');

// 3. Generate CRON_SECRET (secure random key for cron task authorization)
const cronSecret = crypto.randomBytes(24).toString('base64url');

console.log('✨ Here is your newly generated secure keys set:\n');

console.log('🔑 SIM_ENCRYPTION_KEY (Military-grade AES encryption key - exactly 32 chars):');
console.log(`👉 \x1b[36m${simEncryptionKey}\x1b[0m`);
console.log('   (Copy this to your .env under SIM_ENCRYPTION_KEY)\n');

console.log('🔑 AUTH_SECRET (NextAuth / Auth.js session secret key - 64 chars hex):');
console.log(`👉 \x1b[32m${authSecret}\x1b[0m`);
console.log('   (Copy this to your .env under AUTH_SECRET)\n');

console.log('🔑 CRON_SECRET (Vercel Cron backup authentication token):');
console.log(`👉 \x1b[35m${cronSecret}\x1b[0m`);
console.log('   (Copy this to your .env under CRON_SECRET for cron validation)\n');

console.log('======================================================');
console.log('⚠️  IMPORTANT NOTE:');
console.log('1. Keep these keys extremely secret! Never commit them to version control.');
console.log('2. When deploying to production (Vercel, Render, VPS), copy these exact values');
console.log('   into the environment variables settings on your hosting platform dashboard.');
console.log('======================================================\n');
