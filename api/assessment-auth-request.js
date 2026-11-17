import { randomUUID } from 'node:crypto';
import { readPaymentStatus, validateOrderCode } from '../lib/payment.js';
import { createGrant, ensureAssessmentUser, findGrantByOrderCode, findUserByEmail, grantForUser } from '../lib/assessment-access.js';
import { adminEmails, normalizeEmail, supabaseAuthOtp } from '../lib/supabase.js';
import { assessmentGrantCode, signToken, verifyAssessmentGrantCode } from '../lib/tokens.js';
import { sendAssessmentAccessEmail } from '../lib/assessment-email.js';

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

async function grantPaidOrder(email, name, orderCode, user) {
  const identity = await ensureAssessmentUser({ id: user?.auth_user_id || randomUUID(), email });
  const existing = await findGrantByOrderCode(orderCode);
  if (existing && existing.user_id !== identity.id) {
    return { error: { status: 403, message: 'Mã đăng ký đã được liên kết với email khác.' } };
  }
  const grant = existing || await createGrant({
    userId: identity.id,
    source: 'sepay',
    orderCode,
    notes: 'Cấp quyền tự động sau khi SePay xác nhận thanh toán.'
  });
  if (!grant) throw new Error('Không tạo được lượt làm bài.');
  const accessCode = assessmentGrantCode(grant, email);
  try {
    await sendAssessmentAccessEmail({ email, name: name || user?.name, grant, accessCode });
    return { grant, emailSent: true };
  } catch (error) {
    console.error('Assessment access email failed:', error.message);
    return { grant, emailSent: false };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const email = normalizeEmail(body.email);
    const code = String(body.code || '').trim().toUpperCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ ok: false, error: 'Vui lòng nhập email hợp lệ.' });

    const user = await findUserByEmail(email);
    if (code) {
      if (!validateOrderCode(code)) return res.status(400).json({ ok: false, error: 'Mã đăng ký không hợp lệ.' });
      const payment = await readPaymentStatus(code);
      if (payment.status !== 'Paid') return res.status(402).json({ ok: false, error: 'Khoản thanh toán của mã này chưa được SePay xác nhận.' });

      const result = await grantPaidOrder(email, user?.name, code, user);
      if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });
      return res.status(200).json({
        ok: true,
        grantCreated: true,
        emailSent: result.emailSent,
        message: result.emailSent
          ? 'Lượt làm bài đã được cấp. Mã đăng nhập đã gửi đến email của bạn.'
          : 'Lượt đã được cấp nhưng email chưa gửi được. Hãy nhập lại email và mã đăng ký LC để gửi lại mã đăng nhập.'
      });
    }

    const activeGrant = user ? await grantForUser(user.id, true) : null;
    if (activeGrant) {
      if (verifyAssessmentGrantCode(activeGrant, email, body.accessCode)) {
        const identity = await ensureAssessmentUser({ id: user.auth_user_id || randomUUID(), email });
        const currentGrant = await grantForUser(identity.id, true);
        if (!currentGrant || currentGrant.id !== activeGrant.id || !verifyAssessmentGrantCode(currentGrant, email, body.accessCode)) {
          return res.status(403).json({ ok: false, error: 'Mã không đúng hoặc lượt làm bài đã hết hạn.' });
        }
        const expiresAt = Math.floor(new Date(currentGrant.expires_at).getTime() / 1000);
        const accessToken = signToken({ type: 'assessment_access_v2', email, userId: identity.id, authUserId: identity.auth_user_id, grantId: currentGrant.id, exp: expiresAt });
        return res.status(200).json({
          ok: true,
          accessToken,
          user: { email },
          grant: { id: currentGrant.id, expiresAt: currentGrant.expires_at, attemptUsed: Boolean(currentGrant.attempt_used), showPreviousResult: currentGrant.show_previous_result }
        });
      }
      return res.status(401).json({ ok: false, error: 'Email hoặc mã đăng nhập chưa đúng. Hãy dùng mã trong email cấp quyền.' });
    }

    const isAdmin = adminEmails().includes(email);
    if (!isAdmin) {
      const previousGrant = user ? await grantForUser(user.id, true) : null;
      if (previousGrant?.attempt_used) return res.status(409).json({ ok: false, error: 'Lượt làm bài đã được sử dụng. Hãy liên hệ Linh nếu bạn cần cấp lượt mới.' });
      return res.status(403).json({ ok: false, error: 'Email này chưa được cấp quyền làm bài. Hãy liên hệ Linh hoặc nhập mã đăng ký đã thanh toán.' });
    }

    await supabaseAuthOtp(email, 'admin');
    return res.status(200).json({ ok: true, message: 'Email đăng nhập đã được gửi.' });
  } catch (error) {
    const failure = providerError(error);
    if (failure.retryAfterSeconds) res.setHeader('Retry-After', String(failure.retryAfterSeconds));
    return res.status(failure.status).json({ ok: false, error: failure.error, ...(failure.retryAfterSeconds ? { retryAfterSeconds: failure.retryAfterSeconds } : {}) });
  }
}
