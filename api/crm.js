import { sendCrmOtp, verifyCrmOtp, requireCrmAdmin } from '../lib/crm-auth.js';
import { listLeads, upsertLead, updateLead, addLeadActivity } from '../lib/crm.js';

function bodyOf(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
}

function adminError(error) {
  return error.message === 'CRM admin access required' ? 403 : 401;
}

export default async function handler(req, res) {
  const action = String(req.query?.action || '').trim();

  if (action === 'auth-request') {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    try {
      await sendCrmOtp(bodyOf(req).email);
      return res.status(200).json({ ok: true, message: 'Mã xác thực đã được gửi đến email quản trị.' });
    } catch (error) {
      return res.status(403).json({ ok: false, error: error.message || 'Không gửi được mã xác thực.' });
    }
  }

  if (action === 'auth-verify') {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    try {
      const body = bodyOf(req);
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

  try { await requireCrmAdmin(req); } catch (error) {
    return res.status(adminError(error)).json({ ok: false, error: error.message });
  }

  try {
    if (action === 'leads') {
      if (req.method === 'GET') return res.status(200).json({ ok: true, leads: await listLeads() });
      if (req.method === 'POST') {
        const body = bodyOf(req);
        const lead = await upsertLead({ ...body, source: body.source || 'manual' });
        return res.status(201).json({ ok: true, lead });
      }
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    if (action === 'lead') {
      if (req.method !== 'PATCH') return res.status(405).json({ ok: false, error: 'Method not allowed' });
      const id = String(req.query?.id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'Lead id is required' });
      const lead = await updateLead(id, bodyOf(req));
      if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' });
      return res.status(200).json({ ok: true, lead });
    }

    if (action === 'activity') {
      if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
      const body = bodyOf(req);
      if (!body.leadId) return res.status(400).json({ ok: false, error: 'Lead id is required' });
      const activity = await addLeadActivity(body.leadId, { activityType: body.activityType, note: body.note, metadata: body.metadata });
      return res.status(201).json({ ok: true, activity });
    }

    return res.status(404).json({ ok: false, error: 'CRM action not found' });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Không xử lý được CRM.' });
  }
}

