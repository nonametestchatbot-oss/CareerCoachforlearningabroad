import { normalizeEmail, supabaseGetUser, supabaseAuthOtp, supabaseVerifyOtp } from './supabase.js';

function configuredAdminEmails() {
  return String(process.env.CRM_ADMIN_EMAILS || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isCrmAdmin(email) {
  const admins = configuredAdminEmails();
  return admins.length > 0 && admins.includes(normalizeEmail(email));
}

export function bearerToken(req) {
  const value = String(req.headers?.authorization || '');
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

export async function requireCrmAdmin(req) {
  const accessToken = bearerToken(req);
  if (!accessToken) throw new Error('Authentication required');
  const user = await supabaseGetUser(accessToken);
  if (!isCrmAdmin(user.email)) throw new Error('CRM admin access required');
  return user;
}

export async function sendCrmOtp(email) {
  const normalized = normalizeEmail(email);
  if (!isCrmAdmin(normalized)) throw new Error('Email này chưa được cấp quyền quản trị CRM');
  return supabaseAuthOtp(normalized);
}

export async function verifyCrmOtp(email, otp) {
  const normalized = normalizeEmail(email);
  if (!isCrmAdmin(normalized)) throw new Error('Email này chưa được cấp quyền quản trị CRM');
  const session = await supabaseVerifyOtp(normalized, otp);
  if (!isCrmAdmin(session.user?.email || normalized)) throw new Error('CRM admin access required');
  return session;
}




