import crypto from 'node:crypto';
import { upsertLead } from '../lib/crm.js';
import { normalizeEmail, supabaseTable } from '../lib/supabase.js';

const PAYMENT_AMOUNT = 1000000;
const BANK_CODE = 'OCB';
const ACCOUNT_NAME = 'NGUYEN VU PHU LINH';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : (req.body || {});
  const required = ['name', 'contact', 'email', 'studentName', 'student', 'concern'];
  if (required.some(key => !String(body[key] || '').trim())) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }
  if (!process.env.APPS_SCRIPT_URL || !process.env.APPS_SCRIPT_SECRET || !process.env.SEPAY_OCB_VA) {
    return res.status(500).json({ ok: false, error: 'Payment integration is not configured' });
  }

  // OCB webhooks require an official virtual account (VA), not the base account.
  const paymentAccount = process.env.SEPAY_OCB_VA.trim();

  const orderCode = `LC${crypto.randomInt(10000000, 99999999)}`;
  const params = new URLSearchParams({
    action: 'createOrder',
    secret: process.env.APPS_SCRIPT_SECRET,
    orderCode,
    amount: String(PAYMENT_AMOUNT),
    name: String(body.name).trim(),
    contact: String(body.contact).trim(),
    email: String(body.email).trim().toLowerCase(),
    studentName: String(body.studentName).trim(),
    student: String(body.student).trim(),
    concern: String(body.concern).trim()
  });

  try {
    const upstream = await fetch(process.env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: params.toString()
    });
    const result = await upstream.json();
    if (!upstream.ok || !result.ok) throw new Error(result.error || 'Could not save registration');

    // Best-effort record for matching the paid email to the student taking the assessment.
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
      try {
        const email = normalizeEmail(body.email);
        const existing = await supabaseTable(`assessment_users?select=id&email=eq.${encodeURIComponent(email)}&limit=1`);
        const payload = { email, name: String(body.studentName).trim().slice(0, 100), phone: String(body.contact).trim().slice(0, 30), updated_at: new Date().toISOString() };
        if (existing?.[0]?.id) await supabaseTable(`assessment_users?id=eq.${encodeURIComponent(existing[0].id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
        else await supabaseTable('assessment_users', { method: 'POST', body: JSON.stringify(payload) });
      } catch (assessmentError) {
        console.error('Assessment applicant upsert failed:', assessmentError.message);
      }
    }

    // Best-effort CRM upsert: a temporary CRM outage must not interrupt payment.
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await upsertLead({
          name: body.name,
          email: body.email,
          phone: body.contact,
          student: body.student,
          need: body.concern,
          source: body.source || 'landing-page',
          landingPageUrl: body.landingPageUrl,
          utm: body.utm ? JSON.parse(body.utm) : {}
        });
      } catch (crmError) {
        console.error('CRM lead upsert failed:', crmError.message);
      }
    }

    const qr = new URL('https://vietqr.app/img');
    qr.searchParams.set('acc', paymentAccount);
    qr.searchParams.set('bank', BANK_CODE);
    qr.searchParams.set('amount', String(PAYMENT_AMOUNT));
    qr.searchParams.set('des', orderCode);

    return res.status(200).json({
      ok: true,
      orderCode,
      amount: PAYMENT_AMOUNT,
      bank: 'OCB',
      accountNumber: paymentAccount,
      accountName: ACCOUNT_NAME,
      qrUrl: qr.toString()
    });
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Could not create payment order' });
  }
}

