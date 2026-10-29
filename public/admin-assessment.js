let authToken = '';
let email = '';
const $ = id => document.getElementById(id);
const status = (id, text, error = false) => { $(id).textContent = text; $(id).classList.toggle('admin-error', error); };

async function call(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}`, ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Không thực hiện được');
  return data;
}

async function requestOtp(event) {
  event.preventDefault(); email = $('admin-email').value.trim().toLowerCase();
  try { const data = await fetch('/api/assessment-auth-request', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email }) }).then(r => r.json()); if (!data.ok) throw new Error(data.error); $('verify-form').hidden = false; status('login-status', 'Đã gửi mã. Kiểm tra email quản trị.'); } catch (error) { status('login-status', error.message, true); }
}
async function verifyOtp(event) {
  event.preventDefault();
  try { const response = await fetch('/api/assessment-auth-verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, otp:$('admin-otp').value.trim()}) }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error); authToken = data.accessToken; $('login-card').hidden = true; $('panel').hidden = false; await loadGrants(); } catch (error) { status('login-status', error.message, true); }
}
async function loadGrants() { const data = await call('/api/admin-assessment-grants'); $('grant-list').innerHTML = `<table class="admin-table"><thead><tr><th>Email</th><th>Nguồn</th><th>Trạng thái</th><th>Hết hạn</th><th>Tuỳ chọn</th></tr></thead><tbody>${data.grants.map(grant => `<tr><td>${grant.assessment_users?.email || ''}</td><td>${grant.source}</td><td>${grant.status}${grant.attempt_used ? ' · đã làm' : ''}</td><td>${new Date(grant.expires_at).toLocaleString('vi-VN')}</td><td>${grant.show_previous_result ? 'Hiện lần trước' : 'Ẩn lần trước'}</td></tr>`).join('')}</tbody></table>`; }
async function grant(event) { event.preventDefault(); try { await call('/api/admin-assessment-grants', { method:'POST', body:JSON.stringify({ email:$('grant-email').value, name:$('grant-name').value, showPreviousResult:$('show-previous').checked }) }); status('grant-status','Đã cấp lượt làm bài trong 30 ngày.'); event.target.reset(); await loadGrants(); } catch(error) { status('grant-status', error.message, true); } }
$('login-form').addEventListener('submit', requestOtp); $('verify-form').addEventListener('submit', verifyOtp); $('grant-form').addEventListener('submit', grant);
