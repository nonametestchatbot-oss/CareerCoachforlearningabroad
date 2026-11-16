import { adminEmails, normalizeEmail, requireAdmin, supabaseTable } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    if (!adminEmails().length) return res.status(503).json({ ok: false, error: 'ADMIN_EMAILS chưa được cấu hình.' });
    const admin = await requireAdmin(req);
    if (!adminEmails().includes(normalizeEmail(admin.email))) return res.status(403).json({ ok: false, error: 'Admin access required' });
    const id = String(req.query?.id || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ ok: false, error: 'Mã bài làm không hợp lệ.' });
    const rows = await supabaseTable(`assessment_attempts?id=eq.${encodeURIComponent(id)}&select=*,assessment_users(email,name),assessment_access_grants(source,order_code)&limit=1`);
    const attempt = rows?.[0];
    if (!attempt) return res.status(404).json({ ok: false, error: 'Không tìm thấy kết quả bài làm.' });
    const user = Array.isArray(attempt.assessment_users) ? attempt.assessment_users[0] : attempt.assessment_users || {};
    const grant = Array.isArray(attempt.assessment_access_grants) ? attempt.assessment_access_grants[0] : attempt.assessment_access_grants || {};
    return res.status(200).json({
      ok: true,
      attempt: {
        submittedAt: attempt.submitted_at,
        profileType: attempt.answers?._profileType || null,
        user: { name: user.name || '', email: user.email || '' },
        source: grant.source || '',
        orderCode: grant.order_code || '',
        results: attempt.results || {}
      }
    });
  } catch (error) {
    const forbidden = error.message === 'Admin access required';
    return res.status(forbidden ? 403 : 401).json({ ok: false, error: forbidden ? 'Admin access required' : error.message || 'Không tải được kết quả.' });
  }
}
