import { COUNTRY_PROFILES } from '../country-profiles.js';
import { supabaseTable } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const rows = await supabaseTable('assessment_country_profiles?select=iso2,name_en,scores,source_image&order=name_en.asc');
    if (Array.isArray(rows) && rows.length === COUNTRY_PROFILES.length) {
      const namesVi = new Map(COUNTRY_PROFILES.map(profile => [profile.iso2, profile.nameVi]));
      return res.status(200).json({ ok: true, profiles: rows.map(row => ({
        id: row.iso2.toLowerCase(),
        iso2: row.iso2,
        nameEn: row.name_en,
        nameVi: namesVi.get(row.iso2) || row.name_en,
        scores: row.scores,
        sourceImage: row.source_image
      })) });
    }
  } catch {
    // A static copy keeps comparison available before the database migration runs.
  }
  return res.status(200).json({ ok: true, profiles: COUNTRY_PROFILES });
}

