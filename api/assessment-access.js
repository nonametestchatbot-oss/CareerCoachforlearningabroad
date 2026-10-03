import { readPaymentStatus, validateOrderCode } from '../lib/payment.js';
import { expiresIn30Days, signToken } from '../lib/tokens.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const code = String(req.query?.code || '').trim().toUpperCase();
  if (!validateOrderCode(code)) return res.status(400).json({ ok: false, error: 'Invalid order code' });
  try {
    const payment = await readPaymentStatus(code);
    if (payment.status !== 'Paid') return res.status(402).json({ ok: false, error: 'Payment is not confirmed' });
    const expiresAt = expiresIn30Days();
    const accessToken = signToken({ type: 'assessment-access', code, iat: Math.floor(Date.now() / 1000), exp: expiresAt });
    return res.status(200).json({ ok: true, accessToken, expiresAt });
  } catch {
    return res.status(502).json({ ok: false, error: 'Could not verify payment' });
  }
}
