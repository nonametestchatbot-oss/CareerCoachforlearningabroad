import { verifyToken } from '../lib/tokens.js';
import { bearerToken, supabaseAuthUser } from '../lib/supabase.js';
import { ensureAssessmentUser, getAttemptForUser, latestAttempts } from '../lib/assessment-access.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const authToken = bearerToken(req);
    const attemptId = String(req.query?.id || '').trim();
    if (authToken && attemptId) {
      const authUser = await supabaseAuthUser(authToken);
      const user = await ensureAssessmentUser(authUser);
      const attempt = await getAttemptForUser(attemptId, user.id);
      if (!attempt || new Date(attempt.expires_at).getTime() <= Date.now()) throw new Error('Expired');
      const showPrevious = Boolean(attempt.assessment_access_grants?.show_previous_result);
      const attempts = showPrevious ? await latestAttempts(user.id, 5) : [];
      const previous = attempts.find(item => item.id !== attempt.id && new Date(item.expires_at).getTime() > Date.now());
      return res.status(200).json({ ok: true, expiresAt: Math.floor(new Date(attempt.expires_at).getTime() / 1000), results: attempt.results, previousResults: previous?.results || null });
    }
    const result = verifyToken(req.query?.token, 'assessment-result');
    return res.status(200).json({ ok: true, expiresAt: result.exp, results: result.results, previousResults: null });
  } catch {
    return res.status(401).json({ ok: false, error: 'Kết quả đã hết hạn hoặc đường dẫn không hợp lệ.' });
  }
}
