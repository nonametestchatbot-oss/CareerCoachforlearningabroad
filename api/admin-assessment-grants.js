import { createGrant, findUserByEmail } from '../lib/assessment-access.js';
import { adminEmails, bearerToken, normalizeEmail, requireAdmin, supabaseTable } from '../lib/supabase.js';

function bodyOf(req) { return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }

export default async function handler(req, res) {
  try {
    if (!adminEmails().length) return res.status(503).json({ ok: false, error: 'ADMIN_EMAILS chưa được cấu hình.' });
    await requireAdmin(req);
    if (req.method === 'GET') {
      const grants = await supabaseTable('assessment_access_grants?select=*,assessment_users(email,name)&order=created_at.desc&limit=100');
      return res.status(200).json({ ok: true, grants });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    const body = bodyOf(req);
    const action = String(body.action || 'grant');
    const email = normalizeEmail(body.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ ok: false, error: 'Email không hợp lệ.' });
    const user = (await findUserByEmail(email)) || (await supabaseTable('assessment_users', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ email, name: String(body.name || '').trim().slice(0, 100) || null }) }))?.[0];
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
