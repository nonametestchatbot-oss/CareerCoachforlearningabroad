export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ok: false, error: 'Method not allowed'});
  const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : (req.body || {});
  const name = String(body.name || '').trim().slice(0, 100);
  const phone = String(body.phone || '').trim().slice(0, 30);
  const email = String(body.email || '').trim().slice(0, 150);
  const student = String(body.student || '').trim().slice(0, 80);
  const concern = String(body.concern || '').trim().slice(0, 150);
  if (!name || !phone || !student || !concern || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return res.status(400).json({ok: false, error: 'Invalid form'});
  }
  if (!process.env.APPS_SCRIPT_URL || !process.env.APPS_SCRIPT_SECRET) {
    return res.status(500).json({ok: false, error: 'Integration not configured'});
  }
  try {
    const upstream = await fetch(process.env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
      body: new URLSearchParams({action: 'createConsultation', secret: process.env.APPS_SCRIPT_SECRET, name, phone, email, student, concern}).toString()
    });
    const data = await upstream.json();
    if (!upstream.ok || !data.ok) throw new Error('Upstream error');
    return res.status(200).json({ok: true});
  } catch {
    return res.status(502).json({ok: false, error: 'Could not save request'});
  }
}
