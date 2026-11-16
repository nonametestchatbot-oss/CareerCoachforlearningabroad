import { randomUUID } from 'node:crypto';
import { readPaymentStatus, validateOrderCode } from '../lib/payment.js';
import { ensureAssessmentUser, findUserByEmail, grantForUser } from '../lib/assessment-access.js';
import { adminEmails, normalizeEmail, supabaseAuthOtp } from '../lib/supabase.js';
import { signToken } from '../lib/tokens.js';

function providerError(error) {
  const raw = String(error?.message || '');
  let detail;
  try { detail = JSON.parse(raw); } catch {}
  const message = String(detail?.msg || detail?.message || raw);
  const isRateLimited = Number(detail?.code) === 429
    || detail?.error_code === 'over_email_send_rate_limit'
    || /over_email_send_rate_limit/i.test(message);
  if (isRateLimited) {
    const seconds = Number(message.match(/after\\s+(\\d+)\\s+seconds?/i)?.[1] || 60);
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
    const email = normalizeEmail(body.email);
    const code = String(body.code || '').trim().toUpperCase();
    if (!/^\\S+@\\S+\\.\\S+$/.test(email)) return res.status(400).json({ ok: false, error: 'Vui lòng nhập email hợp lệ.' });

    const user = await findUserByEmail(email);
    const activeGrant = user ? await grantForUser(user.id, false) : null;
    if (activeGrant) {
      const identity = await ensureAssessmentUser({ id: user.auth_user_id || randomUUID(), email });
      const currentGrant = await grantForUser(identity.id, false);
      if (!currentGrant || currentGrant.id !== activeGrant.id) return res.status(403).json({ ok: false, error: 'Lượt làm bài không còn hiệu lực. Hãy liên hệ Linh để được hỗ trợ.' });
      const expiresAt = Math.floor(new Date(currentGrant.expires_at).getTime() / 1000);
      const accessToken = signToken({ type: 'assessment_access', email, userId: identity.id, authUserId: identity.auth_user_id, grantId: currentGrant.id, exp: expiresAt });
      return res.status(200).json({
        ok: true,
        accessToken,
        user: { email },
        grant: { id: currentGrant.id, expiresAt: currentGrant.expires_at, attemptUsed: false, showPreviousResult: currentGrant.show_previous_result }
      });
    }

    const isAdmin = adminEmails().includes(email);
    if (code) {
      if (!validateOrderCode(code)) return res.status(400).json({ ok: false, error: 'Mã đăng ký không hợp lệ.' });
      const payment = await readPaymentStatus(code);
      if (payment.status !== 'Paid') return res.status(402).json({ ok: false, error: 'Khoản thanh toán của mã này chưa được SePay xác nhận.' });
    } else if (!isAdmin) {
      const previousGrant = user ? await grantForUser(user.id, true) : null;
      if (previousGrant?.attempt_used) return res.status(409).json({ ok: false, error: 'Lượt làm bài đã được sử dụng. Hãy liên hệ Linh nếu bạn cần cấp lượt mới.' });
      return res.status(403).json({ ok: false, error: 'Email này chưa được cấp quyền làm bài. Hãy liên hệ Linh hoặc nhập mã đăng ký đã thanh toán.' });
    }

    await supabaseAuthOtp(email, isAdmin ? 'admin' : 'assessment');
    return res.status(200).json({ ok: true, message: 'Email đăng nhập đã được gửi.' });
  } catch (error) {
    const failure = providerError(error);
    if (failure.retryAfterSeconds) res.setHeader('Retry-After', String(failure.retryAfterSeconds));
    return res.status(failure.status).json({ ok: false, error: failure.error, ...(failure.retryAfterSeconds ? { retryAfterSeconds: failure.retryAfterSeconds } : {}) });
  }
}
