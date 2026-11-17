import { normalizeEmail } from './supabase.js';

function appScriptConfig() {
  const url = String(process.env.GIFT_APPS_SCRIPT_URL || '').trim();
  const secret = String(process.env.GIFT_AUTOMATION_SECRET || '').trim();
  if (!url || !secret) throw new Error('Assessment email delivery is not configured');
  return { url, secret };
}

export async function sendAssessmentAccessEmail({ email, name = '', grant, accessCode }) {
  const normalizedEmail = normalizeEmail(email);
  if (!/^\\S+@\\S+\\.\\S+$/.test(normalizedEmail) || !grant?.id || !grant?.expires_at || !accessCode) {
    throw new Error('Assessment access email details are incomplete');
  }
  const { url, secret } = appScriptConfig();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'sendAssessmentAccess',
      secret,
      email: normalizedEmail,
      name: String(name || '').trim().slice(0, 100),
      requestId: String(grant.id),
      accessCode,
      expiresAt: grant.expires_at,
      testUrl: 'https://duhocbenvung.linhcoach-eqstrength.com/test'
    })
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok || !data.ok) throw new Error(data.error || 'Could not send the assessment access email');
  return { duplicate: Boolean(data.duplicate) };
}
