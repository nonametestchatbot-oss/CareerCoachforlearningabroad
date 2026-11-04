import { supabaseTable } from './supabase.js';

export const STOP_STATUSES = new Set(['booked', 'won', 'not_fit']);
const BOOKING_URL = 'https://linhcoach.nghetrienkhaiai.com/book/coaching';

const SEQUENCES = {
  high: {
    key: 'score_70_100', label: 'Score 70–100 · Hiểu nhu cầu và mời đặt lịch', delays: [0, 3],
    messages: [
      { goal: 'Hiểu rõ điều lead đang cần giải quyết.', condition: 'Lead có score 70–100, có email và đã đồng ý nhận email.', subject: 'Điều gì đang khiến bạn chưa yên tâm về lựa chọn hiện tại?', body: 'Chào {{name}},\n\nCảm ơn bạn đã chia sẻ nhu cầu. Để buổi trao đổi đi đúng trọng tâm, bạn có thể ghi lại một điều đang khiến bạn băn khoăn nhất về hướng đi hiện tại.\n\nKhi bạn sẵn sàng, hãy chọn một khung giờ phù hợp để cùng Linh nhìn rõ vấn đề và bước tiếp theo.', cta: 'Chọn lịch trao đổi 1:1', stop: 'Dừng nếu lead đặt lịch, đã mua, từ chối hoặc rút đồng ý nhận email.', url: BOOKING_URL },
      { goal: 'Mời lead đặt buổi trao đổi 1:1 khi đã sẵn sàng.', condition: 'Sau email 1 ít nhất 3 ngày và lead vẫn ở trạng thái chưa đặt lịch/mua/từ chối.', subject: 'Bạn có thể bắt đầu từ một cuộc trao đổi rõ ràng', body: 'Chào {{name}},\n\nNếu bạn vẫn đang cân nhắc, một buổi trao đổi ngắn có thể giúp bạn sắp xếp lại điều mình muốn, điều cần kiểm chứng và bước nên làm trước.\n\nBạn có thể chọn lịch khi thấy phù hợp; không cần chuẩn bị câu trả lời hoàn hảo trước buổi gặp.', cta: 'Đặt lịch 1:1 với Linh', stop: 'Dừng nếu lead đặt lịch, đã mua, từ chối hoặc rút đồng ý nhận email.', url: BOOKING_URL }
    ]
  },
  medium: {
    key: 'score_40_69', label: 'Score 40–69 · Ví dụ và tài liệu phù hợp', delays: [0, 3, 7],
    messages: [
      { goal: 'Giúp lead nhìn một vấn đề nghề nghiệp qua ví dụ cụ thể.', condition: 'Lead có score 40–69, có email và đã đồng ý nhận email.', subject: 'Một cách đơn giản để nhìn lại lựa chọn nghề nghiệp', body: 'Chào {{name}},\n\nKhi cân nhắc một hướng đi, hãy thử tách thành ba câu hỏi: mình đang quan tâm điều gì, công việc thực tế đòi hỏi gì, và mình đã có bằng chứng nào từ trải nghiệm của bản thân.\n\nBạn có thể dùng ba câu hỏi này để xem lựa chọn hiện tại đang dựa trên dữ liệu hay chỉ dựa trên cảm giác.', cta: 'Xem 3 câu hỏi tự rà soát', stop: 'Dừng nếu lead đặt lịch, đã mua, từ chối hoặc rút đồng ý nhận email.' },
      { goal: 'Đưa một ví dụ áp dụng để lead tự kiểm chứng.', condition: 'Sau email 1 ít nhất 3 ngày và lead vẫn chưa dừng chuỗi.', subject: 'Đừng chỉ hỏi “mình thích gì” — hãy thử kiểm chứng', body: 'Chào {{name}},\n\nMột cách thực tế hơn là chọn một hoạt động nhỏ liên quan đến ngành đang quan tâm, thực hiện trong thời gian ngắn, rồi ghi lại: phần nào làm bạn có năng lượng, phần nào khiến bạn mất tập trung, và kết quả bạn tạo ra.\n\nĐây là dữ liệu để suy nghĩ tiếp, không phải bài kiểm tra để kết luận vội.', cta: 'Thử một trải nghiệm nhỏ', stop: 'Dừng nếu lead đặt lịch, đã mua, từ chối hoặc rút đồng ý nhận email.' },
      { goal: 'Gợi ý bước tiếp theo phù hợp với mức độ sẵn sàng.', condition: 'Sau email 2 ít nhất 4 ngày và lead vẫn chưa dừng chuỗi.', subject: 'Khi nào bạn nên tìm người đồng hành?', body: 'Chào {{name}},\n\nNếu bạn đã thử tự rà soát nhưng vẫn mắc ở việc chọn tiêu chí, đọc tín hiệu từ trải nghiệm hoặc biến suy nghĩ thành kế hoạch, một cuộc trao đổi có cấu trúc có thể giúp bạn nhìn rõ hơn.\n\nBạn chỉ cần đặt lịch khi thấy đây là bước phù hợp với mình lúc này.', cta: 'Xem lịch trao đổi', stop: 'Dừng nếu lead đặt lịch, đã mua, từ chối hoặc rút đồng ý nhận email.', url: BOOKING_URL }
    ]
  },
  low: {
    key: 'score_0_39', label: 'Score 0–39 · Duy trì giá trị và quay lại khi sẵn sàng', delays: [0, 7, 14],
    messages: [
      { goal: 'Duy trì một giá trị nhỏ, dễ áp dụng.', condition: 'Lead có score 0–39, có email và đã đồng ý nhận email.', subject: 'Một câu hỏi nhỏ để bạn giữ lại cho lúc phù hợp', body: 'Chào {{name}},\n\nBạn không cần phải có ngay một câu trả lời về tương lai. Hãy thử ghi lại một việc bạn từng làm tốt, một việc khiến bạn muốn tìm hiểu thêm và một môi trường khiến bạn thấy mình có thể phát triển.\n\nBạn có thể quay lại những ghi chú này khi sẵn sàng.', cta: 'Lưu lại 3 câu hỏi', stop: 'Dừng nếu lead đặt lịch, đã mua, từ chối hoặc rút đồng ý nhận email.' },
      { goal: 'Khuyến khích lead quan sát bản thân qua trải nghiệm.', condition: 'Sau email 1 ít nhất 7 ngày và lead vẫn chưa dừng chuỗi.', subject: 'Trải nghiệm nhỏ cũng có thể cho bạn thêm dữ liệu', body: 'Chào {{name}},\n\nNếu chưa muốn quyết định, bạn có thể chọn một trải nghiệm nhỏ: tham gia một hoạt động, trò chuyện với người đang làm nghề bạn tò mò, hoặc thử một nhiệm vụ gần với công việc đó.\n\nĐiều quan trọng là ghi lại điều bạn học được sau trải nghiệm.', cta: 'Chọn một trải nghiệm để thử', stop: 'Dừng nếu lead đặt lịch, đã mua, từ chối hoặc rút đồng ý nhận email.' },
      { goal: 'Mở lại cánh cửa liên hệ mà không gây áp lực.', condition: 'Sau email 2 ít nhất 7 ngày và lead vẫn chưa dừng chuỗi.', subject: 'Khi bạn sẵn sàng, Linh vẫn ở đây', body: 'Chào {{name}},\n\nBạn có thể giữ lại chuỗi email này và quay lại bất cứ khi nào muốn sắp xếp lại suy nghĩ về học tập, nghề nghiệp hoặc bước tiếp theo.\n\nNếu cần một cuộc trao đổi có cấu trúc, bạn có thể xem lịch; còn nếu chưa phù hợp, bạn không cần làm gì thêm.', cta: 'Xem lịch khi bạn sẵn sàng', stop: 'Dừng nếu lead đặt lịch, đã mua, từ chối hoặc rút đồng ý nhận email.', url: BOOKING_URL }
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
  const sequence = sequenceForLead(lead);
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
  const sequence = sequenceForLead(lead);
  if (reason || !sequence) return { status: reason ? 'blocked' : 'not_started', reason: reason || 'Chưa có score để chọn chuỗi.', inserted: 0, nurture: await readNurtureForLead(lead) };
  const now = new Date();
  const rows = sequence.messages.map((message, index) => ({ lead_id: lead.id, sequence_key: sequence.key, step: index + 1, send_after: new Date(now.getTime() + sequence.delays[index] * 86400000).toISOString(), goal: message.goal, subject: message.subject, body: replaceName(message.body, lead), cta: message.cta, stop_condition: message.stop, status: 'draft', blocked_reason: null, updated_at: now.toISOString() }));
  const inserted = await supabaseTable('lead_email_outbox?on_conflict=lead_id,sequence_key,step', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(rows) });
  await supabaseTable(`leads?id=eq.${encodeURIComponent(lead.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ nurture_sequence: sequence.key, nurture_status: 'outbox_ready', nurture_next_at: rows[0].send_after, nurture_stopped_reason: null, updated_at: now.toISOString() }) });
  return { status: 'outbox_ready', reason: null, inserted: inserted?.length || 0, nurture: await readNurtureForLead({ ...lead, nurture_sequence: sequence.key, nurture_status: 'outbox_ready' }) };
}

export async function stopNurtureForLead(lead) {
  if (!STOP_STATUSES.has(lead?.status)) return;
  const reason = `Dừng vì trạng thái Pipeline: ${lead.status}.`;
  await supabaseTable(`lead_email_outbox?lead_id=eq.${encodeURIComponent(lead.id)}&status=in.(draft,queued)`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'stopped', blocked_reason: reason, updated_at: new Date().toISOString() }) });
  await supabaseTable(`leads?id=eq.${encodeURIComponent(lead.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ nurture_status: 'stopped', nurture_stopped_reason: reason, nurture_next_at: null, updated_at: new Date().toISOString() }) });
}

