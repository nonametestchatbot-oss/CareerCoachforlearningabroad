import { sendCrmOtp } from '../lib/crm-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    await sendCrmOtp(body.email);
    return res.status(200).json({ ok: true, message: 'Mã xác thực đã được gửi đến email quản trị.' });
  } catch (error) {
    return res.status(403).json({ ok: false, error: error.message || 'Không gửi được mã xác thực.' });
  }
}




