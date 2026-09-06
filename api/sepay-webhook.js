export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const expected = 'Apikey ' + (process.env.SEPAY_API_KEY || '');
  if (!process.env.SEPAY_API_KEY || req.headers.authorization !== expected) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  if (!process.env.APPS_SCRIPT_URL || !process.env.APPS_SCRIPT_SECRET) return res.status(500).json({ ok: false, error: 'Payment integration is not configured' });
  const transaction = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const params = new URLSearchParams({ action: 'confirmPayment', secret: process.env.APPS_SCRIPT_SECRET, transaction: JSON.stringify(transaction) });
  try {
    const upstream = await fetch(process.env.APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: params.toString() });
    const result = await upstream.json();
    return res.status(upstream.ok && result.ok ? 200 : 422).json(result);
  } catch (error) { return res.status(502).json({ ok: false, error: 'Could not process payment webhook' }); }
}
