import { requireCrmAdmin } from '../lib/crm-auth.js';
import { updateLead } from '../lib/crm.js';

export default async function handler(req, res) {
  try { await requireCrmAdmin(req); } catch (error) {
    return res.status(error.message === 'CRM admin access required' ? 403 : 401).json({ ok: false, error: error.message });
  }
  if (req.method !== 'PATCH') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const id = String(req.query?.id || '').trim();
  if (!id) return res.status(400).json({ ok: false, error: 'Lead id is required' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const lead = await updateLead(id, body);
    if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' });
    return res.status(200).json({ ok: true, lead });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Không cập nhật được lead.' });
  }
}




