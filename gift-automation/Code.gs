const GIFT_FILE_ID = '1BHEPGL6dJ8WY-knFEolGDMdYilW9iEKkdwRvQr9s8O0';
const GIFT_FILE_URL = 'https://docs.google.com/spreadsheets/d/' + GIFT_FILE_ID + '/edit';
const GIFT_SITE_URL = 'https://duhocbenvung.linhcoach-eqstrength.com';
const GIFT_API_URL = GIFT_SITE_URL + '/api/crm?action=gift-nurture';

function doPost(e) {
  let input = e && e.parameter ? e.parameter : {};
  if (e && e.postData && e.postData.contents) {
    try { input = Object.assign({}, input, JSON.parse(e.postData.contents)); } catch (ignored) {}
  }
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty('GIFT_AUTOMATION_SECRET') || '';
  if (!secret || !constantTimeEqual_(input.secret || input['x-gift-secret'], secret)) return json_({ok:false,error:'Unauthorized'});
  if (input.action === 'deliverGift') return deliverGift_(input);
  if (input.action === 'sendAssessmentAccess') return sendAssessmentAccess_(input);
  return json_({ok:false,error:'Unknown action'});
}
function sendAssessmentAccess_(input) {
  const email = String(input.email || '').trim().toLowerCase();
  const name = String(input.name || 'bạn').trim() || 'bạn';
  const requestId = String(input.requestId || '').trim();
  const accessCode = String(input.accessCode || '').trim().toUpperCase();
  const expiresAt = new Date(input.expiresAt);
  if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)
      || !/^[0-9a-f-]{36}$/i.test(requestId)
      || !/^[A-F0-9]{4}(?:-[A-F0-9]{4}){3}$/.test(accessCode)
      || !Number.isFinite(expiresAt.getTime())) {
    return json_({ok:false,error:'Thông tin cấp quyền không hợp lệ.'});
  }
  const properties = PropertiesService.getScriptProperties();
  const propertyKey = 'assessment_access_' + requestId;
  if (properties.getProperty(propertyKey)) return json_({ok:true,duplicate:true});
  try {
    const subject = 'Mã đăng nhập bài test của bạn | Linh Coach';
    const expiryLabel = Utilities.formatDate(expiresAt, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const testUrl = GIFT_SITE_URL + '/test';
    const body = 'Chào ' + name + ',\\n\\n'
      + 'Linh Coach đã cấp quyền làm bài kiểm chứng hướng đi cho email: ' + email + '.\\n\\n'
      + 'MÃ ĐĂNG NHẬP BÀI TEST: ' + accessCode + '\\n\\n'
      + 'Cách vào bài test:\\n1. Mở ' + testUrl + '\\n2. Nhập đúng email này và mã đăng nhập ở trên.\\n\\n'
      + 'Mã có hiệu lực đến ' + expiryLabel + ' (30 ngày kể từ ngày cấp). Sau khi hoàn thành, bạn có thể dùng lại đúng email và mã này để xem kết quả gần nhất đến hạn trên.\\n\\n'
      + 'Nếu không yêu cầu quyền truy cập này, vui lòng bỏ qua email và liên hệ Linh Coach.\\n\\n'
      + 'Trân trọng,\\nLinh Coach';
    MailApp.sendEmail({to:email,subject:subject,body:body,name:'Linh Coach'});
    properties.setProperty(propertyKey, new Date().toISOString());
    return json_({ok:true});
  } catch (error) {
    return json_({ok:false,error:'Google chưa xác nhận gửi email mã đăng nhập.'});
  }
}

function deliverGift_(input) {
  const email = String(input.email || '').trim().toLowerCase();
  const name = String(input.name || 'bạn').trim() || 'bạn';
  const requestId = String(input.requestId || '').trim();
  if (!email || !requestId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json_({ok:false,error:'Thông tin yêu cầu không hợp lệ.'});
  const properties = PropertiesService.getScriptProperties();
  const prior = properties.getProperty('gift_' + requestId);
  if (prior) return json_({ok:true,fileUrl:GIFT_FILE_URL,duplicate:true});
  try {
    const file = DriveApp.getFileById(GIFT_FILE_ID);
    const viewers = file.getViewers().map(user => String(user.getEmail() || '').toLowerCase());
    if (viewers.indexOf(email) < 0) file.addViewer(email);
    const subject = 'Quà tặng của Linh Coach: Bảng chương trình quốc tế ngắn hạn';
    const body = 'Chào ' + name + ',\n\nLinh Coach đã cấp quyền xem bảng chương trình quốc tế ngắn hạn có học bổng cho email này.\n\nMở tài liệu tại đây: ' + GIFT_FILE_URL + '\n\nNếu Google yêu cầu đăng nhập, hãy dùng đúng email đã đăng ký: ' + email + '. Tài liệu được chia sẻ ở chế độ chỉ xem.\n\nCác cơ hội trong bảng chỉ mang tính tham khảo. Hạn nộp, độ tuổi, chi phí và hỗ trợ có thể thay đổi; vui lòng xác minh với đơn vị tổ chức trước khi đăng ký.\n\nNếu bạn muốn dừng nhận email tiếp theo, vui lòng liên hệ Linh tại Linhcoach.EQstrength@gmail.com.\n\nTrân trọng,\nLinh Coach\nLinhcoach.EQstrength@gmail.com';
    MailApp.sendEmail({to:email,subject:subject,body:body,name:'Linh Coach'});
    properties.setProperty('gift_' + requestId, new Date().toISOString());
    return json_({ok:true,fileUrl:GIFT_FILE_URL});
  } catch (error) {
    return json_({ok:false,error:'Google chưa xác nhận hoàn tất cấp quyền và gửi thư.'});
  }
}
function installNurtureTrigger() {
  const existing = ScriptApp.getProjectTriggers().some(trigger => trigger.getHandlerFunction() === 'sendDueGiftNurture');
  if (!existing) ScriptApp.newTrigger('sendDueGiftNurture').timeBased().everyMinutes(15).create();
}
function sendDueGiftNurture() {
  const secret = PropertiesService.getScriptProperties().getProperty('GIFT_AUTOMATION_SECRET') || '';
  if (!secret) throw new Error('Cần đặt Script Property GIFT_AUTOMATION_SECRET trước.');
  const response = UrlFetchApp.fetch(GIFT_API_URL,{method:'post',contentType:'application/json',headers:{'x-gift-secret':secret},payload:JSON.stringify({action:'claim',secret:secret}),muteHttpExceptions:true});
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('Không lấy được email đến hạn.');
  const data = JSON.parse(response.getContentText());
  if (!data.ok) throw new Error('API không xác nhận danh sách email.');
  (data.messages || []).forEach(message => {
    let outcome = {action:'ack',id:message.id,outcome:'failed',error:'Gmail chưa xác nhận gửi.'};
    try {
      const body = String(message.body || '').replaceAll('{{name}}',String(message.name || 'bạn'));
      MailApp.sendEmail({to:message.to,subject:message.subject,body:body + '\n\nMở tài liệu: ' + GIFT_FILE_URL + '\n\nNếu bạn muốn dừng nhận email tiếp theo, vui lòng liên hệ Linh tại Linhcoach.EQstrength@gmail.com.',name:'Linh Coach'});
      outcome = {action:'ack',id:message.id,outcome:'sent'};
    } catch (error) { outcome.error = String(error).slice(0,400); }
    try { UrlFetchApp.fetch(GIFT_API_URL,{method:'post',contentType:'application/json',headers:{'x-gift-secret':secret},payload:JSON.stringify(Object.assign({},outcome,{secret:secret})),muteHttpExceptions:true}); } catch (ignored) {}
  });
}
function constantTimeEqual_(a,b) {
  a=String(a||'');b=String(b||'');if(!a||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;
}
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
