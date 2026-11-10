import { supabaseTable } from './supabase.js';

export const STOP_STATUSES = new Set(['booked', 'won', 'not_fit']);
const CONSULTATION_URL = 'https://duhocbenvung.linhcoach-eqstrength.com/#dat-lich';
const STOP_RULE = 'Dừng nếu gia đình đã đặt lịch, đã mua, từ chối hoặc rút đồng ý nhận email.';

const SEQUENCES = {
  high: {
    key: 'score_70_100', label: 'Score 70–100 · Hiểu nhu cầu và mời đặt lịch', delays: [0, 3],
    messages: [
      {
        goal: 'Xác định một quyết định khiến gia đình cần được hỗ trợ ngay.',
        condition: 'Ngày 0; score 70–100, có email, đã đồng ý nhận email và chưa thuộc trạng thái dừng.',
        subject: 'Điều gì khiến gia đình chưa yên tâm khi chọn ngành cho con?',
        body: 'Chào {{name}},\n\nTrước khi chọn trường, nhiều gia đình cần làm rõ một câu hỏi gần hơn: ngành con đang nghĩ tới có liên quan thế nào đến điều con thích, việc con làm tốt và công việc sau khi ra trường?\n\nNếu ba mẹ và con đã có một hướng dự định, hãy thử hỏi con: “Con muốn kiểm chứng điều gì về ngành này trước khi quyết định?” Câu trả lời có thể là việc con cần được thử, người con cần gặp hoặc thông tin gia đình cần tìm.\n\nĐể Linh hiểu đúng điều gia đình đang cần, ba mẹ có thể trả lời email này bằng một câu hỏi khiến mình băn khoăn nhất lúc này.\n\nLinh Coach',
        cta: 'Trả lời email này với một câu hỏi gia đình muốn làm rõ', stop: STOP_RULE
      },
      {
        goal: 'Mời gia đình đăng ký buổi tư vấn 1:1 có nêu rõ thời lượng và chi phí.',
        condition: 'Ngày 3; chỉ tiếp tục nếu gia đình chưa đặt lịch, chưa mua, chưa từ chối và vẫn đồng ý nhận email.',
        subject: 'Một giờ để ba mẹ và con cùng kiểm tra hướng ngành',
        body: `Chào {{name}},\n\nNếu gia đình vẫn đang cân nhắc ngành học, buổi tư vấn 1:1 cùng Linh là lúc ba mẹ và con cùng nêu điều mình mong muốn. Linh sẽ có thời gian làm việc riêng với con, rồi cả nhà chọn một việc con có thể thử trong 7 ngày.\n\nBuổi tư vấn kéo dài 60 phút, chi phí 1.000.000đ. Trên trang đăng ký, gia đình điền thông tin, thanh toán bằng QR rồi chọn lịch. Buổi gặp không bắt buộc đăng ký chương trình khác.\n\nĐăng ký buổi tư vấn: ${CONSULTATION_URL}\n\nLinh Coach`,
        cta: 'Đăng ký buổi tư vấn 60 phút', stop: STOP_RULE, url: CONSULTATION_URL
      }
    ]
  },
  medium: {
    key: 'score_40_69', label: 'Score 40–69 · Ví dụ và tài liệu phù hợp', delays: [0, 3, 7],
    messages: [
      {
        goal: 'Giúp gia đình tách điều con thích, bằng chứng con làm được và thực tế ngành.',
        condition: 'Ngày 0; score 40–69, có email, đã đồng ý nhận email và chưa thuộc trạng thái dừng.',
        subject: 'Ba câu hỏi trước khi gia đình chốt ngành cho con',
        body: 'Chào {{name}},\n\nKhi con nói “con thích ngành này”, ba mẹ có thể cùng con làm rõ ba điều:\n\n1. Con thích hoạt động cụ thể nào trong ngành, thay vì chỉ thích tên ngành?\n2. Con đã từng làm việc gì liên quan và phần nào con làm tốt?\n3. Công việc thực tế trong ngành đòi hỏi điều gì mà con chưa thử?\n\nKhông cần trả lời hoàn hảo. Chỉ cần thấy câu nào đang thiếu dữ liệu, gia đình sẽ biết nên tìm hiểu tiếp ở đâu.\n\nBa mẹ có thể trả lời email này bằng câu hỏi mà cả nhà chưa trả lời được.\n\nLinh Coach',
        cta: 'Trả lời email này bằng một câu hỏi còn bỏ ngỏ', stop: STOP_RULE
      },
      {
        goal: 'Gợi một trải nghiệm nhỏ để kiểm tra lựa chọn ngành mà không vội kết luận.',
        condition: 'Ngày 3; chỉ tiếp tục nếu gia đình chưa thuộc trạng thái dừng và vẫn đồng ý nhận email.',
        subject: 'Cho con thử một việc nhỏ trước khi chọn ngành',
        body: 'Chào {{name}},\n\nMột ngành học không chỉ là danh sách môn học. Con sẽ dành nhiều thời gian giải quyết những loại việc rất cụ thể. Vì vậy, trước khi tìm thêm trường, hãy cho con thử một hoạt động gần với ngành đang cân nhắc.\n\nVí dụ: nếu con quan tâm truyền thông, con có thể phỏng vấn một người, viết thông điệp cho một hoạt động ở trường rồi xin góp ý. Sau đó, hỏi con: phần nào con muốn làm tiếp, phần nào khó, và con muốn cải thiện điều gì?\n\nĐó là dữ liệu từ trải nghiệm của chính con, không phải kết luận rằng con chắc chắn hợp ngành.\n\nBa mẹ hãy cùng con chọn một việc có thể thử trong bảy ngày tới.\n\nLinh Coach',
        cta: 'Cùng con chọn một việc để thử trong 7 ngày', stop: STOP_RULE
      },
      {
        goal: 'Mời gia đình trao đổi 1:1 nếu vẫn còn điểm chưa thể tự kiểm chứng.',
        condition: 'Ngày 7; chỉ tiếp tục nếu gia đình chưa thuộc trạng thái dừng và vẫn đồng ý nhận email.',
        subject: 'Nếu đã thử mà vẫn chưa rõ hướng ngành cho con',
        body: `Chào {{name}},\n\nSau khi nhìn lại điều con thích và một việc con đã thử, gia đình có thể vẫn phân vân giữa vài hướng. Khi đó, câu hỏi hữu ích không phải “ngành nào tốt nhất”, mà là “điều gì cần được kiểm chứng trước khi quyết định?”.\n\nTrong buổi tư vấn 60 phút, Linh nghe cả ba mẹ và con, có phần trao đổi riêng với con rồi cùng gia đình xác định một bước thử tiếp theo. Chi phí buổi tư vấn là 1.000.000đ; đăng ký và thanh toán QR trên trang trước khi chọn lịch.\n\nĐăng ký buổi tư vấn: ${CONSULTATION_URL}\n\nLinh Coach`,
        cta: 'Đăng ký buổi tư vấn 60 phút', stop: STOP_RULE, url: CONSULTATION_URL
      }
    ]
  },
  low: {
    key: 'score_0_39', label: 'Score 0–39 · Duy trì giá trị và quay lại khi sẵn sàng', delays: [0, 7, 14],
    messages: [
      {
        goal: 'Giúp phụ huynh bắt đầu quan sát con mà chưa phải chọn ngành ngay.',
        condition: 'Ngày 0; score 0–39, có email, đã đồng ý nhận email và chưa thuộc trạng thái dừng.',
        subject: 'Chưa cần chọn ngành ngay: thử ghi lại ba điều về con',
        body: 'Chào {{name}},\n\nNếu gia đình chưa sẵn sàng bàn về ngành học, có thể bắt đầu bằng việc quan sát điều con đã làm trong đời sống hằng ngày.\n\nTrong tuần này, ba mẹ thử ghi lại: một việc con tự nguyện làm, một việc con từng làm đến nơi đến chốn, và một câu hỏi con hay tò mò. Không cần biến những điều đó thành tên nghề ngay. Hãy hỏi con cảm nhận của con về từng việc để tránh kết luận thay.\n\nBa mẹ hãy giữ lại ba ghi chú ấy cho lần trò chuyện tiếp theo với con.\n\nLinh Coach',
        cta: 'Ghi lại ba quan sát cụ thể về con', stop: STOP_RULE
      },
      {
        goal: 'Gợi một cuộc trò chuyện ngắn để con có tiếng nói trong định hướng.',
        condition: 'Ngày 7; chỉ tiếp tục nếu gia đình chưa thuộc trạng thái dừng và vẫn đồng ý nhận email.',
        subject: 'Một câu hỏi để con nói nhiều hơn về điều mình muốn thử',
        body: 'Chào {{name}},\n\nThay vì hỏi “sau này con làm nghề gì?”, ba mẹ có thể chọn một lúc thoải mái và hỏi: “Có việc nào con muốn thử thêm trước khi nhà mình quyết định ngành hoặc trường không?”\n\nNếu con chưa biết, ba mẹ có thể nhắc một hoạt động con từng chủ động làm và hỏi điều gì ở đó khiến con thích hoặc không thích. Mục tiêu của cuộc trò chuyện là nghe thêm, chưa cần đi đến quyết định trong một lần.\n\nTuần này, ba mẹ hãy thử dành mười phút để hỏi và nghe con trả lời câu hỏi ấy.\n\nLinh Coach',
        cta: 'Dành 10 phút trò chuyện với con', stop: STOP_RULE
      },
      {
        goal: 'Để gia đình chủ động quay lại khi có câu hỏi hoặc mốc quyết định cụ thể.',
        condition: 'Ngày 14; chỉ tiếp tục nếu gia đình chưa thuộc trạng thái dừng và vẫn đồng ý nhận email.',
        subject: 'Khi gia đình muốn xem lại hướng ngành cho con',
        body: 'Chào {{name}},\n\nSau vài lần quan sát và trò chuyện, có thể gia đình đã thấy một điều con muốn thử thêm. Cũng có thể mọi thứ vẫn chưa rõ. Cả hai đều là điểm bắt đầu để tìm hiểu tiếp.\n\nNếu đã có một ngành, một quốc gia hoặc một thời hạn khiến gia đình cần quyết định, ba mẹ có thể gửi lại cho Linh đúng câu hỏi đang mắc. Linh sẽ biết gia đình muốn làm rõ điều gì trước khi đề xuất bước tiếp theo. Nếu chưa đến lúc, ba mẹ có thể giữ lại các ghi chú và quay lại sau.\n\nKhi cần, ba mẹ hãy trả lời email này với câu hỏi cụ thể của gia đình.\n\nLinh Coach',
        cta: 'Trả lời email này với câu hỏi cụ thể', stop: STOP_RULE
      }
    ]
  }
};

export function getScoreBand(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return null;
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

export function sequenceForLead(lead) {
  const band = getScoreBand(lead?.score);
  return band ? { band, ...SEQUENCES[band] } : null;
}

export function defaultNurtureTemplates() {
  return Object.values(SEQUENCES).flatMap(sequence => sequence.messages.map((message, index) => ({
    sequence_key: sequence.key,
    sequence_label: sequence.label,
    step: index + 1,
    delay_days: sequence.delays[index],
    ...message
  })));
}

async function templateOverrides() {
  return await supabaseTable('nurture_email_templates?select=sequence_key,step,subject,body,cta,updated_at') || [];
}

export async function getNurtureTemplates() {
  const overrides = await templateOverrides();
  return defaultNurtureTemplates().map(template => ({
    ...template,
    ...(overrides.find(row => row.sequence_key === template.sequence_key && row.step === template.step) || {}),
    customized: overrides.some(row => row.sequence_key === template.sequence_key && row.step === template.step)
  }));
}

export async function saveNurtureTemplate(sequenceKey, step, input) {
  const template = defaultNurtureTemplates().find(item => item.sequence_key === sequenceKey && item.step === step);
  if (!template) throw new Error('Email mẫu không hợp lệ.');
  const changes = validateDraftEdit(input);
  const rows = await supabaseTable('nurture_email_templates?on_conflict=sequence_key,step', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ sequence_key: sequenceKey, step, ...changes, updated_at: new Date().toISOString() })
  });
  return { ...template, ...(rows?.[0] || changes), customized: true };
}

async function sequenceWithOverrides(lead) {
  const sequence = sequenceForLead(lead);
  if (!sequence) return null;
  const overrides = await templateOverrides();
  return {
    ...sequence,
    messages: sequence.messages.map((message, index) => ({
      ...message,
      ...(overrides.find(row => row.sequence_key === sequence.key && row.step === index + 1) || {})
    }))
  };
}

function replaceName(body, lead) {
  const name = String(lead?.name || 'bạn').trim() || 'bạn';
  return body.replaceAll('{{name}}', name);
}

function stoppedReason(lead) {
  if (STOP_STATUSES.has(lead?.status)) return `Dừng vì trạng thái Pipeline: ${lead.status}.`;
  if (!lead?.email) return 'Lead chưa có email.';
  if (!lead?.email_consent) return 'Chưa có sự đồng ý nhận email.';
  return '';
}

export async function readNurtureForLead(lead) {
  const outbox = await supabaseTable(`lead_email_outbox?lead_id=eq.${encodeURIComponent(lead.id)}&select=*&order=step.asc`);
  const sequence = await sequenceWithOverrides(lead);
  const reason = stoppedReason(lead);
  return { sequence, outbox: outbox || [], blockedReason: reason || null, status: lead.nurture_status || (reason ? 'blocked' : 'not_started') };
}

export async function getNurtureProfile(leadId) {
  const rows = await supabaseTable(`leads?id=eq.${encodeURIComponent(leadId)}&select=*&limit=1`);
  const lead = rows?.[0] || null;
  return lead ? { lead, nurture: await readNurtureForLead(lead) } : null;
}

export async function updateNurtureConsent(leadId, consent) {
  const now = new Date().toISOString();
  if (!consent) {
    await supabaseTable(`lead_email_outbox?lead_id=eq.${encodeURIComponent(leadId)}&status=in.(draft,queued)`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'stopped', blocked_reason: 'Đã rút hoặc chưa có sự đồng ý nhận email.', updated_at: now }) });
  }
  const rows = await supabaseTable(`leads?id=eq.${encodeURIComponent(leadId)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ email_consent: Boolean(consent), email_consent_at: consent ? now : null, nurture_status: consent ? 'not_started' : 'blocked', nurture_stopped_reason: consent ? null : 'Đã rút hoặc chưa có sự đồng ý nhận email.', updated_at: now }) });
  return rows?.[0] || null;
}

export async function queueNurtureForLead(lead) {
  const reason = stoppedReason(lead);
  const sequence = await sequenceWithOverrides(lead);
  if (reason || !sequence) return { status: reason ? 'blocked' : 'not_started', reason: reason || 'Chưa có score để chọn chuỗi.', inserted: 0, nurture: await readNurtureForLead(lead) };
  const now = new Date();
  const rows = sequence.messages.map((message, index) => ({ lead_id: lead.id, sequence_key: sequence.key, step: index + 1, send_after: new Date(now.getTime() + sequence.delays[index] * 86400000).toISOString(), goal: message.goal, subject: message.subject, body: replaceName(message.body, lead), cta: message.cta, stop_condition: message.stop, status: 'draft', blocked_reason: null, updated_at: now.toISOString() }));
  const existing = await supabaseTable(`lead_email_outbox?lead_id=eq.${encodeURIComponent(lead.id)}&sequence_key=eq.${encodeURIComponent(sequence.key)}&select=step`);
  const existingSteps = new Set((existing || []).map(item => item.step));
  const missing = rows.filter(item => !existingSteps.has(item.step));
  const inserted = missing.length ? await supabaseTable('lead_email_outbox?on_conflict=lead_id,sequence_key,step', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify(missing) }) : [];
  await supabaseTable(`leads?id=eq.${encodeURIComponent(lead.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ nurture_sequence: sequence.key, nurture_status: 'outbox_ready', nurture_next_at: rows[0].send_after, nurture_stopped_reason: null, updated_at: now.toISOString() }) });
  return { status: 'outbox_ready', reason: null, inserted: inserted?.length || 0, nurture: await readNurtureForLead({ ...lead, nurture_sequence: sequence.key, nurture_status: 'outbox_ready' }) };
}

export function validateDraftEdit(input) {
  const subject = String(input?.subject || '').trim();
  const body = String(input?.body || '').trim();
  const cta = String(input?.cta || '').trim();
  if (!subject || !body || !cta) throw new Error('Cần nhập tiêu đề, nội dung và CTA.');
  if (subject.length > 200 || body.length > 12000 || cta.length > 300) throw new Error('Email vượt quá độ dài cho phép.');
  return { subject, body, cta };
}

export async function updateNurtureDraft(leadId, draftId, input) {
  if (!/^[0-9a-f-]{36}$/i.test(String(leadId)) || !/^[0-9a-f-]{36}$/i.test(String(draftId))) throw new Error('Mã bản nháp không hợp lệ.');
  const changes = validateDraftEdit(input);
  const rows = await supabaseTable(`lead_email_outbox?id=eq.${encodeURIComponent(draftId)}&lead_id=eq.${encodeURIComponent(leadId)}&select=id,status,updated_at&limit=1`);
  const current = rows?.[0];
  if (!current) throw new Error('Không tìm thấy email nháp của khách hàng này.');
  if (current.status !== 'draft') throw new Error('Chỉ có thể sửa email đang ở trạng thái nháp.');
  const updated = await supabaseTable(`lead_email_outbox?id=eq.${encodeURIComponent(draftId)}&lead_id=eq.${encodeURIComponent(leadId)}&status=eq.draft&updated_at=eq.${encodeURIComponent(current.updated_at)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...changes, updated_at: new Date().toISOString() }) });
  if (!updated?.[0]) throw new Error('Bản nháp vừa thay đổi ở nơi khác. Tải lại hồ sơ trước khi sửa tiếp.');
  return updated[0];
}

export async function stopNurtureForLead(lead) {
  if (!STOP_STATUSES.has(lead?.status)) return;
  const reason = `Dừng vì trạng thái Pipeline: ${lead.status}.`;
  await supabaseTable(`lead_email_outbox?lead_id=eq.${encodeURIComponent(lead.id)}&status=in.(draft,queued)`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'stopped', blocked_reason: reason, updated_at: new Date().toISOString() }) });
  await supabaseTable(`leads?id=eq.${encodeURIComponent(lead.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ nurture_status: 'stopped', nurture_stopped_reason: reason, nurture_next_at: null, updated_at: new Date().toISOString() }) });
}

