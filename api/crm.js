import { sendCrmOtp, verifyCrmOtp, requireCrmAdmin } from '../lib/crm-auth.js';
import { supabaseTable } from '../lib/supabase.js';
import { listLeads, upsertLead, updateLead, addLeadActivity, getLeadProfile, addLeadEmailHistory } from '../lib/crm.js';
import { getNurtureProfile, updateNurtureConsent, queueNurtureForLead, updateNurtureDraft, getNurtureTemplates, saveNurtureTemplate } from '../lib/nurture.js';

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


function safeEqual(a, b) {
  const x = String(a || ''), y = String(b || '');
  if (!x || x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
async function handleGiftNurture(req, res, action) {
  if (req.method !== 'POST') return res.status(405).json({ok:false,error:'Method not allowed'});
  if (!safeEqual(req.headers['x-gift-secret'], process.env.GIFT_AUTOMATION_SECRET)) return res.status(401).json({ok:false,error:'Unauthorized'});
  const body = bodyOf(req);
  try {
    if (body.action === 'claim') {
      const due = await supabaseTable('lead_email_outbox?sequence_key=eq.gift_short_programs&status=eq.queued&send_after=lte.'+encodeURIComponent(new Date().toISOString())+'&select=id,lead_id,step,subject,body,cta&order=send_after.asc&limit=20');
      const messages = [];
      for (const row of due || []) {
        const leads = await supabaseTable('leads?id=eq.'+encodeURIComponent(row.lead_id)+'&select=id,email,name,email_consent,status&limit=1');
        const lead = leads?.[0];
        if (!lead || !lead.email_consent || !lead.email || ['booked','won','not_fit'].includes(lead.status)) {
          await supabaseTable('lead_email_outbox?id=eq.'+encodeURIComponent(row.id)+'&status=eq.queued',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'stopped',blocked_reason:'Lead đã dừng hoặc không còn consent.',updated_at:new Date().toISOString()})});
          continue;
        }
        const claimed = await supabaseTable('lead_email_outbox?id=eq.'+encodeURIComponent(row.id)+'&status=eq.queued',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'sending',updated_at:new Date().toISOString()})});
        if (claimed?.[0]) messages.push({id:row.id,leadId:row.lead_id,to:lead.email,name:lead.name,subject:row.subject,body:row.body,cta:row.cta});
      }
      return res.status(200).json({ok:true,messages});
    }
    if (body.action === 'ack') {
      const id = String(body.id || '');
      const rows = await supabaseTable('lead_email_outbox?id=eq.'+encodeURIComponent(id)+'&sequence_key=eq.gift_short_programs&status=eq.sending&select=id,lead_id,subject&limit=1');
      const row = rows?.[0];
      if (!row) return res.status(404).json({ok:false,error:'Message not found'});
      if (body.outcome === 'sent') {
        const sentAt = new Date().toISOString();
        await supabaseTable('lead_email_outbox?id=eq.'+encodeURIComponent(id)+'&status=eq.sending',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'sent',sent_at:sentAt,last_error:null,updated_at:sentAt})});
        await addLeadEmailHistory(row.lead_id,{subject:row.subject,note:'Email quà tặng/nuôi dưỡng được Apps Script xác nhận đã gửi.',sentAt});
        return res.status(200).json({ok:true});
      }
      const error = String(body.error || 'Gmail không xác nhận gửi.').slice(0,500);
      await supabaseTable('lead_email_outbox?id=eq.'+encodeURIComponent(id)+'&status=eq.sending',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'failed',last_error:error,updated_at:new Date().toISOString()})});
      return res.status(200).json({ok:true});
    }
    return res.status(400).json({ok:false,error:'Unknown action'});
  } catch (error) {
    return res.status(500).json({ok:false,error:'Could not process nurture message'});
  }
}

export default async function handler(req, res) {
  const action = String(req.query?.action || '').trim();

  if (action === 'gift-nurture') return handleGiftNurture(req, res, action);

  if (action === 'auth-refresh') {
    if (req.method !== 'POST') return res.status(405).json({ok:false,error:'Method not allowed'});
    try {
      const refreshToken = String(bodyOf(req).refreshToken || '').trim();
      if (!refreshToken) return res.status(400).json({ok:false,error:'Thiếu thông tin phiên đăng nhập.'});
      const config = supabaseConfig();
      const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
        method:'POST', headers:{'Content-Type':'application/json',apikey:config.anonKey},
        body:JSON.stringify({refresh_token:refreshToken})
      });
      const refreshed = await response.json().catch(()=>({}));
      if (!response.ok || !isCrmAdmin(refreshed.user?.email)) return res.status(401).json({ok:false,error:'Phiên đăng nhập hết hạn hoặc tài khoản không còn quyền quản trị.'});
      return res.status(200).json({ok:true,accessToken:refreshed.access_token,refreshToken:refreshed.refresh_token,user:{email:refreshed.user.email}});
    } catch (error) { return res.status(401).json({ok:false,error:'Không thể gia hạn phiên đăng nhập.'}); }
  }

  if (action === 'auth-request') {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    try { await sendCrmOtp(bodyOf(req).email); return res.status(200).json({ ok: true }); }
    catch (error) { return res.status(400).json({ ok: false, error: authError(error) }); }
  }
  if (action === 'auth-verify') {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    try {
      const result = await verifyCrmOtp(bodyOf(req).email, bodyOf(req).otp);
      return res.status(200).json({ok:true,accessToken:result.access_token,refreshToken:result.refresh_token,expiresIn:result.expires_in,user:{email:result.user?.email}});
    }
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
    if (action === 'nurture-draft' && req.method === 'PATCH') {
      const body = bodyOf(req);
      const draft = await updateNurtureDraft(String(body.leadId || '').trim(), String(body.draftId || '').trim(), body);
      return res.status(200).json({ ok: true, draft });
    }
    if (action === 'nurture-templates' && req.method === 'GET') {
      return res.status(200).json({ ok: true, templates: await getNurtureTemplates() });
    }
    if (action === 'nurture-template' && req.method === 'PATCH') {
      const body = bodyOf(req);
      const template = await saveNurtureTemplate(String(body.sequenceKey || '').trim(), Number(body.step), body);
      return res.status(200).json({ ok: true, template });
    }
    return res.status(404).json({ ok: false, error: 'CRM route not found' });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'CRM request failed' });
  }
}

