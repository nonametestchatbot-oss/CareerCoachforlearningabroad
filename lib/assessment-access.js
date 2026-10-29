import { supabaseTable } from './supabase.js';

export async function findUserByEmail(email) {
  const rows = await supabaseTable(`assessment_users?select=*&email=eq.${encodeURIComponent(email)}&limit=1`);
  return rows?.[0] || null;
}

export async function ensureAssessmentUser(authUser) {
  const email = String(authUser.email || '').trim().toLowerCase();
  if (!email || !authUser.id) throw new Error('Email authentication is required');
  let user = await findUserByEmail(email);
  const payload = { email, auth_user_id: authUser.id, updated_at: new Date().toISOString() };
  if (!user) {
    const rows = await supabaseTable('assessment_users', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
    return rows?.[0];
  }
  if (user.auth_user_id && user.auth_user_id !== authUser.id) throw new Error('This email is linked to another account');
  const rows = await supabaseTable(`assessment_users?id=eq.${encodeURIComponent(user.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
  return rows?.[0] || { ...user, ...payload };
}

export async function findGrantByOrderCode(orderCode) {
  const rows = await supabaseTable(`assessment_access_grants?select=*&order_code=eq.${encodeURIComponent(orderCode)}&limit=1`);
  return rows?.[0] || null;
}

export async function findUserByAuthId(authUserId) {
  const rows = await supabaseTable(`assessment_users?select=*&auth_user_id=eq.${encodeURIComponent(authUserId)}&limit=1`);
  return rows?.[0] || null;
}

export async function grantForUser(userId, includeUsed = true) {
  const now = new Date().toISOString();
  const statusFilter = includeUsed ? 'status=in.(active,used)' : 'status=eq.active&attempt_used=eq.false';
  const rows = await supabaseTable(`assessment_access_grants?select=*&user_id=eq.${encodeURIComponent(userId)}&${statusFilter}&expires_at=gt.${encodeURIComponent(now)}&order=granted_at.desc&limit=1`);
  return rows?.[0] || null;
}

export async function createGrant({ userId, source, orderCode = null, showPreviousResult = false, notes = '' }) {
  const existing = orderCode ? await findGrantByOrderCode(orderCode) : null;
  if (existing) return existing;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await supabaseTable('assessment_access_grants', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ user_id: userId, source, order_code: orderCode, expires_at: expiresAt, show_previous_result: Boolean(showPreviousResult), notes: String(notes || '').slice(0, 500) }) });
  return rows?.[0];
}

export async function latestAttempts(userId, limit = 5) {
  return supabaseTable(`assessment_attempts?select=*&user_id=eq.${encodeURIComponent(userId)}&order=submitted_at.desc&limit=${Math.max(1, Math.min(10, limit))}`);
}

export async function getAttemptForUser(attemptId, userId) {
  const rows = await supabaseTable(`assessment_attempts?select=*,assessment_access_grants(show_previous_result)&id=eq.${encodeURIComponent(attemptId)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`);
  return rows?.[0] || null;
}
