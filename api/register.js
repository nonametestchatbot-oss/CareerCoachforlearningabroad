import crypto from 'node:crypto';
import { upsertLead } from '../lib/crm.js';

const PAYMENT_AMOUNT = 1000000;
const BANK_CODE = 'OCB';
const ACCOUNT_NAME = 'NGUYEN VU PHU LINH';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : (req.body || {});
  const required = ['name', 'contact', 'email', 'student', 'concern'];
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

