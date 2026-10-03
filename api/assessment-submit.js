import { calculateResults } from '../lib/assessment.js';
import { signToken, verifyToken } from '../lib/tokens.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const access = verifyToken(body.accessToken, 'assessment-access');
    const results = calculateResults(body.answers);
    const resultToken = signToken({
      type: 'assessment-result',
      code: access.code,
      iat: Math.floor(Date.now() / 1000),
      exp: access.exp,
      results
    });
    return res.status(200).json({ ok: true, resultToken, expiresAt: access.exp });
  } catch (error) {
    const invalidAnswers = String(error?.message || '').startsWith('Invalid answer');
    return res.status(invalidAnswers ? 400 : 401).json({ ok: false, error: invalidAnswers ? 'Please answer every question' : 'Assessment access has expired' });
  }
}
