import { normalizeEmail, normalizePhone, supabaseTable } from './supabase.js';

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'booked', 'won', 'not_fit'];
export const STATUS_LABELS = {
  new: 'Mới', contacted: 'Đã liên hệ', qualified: 'Đủ điều kiện', booked: 'Đặt lịch', won: 'Đã mua', not_fit: 'Chưa phù hợp'
};

function cleanText(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function toScore(value) {
  if (value === '' || value === null || typeof value === 'undefined') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) throw new Error('Score must be between 0 and 100');
  return Math.round(number);
}

export function calculateLeadScore({ fitScore, intentScore, engagementScore }) {
  const values = [fitScore, intentScore, engagementScore].map(value => value === null || typeof value === 'undefined' ? null : Number(value));
  if (values.some(value => value === null || !Number.isFinite(value))) return null;
  return Math.round(values[0] * 0.4 + values[1] * 0.35 + values[2] * 0.25);
}

export function leadPayload(input, { allowId = false } = {}) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone || input.contact);
  const status = LEAD_STATUSES.includes(input.status) ? input.status : 'new';
  const fitScore = toScore(input.fitScore);
  const intentScore = toScore(input.intentScore);
  const engagementScore = toScore(input.engagementScore);
  const payload = {
    name: cleanText(input.name, 120),
    email: email || null,
    email_normalized: email || null,
    phone: cleanText(input.phone || input.contact, 40) || null,
    phone_normalized: phone || null,
    source: cleanText(input.source, 120) || 'landing-page',
    landing_page_url: cleanText(input.landingPageUrl || input.landing_page_url, 1000) || null,
    utm: input.utm && typeof input.utm === 'object' ? input.utm : {},
    need: cleanText(input.need || input.concern, 500) || null,
    student_context: cleanText(input.student || input.studentContext, 200) || null,
    status,
    fit_score: fitScore,
    intent_score: intentScore,
    engagement_score: engagementScore,
    score: calculateLeadScore({ fitScore, intentScore, engagementScore }),
    score_reasons: input.scoreReasons && typeof input.scoreReasons === 'object' ? input.scoreReasons : {},
    next_action: cleanText(input.nextAction || input.next_action, 500) || null,
    updated_at: new Date().toISOString()
  };
  if (Object.prototype.hasOwnProperty.call(input, 'nextFollowUpAt') || Object.prototype.hasOwnProperty.call(input, 'next_follow_up_at')) {
    const followUp = input.nextFollowUpAt || input.next_follow_up_at;
    payload.next_follow_up_at = followUp ? new Date(`${String(followUp).slice(0, 10)}T09:00:00+07:00`).toISOString() : null;
  }
  if (allowId && input.id) payload.id = String(input.id);
  if (!payload.name) throw new Error('Lead name is required');
  if (!payload.email_normalized && !payload.phone_normalized) throw new Error('Lead email or phone is required');
  return payload;
}

export async function findLeadByIdentity({ email, phone }) {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) {
    const rows = await supabaseTable(`leads?select=*&email_normalized=eq.${encodeURIComponent(normalizedEmail)}&limit=1`);
    if (rows?.[0]) return rows[0];
  }
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone) {
    const rows = await supabaseTable(`leads?select=*&phone_normalized=eq.${encodeURIComponent(normalizedPhone)}&limit=1`);
    if (rows?.[0]) return rows[0];
  }
  return null;
}

export async function upsertLead(input) {
  const payload = leadPayload(input);
  const existing = await findLeadByIdentity(payload);
  let lead;
  if (existing) {
    const update = { ...payload };
    if (!update.email_normalized && existing.email_normalized) delete update.email_normalized;
    if (!update.phone_normalized && existing.phone_normalized) delete update.phone_normalized;
    const rows = await supabaseTable(`leads?id=eq.${encodeURIComponent(existing.id)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(update)
    });
    lead = rows?.[0] || { ...existing, ...update };
  } else {
    const rows = await supabaseTable('leads', {
      method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload)
    });
    lead = rows?.[0];
  }
  await addLeadActivity(lead.id, { activityType: 'form_submitted', note: 'Lead gửi form trên landing page.', metadata: { source: payload.source, need: payload.need } });
  return lead;
}

export async function addLeadActivity(leadId, { activityType = 'note', note = '', metadata = {} } = {}) {
  const occurredAt = new Date().toISOString();
  const rows = await supabaseTable('lead_activities', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ lead_id: leadId, activity_type: cleanText(activityType, 80) || 'note', note: cleanText(note, 1000) || null, metadata, occurred_at: occurredAt })
  });
  await supabaseTable(`leads?id=eq.${encodeURIComponent(leadId)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ latest_interaction_at: occurredAt, updated_at: occurredAt })
  });
  return rows?.[0] || null;
}

export async function listLeads() {
  return supabaseTable('leads?select=*&order=updated_at.desc&limit=500');
}

export async function updateLead(id, input) {
  const existingRows = await supabaseTable(`leads?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  const existing = existingRows?.[0] || null;
  const payload = leadPayload({ ...input, id }, { allowId: true });
  delete payload.id;
  const rows = await supabaseTable(`leads?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload)
  });
  const lead = rows?.[0] || null;
  if (lead && existing && existing.status !== lead.status) {
    await addLeadActivity(id, {
      activityType: 'pipeline_status_changed',
      note: `Chuyển Pipeline: ${STATUS_LABELS[existing.status] || existing.status} → ${STATUS_LABELS[lead.status] || lead.status}.`,
      metadata: { from: existing.status, to: lead.status }
    });
  }
  return lead;
}

export async function getLeadProfile(id) {
  const leadRows = await supabaseTable(`leads?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  const lead = leadRows?.[0] || null;
  if (!lead) return null;
  const activities = await supabaseTable(`lead_activities?lead_id=eq.${encodeURIComponent(id)}&select=*&order=occurred_at.desc&limit=200`);
  const emails = await supabaseTable(`lead_email_history?lead_id=eq.${encodeURIComponent(id)}&select=*&order=sent_at.desc&limit=100`);
  return { lead, activities: activities || [], emails: emails || [] };
}

export async function addLeadEmailHistory(leadId, { subject = '', note = '', sentAt = '' } = {}) {
  const cleanSubject = cleanText(subject, 200);
  if (!cleanSubject) throw new Error('Email subject is required');
  const timestamp = sentAt ? new Date(sentAt).toISOString() : new Date().toISOString();
  const rows = await supabaseTable('lead_email_history', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ lead_id: leadId, subject: cleanSubject, note: cleanText(note, 500) || null, sent_at: timestamp })
  });
  await supabaseTable(`leads?id=eq.${encodeURIComponent(leadId)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ latest_interaction_at: timestamp, updated_at: timestamp })
  });
  return rows?.[0] || null;
}


