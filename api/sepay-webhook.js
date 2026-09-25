export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const expected = `Apikey ${process.env.SEPAY_API_KEY || ''}`;
  if (!process.env.SEPAY_API_KEY || req.headers.authorization !== expected) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  if (!process.env.APPS_SCRIPT_URL || !process.env.APPS_SCRIPT_SECRET) {
    return res.status(500).json({ ok: false, error: 'Payment integration is not configured' });
  }

  if (!process.env.SEPAY_OCB_VA) {
    return res.status(500).json({ ok: false, error: 'OCB virtual account is not configured' });
  }

  let transaction;
  try {
    transaction = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }
  const virtualAccount = process.env.SEPAY_OCB_VA.trim().toUpperCase();
  const gateway = String(transaction.gateway || '').trim().toUpperCase();
  const subAccount = String(transaction.subAccount || '').trim().toUpperCase();
  const content = String(transaction.content || '').toUpperCase();
  const code = String(transaction.code || '').toUpperCase();
  const amount = Number(transaction.transferAmount);
  if (gateway !== 'OCB' || subAccount !== virtualAccount || transaction.transferType !== 'in' || !Number.isSafeInteger(amount) || amount <= 0) {
    return res.status(200).json({ success: true, ignored: true });
  }
  if (!/^LC\d{8}$/.test(code) && !/\bLC\d{8}\b/.test(content)) {
    return res.status(200).json({ success: true, ignored: true });
  }
  const params = new URLSearchParams({
    action: 'confirmPayment',
    secret: process.env.APPS_SCRIPT_SECRET,
    transaction: JSON.stringify(transaction)
  });

  try {
    const upstream = await fetch(process.env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: params.toString()
    });
    const result = await upstream.json();
    if (!upstream.ok || !result.ok) return res.status(422).json({ success: false, error: 'Could not confirm order' });
    return res.status(200).json({ success: true, status: result.status });
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Could not process payment webhook' });
  }
}
