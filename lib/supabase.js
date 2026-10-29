const jsonHeaders = { 'Content-Type': 'application/json' };

export function supabaseConfig() {
  const url = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const anonKey = String(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!url || !serviceKey || !anonKey) throw new Error('Supabase is not configured');
  return { url, serviceKey, anonKey };
}

function dbHeaders(config, extra = {}) {
  return { ...jsonHeaders, apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, ...extra };
}

export async function supabaseAuthUser(accessToken) {
  const config = supabaseConfig();
  if (!accessToken) throw new Error('Missing authentication');
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.anonKey, Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Invalid authentication');
  return response.json();
}

export async function supabaseAuthOtp(email) {
  const config = supabaseConfig();
  const response = await fetch(`${config.url}/auth/v1/otp`, {
    method: 'POST',
    headers: { ...jsonHeaders, apikey: config.anonKey },
    body: JSON.stringify({ email, create_user: true })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Could not send verification code');
  }
}

export async function supabaseVerifyOtp(email, token) {
  const config = supabaseConfig();
  const response = await fetch(`${config.url}/auth/v1/verify`, {
    method: 'POST',
    headers: { ...jsonHeaders, apikey: config.anonKey },
    body: JSON.stringify({ email, token, type: 'email' })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Invalid verification code');
  }
  return response.json();
}

export async function supabaseTable(path, options = {}) {
  const config = supabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: dbHeaders(config, options.headers || {})
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const message = body?.message || body?.error_description || body?.hint || body?.details || body?.error || 'Supabase request failed';
    throw new Error(message);
  }
  return body;
}

export async function supabaseRpc(name, body) {
  return supabaseTable(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
}

export function bearerToken(req) {
  const header = String(req.headers?.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function adminEmails() {
  return String(process.env.ADMIN_EMAILS || '').split(',').map(normalizeEmail).filter(Boolean);
}

export async function requireAdmin(req) {
  const user = await supabaseAuthUser(bearerToken(req));
  if (!adminEmails().includes(normalizeEmail(user.email))) throw new Error('Admin access required');
  return user;
}

export function currentGrantFilter(userId) {
  return `user_id=eq.${encodeURIComponent(userId)}&status=eq.active&attempt_used=eq.false&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=granted_at.desc&limit=1`;
}
