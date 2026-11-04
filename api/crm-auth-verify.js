import { verifyCrmOtp } from '../lib/crm-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const otp = String(body.otp || '').trim();
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ ok: false, error: 'Mã xác thực phải gồm 6 chữ số.' });
    const session = await verifyCrmOtp(body.email, otp);
    return res.status(200).json({
      ok: true,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      user: { email: session.user.email }
    });
  } catch (error) {
    return res.status(401).json({ ok: false, error: error.message || 'Mã xác thực không đúng hoặc đã hết hạn.' });
  }
}




