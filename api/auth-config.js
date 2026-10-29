export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const url = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const anonKey = String(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!url || !anonKey) return res.status(503).json({ ok: false, error: 'Assessment login is not configured yet' });
  return res.status(200).json({ ok: true, supabaseUrl: url, supabaseAnonKey: anonKey });
}
