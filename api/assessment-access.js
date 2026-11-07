import { bearerToken, supabaseAuthUser } from '../lib/supabase.js';
import { ensureAssessmentUser, grantForUser, latestAttempts } from '../lib/assessment-access.js';

export default async function handler(req, res) {
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
