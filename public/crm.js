const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const emailForm = document.getElementById('email-form');
const magicLinkView = document.getElementById('magic-link-view');
const emailInput = document.getElementById('admin-email');
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
const statusLabels = {new:'Mới', contacted:'Đã liên hệ', qualified:'Đủ điều kiện', booked:'Đặt lịch', won:'Đã mua', not_fit:'Chưa phù hợp'};
const statusKeys = Object.keys(statusLabels);
const sessionKey = 'linhCoachCrmSession';
let session = null;
let leads = [];
let editingLead = null;

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
    '/api/crm-activity': '/api/crm?action=activity'
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
function showAuth() { authView.hidden = false; appView.hidden = true; emailForm.hidden = false; magicLinkView.hidden = true; }
function showApp() { authView.hidden = true; appView.hidden = false; document.getElementById('signed-in').textContent = session?.user?.email || ''; }

emailForm.addEventListener('submit', async event => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const button = emailForm.querySelector('button'); button.disabled = true;
  setStatus(authStatus, 'Đang gửi link đăng nhập…');
  try {
    await api('/api/crm-auth-request', {method:'POST', body:JSON.stringify({email})});
    emailForm.hidden = true;
    magicLinkView.hidden = false;
    setStatus(authStatus, 'Đã gửi link đăng nhập. Mở email mới nhất và bấm nút đăng nhập.');
  } catch (error) { setStatus(authStatus, error.message, true); }
  finally { button.disabled = false; }
});
document.getElementById('change-email').addEventListener('click', () => { magicLinkView.hidden = true; emailForm.hidden = false; setStatus(authStatus, ''); emailInput.focus(); });
document.getElementById('logout-button').addEventListener('click', () => { clearSession(); showAuth(); emailInput.value = ''; });
document.getElementById('refresh-button').addEventListener('click', loadLeads);
[sourceFilter, statusFilter, scoreFilter].forEach(element => element.addEventListener('input', renderBoard));
document.getElementById('add-lead-button').addEventListener('click', () => openLeadDialog(null));

function fillStatusOptions() {
  const current = leadForm.elements.status.value;
  leadForm.elements.status.innerHTML = statusKeys.map(key => `<option value="${key}">${statusLabels[key]}</option>`).join('');
  leadForm.elements.status.value = current || 'new';
  statusFilter.innerHTML = '<option value="">Tất cả trạng thái</option>' + statusKeys.map(key => `<option value="${key}">${statusLabels[key]}</option>`).join('');
}
function populateFilters() {
  const current = sourceFilter.value;
  const sources = [...new Set(leads.map(lead => lead.source).filter(Boolean))].sort();
  sourceFilter.innerHTML = '<option value="">Tất cả nguồn</option>' + sources.map(source => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join('');
  sourceFilter.value = sources.includes(current) ? current : '';
}
function visibleLeads() {
  const minScore = scoreFilter.value === '' ? null : Number(scoreFilter.value);
  return leads.filter(lead => (!sourceFilter.value || lead.source === sourceFilter.value) && (!statusFilter.value || lead.status === statusFilter.value) && (minScore === null || (Number.isFinite(lead.score) && lead.score >= minScore)));
}
function formatDate(value) { return value ? new Intl.DateTimeFormat('vi-VN', {dateStyle:'short', timeStyle:'short'}).format(new Date(value)) : 'Chưa có'; }
function scoreLabel(lead) { return Number.isFinite(Number(lead.score)) ? `<strong class="score-value">${lead.score}</strong><span>Phù hợp ${lead.fit_score ?? '—'} · Ý định ${lead.intent_score ?? '—'} · Tương tác ${lead.engagement_score ?? '—'}</span>` : '<span class="score-missing">Chưa đủ dữ liệu để chấm</span>'; }
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
function toApiLead(lead) { return {name:lead.name,email:lead.email || '',phone:lead.phone || '',source:lead.source,landingPageUrl:lead.landing_page_url || '',utm:lead.utm || {},need:lead.need || '',student:lead.student_context || '',status:lead.status,fitScore:lead.fit_score,intentScore:lead.intent_score,engagementScore:lead.engagement_score,scoreReasons:lead.score_reasons || {},nextAction:lead.next_action || ''}; }
async function loadLeads() { setStatus(appStatus, 'Đang tải lead…'); try { const data = await api('/api/crm-leads'); leads = data.leads || []; populateFilters(); renderBoard(); setStatus(appStatus, `${leads.length} lead trong hệ thống.`); } catch (error) { setStatus(appStatus, error.message, true); if (/session|Authentication/i.test(error.message)) { clearSession(); showAuth(); } } }
function openLeadDialog(lead) { editingLead = lead; leadForm.reset(); fillStatusOptions(); dialogTitle.textContent = lead ? 'Cập nhật lead' : 'Thêm lead thủ công'; dialogEyebrow.textContent = lead ? 'LEAD DETAIL' : 'LEAD MỚI'; activityField.hidden = !lead; if (lead) { leadForm.elements.name.value = lead.name || ''; leadForm.elements.email.value = lead.email || ''; leadForm.elements.phone.value = lead.phone || ''; leadForm.elements.source.value = lead.source || ''; leadForm.elements.need.value = lead.need || ''; leadForm.elements.nextAction.value = lead.next_action || ''; leadForm.elements.status.value = lead.status || 'new'; leadForm.elements.fitScore.value = lead.fit_score ?? ''; leadForm.elements.intentScore.value = lead.intent_score ?? ''; leadForm.elements.engagementScore.value = lead.engagement_score ?? ''; leadForm.elements.scoreReasons.value = JSON.stringify(lead.score_reasons || {}, null, 2); } else { leadForm.elements.status.value = 'new'; leadForm.elements.source.value = 'manual'; } updateDialogScore(); dialog.showModal(); }
['fitScore','intentScore','engagementScore'].forEach(name => leadForm.elements[name].addEventListener('input', updateDialogScore));
function updateDialogScore() { const values = ['fitScore','intentScore','engagementScore'].map(name => Number(leadForm.elements[name].value)); const complete = values.every(value => Number.isFinite(value) && value >= 0 && value <= 100); dialogScore.textContent = complete ? `Score: ${Math.round(values[0]*.4 + values[1]*.35 + values[2]*.25)} / 100 (Phù hợp 40% · Ý định 35% · Tương tác 25%)` : 'Score: chưa đủ dữ liệu — không tự suy đoán khi còn thiếu thành phần.'; }
leadForm.addEventListener('submit', async event => { event.preventDefault(); const button = document.getElementById('save-lead-button'); button.disabled = true; setStatus(dialogStatus, 'Đang lưu…'); const formData = new FormData(leadForm); const body = {name:formData.get('name'),email:formData.get('email'),phone:formData.get('phone'),source:formData.get('source'),need:formData.get('need'),nextAction:formData.get('nextAction'),status:formData.get('status'),fitScore:formData.get('fitScore'),intentScore:formData.get('intentScore'),engagementScore:formData.get('engagementScore')}; try { body.scoreReasons = JSON.parse(String(formData.get('scoreReasons') || '{}')); } catch { body.scoreReasons = {note:String(formData.get('scoreReasons') || '').slice(0,1000)}; } try { let saved; if (editingLead) { saved = (await api(`/api/crm-lead?id=${encodeURIComponent(editingLead.id)}`, {method:'PATCH', body:JSON.stringify({...body,email:body.email || editingLead.email || '',phone:body.phone || editingLead.phone || '',landingPageUrl:editingLead.landing_page_url || '',utm:editingLead.utm || {},student:editingLead.student_context || ''})})).lead; const note = String(formData.get('activityNote') || '').trim(); if (note) await api('/api/crm-activity', {method:'POST', body:JSON.stringify({leadId:editingLead.id,note,activityType:'manual_note'})}); } else saved = (await api('/api/crm-leads', {method:'POST', body:JSON.stringify(body)})).lead; const index = leads.findIndex(lead => lead.id === saved.id); if (index >= 0) leads[index] = saved; else leads.unshift(saved); populateFilters(); renderBoard(); dialog.close(); setStatus(appStatus, 'Đã lưu lead.'); } catch (error) { setStatus(dialogStatus, error.message, true); } finally { button.disabled = false; } });

function hydrateMagicLinkSession() {
  const rawHash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(rawHash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  const expiresIn = Number(params.get('expires_in') || 3600);
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return { accessToken, refreshToken, expiresIn, user: { email: 'Quản trị viên' } };
}

async function bootstrap() {
  fillStatusOptions();
  const callbackSession = hydrateMagicLinkSession();
  session = callbackSession || readSession();
  if (session?.accessToken) {
    saveSession(session);
    showApp();
    await loadLeads();
  } else showAuth();
}

bootstrap();




