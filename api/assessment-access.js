import { readPaymentStatus, validateOrderCode } from '../lib/payment.js';
import { expiresIn30Days, signToken } from '../lib/tokens.js';
import { bearerToken, supabaseAuthUser } from '../lib/supabase.js';
import { ensureAssessmentUser, grantForUser, latestAttempts } from '../lib/assessment-access.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const token = bearerToken(req);
    if (token) {
      const authUser = await supabaseAuthUser(token);
      const user = await ensureAssessmentUser(authUser);
      const grant = await grantForUser(user.id, true);
      const attempts = await latestAttempts(user.id, 2);
      if (!grant) return res.status(403).json({ ok: false, error: 'Bạn chưa có lượt làm bài còn hiệu lực.' });
      return res.status(200).json({ ok: true, grant: { id: grant.id, expiresAt: grant.expires_at, attemptUsed: grant.attempt_used, showPreviousResult: grant.show_previous_result }, latestAttemptId: attempts?.[0]?.id || null });
    }
    const code = String(req.query?.code || '').trim().toUpperCase();
    if (!validateOrderCode(code)) return res.status(400).json({ ok: false, error: 'Invalid order code' });
    const payment = await readPaymentStatus(code);
    if (payment.status !== 'Paid') return res.status(402).json({ ok: false, error: 'Payment is not confirmed' });
    const expiresAt = expiresIn30Days();
    const accessToken = signToken({ type: 'assessment-access', code, iat: Math.floor(Date.now() / 1000), exp: expiresAt });
    return res.status(200).json({ ok: true, accessToken, expiresAt });
  } catch (error) {
    return res.status(error.message?.includes('Supabase') ? 503 : 401).json({ ok: false, error: 'Quyền truy cập chưa sẵn sàng hoặc đã hết hạn.' });
  }
}
