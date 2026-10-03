import crypto from 'node:crypto';

const DEFAULT_DEV_SECRET = 'local-assessment-secret-change-me';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function getSecret() {
  const secret = String(process.env.ASSESSMENT_SIGNING_SECRET || '').trim();
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') return DEFAULT_DEV_SECRET;
  throw new Error('ASSESSMENT_SIGNING_SECRET is not configured');
}

export function signToken(payload) {
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyToken(token, expectedType) {
  if (typeof token !== 'string') throw new Error('Missing token');
  const [body, signature] = token.split('.');
  if (!body || !signature) throw new Error('Invalid token');
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) throw new Error('Invalid token');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (expectedType && payload.type !== expectedType) throw new Error('Invalid token type');
  if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

export function expiresIn30Days() {
  return Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
}
