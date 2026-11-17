import crypto from 'node:crypto';

const DEFAULT_DEV_SECRET = 'local-assessment-secret-change-me';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function getSecret() {
  const secret = String(process.env.ASSESSMENT_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') return DEFAULT_DEV_SECRET;
  throw new Error('ASSESSMENT_SIGNING_SECRET is not configured');
}

export function signToken(payload) {
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function grantCodeDigest(grant, email) {
  if (!grant?.id || !grant?.expires_at || !email) throw new Error('Assessment grant details are incomplete');
  const expiry = new Date(grant.expires_at).toISOString();
  return crypto.createHmac('sha256', getSecret())
    .update(`assessment-access-code:${grant.id}:${String(email).trim().toLowerCase()}:${expiry}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
}

export function assessmentGrantCode(grant, email) {
  const raw = grantCodeDigest(grant, email);
  return raw.match(/.{1,4}/g).join('-');
}

export function verifyAssessmentGrantCode(grant, email, suppliedCode) {
  const supplied = String(suppliedCode || '').replace(/[^a-f0-9]/gi, '').toUpperCase();
  if (!/^[A-F0-9]{16}$/.test(supplied)) return false;
  const expected = grantCodeDigest(grant, email);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
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
