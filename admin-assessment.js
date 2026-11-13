const sessionKey='linhCoachCrmSession';
let session=null, authToken='', email='';
let dashboard = {grants:[],attempts:[]};
const $ = id => document.getElementById(id);
const status = (id,text,error=false)=>{$(id).textContent=text;$(id).classList.toggle('admin-error',error);};
const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const date=value=>value?new Date(value).toLocaleString('vi-VN'):'—';
const related=value=>Array.isArray(value)?value[0]||{}:(value||{});
function saveSession(value){session={...session,...value,createdAt:session?.createdAt||value.createdAt||Date.now()};session.expiresAt=Date.now()+50*60*1000;authToken=session.accessToken;localStorage.setItem(sessionKey,JSON.stringify(session));sessionStorage.setItem(sessionKey,JSON.stringify(session));}
function clearSession(){session=null;authToken='';localStorage.removeItem(sessionKey);sessionStorage.removeItem(sessionKey);}
function readSession(){try{const value=JSON.parse(localStorage.getItem(sessionKey)||sessionStorage.getItem(sessionKey)||'null');return value?.accessToken&&value?.refreshToken&&Date.now()-Number(value.createdAt||Date.now())<30*86400000?value:null;}catch{return null;}}
async function refreshSession(){if(!session?.refreshToken)throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');const response=await fetch('/api/crm?action=auth-refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:session.refreshToken})});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok){clearSession();throw new Error(data.error||'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');}saveSession({...data,createdAt:session.createdAt});}
async function call(path,options={}){
 if(session?.expiresAt&&Date.now()>session.expiresAt-90000)await refreshSession();
 const send=()=>fetch(path,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${authToken}`,...(options.headers||{})},cache:'no-store'});
 let response=await send();
 if(response.status===401&&session?.refreshToken){await refreshSession();response=await send();}
 const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Không thực hiện được');return data;
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
  const response=await fetch('/api/crm?action=auth-request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
  let data={}; try { data=await response.json(); } catch {}
  if(!response.ok||!data.ok) {
   if(response.status===429)startOtpCooldown(data.retryAfterSeconds||60);
   throw new Error(data.error||'Chưa gửi được email đăng nhập. Vui lòng thử lại sau ít phút.');
  }
  $('verify-form').hidden=true;startOtpCooldown(60);
  $('verify-form').hidden=false;status('login-status','Mã 6 số đã được gửi. Hãy nhập mã trong email để vào quản trị.');
 } catch(error){status('login-status',error.message||'Chưa gửi được email đăng nhập. Vui lòng thử lại sau ít phút.',true);}
}
async function verifyOtp(event) {
 event.preventDefault();
 try {const response=await fetch('/api/crm?action=auth-verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,otp:$('admin-otp').value.trim()})});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error);saveSession(data);$('login-card').hidden=true;$('panel').hidden=false;await loadDashboard();}
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
$('login-form').addEventListener('submit',requestOtp);
$('verify-form').addEventListener('submit',verifyOtp);
$('grant-form').addEventListener('submit',grant);
$('admin-search').addEventListener('input',renderDashboard);
session=readSession();
if(session){authToken=session.accessToken;email=session.user?.email||'';$('login-card').hidden=true;$('panel').hidden=false;loadDashboard().catch(error=>{clearSession();$('login-card').hidden=false;$('panel').hidden=true;status('login-status',error.message,true);});}
