const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const date=value=>value?new Date(value).toLocaleString('vi-VN'):'—';
let session=null;
async function refresh() {
 try {
  session=JSON.parse(localStorage.getItem('linhCoachCrmSession')||'null');
  if(!session?.refreshToken)return false;
  const response=await fetch('/api/crm?action=auth-refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:session.refreshToken})});
  const data=await response.json();if(!response.ok||!data.ok)return false;
  session={...session,...data,expiresAt:Date.now()+Number(data.expiresIn||3600)*1000};
  localStorage.setItem('linhCoachCrmSession',JSON.stringify(session));sessionStorage.setItem('linhCoachCrmSession',JSON.stringify(session));
  return true;
 } catch{return false;}
}
function cards(results) {
 return Object.values(results||{}).map(result=>`<article class="admin-axis"><div class="result-top"><div><h2>${esc(result.left)} — ${esc(result.right)}</h2><p class="result-meta">${esc(result.theme||'')}</p></div><strong class="admin-score">${esc(result.position??'—')}/100</strong></div><p>${esc(result.phrase||'')}</p><div class="admin-axis-grid"><div><strong>${esc(result.left)}</strong><p>${esc(result.leftDetail||'')}</p></div><div><strong>${esc(result.right)}</strong><p>${esc(result.rightDetail||'')}</p></div></div><p><strong>Gợi ý:</strong> ${esc(result.context||'')}</p></article>`).join('');
}
(async()=>{
 try {
  session=JSON.parse(localStorage.getItem('linhCoachCrmSession')||'null');
  if(!session?.accessToken||!session?.refreshToken)throw new Error('Vui lòng đăng nhập lại Workspace quản trị.');
  const id=new URLSearchParams(location.search).get('id');
  if(!id)throw new Error('Thiếu mã kết quả.');
  const request=()=>fetch(`/api/admin-assessment-grants?attemptId=${encodeURIComponent(id)}`,{cache:'no-store',headers:{Authorization:`Bearer ${session.accessToken}`}});
  let response=await request();
  if(response.status===401&&await refresh())response=await request();
  const data=await response.json();
  if(!response.ok||!data.ok)throw new Error(data.error||'Không tải được kết quả.');
  const a=data.attempt, user=a.user||{};
  $('result-state').textContent='';
  $('result-content').hidden=false;
  $('result-content').innerHTML=`<div class="result-top"><div><h1>Kết quả bài test gần nhất</h1><p class="result-meta"><strong>${esc(user.name||'Chưa có tên')}</strong> · ${esc(user.email)}<br>Hoàn thành: ${esc(date(a.submittedAt))}<br>Nhóm: ${a.profileType==='student'?'Học sinh / sinh viên':a.profileType==='professional'?'Người đi làm':'Chưa xác định'}</p></div><a class="assessment-button" href="/admin-assessment">Quay lại danh sách</a></div><div class="result-cards">${cards(a.results)||'<p>Chưa có dữ liệu kết quả.</p>'}</div>`;
 } catch(error) {
  $('result-state').innerHTML=`<p class="admin-error">${esc(error.message||'Không tải được kết quả.')}</p><p><a href="/admin-assessment">Quay lại trang quản lý bài test</a></p>`;
 }
})();
