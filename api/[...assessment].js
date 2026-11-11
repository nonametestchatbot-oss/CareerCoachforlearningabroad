import { bearerToken, supabaseAuthUser, adminEmails, normalizeEmail, requireAdmin, supabaseTable } from '../lib/supabase.js';
import { createGrant, ensureAssessmentUser, findUserByEmail, grantForUser, latestAttempts } from '../lib/assessment-access.js';

function bodyOf(req) { return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
function routeOf(req) {
  try { return new URL(req.url || '/', 'http://localhost').pathname.replace(/\/+$/, ''); }
  catch { return String(req.url || '').split('?')[0].replace(/\/+$/, ''); }
}

async function assessmentAccess(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Hãy xác thực email trước khi mở bài test.' });
    const authUser = await supabaseAuthUser(token);
    const user = await ensureAssessmentUser(authUser);
    const grant = await grantForUser(user.id, true);
    const attempts = await latestAttempts(user.id, 2);
    if (!grant) return res.status(403).json({ ok: false, error: 'Bạn chưa có lượt làm bài còn hiệu lực.' });
    return res.status(200).json({ ok: true, grant: { id: grant.id, expiresAt: grant.expires_at, attemptUsed: grant.attempt_used, showPreviousResult: grant.show_previous_result }, latestAttemptId: attempts?.[0]?.id || null });
  } catch (error) {
    return res.status(error.message?.includes('Supabase') ? 503 : 401).json({ ok: false, error: 'Quyền truy cập chưa sẵn sàng hoặc đã hết hạn.' });
  }
}

async function adminAssessmentGrants(req, res) {
  try {
    if (!adminEmails().length) return res.status(503).json({ ok: false, error: 'ADMIN_EMAILS chưa được cấu hình.' });
    await requireAdmin(req);
    if (req.method === 'GET') {
      const grants = await supabaseTable('assessment_access_grants?select=*,assessment_users(email,name)&order=created_at.desc&limit=250');
      const attempts = await supabaseTable('assessment_attempts?select=*,assessment_users(email,name),assessment_access_grants(source,order_code)&order=submitted_at.desc&limit=500');
      return res.status(200).json({ ok: true, grants, attempts });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    const body = bodyOf(req);
    const action = String(body.action || 'grant');
    const email = normalizeEmail(body.email);
    if (!/^\\S+@\\S+\\.\\S+$/.test(email)) return res.status(400).json({ ok: false, error: 'Email không hợp lệ.' });
    let user = await findUserByEmail(email);
    const name = String(body.name || '').trim().slice(0, 100) || null;
    if (!user) user = (await supabaseTable('assessment_users', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ email, name }) }))?.[0];
    else if (name && name !== user.name) user = (await supabaseTable(`assessment_users?id=eq.${encodeURIComponent(user.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ name, updated_at: new Date().toISOString() }) }))?.[0] || { ...user, name };
    if (action === 'revoke') {
      await supabaseTable(`assessment_access_grants?id=eq.${encodeURIComponent(String(body.grantId || ''))}`, { method: 'PATCH', body: JSON.stringify({ status: 'revoked' }) });
      return res.status(200).json({ ok: true });
    }
    const grant = await createGrant({ userId: user.id, source: 'manual', showPreviousResult: Boolean(body.showPreviousResult), notes: String(body.notes || 'Cấp thủ công bởi quản trị viên').slice(0, 500) });
    return res.status(200).json({ ok: true, grant });
  } catch (error) {
    return res.status(error.message === 'Admin access required' ? 403 : 401).json({ ok: false, error: error.message || 'Không thực hiện được.' });
  }
}

export default async function handler(req, res) {
  const path = routeOf(req);
  if (path.endsWith('/admin-assessment-grants')) return adminAssessmentGrants(req, res);
  if (path.endsWith('/assessment-access')) return assessmentAccess(req, res);
  return res.status(404).json({ ok: false, error: 'API route not found' });
}
