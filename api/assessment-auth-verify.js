import { readPaymentStatus, validateOrderCode } from '../lib/payment.js';
import { createGrant, ensureAssessmentUser, findGrantByOrderCode, grantForUser } from '../lib/assessment-access.js';
import { adminEmails, normalizeEmail, supabaseVerifyOtp } from '../lib/supabase.js';
import { assessmentGrantCode } from '../lib/tokens.js';
import { sendAssessmentAccessEmail } from '../lib/assessment-email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const email = normalizeEmail(body.email); const code = String(body.code || '').trim().toUpperCase(); const otp = String(body.otp || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(otp)) return res.status(400).json({ ok: false, error: 'Email hoặc mã xác thực chưa đúng.' });
    if (code && !validateOrderCode(code)) return res.status(400).json({ ok: false, error: 'Mã đăng ký không hợp lệ.' });
    const session = await supabaseVerifyOtp(email, otp); const user = await ensureAssessmentUser(session.user);
    if (code) {
      const payment = await readPaymentStatus(code);
      if (payment.status !== 'Paid') return res.status(402).json({ ok: false, error: 'Khoản thanh toán chưa được xác nhận.' });
      const existing = await findGrantByOrderCode(code);
      let paidGrant = existing;
      if (!existing) paidGrant = await createGrant({ userId: user.id, source: 'sepay', orderCode: code, notes: 'Cấp quyền tự động sau khi SePay xác nhận thanh toán.' });
      else if (existing.user_id !== user.id) return res.status(403).json({ ok: false, error: 'Mã đăng ký đã được liên kết với email khác.' });
      if (!paidGrant) throw new Error('Không tạo được lượt làm bài.');
      const accessCode = assessmentGrantCode(paidGrant, email);
      let emailSent = true;
      try {
        await sendAssessmentAccessEmail({ email, name: user.name, grant: paidGrant, accessCode });
      } catch (emailError) {
        emailSent = false;
        console.error('Assessment access email failed:', emailError.message);
      }
      return res.status(200).json({
        ok: true,
        grantCreated: true,
        emailSent,
        message: emailSent
          ? 'Lượt làm bài đã được cấp. Mã đăng nhập đã gửi đến email của bạn.'
          : 'Lượt đã được cấp nhưng email chưa gửi được. Hãy quay lại, nhập email và mã đăng ký LC để gửi lại mã đăng nhập.'
      });
    }
    const grant = await grantForUser(user.id, true);
    if (!grant && !adminEmails().includes(email)) return res.status(403).json({ ok: false, error: 'Email này chưa có lượt làm bài còn hiệu lực.' });
    if (!grant) return res.status(200).json({ ok: true, accessToken: session.access_token, refreshToken: session.refresh_token, user: { email }, admin: true, grant: null });
    return res.status(200).json({ ok: true, accessToken: session.access_token, refreshToken: session.refresh_token, user: { email }, grant: { id: grant.id, expiresAt: grant.expires_at, attemptUsed: grant.attempt_used, showPreviousResult: grant.show_previous_result } });
  } catch (error) { return res.status(401).json({ ok: false, error: error.message || 'Không xác thực được email.' }); }
}
