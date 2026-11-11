import { addLeadActivity, findLeadByIdentity, leadPayload, upsertLead } from '../lib/crm.js';
import { queueGiftNurture } from '../lib/gift-nurture.js';

function bodyOf(req) {
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return Object.fromEntries(new URLSearchParams(req.body)); } }
  return req.body || {};
}
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
function clean(value, max) { return String(value || '').trim().slice(0, max); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ok:false,error:'Phương thức không được hỗ trợ.'});
  const body = bodyOf(req);
  if (body.website) return res.status(200).json({ok:true});
  const name = clean(body.name,120);
  const email = clean(body.email,180).toLowerCase();
  const phone = clean(body.phone,40);
  const role = clean(body.role,80);
  if (!name || !validEmail(email) || body.deliveryConsent !== true) return res.status(400).json({ok:false,error:'Vui lòng nhập họ tên, email hợp lệ và đồng ý nhận tài liệu.'});
  const scriptUrl = String(process.env.GIFT_APPS_SCRIPT_URL || '').trim();
  const secret = String(process.env.GIFT_AUTOMATION_SECRET || '').trim();
  if (!scriptUrl || !secret) return res.status(503).json({ok:false,error:'Tính năng chia sẻ quà tặng đang được hoàn tất cấu hình. Vui lòng thử lại sau.'});

  let lead = null;
  try {
    const existing = await findLeadByIdentity({email,phone});
    const consent = body.marketingConsent === true || existing?.email_consent === true;
    const source = clean(body.source,120) || 'gift-short-programs';
    const payload = leadPayload({
      name,email,phone,source,
      landingPageUrl: clean(body.landingPageUrl,1000),
      utm: body.utm && typeof body.utm === 'object' ? body.utm : {},
      need: 'Nhận bảng chương trình quốc tế ngắn hạn có học bổng để xây hồ sơ du học.',
      status: existing?.status || 'new',
      fitScore: existing?.fit_score,
      intentScore: existing?.intent_score,
      engagementScore: existing?.engagement_score,
      scoreReasons: existing?.score_reasons || {},
      nextAction: existing?.next_action,
      nextFollowUpAt: existing?.next_follow_up_at,
      emailConsent: consent
    });
    lead = await upsertLead(payload);
    await addLeadActivity(lead.id, {
      activityType:'gift_requested',
      note:'Đăng ký nhận bảng chương trình quốc tế ngắn hạn có học bổng.',
      metadata:{
        gift:'short-international-programs',
        role,
        delivery_consent:true,
        marketing_consent:body.marketingConsent === true,
        landing_page_url:clean(body.landingPageUrl,1000),
        referrer:clean(body.referrer,1000),
        utm:body.utm && typeof body.utm === 'object' ? body.utm : {}
      }
    });

    const response = await fetch(scriptUrl, {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body:new URLSearchParams({
        action:'deliverGift',
        secret,
        requestId:lead.id + ':' + Date.now(),
        email,
        name,
        fileId:'1BHEPGL6dJ8WY-knFEolGDMdYilW9iEKkdwRvQr9s8O0',
        fileUrl:'https://docs.google.com/spreadsheets/d/1BHEPGL6dJ8WY-knFEolGDMdYilW9iEKkdwRvQr9s8O0/edit'
      }).toString(),
      signal:AbortSignal.timeout(20000)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Chưa xác nhận được việc chia sẻ tài liệu.');
    await addLeadActivity(lead.id,{
      activityType:'gift_shared',
      note:'Google Drive xác nhận đã cấp quyền xem riêng cho email khách và gửi email hướng dẫn.',
      metadata:{gift:'short-international-programs',email,drive_file_id:'1BHEPGL6dJ8WY-knFEolGDMdYilW9iEKkdwRvQr9s8O0'}
    });
    let nurture = {queued:0};
    if (consent && !['booked','won','not_fit'].includes(lead.status)) nurture = await queueGiftNurture(lead);
    return res.status(200).json({ok:true,email,fileUrl:result.fileUrl || 'https://docs.google.com/spreadsheets/d/1BHEPGL6dJ8WY-knFEolGDMdYilW9iEKkdwRvQr9s8O0/edit',nurtureQueued:nurture.queued || 0});
  } catch (error) {
    if (lead) {
      try { await addLeadActivity(lead.id,{activityType:'gift_share_failed',note:'Chưa hoàn tất chia sẻ quà tặng; cần thử lại hoặc kiểm tra cấu hình.',metadata:{gift:'short-international-programs'}}); } catch {}
    }
    return res.status(502).json({ok:false,error:'Chưa thể cấp quyền xem tài liệu lúc này. Thông tin của bạn đã được ghi nhận; vui lòng thử lại sau hoặc liên hệ Linh Coach.'});
  }
}
