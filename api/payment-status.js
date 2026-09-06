export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const code = String(req.query?.code || '').trim();
  if (!/^LC\d{8}$/.test(code)) return res.status(400).json({ ok: false, error: 'Invalid order code' });
  if (!process.env.APPS_SCRIPT_URL || !process.env.APPS_SCRIPT_SECRET) {
    return res.status(500).json({ ok: false, error: 'Payment integration is not configured' });
  }

  try {
    const url = new URL(process.env.APPS_SCRIPT_URL);
    url.searchParams.set('action', 'paymentStatus');
    url.searchParams.set('secret', process.env.APPS_SCRIPT_SECRET);
    url.searchParams.set('orderCode', code);
    const upstream = await fetch(url);
    const result = await upstream.json();
    return res.status(upstream.ok ? 200 : 502).json(result);
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Could not check payment status' });
  }
}
