import { readPaymentStatus, validateOrderCode } from '../lib/payment.js';
import { findUserByEmail, grantForUser } from '../lib/assessment-access.js';
import { adminEmails, normalizeEmail, supabaseAuthOtp } from '../lib/supabase.js';

function providerError(error) {
  const raw = String(error?.message || '');
  let detail;
  try { detail = JSON.parse(raw); } catch {}
  const message = String(detail?.msg || detail?.message || raw);
  const isRateLimited = Number(detail?.code) === 429
    || detail?.error_code === 'over_email_send_rate_limit'
    || /over_email_send_rate_limit/i.test(message);
  if (isRateLimited) {
    const seconds = Number(message.match(/after\s+(\d+)\s+seconds?/i)?.[1] || 60);
    return {
      status: 429,
      retryAfterSeconds: seconds,
      error: `Bạn vừa yêu cầu mã xác thực. Hãy chờ ${seconds} giây rồi thử lại. Nếu đã nhận email, hãy mở liên kết đăng nhập trong đó.`
    };
  }
  return { status: 502, error: 'Chưa gửi được mã xác thực lúc này. Vui lòng thử lại sau ít phút.' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const email = normalizeEmail(body.email); const code = String(body.code || '').trim().toUpperCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ ok: false, error: 'Vui lòng nhập email hợp lệ.' });
    if (code && !validateOrderCode(code)) return res.status(400).json({ ok: false, error: 'Mã đăng ký không hợp lệ.' });
    const isAdmin = adminEmails().includes(email);
    if (code) {
      const payment = await readPaymentStatus(code);
      if (payment.status !== 'Paid') return res.status(402).json({ ok: false, error: 'Khoản thanh toán của mã này chưa được SePay xác nhận.' });
    } else if (!isAdmin) {
      const user = await findUserByEmail(email);
      if (!user || !(await grantForUser(user.id, false))) return res.status(403).json({ ok: false, error: 'Email này chưa được cấp quyền làm bài. Nếu bạn đã thanh toán, hãy dùng mã đăng ký trên trang thanh toán.' });
    }
    await supabaseAuthOtp(email, isAdmin ? 'admin' : 'assessment');
    return res.status(200).json({ ok: true, message: 'Email đăng nhập đã được gửi.' });
  } catch (error) {
    const failure = providerError(error);
    if (failure.retryAfterSeconds) res.setHeader('Retry-After', String(failure.retryAfterSeconds));
    return res.status(failure.status).json({ ok: false, error: failure.error, ...(failure.retryAfterSeconds ? { retryAfterSeconds: failure.retryAfterSeconds } : {}) });
  }
}
