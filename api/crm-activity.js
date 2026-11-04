import { requireCrmAdmin } from '../lib/crm-auth.js';
import { addLeadActivity } from '../lib/crm.js';

export default async function handler(req, res) {
  try { await requireCrmAdmin(req); } catch (error) {
    return res.status(error.message === 'CRM admin access required' ? 403 : 401).json({ ok: false, error: error.message });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!body.leadId) return res.status(400).json({ ok: false, error: 'Lead id is required' });
    const activity = await addLeadActivity(body.leadId, { activityType: body.activityType, note: body.note, metadata: body.metadata });
    return res.status(201).json({ ok: true, activity });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Không lưu được tương tác.' });
  }
}




