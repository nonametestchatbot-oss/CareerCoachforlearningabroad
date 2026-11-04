const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const emailForm = document.getElementById('email-form');
const otpForm = document.getElementById('otp-form');
const emailInput = document.getElementById('admin-email');
const otpInput = document.getElementById('admin-otp');
const authStatus = document.getElementById('auth-status');
const appStatus = document.getElementById('app-status');
const pipeline = document.getElementById('pipeline');
const sourceFilter = document.getElementById('source-filter');
const statusFilter = document.getElementById('status-filter');
const scoreFilter = document.getElementById('score-filter');
const dialog = document.getElementById('lead-dialog');
const leadForm = document.getElementById('lead-form');
const dialogTitle = document.getElementById('dialog-title');
const dialogEyebrow = document.getElementById('dialog-eyebrow');
const dialogStatus = document.getElementById('dialog-status');
const dialogScore = document.getElementById('dialog-score');
const activityField = document.getElementById('activity-field');
const customerSearch = document.getElementById('customer-search');
const customerSourceFilter = document.getElementById('customer-source-filter');
const customerStatusFilter = document.getElementById('customer-status-filter');
const customerScoreFilter = document.getElementById('customer-score-filter');
const customerList = document.getElementById('customer-list');
const customerCount = document.getElementById('customer-count');
const customerProfile = document.getElementById('customer-profile');
const profileForm = document.getElementById('profile-form');
const profileStatus = document.getElementById('profile-status');
const activityHistory = document.getElementById('activity-history');
const emailHistory = document.getElementById('email-history');
const emailHistoryForm = document.getElementById('email-history-form');
const nurtureStatus = document.getElementById('nurture-status');
const nurtureSummary = document.getElementById('nurture-summary');
const nurturePreview = document.getElementById('nurture-preview');
const nurturePreviewSelect = document.getElementById('nurture-preview-select');
const nurtureQueueButton = document.getElementById('nurture-queue-button');
const nurtureOutbox = document.getElementById('nurture-outbox');
const nurtureGoal = document.getElementById('nurture-goal');
const nurtureCondition = document.getElementById('nurture-condition');
const nurtureSubject = document.getElementById('nurture-subject');
const nurtureBody = document.getElementById('nurture-body');
const nurtureCta = document.getElementById('nurture-cta');
const nurtureStop = document.getElementById('nurture-stop');
const statusLabels = {new:'Mới', contacted:'Đã liên hệ', qualified:'Đủ điều kiện', booked:'Đặt lịch', won:'Đã mua', not_fit:'Chưa phù hợp'};
const statusKeys = Object.keys(statusLabels);
const sessionKey = 'linhCoachCrmSession';
let session = null;
let leads = [];
let editingLead = null;
let selectedCustomerId = null;
let selectedProfile = null;

function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function setStatus(element, message, error = false) { element.textContent = message; element.classList.toggle('error', error); }
function readSession() { try { return JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch { return null; } }
function saveSession(value) { session = value; sessionStorage.setItem(sessionKey, JSON.stringify(value)); }
function clearSession() { session = null; sessionStorage.removeItem(sessionKey); }
async function api(path, options = {}) {
  const routeMap = {
    '/api/crm-auth-request': '/api/crm?action=auth-request',
    '/api/crm-auth-verify': '/api/crm?action=auth-verify',
    '/api/crm-leads': '/api/crm?action=leads',
    '/api/crm-activity': '/api/crm?action=activity',
    '/api/crm-email-history': '/api/crm?action=email-history',
    '/api/crm-nurture-profile': '/api/crm?action=nurture-profile',
    '/api/crm-nurture-consent': '/api/crm?action=nurture-consent',
    '/api/crm-nurture-queue': '/api/crm?action=nurture-queue'
  };
  if (routeMap[path]) path = routeMap[path];
  else if (path.startsWith('/api/crm-lead?')) path = path.replace('/api/crm-lead?', '/api/crm?action=lead&');
  const headers = {'Content-Type':'application/json', ...(options.headers || {})};
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  const response = await fetch(path, {...options, headers, cache:'no-store'});
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể kết nối CRM');
  return data;
}
function showAuth() { authView.hidden = false; appView.hidden = true; }
function showApp() { authView.hidden = true; appView.hidden = false; document.getElementById('signed-in').textContent = session?.user?.email || ''; }

emailForm.addEventListener('submit', async event => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const button = emailForm.querySelector('button'); button.disabled = true;
  setStatus(authStatus, 'Đang gửi mã xác thực…');
  try { await api('/api/crm-auth-request', {method:'POST', body:JSON.stringify({email})}); emailForm.hidden = true; otpForm.hidden = false; otpInput.focus(); setStatus(authStatus, 'Mã đã được gửi. Kiểm tra hộp thư và nhập mã 6 chữ số.'); }
  catch (error) { setStatus(authStatus, error.message, true); }
  finally { button.disabled = false; }
});
otpForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = otpForm.querySelector('button[type="submit"]'); button.disabled = true;
  setStatus(authStatus, 'Đang xác minh…');
  try { const data = await api('/api/crm-auth-verify', {method:'POST', body:JSON.stringify({email:emailInput.value.trim(), otp:otpInput.value.trim()})}); saveSession(data); showApp(); await loadLeads(); }
  catch (error) { setStatus(authStatus, error.message, true); }
  finally { button.disabled = false; }
});
document.getElementById('change-email').addEventListener('click', () => { otpForm.hidden = true; emailForm.hidden = false; otpInput.value = ''; setStatus(authStatus, ''); emailInput.focus(); });
document.getElementById('logout-button').addEventListener('click', () => { clearSession(); showAuth(); emailForm.hidden = false; otpForm.hidden = true; emailInput.value = ''; otpInput.value = ''; });
document.getElementById('refresh-button').addEventListener('click', loadLeads);
[sourceFilter, statusFilter, scoreFilter].forEach(element => element.addEventListener('input', renderBoard));
document.getElementById('add-lead-button').addEventListener('click', () => openLeadDialog(null));
document.querySelectorAll('.view-tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.view-tab').forEach(item => item.classList.toggle('is-active', item === tab));
  document.querySelectorAll('.crm-view').forEach(view => { view.hidden = view.id !== tab.dataset.view; });
  if (tab.dataset.view === 'customers-view') renderCustomers();
}));
[customerSearch, customerSourceFilter, customerStatusFilter, customerScoreFilter].forEach(element => element.addEventListener('input', renderCustomers));
document.getElementById('customer-refresh-button').addEventListener('click', loadLeads);
document.getElementById('close-profile').addEventListener('click', () => { customerProfile.hidden = true; selectedCustomerId = null; selectedProfile = null; });
profileForm.addEventListener('submit', saveCustomerProfile);
document.getElementById('mark-done-button').addEventListener('click', markTaskDone);
emailHistoryForm.addEventListener('submit', saveEmailHistory);
nurturePreviewSelect.addEventListener('change', renderNurturePreview);
nurtureQueueButton.addEventListener('click', queueNurture);

function fillStatusOptions() {
  const current = leadForm.elements.status.value;
  leadForm.elements.status.innerHTML = statusKeys.map(key => `<option value="${key}">${statusLabels[key]}</option>`).join('');
  leadForm.elements.status.value = current || 'new';
  statusFilter.innerHTML = '<option value="">Tất cả trạng thái</option>' + statusKeys.map(key => `<option value="${key}">${statusLabels[key]}</option>`).join('');
  profileForm.elements.status.innerHTML = statusKeys.map(key => `<option value="${key}">${statusLabels[key]}</option>`).join('');
  customerStatusFilter.innerHTML = '<option value="">Tất cả trạng thái</option>' + statusKeys.map(key => `<option value="${key}">${statusLabels[key]}</option>`).join('');
}
function populateFilters() {
  const current = sourceFilter.value;
  const sources = [...new Set(leads.map(lead => lead.source).filter(Boolean))].sort();
  sourceFilter.innerHTML = '<option value="">Tất cả nguồn</option>' + sources.map(source => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join('');
  sourceFilter.value = sources.includes(current) ? current : '';
  const customerCurrent = customerSourceFilter.value;
  customerSourceFilter.innerHTML = '<option value="">Tất cả nguồn</option>' + sources.map(source => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join('');
  customerSourceFilter.value = sources.includes(customerCurrent) ? customerCurrent : '';
}
function visibleLeads() {
  const minScore = scoreFilter.value === '' ? null : Number(scoreFilter.value);
  return leads.filter(lead => (!sourceFilter.value || lead.source === sourceFilter.value) && (!statusFilter.value || lead.status === statusFilter.value) && (minScore === null || (Number.isFinite(lead.score) && lead.score >= minScore)));
}
function visibleCustomers() {
  const query = String(customerSearch.value || '').trim().toLowerCase();
  const minScore = customerScoreFilter.value === '' ? null : Number(customerScoreFilter.value);
  return leads.filter(lead => {
    const haystack = [lead.name, lead.email, lead.phone].filter(Boolean).join(' ').toLowerCase();
    return (!query || haystack.includes(query)) && (!customerSourceFilter.value || lead.source === customerSourceFilter.value) && (!customerStatusFilter.value || lead.status === customerStatusFilter.value) && (minScore === null || (Number.isFinite(lead.score) && lead.score >= minScore));
  });
}
function formatDate(value) { return value ? new Intl.DateTimeFormat('vi-VN', {dateStyle:'short', timeStyle:'short'}).format(new Date(value)) : 'Chưa có'; }
function formatDay(value) { return value ? new Intl.DateTimeFormat('vi-VN', {dateStyle:'medium'}).format(new Date(value)) : 'Chưa đặt'; }
function scoreLabel(lead) { return Number.isFinite(Number(lead.score)) ? `<strong class="score-value">${lead.score}</strong><span>Phù hợp ${lead.fit_score ?? '—'} · Ý định ${lead.intent_score ?? '—'} · Tương tác ${lead.engagement_score ?? '—'}</span>` : '<span class="score-missing">Chưa đủ dữ liệu để chấm</span>'; }
function customerRow(lead) {
  const active = selectedCustomerId === lead.id ? ' is-selected' : '';
  return `<button class="customer-row${active}" data-customer-id="${escapeHtml(lead.id)}" type="button"><span class="customer-main"><strong>${escapeHtml(lead.name)}</strong><small>${escapeHtml(lead.email || lead.phone || 'Chưa có liên hệ')}</small></span><span class="customer-source">${escapeHtml(lead.source || 'Không rõ nguồn')}</span><span class="customer-status">${escapeHtml(statusLabels[lead.status] || lead.status)}</span><span class="customer-score">${Number.isFinite(Number(lead.score)) ? `${lead.score}/100` : '—'}</span></button>`;
}
function renderCustomers() {
  const filtered = visibleCustomers();
  customerCount.textContent = `${filtered.length} khách hàng`;
  customerList.innerHTML = filtered.length ? filtered.map(customerRow).join('') : '<p class="empty-state">Chưa có khách hàng phù hợp bộ lọc.</p>';
  customerList.querySelectorAll('[data-customer-id]').forEach(row => row.addEventListener('click', () => openCustomerProfile(row.dataset.customerId)));
}
function profileScore(lead) {
  document.getElementById('profile-score').innerHTML = Number.isFinite(Number(lead.score)) ? `<strong>Score ${lead.score}/100</strong><span>Phù hợp ${lead.fit_score ?? '—'} · Ý định ${lead.intent_score ?? '—'} · Tương tác ${lead.engagement_score ?? '—'}</span><small>Lý do: ${escapeHtml(JSON.stringify(lead.score_reasons || {}) || 'Chưa ghi lý do')}</small>` : '<strong>Score: chưa đủ dữ liệu</strong><small>Chỉ chấm khi có đủ Phù hợp, Ý định và Tương tác.</small>';
}
function renderTimeline(profile) {
  activityHistory.innerHTML = profile.activities?.length ? profile.activities.map(item => `<article class="timeline-item"><strong>${escapeHtml(item.activity_type === 'pipeline_status_changed' ? 'Thay đổi Pipeline' : item.activity_type === 'task_done' ? 'Đã đánh dấu việc đã làm' : 'Ghi chú')}</strong><time>${escapeHtml(formatDate(item.occurred_at))}</time><p>${escapeHtml(item.note || 'Không có ghi chú')}</p></article>`).join('') : '<p class="empty-state">Chưa có hoạt động.</p>';
  emailHistory.innerHTML = profile.emails?.length ? profile.emails.map(item => `<article class="timeline-item"><strong>${escapeHtml(item.subject)}</strong><time>${escapeHtml(formatDate(item.sent_at))}</time>${item.note ? `<p>${escapeHtml(item.note)}</p>` : ''}</article>`).join('') : '<p class="empty-state">Chưa ghi nhận email nào.</p>';
}
const nurtureStatusLabels = { not_started: 'Chưa bắt đầu', outbox_ready: 'Outbox đã tạo · Chưa gửi', blocked: 'Chưa đủ điều kiện', stopped: 'Đã dừng', queued: 'Đang chờ nhà cung cấp', sent: 'Đã xác nhận gửi', failed: 'Gửi lỗi' };
function renderNurturePreview() {
  const sequence = selectedProfile?.nurture?.sequence;
  const index = Number(nurturePreviewSelect.value || 0);
  const message = sequence?.messages?.[index];
  if (!message) { nurturePreview.hidden = true; return; }
  nurturePreview.hidden = false;
  nurtureGoal.textContent = message.goal;
  nurtureCondition.textContent = message.condition;
  nurtureSubject.textContent = message.subject;
  nurtureBody.innerHTML = escapeHtml(message.body).replace(/\n/g, '<br>');
  nurtureCta.textContent = message.cta;
  nurtureStop.textContent = message.stop;
}
function renderNurture(nurture) {
  if (!nurtureStatus) return;
  const status = nurture?.status || 'not_started';
  nurtureStatus.textContent = nurtureStatusLabels[status] || status;
  nurtureStatus.className = `nurture-badge ${['blocked', 'stopped'].includes(status) ? 'is-blocked' : ''}`;
  const sequence = nurture?.sequence;
  nurturePreviewSelect.innerHTML = sequence?.messages?.length ? sequence.messages.map((message, index) => `<option value="${index}">Email ${index + 1}: ${escapeHtml(message.subject)}</option>`).join('') : '';
  const blocked = nurture?.blockedReason;
  if (!sequence) {
    nurtureSummary.textContent = blocked || 'Chưa có score để chọn chuỗi email.';
    nurturePreview.hidden = true;
    nurtureOutbox.innerHTML = '';
    nurtureQueueButton.disabled = true;
    return;
  }
  nurtureSummary.textContent = `${sequence.label}. ${nurture.outbox?.length || 0}/${sequence.messages.length} email trong outbox. ${blocked ? `Chưa thể tạo: ${blocked}` : 'Không có email nào được gửi tự động.'}`;
  nurtureQueueButton.disabled = Boolean(blocked) || ['stopped', 'sent'].includes(status);
  renderNurturePreview();
  nurtureOutbox.innerHTML = nurture.outbox?.length ? nurture.outbox.map(item => `<article class="nurture-item"><div class="nurture-item-head"><strong>Email ${item.step}: ${escapeHtml(item.subject)}</strong><span class="nurture-item-status">${escapeHtml(nurtureStatusLabels[item.status] || item.status)}</span></div><small>Dự kiến: ${escapeHtml(formatDate(item.send_after))}</small></article>`).join('') : '<p class="empty-state">Chưa có email trong outbox. Bấm “Tạo outbox — không gửi” sau khi đã có consent.</p>';
}
async function queueNurture() {
  if (!selectedProfile?.lead) return;
  nurtureQueueButton.disabled = true;
  setStatus(profileStatus, 'Đang tạo outbox…');
  try {
    const data = await api('/api/crm-nurture-queue', { method: 'POST', body: JSON.stringify({ leadId: selectedProfile.lead.id }) });
    await openCustomerProfile(selectedProfile.lead.id);
    setStatus(profileStatus, data.inserted ? `Đã tạo ${data.inserted} email nháp trong outbox. Chưa gửi.` : (data.reason || 'Chưa tạo outbox.'));
  } catch (error) { setStatus(profileStatus, error.message, true); }
  finally { nurtureQueueButton.disabled = false; }
}
function fillProfileForm(lead) {
  profileForm.elements.name.value = lead.name || '';
  profileForm.elements.email.value = lead.email || '';
  profileForm.elements.phone.value = lead.phone || '';
  profileForm.elements.source.value = lead.source || '';
  profileForm.elements.status.value = lead.status || 'new';
  profileForm.elements.nextFollowUpAt.value = lead.next_follow_up_at ? String(lead.next_follow_up_at).slice(0, 10) : '';
  profileForm.elements.need.value = lead.need || '';
  profileForm.elements.nextAction.value = lead.next_action || '';
  profileForm.elements.internalNote.value = '';
  profileForm.elements.emailConsent.checked = Boolean(lead.email_consent);
  document.getElementById('profile-name').textContent = lead.name || 'Khách hàng';
  document.getElementById('profile-contact').textContent = [lead.email, lead.phone].filter(Boolean).join(' · ') || 'Chưa có thông tin liên hệ';
  profileScore(lead);
}
async function openCustomerProfile(id) {
  selectedCustomerId = id;
  renderCustomers();
  customerProfile.hidden = false;
  setStatus(profileStatus, 'Đang tải hồ sơ…');
  try {
    selectedProfile = await api(`/api/crm-lead?id=${encodeURIComponent(id)}`);
    fillProfileForm(selectedProfile.lead);
    renderTimeline(selectedProfile);
    renderNurture(selectedProfile.nurture);
    setStatus(profileStatus, '');
    customerProfile.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { setStatus(profileStatus, error.message, true); }
}
function profileBody(formData) {
  const current = selectedProfile.lead;
  return { name: formData.get('name'), email: formData.get('email') || current.email || '', phone: formData.get('phone') || current.phone || '', source: formData.get('source'), status: formData.get('status'), nextFollowUpAt: formData.get('nextFollowUpAt'), need: formData.get('need'), nextAction: formData.get('nextAction'), emailConsent: formData.get('emailConsent') === 'on', fitScore: current.fit_score, intentScore: current.intent_score, engagementScore: current.engagement_score, scoreReasons: current.score_reasons || {}, landingPageUrl: current.landing_page_url || '', utm: current.utm || {}, student: current.student_context || '' };
}
async function saveCustomerProfile(event) {
  event.preventDefault();
  if (!selectedProfile?.lead) return;
  const button = profileForm.querySelector('button[type="submit"]'); button.disabled = true; setStatus(profileStatus, 'Đang lưu…');
  try {
    const formData = new FormData(profileForm);
    const data = await api(`/api/crm-lead?id=${encodeURIComponent(selectedProfile.lead.id)}`, { method: 'PATCH', body: JSON.stringify(profileBody(formData)) });
    const index = leads.findIndex(item => item.id === data.lead.id); if (index >= 0) leads[index] = data.lead;
    const note = String(formData.get('internalNote') || '').trim();
    if (note) await api('/api/crm-activity', { method: 'POST', body: JSON.stringify({ leadId: data.lead.id, activityType: 'internal_note', note }) });
    await openCustomerProfile(data.lead.id); populateFilters(); renderBoard(); setStatus(appStatus, 'Đã lưu hồ sơ khách hàng.');
  } catch (error) { setStatus(profileStatus, error.message, true); } finally { button.disabled = false; }
}
async function markTaskDone() {
  if (!selectedProfile?.lead) return;
  const button = document.getElementById('mark-done-button'); button.disabled = true;
  try { await api('/api/crm-activity', { method: 'POST', body: JSON.stringify({ leadId: selectedProfile.lead.id, activityType: 'task_done', note: `Đã hoàn thành: ${selectedProfile.lead.next_action || 'việc tiếp theo'}.` }) }); await openCustomerProfile(selectedProfile.lead.id); }
  catch (error) { setStatus(profileStatus, error.message, true); } finally { button.disabled = false; }
}
async function saveEmailHistory(event) {
  event.preventDefault();
  if (!selectedProfile?.lead) return;
  const button = emailHistoryForm.querySelector('button'); button.disabled = true;
  try { const data = new FormData(emailHistoryForm); await api('/api/crm-email-history', { method: 'POST', body: JSON.stringify({ leadId: selectedProfile.lead.id, subject: data.get('subject'), note: data.get('note') }) }); emailHistoryForm.reset(); await openCustomerProfile(selectedProfile.lead.id); }
  catch (error) { setStatus(profileStatus, error.message, true); } finally { button.disabled = false; }
}
function leadCard(lead) {
  return `<article class="lead-card" draggable="true" data-id="${escapeHtml(lead.id)}"><h3>${escapeHtml(lead.name)}</h3><p class="lead-meta">${escapeHtml(lead.source || 'Không rõ nguồn')} · ${escapeHtml(lead.email || lead.phone || 'Chưa có liên hệ')}</p><div class="lead-detail"><span><b>Việc tiếp theo:</b> ${escapeHtml(lead.next_action || 'Chưa đặt')}</span><span><b>Tương tác gần nhất:</b> ${escapeHtml(formatDate(lead.latest_interaction_at))}</span></div><div class="lead-score">${scoreLabel(lead)}</div><div class="lead-actions"><button class="edit-button" data-edit="${escapeHtml(lead.id)}" type="button">Mở chi tiết →</button></div></article>`;
}
function renderBoard() {
  const filtered = visibleLeads();
  pipeline.innerHTML = statusKeys.map(status => { const items = filtered.filter(lead => lead.status === status); return `<section class="pipeline-column" data-status="${status}"><div class="column-head"><span>${statusLabels[status]}</span><span class="count">${items.length}</span></div><div class="lead-list">${items.map(leadCard).join('')}</div></section>`; }).join('');
  pipeline.querySelectorAll('.lead-card').forEach(card => { card.addEventListener('dragstart', event => event.dataTransfer.setData('text/plain', card.dataset.id)); card.addEventListener('click', event => { if (event.target.closest('[data-edit]')) openLeadDialog(leads.find(lead => lead.id === card.dataset.id)); }); });
  pipeline.querySelectorAll('.pipeline-column').forEach(column => { column.addEventListener('dragover', event => { event.preventDefault(); column.classList.add('drop-active'); }); column.addEventListener('dragleave', () => column.classList.remove('drop-active')); column.addEventListener('drop', event => { event.preventDefault(); column.classList.remove('drop-active'); const lead = leads.find(item => item.id === event.dataTransfer.getData('text/plain')); if (lead && lead.status !== column.dataset.status) moveLead(lead, column.dataset.status); }); });
}
async function moveLead(lead, status) { const old = lead.status; lead.status = status; renderBoard(); setStatus(appStatus, 'Đang cập nhật trạng thái…'); try { await api(`/api/crm-lead?id=${encodeURIComponent(lead.id)}`, {method:'PATCH', body:JSON.stringify(toApiLead(lead))}); setStatus(appStatus, 'Đã cập nhật trạng thái.'); } catch (error) { lead.status = old; renderBoard(); setStatus(appStatus, error.message, true); } }
function toApiLead(lead) { return {name:lead.name,email:lead.email || '',phone:lead.phone || '',source:lead.source,landingPageUrl:lead.landing_page_url || '',utm:lead.utm || {},need:lead.need || '',student:lead.student_context || '',status:lead.status,fitScore:lead.fit_score,intentScore:lead.intent_score,engagementScore:lead.engagement_score,scoreReasons:lead.score_reasons || {},nextAction:lead.next_action || '',nextFollowUpAt:lead.next_follow_up_at ? String(lead.next_follow_up_at).slice(0, 10) : ''}; }
async function loadLeads() { setStatus(appStatus, 'Đang tải lead…'); try { const data = await api('/api/crm-leads'); leads = data.leads || []; populateFilters(); renderBoard(); renderCustomers(); setStatus(appStatus, `${leads.length} lead trong hệ thống.`); } catch (error) { setStatus(appStatus, error.message, true); if (/session|Authentication/i.test(error.message)) { clearSession(); showAuth(); } } }
function openLeadDialog(lead) { editingLead = lead; leadForm.reset(); fillStatusOptions(); dialogTitle.textContent = lead ? 'Cập nhật lead' : 'Thêm lead thủ công'; dialogEyebrow.textContent = lead ? 'LEAD DETAIL' : 'LEAD MỚI'; activityField.hidden = !lead; if (lead) { leadForm.elements.name.value = lead.name || ''; leadForm.elements.email.value = lead.email || ''; leadForm.elements.phone.value = lead.phone || ''; leadForm.elements.source.value = lead.source || ''; leadForm.elements.need.value = lead.need || ''; leadForm.elements.nextAction.value = lead.next_action || ''; leadForm.elements.status.value = lead.status || 'new'; leadForm.elements.fitScore.value = lead.fit_score ?? ''; leadForm.elements.intentScore.value = lead.intent_score ?? ''; leadForm.elements.engagementScore.value = lead.engagement_score ?? ''; leadForm.elements.scoreReasons.value = JSON.stringify(lead.score_reasons || {}, null, 2); } else { leadForm.elements.status.value = 'new'; leadForm.elements.source.value = 'manual'; } updateDialogScore(); dialog.showModal(); }
['fitScore','intentScore','engagementScore'].forEach(name => leadForm.elements[name].addEventListener('input', updateDialogScore));
function updateDialogScore() { const values = ['fitScore','intentScore','engagementScore'].map(name => Number(leadForm.elements[name].value)); const complete = values.every(value => Number.isFinite(value) && value >= 0 && value <= 100); dialogScore.textContent = complete ? `Score: ${Math.round(values[0]*.4 + values[1]*.35 + values[2]*.25)} / 100 (Phù hợp 40% · Ý định 35% · Tương tác 25%)` : 'Score: chưa đủ dữ liệu — không tự suy đoán khi còn thiếu thành phần.'; }
leadForm.addEventListener('submit', async event => { event.preventDefault(); const button = document.getElementById('save-lead-button'); button.disabled = true; setStatus(dialogStatus, 'Đang lưu…'); const formData = new FormData(leadForm); const body = {name:formData.get('name'),email:formData.get('email'),phone:formData.get('phone'),source:formData.get('source'),need:formData.get('need'),nextAction:formData.get('nextAction'),status:formData.get('status'),fitScore:formData.get('fitScore'),intentScore:formData.get('intentScore'),engagementScore:formData.get('engagementScore')}; try { body.scoreReasons = JSON.parse(String(formData.get('scoreReasons') || '{}')); } catch { body.scoreReasons = {note:String(formData.get('scoreReasons') || '').slice(0,1000)}; } try { let saved; if (editingLead) { saved = (await api(`/api/crm-lead?id=${encodeURIComponent(editingLead.id)}`, {method:'PATCH', body:JSON.stringify({...body,email:body.email || editingLead.email || '',phone:body.phone || editingLead.phone || '',landingPageUrl:editingLead.landing_page_url || '',utm:editingLead.utm || {},student:editingLead.student_context || ''})})).lead; const note = String(formData.get('activityNote') || '').trim(); if (note) await api('/api/crm-activity', {method:'POST', body:JSON.stringify({leadId:editingLead.id,note,activityType:'manual_note'})}); } else saved = (await api('/api/crm-leads', {method:'POST', body:JSON.stringify(body)})).lead; const index = leads.findIndex(lead => lead.id === saved.id); if (index >= 0) leads[index] = saved; else leads.unshift(saved); populateFilters(); renderBoard(); dialog.close(); setStatus(appStatus, 'Đã lưu lead.'); } catch (error) { setStatus(dialogStatus, error.message, true); } finally { button.disabled = false; } });

fillStatusOptions();
session = readSession();
if (session?.accessToken) { showApp(); loadLeads(); } else showAuth();


