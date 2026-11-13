let authToken = '';
let email = '';
let dashboard = {grants:[],attempts:[]};
const $ = id => document.getElementById(id);
const status = (id,text,error=false)=>{$(id).textContent=text;$(id).classList.toggle('admin-error',error);};
const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const date=value=>value?new Date(value).toLocaleString('vi-VN'):'—';
const related=value=>Array.isArray(value)?value[0]||{}:(value||{});
async function call(path,options={}) {
 const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${authToken}`,...(options.headers||{})}});
 const data=await response.json(); if(!response.ok||!data.ok)throw new Error(data.error||'Không thực hiện được'); return data;
}
let otpCooldownTimer;
function startOtpCooldown(seconds) {
 const button=$('login-form').querySelector('button[type="submit"]');
 if(!button)return;
 clearInterval(otpCooldownTimer);
 const original=button.dataset.originalLabel||button.textContent.trim();
 button.dataset.originalLabel=original;
 let remaining=Math.max(0,Number(seconds)||60);
 button.disabled=remaining>0;
 const tick=()=>{
  if(remaining<=0){clearInterval(otpCooldownTimer);button.disabled=false;button.textContent=original;return;}
  button.textContent=`Gửi lại sau ${remaining} giây`;
  remaining-=1;
 };
 tick();
 otpCooldownTimer=setInterval(tick,1000);
}
async function requestOtp(event) {
 event.preventDefault(); email=$('admin-email').value.trim().toLowerCase();
 try {
  const response=await fetch('/api/assessment-auth-request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
  let data={}; try { data=await response.json(); } catch {}
  if(!response.ok||!data.ok) {
   if(response.status===429)startOtpCooldown(data.retryAfterSeconds||60);
   throw new Error(data.error||'Chưa gửi được email đăng nhập. Vui lòng thử lại sau ít phút.');
  }
  $('verify-form').hidden=false;startOtpCooldown(60);
  status('login-status','Email đã gửi. Nếu có mã 6 số, nhập vào đây. Nếu thư chỉ có nút đăng nhập, bấm nút đó một lần; sau đó vào Workspace.');
 } catch(error){status('login-status',error.message||'Chưa gửi được email đăng nhập. Vui lòng thử lại sau ít phút.',true);}
}
async function verifyOtp(event) {
 event.preventDefault();
 try {const response=await fetch('/api/assessment-auth-verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,otp:$('admin-otp').value.trim()})});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error);authToken=data.accessToken;const shared={accessToken:data.accessToken,refreshToken:data.refreshToken,user:data.user,createdAt:Date.now(),expiresAt:Date.now()+50*60*1000};localStorage.setItem('linhCoachCrmSession',JSON.stringify(shared));sessionStorage.setItem('linhCoachCrmSession',JSON.stringify(shared));$('login-card').hidden=true;$('panel').hidden=false;await loadDashboard();}
 catch(error){status('login-status',error.message,true);}
}
function grantHtml(grant) {
 const user=related(grant.assessment_users), source=grant.source==='sepay'?'Tự động · thanh toán':'Linh cấp thủ công';
 const state=grant.status==='revoked'?'Đã thu hồi':grant.attempt_used?'Đã làm bài':grant.status==='active'?'Chưa làm':'Hết hiệu lực';
 return `<tr><td><strong>${esc(user.name||'Chưa có tên')}</strong><br>${esc(user.email||'')}</td><td><span class="source-tag">${source}</span><br>${esc(grant.order_code||'')}</td><td>${esc(state)}</td><td>${esc(date(grant.granted_at||grant.created_at))}<br>đến ${esc(date(grant.expires_at))}</td><td>${esc(grant.notes||'—')}</td></tr>`;
}
function attemptHtml(attempt) {
 const user=related(attempt.assessment_users), grant=related(attempt.assessment_access_grants), answers=attempt.answers||{};
 const profile=answers._profileType==='student'?'Học sinh / sinh viên':answers._profileType==='professional'?'Người đi làm':'Chưa lưu nhóm';
 const results=attempt.results||{};
 const resultItems=Object.values(results).map((value,index)=>`<span><strong>${esc(value?.key||index+1)}:</strong> ${esc(value?.position??'—')}/100</span>`).join('');
 const raw=Object.entries(answers).filter(([key])=>!key.startsWith('_')).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true})).map(([key,value])=>`<span><strong>${esc(key)}:</strong> ${esc(value)}</span>`).join('');
 const source=grant.source==='sepay'?'Tự động · thanh toán':'Linh cấp thủ công';
 return `<tr><td><strong>${esc(user.name||'Chưa có tên')}</strong><br>${esc(user.email||'')}</td><td>${esc(profile)}<br><span class="source-tag">${source}</span><br>${esc(grant.order_code||'')}</td><td>${esc(date(attempt.submitted_at))}</td><td><div class="attempt-result">${resultItems||'Chưa có điểm'}</div></td><td><details><summary>Chi tiết câu trả lời</summary><div class="answer-list">${raw||'Không có dữ liệu câu trả lời.'}</div></details></td></tr>`;
}
function renderDashboard() {
 const query=$('admin-search').value.trim().toLowerCase();
 const matches=text=>!query||String(text).toLowerCase().includes(query);
 const grants=dashboard.grants.filter(g=>{const u=related(g.assessment_users);return matches([u.name,u.email,g.order_code,g.source,g.status].join(' '));});
 const attempts=dashboard.attempts.filter(a=>{const u=related(a.assessment_users),g=related(a.assessment_access_grants);return matches([u.name,u.email,g.order_code,g.source,a.answers?._profileType].join(' '));});
 $('metric-grants').textContent=dashboard.grants.length;
 $('metric-attempts').textContent=dashboard.attempts.length;
 $('metric-manual').textContent=dashboard.grants.filter(g=>g.source==='manual').length;
 $('grant-list').innerHTML=grants.length?`<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Người làm bài</th><th>Nguồn / mã</th><th>Trạng thái</th><th>Thời hạn</th><th>Ghi chú</th></tr></thead><tbody>${grants.map(grantHtml).join('')}</tbody></table></div>`:'<div class="admin-empty">Không tìm thấy lượt cấp quyền.</div>';
 $('attempt-list').innerHTML=attempts.length?`<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Người làm bài</th><th>Nhóm / nguồn</th><th>Thời gian nộp</th><th>5 chiều kết quả</th><th>Đáp án</th></tr></thead><tbody>${attempts.map(attemptHtml).join('')}</tbody></table></div>`:'<div class="admin-empty">Chưa có bài làm phù hợp.</div>';
}
async function loadDashboard() {dashboard=await call('/api/admin-assessment-grants');renderDashboard();}
async function grant(event) {
 event.preventDefault();
 try {await call('/api/admin-assessment-grants',{method:'POST',body:JSON.stringify({email:$('grant-email').value,name:$('grant-name').value,notes:$('grant-notes').value,showPreviousResult:$('show-previous').checked})});status('grant-status','Đã cấp lượt làm bài trong 30 ngày.');event.target.reset();await loadDashboard();}
 catch(error){status('grant-status',error.message,true);}
}
async function consumeMagicLink() {
 const params=new URLSearchParams(window.location.hash.slice(1));
 const refreshToken=params.get('refresh_token');
 const error=params.get('error_description')||params.get('error');
 if(!refreshToken){if(error)status('login-status','Liên kết đăng nhập không còn hiệu lực. Hãy yêu cầu email mới.',true);return;}
 window.history.replaceState(null,'',window.location.pathname+window.location.search);
 try {
  const response=await fetch('/api/crm?action=auth-refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken})});
  const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Không xác minh được tài khoản quản trị.');
  authToken=data.accessToken;
  const shared={accessToken:data.accessToken,refreshToken:data.refreshToken,user:data.user,createdAt:Date.now(),expiresAt:Date.now()+50*60*1000};
  localStorage.setItem('linhCoachCrmSession',JSON.stringify(shared));sessionStorage.setItem('linhCoachCrmSession',JSON.stringify(shared));
  await loadDashboard();$('login-card').hidden=true;$('panel').hidden=false;
  status('login-status','Đã đăng nhập. Phiên này được lưu trên thiết bị trong tối đa 30 ngày. Mở “Workspace quản lý” phía trên để vào CRM.');
 } catch(error) {authToken='';status('login-status',error.message||'Liên kết hết hạn. Hãy yêu cầu email mới.',true);}
}
$('login-form').addEventListener('submit',requestOtp);consumeMagicLink();$('verify-form').addEventListener('submit',verifyOtp);$('grant-form').addEventListener('submit',grant);$('admin-search').addEventListener('input',renderDashboard);
