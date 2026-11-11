import { supabaseTable } from './supabase.js';

const STOP = new Set(['booked','won','not_fit']);
const SEQUENCE = [
  {step:1,days:1,goal:'Giúp gia đình chọn một cơ hội đáng tìm hiểu trước.',subject:'Một cách nhẹ nhàng để cùng con chọn cơ hội phù hợp',body:'Chào {{name}},\n\nSau khi xem bảng chương trình, gia đình chưa cần chọn ngay. Hãy cùng con chọn một cơ hội khiến con tò mò nhất rồi kiểm tra ba điều: độ tuổi, thời gian cần tham gia và chi phí sau hỗ trợ.\n\nNếu các điều kiện cơ bản phù hợp, con có thể đọc trang chính thức và ghi lại một câu hỏi muốn tìm lời giải.\n\nLinh Coach',cta:'Mở lại bảng chương trình'},
  {step:2,days:4,goal:'Gợi ý biến một cơ hội thành trải nghiệm có chủ đích trong hồ sơ.',subject:'Trải nghiệm có ý nghĩa bắt đầu từ điều con muốn khám phá',body:'Chào {{name}},\n\nMột hoạt động ngắn hạn có thể giúp con khám phá chủ đề mình quan tâm, nhưng giá trị không nằm ở tên chương trình. Gia đình có thể hỏi con: “Con muốn học hoặc thử điều gì ở đây?” và “Sau chương trình, con muốn kể lại điều gì mình đã làm?”\n\nCâu trả lời giúp con chọn trải nghiệm có chủ đích và nhìn lại điều mình học được.\n\nLinh Coach',cta:'Cùng con chọn một câu hỏi khám phá'},
  {step:3,days:9,goal:'Mời gia đình trao đổi bước tiếp theo nếu cần làm rõ định hướng.',subject:'Khi gia đình muốn nối trải nghiệm với hướng học tập của con',body:'Chào {{name}},\n\nNếu gia đình đã xem các cơ hội nhưng vẫn chưa rõ nên ưu tiên điều gì, có thể bắt đầu bằng việc đối chiếu mối quan tâm của con với trải nghiệm, môn học và ngành con đang cân nhắc. Không cần quyết định ngay; mục tiêu là xác định một bước tìm hiểu tiếp theo có thể kiểm chứng.\n\nNếu muốn trao đổi về hướng học tập hoặc nghề nghiệp của con, ba mẹ có thể đặt lịch trò chuyện với Linh.\n\nLinh Coach',cta:'Tìm hiểu buổi tư vấn cùng Linh'}
];
function withName(body,lead) { return body.replaceAll('{{name}}',String(lead.name || 'bạn').trim() || 'bạn'); }
export async function queueGiftNurture(lead) {
  if (!lead?.id || !lead.email || lead.email_consent !== true || STOP.has(lead.status)) return {queued:0,status:'blocked'};
  const existing = await supabaseTable('lead_email_outbox?lead_id=eq.'+encodeURIComponent(lead.id)+'&sequence_key=eq.gift_short_programs&select=step,status');
  const done = new Set((existing || []).map(row=>row.step));
  const now = Date.now();
  const rows = SEQUENCE.filter(item=>!done.has(item.step)).map(item=>({
    lead_id:lead.id,sequence_key:'gift_short_programs',step:item.step,
    send_after:new Date(now+item.days*86400000).toISOString(),goal:item.goal,
    subject:item.subject,body:withName(item.body,lead),cta:item.cta,
    stop_condition:'Dừng ngay khi đặt lịch, đã mua, chưa phù hợp hoặc rút consent.',
    status:'queued',blocked_reason:null,updated_at:new Date().toISOString()
  }));
  if (!rows.length) return {queued:0,status:'already_queued'};
  const inserted = await supabaseTable('lead_email_outbox?on_conflict=lead_id,sequence_key,step',{
    method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(rows)
  });
  await supabaseTable('leads?id=eq.'+encodeURIComponent(lead.id),{
    method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({
      nurture_sequence:'gift_short_programs',nurture_status:'queued',nurture_next_at:rows[0].send_after,nurture_stopped_reason:null,updated_at:new Date().toISOString()
    })
  });
  return {queued:inserted?.length || 0,status:'queued'};
}
