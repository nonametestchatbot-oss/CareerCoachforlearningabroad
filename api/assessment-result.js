import { bearerToken, supabaseAuthUser, supabaseTable } from '../lib/supabase.js';
import { getAttemptForUser, latestAttempts, resolveAssessmentSession } from '../lib/assessment-access.js';
import { COUNTRY_PROFILES } from '../country-profiles.js';

async function countryProfiles() {
  try {
    const rows = await supabaseTable('assessment_country_profiles?select=iso2,name_en,scores,source_image&order=name_en.asc');
    if (Array.isArray(rows) && rows.length === COUNTRY_PROFILES.length) {
      const namesVi = new Map(COUNTRY_PROFILES.map(profile => [profile.iso2, profile.nameVi]));
      return rows.map(row => ({ id: row.iso2.toLowerCase(), iso2: row.iso2,
        nameEn: row.name_en, nameVi: namesVi.get(row.iso2) || row.name_en,
        scores: row.scores, sourceImage: row.source_image }));
    }
  } catch {
    // Reference profiles remain available while the migration is pending.
  }
  return COUNTRY_PROFILES;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const authToken = bearerToken(req);
    const attemptId = String(req.query?.id || '').trim();
    if (authToken && attemptId) {
      const { user, grantId } = await resolveAssessmentSession(authToken);
      const attempt = await getAttemptForUser(attemptId, user.id);
      if (!attempt || (grantId && attempt.grant_id !== grantId) || new Date(attempt.expires_at).getTime() <= Date.now()) throw new Error('Expired');
      const showPrevious = Boolean(attempt.assessment_access_grants?.show_previous_result);
      const attempts = showPrevious ? await latestAttempts(user.id, 5) : [];
      const previous = attempts.find(item => item.id !== attempt.id && new Date(item.expires_at).getTime() > Date.now());
      return res.status(200).json({ ok: true, expiresAt: Math.floor(new Date(attempt.expires_at).getTime() / 1000), results: attempt.results, profileType: attempt.answers?._profileType || null, previousResults: previous?.results || null, countryProfiles: await countryProfiles() });
    }
    throw new Error('Verified assessment access is required');
  } catch {
    return res.status(401).json({ ok: false, error: 'Kết quả đã hết hạn hoặc đường dẫn không hợp lệ.' });
  }
}

