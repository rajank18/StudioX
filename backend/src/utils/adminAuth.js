const crypto = require('crypto');

const ADMIN_EMAIL = process.env.STUDIOX_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.STUDIOX_ADMIN_PASSWORD;
const ADMIN_PASSWORD_SALT = process.env.STUDIOX_ADMIN_PASSWORD_SALT;
const ADMIN_SECRET = process.env.STUDIOX_ADMIN_SECRET;
const TOKEN_TTL_MS = Number(process.env.STUDIOX_ADMIN_TOKEN_TTL_MS || 12 * 60 * 60 * 1000);

function base64urlEncode(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64urlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function hashPassword(password) {
  return crypto.scryptSync(String(password), ADMIN_PASSWORD_SALT, 64).toString('hex');
}

function getExpectedPasswordHash() {
  return process.env.STUDIOX_ADMIN_PASSWORD_HASH || hashPassword(ADMIN_PASSWORD);
}

function verifyAdminCredentials(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const expectedEmail = ADMIN_EMAIL.trim().toLowerCase();

  if (!normalizedEmail || normalizedEmail !== expectedEmail) {
    return false;
  }

  const actualHash = hashPassword(password || '');
  const expectedHash = getExpectedPasswordHash();

  const actualBuf = Buffer.from(actualHash, 'hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');

  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function signPayload(payload) {
  return crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('base64url');
}

function createAdminToken(email) {
  const payload = {
    email: String(email || '').trim().toLowerCase(),
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing_token' };
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return { valid: false, reason: 'invalid_format' };
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');

  if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    return { valid: false, reason: 'invalid_signature' };
  }

  let payload;
  try {
    payload = JSON.parse(base64urlDecode(encodedPayload));
  } catch (_) {
    return { valid: false, reason: 'invalid_payload' };
  }

  if (!payload?.exp || Number(payload.exp) < Date.now()) {
    return { valid: false, reason: 'expired' };
  }

  return {
    valid: true,
    payload,
  };
}

module.exports = {
  ADMIN_EMAIL,
  TOKEN_TTL_MS,
  verifyAdminCredentials,
  createAdminToken,
  verifyAdminToken,
};
