import { calculateResults } from '../lib/assessment.js';

import { bearerToken, supabaseAuthUser, supabaseRpc } from '../lib/supabase.js';
import { grantForUser, resolveAssessmentSession } from '../lib/assessment-access.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!['student','professional'].includes(body.profileType)) throw new Error('Test profile is required');
    const results = calculateResults(body.answers);
    const authToken = bearerToken(req);
    if (authToken) {
      const { authUser, user, grantId } = await resolveAssessmentSession(authToken);
      const grant = await grantForUser(user.id, false);
      if (!grant || (grantId && grant.id !== grantId)) throw new Error('Assessment access is unavailable');
      const inserted = await supabaseRpc('submit_assessment', { p_auth_user_id: authUser.id, p_grant_id: grant.id, p_answers: { ...body.answers, _profileType: ['student','professional'].includes(body.profileType) ? body.profileType : 'student' }, p_results: results });
      const attempt = Array.isArray(inserted) ? inserted[0] : inserted;
      if (!attempt?.id) throw new Error('Assessment result was not saved');
      return res.status(200).json({ ok: true, attemptId: attempt.id, expiresAt: Math.floor(new Date(attempt.expires_at).getTime() / 1000), results });
    }
    throw new Error('Verified assessment access is required');
  } catch (error) {
    const invalidAnswers = String(error?.message || '').startsWith('Invalid answer');
    return res.status(invalidAnswers ? 400 : 401).json({ ok: false, error: invalidAnswers ? 'Please answer every question' : 'Bài test đã hết quyền truy cập hoặc chưa lưu được kết quả.' });
  }
}
