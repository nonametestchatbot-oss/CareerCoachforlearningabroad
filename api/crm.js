import { sendCrmOtp, verifyCrmOtp, requireCrmAdmin } from '../lib/crm-auth.js';
import { listLeads, upsertLead, updateLead, addLeadActivity, getLeadProfile, addLeadEmailHistory } from '../lib/crm.js';
import { getNurtureProfile, updateNurtureConsent, queueNurtureForLead } from '../lib/nurture.js';

function bodyOf(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
}

function adminError(error) {
  return error.message === 'CRM admin access required' ? 403 : 401;
}

function authError(error) {
  const raw = String(error?.message || '');
  if (/rate limit|over_email_send_rate_limit/i.test(raw)) {
    return 'Supabase đang giới hạn gửi email. Vui lòng chờ quota email reset rồi thử lại một lần; không cần bấm gửi liên tục.';
  }
  if (/invalid.*email|email/i.test(raw) && /admin|permission|not allowed/i.test(raw)) {
    return 'Email này chưa được cấp quyền quản trị CRM.';
  }
  return raw || 'Không thể xử lý đăng nhập CRM.';
}

export default async function handler(req, res) {
  const action = String(req.query?.action || '').trim();

  if (action === 'auth-request') {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    try { await sendCrmOtp(bodyOf(req).email); return res.status(200).json({ ok: true }); }
    catch (error) { return res.status(400).json({ ok: false, error: authError(error) }); }
  }
  if (action === 'auth-verify') {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    try { const result = await verifyCrmOtp(bodyOf(req).email, bodyOf(req).otp); return res.status(200).json({ ok: true, ...result }); }
    catch (error) { return res.status(401).json({ ok: false, error: authError(error) }); }
  }

  try { await requireCrmAdmin(req); }
  catch (error) { return res.status(adminError(error)).json({ ok: false, error: error.message }); }

  try {
    if (action === 'leads') {
      if (req.method === 'GET') return res.status(200).json({ ok: true, leads: await listLeads() });
      if (req.method === 'POST') return res.status(200).json({ ok: true, lead: await upsertLead(bodyOf(req)) });
    }
    if (action === 'lead') {
      const id = String(req.query?.id || bodyOf(req).id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'Lead id is required' });
      if (req.method === 'GET') {
        const profile = await getLeadProfile(id);
        return profile ? res.status(200).json({ ok: true, ...profile }) : res.status(404).json({ ok: false, error: 'Lead not found' });
      }
      if (req.method === 'PATCH') return res.status(200).json({ ok: true, lead: await updateLead(id, bodyOf(req)) });
    }
    if (action === 'email-history' && req.method === 'POST') {
      const body = bodyOf(req);
      return res.status(200).json({ ok: true, email: await addLeadEmailHistory(body.leadId, body) });
    }
    if (action === 'activity' && req.method === 'POST') {
      const body = bodyOf(req);
      return res.status(200).json({ ok: true, activity: await addLeadActivity(body.leadId, body) });
    }
    if (action === 'nurture-profile' && req.method === 'GET') {
      const profile = await getNurtureProfile(String(req.query?.id || '').trim());
      return profile ? res.status(200).json({ ok: true, ...profile }) : res.status(404).json({ ok: false, error: 'Lead not found' });
    }
    if (action === 'nurture-consent' && ['PATCH', 'POST'].includes(req.method)) {
      const body = bodyOf(req);
      const lead = await updateNurtureConsent(String(body.leadId || '').trim(), body.consent === true);
      const profile = lead ? await getNurtureProfile(lead.id) : null;
      return res.status(200).json({ ok: true, lead, nurture: profile?.nurture || null });
    }
    if (action === 'nurture-queue' && req.method === 'POST') {
      const id = String(bodyOf(req).leadId || '').trim();
      const profile = await getNurtureProfile(id);
      if (!profile) return res.status(404).json({ ok: false, error: 'Lead not found' });
      const result = await queueNurtureForLead(profile.lead);
      return res.status(200).json({ ok: true, ...result });
    }
    return res.status(404).json({ ok: false, error: 'CRM route not found' });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'CRM request failed' });
  }
}

