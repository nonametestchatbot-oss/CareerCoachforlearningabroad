import { requireCrmAdmin } from '../lib/crm-auth.js';
import { listLeads, upsertLead } from '../lib/crm.js';

export default async function handler(req, res) {
  try { await requireCrmAdmin(req); } catch (error) {
    return res.status(error.message === 'CRM admin access required' ? 403 : 401).json({ ok: false, error: error.message });
  }
  try {
    if (req.method === 'GET') return res.status(200).json({ ok: true, leads: await listLeads() });
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const lead = await upsertLead({ ...body, source: body.source || 'manual' });
      return res.status(201).json({ ok: true, lead });
    }
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Không xử lý được lead.' });
  }
}




