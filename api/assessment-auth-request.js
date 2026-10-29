import { readPaymentStatus, validateOrderCode } from '../lib/payment.js';
import { findUserByEmail, grantForUser } from '../lib/assessment-access.js';
import { adminEmails, normalizeEmail, supabaseAuthOtp } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const email = normalizeEmail(body.email); const code = String(body.code || '').trim().toUpperCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ ok: false, error: 'Vui lòng nhập email hợp lệ.' });
    if (code && !validateOrderCode(code)) return res.status(400).json({ ok: false, error: 'Mã đăng ký không hợp lệ.' });
    if (code) {
      const payment = await readPaymentStatus(code);
      if (payment.status !== 'Paid') return res.status(402).json({ ok: false, error: 'Khoản thanh toán của mã này chưa được SePay xác nhận.' });
    } else if (!adminEmails().includes(email)) {
      const user = await findUserByEmail(email);
      if (!user || !(await grantForUser(user.id, false))) return res.status(403).json({ ok: false, error: 'Email này chưa được cấp quyền làm bài. Nếu bạn đã thanh toán, hãy dùng mã đăng ký trên trang thanh toán.' });
    }
    await supabaseAuthOtp(email);
    return res.status(200).json({ ok: true, message: 'Mã xác thực đã được gửi đến email.' });
  } catch (error) { return res.status(502).json({ ok: false, error: error.message || 'Chưa gửi được mã xác thực.' }); }
}
