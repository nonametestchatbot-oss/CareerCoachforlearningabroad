import { COUNTRY_PROFILES } from '/country-profiles.js';

const chart = document.getElementById('result-chart');
const app = document.getElementById('result-app');
const errorView = document.getElementById('result-error');
const expiry = document.getElementById('result-expiry');
const countrySelect = document.getElementById('country-select');
const countryStatus = document.getElementById('country-status');
const countryResults = document.getElementById('country-results');
const token = new URLSearchParams(window.location.search).get('token');
const attemptId = new URLSearchParams(window.location.search).get('id');
const previousResult = document.getElementById('previous-result');
const previousChart = document.getElementById('previous-chart');
const downloadButton = document.getElementById('download-result');
let userResults = [];

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'}[character]));
}

function flagEmoji(iso2) {
  return String(iso2 || '').toUpperCase().replace(/[A-Z]/g, character => String.fromCodePoint(127397 + character.charCodeAt(0)));
}

function countryLabel(profile) {
  return `${flagEmoji(profile.iso2)} ${profile.nameVi} / ${profile.nameEn}`;
}

function formatExpiry(timestamp) {
  return new Intl.DateTimeFormat('vi-VN', {dateStyle: 'long', timeStyle: 'short'}).format(new Date(timestamp * 1000));
}

function renderCard(result) {
  const position = Math.max(0, Math.min(100, Number(result.position) || 50));
  const markerColor = result.level === 'middle' ? 'var(--teal)' : result.level.includes('left') ? 'var(--orange)' : 'var(--gold)';
  return `<article class="result-card">
    <div class="result-card-header"><div><h3>${escapeHtml(result.left)} <span aria-hidden="true">—</span> ${escapeHtml(result.right)}</h3><p class="result-theme">${escapeHtml(result.theme)}</p></div><strong class="result-percentile">${result.position}%</strong></div>
    <p class="result-phrase">${escapeHtml(result.phrase)}</p>
    <div class="axis-labels"><span>${escapeHtml(result.left)}</span><span>${escapeHtml(result.right)}</span></div>
    <div class="axis-track" aria-label="Vị trí phần trăm giữa hai xu hướng"><span class="axis-marker" style="left:${position}%;background:${markerColor}"></span></div>
    <div class="result-z">Tổng z: <strong>${escapeHtml(result.rawZ)}</strong> · vị trí theo bảng quy đổi: <strong>${result.position}%</strong></div>
    <div class="result-detail-grid"><div class="result-detail"><h4>${escapeHtml(result.left)}</h4><p>${escapeHtml(result.leftDetail || '')}</p></div><div class="result-detail"><h4>${escapeHtml(result.right)}</h4><p>${escapeHtml(result.rightDetail || '')}</p></div></div>
    <p class="result-context"><strong>Gợi ý:</strong> ${escapeHtml(result.context)}</p>
  </article>`;
}

function renderCountryOptions() {
  if (!countrySelect || !countryStatus) return;
  if (!COUNTRY_PROFILES.length) {
    countrySelect.disabled = true;
    countryStatus.textContent = 'Chưa tải được bảng hồ sơ quốc gia. Vui lòng tải lại trang hoặc liên hệ hỗ trợ.';
    return;
  }
  countrySelect.innerHTML = '<option value="">Chọn một nước để so sánh</option>' + COUNTRY_PROFILES.map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(countryLabel(profile))}</option>`).join('');
  countrySelect.disabled = false;
  countryStatus.textContent = 'Điểm quốc gia được chuẩn hoá từ vị trí điểm trong các biểu đồ bạn cung cấp; đây là mốc tham chiếu ở cấp độ xã hội, không phải nhãn dán cho từng cá nhân.';
}

function distanceToCountry(profile) {
  return Math.sqrt(userResults.reduce((sum, result) => sum + Math.pow(Number(result.position) - Number(profile.scores[result.key]), 2), 0));
}

function renderCountryComparison() {
  if (!countryResults || !countrySelect || !COUNTRY_PROFILES.length) return;
  const selected = COUNTRY_PROFILES.find(profile => profile.id === countrySelect.value);
  if (!selected) {
    countryResults.innerHTML = '';
    return;
  }
  const selectedLabel = countryLabel(selected);
  const rows = userResults.map(result => `<div class="country-row"><span>${escapeHtml(result.key)} · ${escapeHtml(result.left)} — ${escapeHtml(result.right)}</span><strong>${result.position}%</strong><span>${selected.scores[result.key]}%</span></div>`).join('');
  const nearest = COUNTRY_PROFILES.filter(profile => profile.id !== selected.id).map(profile => ({profile, distance: distanceToCountry(profile)})).sort((a, b) => a.distance - b.distance).slice(0, 3);
  countryResults.innerHTML = `<div class="country-compare-card"><h3>${escapeHtml(selectedLabel)} và kết quả của bạn</h3><p>So sánh theo khoảng cách Euclid trên 5 trục; khoảng cách nhỏ hơn nghĩa là hồ sơ tham chiếu gần hơn.</p><div class="country-table"><div class="country-row country-row-head"><span>Trục</span><strong>Bạn</strong><strong>${escapeHtml(selectedLabel)}</strong></div>${rows}</div></div><div class="country-compare-card"><h3>3 nước có hồ sơ gần nhất</h3><ol class="nearest-list">${nearest.map(item => `<li><span>${escapeHtml(countryLabel(item.profile))}</span><strong>Khoảng cách ${item.distance.toFixed(1)}</strong></li>`).join('')}</ol></div>`;
}

async function loadResult() {
  if (!token && !attemptId) throw new Error('Missing result identifier');
  const auth = sessionStorage.getItem('linhCoachAssessmentAuth') || '';
  const query = attemptId ? `id=${encodeURIComponent(attemptId)}` : `token=${encodeURIComponent(token)}`;
  const response = await fetch(`/api/assessment-result?${query}`, {cache: 'no-store', headers: auth ? {Authorization: `Bearer ${auth}`} : {}});
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Result unavailable');
  userResults = data.results;
  expiry.textContent = `Đường dẫn kết quả có hiệu lực đến ${formatExpiry(data.expiresAt)}.`;
  chart.innerHTML = userResults.map(renderCard).join('');
  renderCountryOptions();
  if (data.previousResults?.length && previousResult && previousChart) {
    previousResult.hidden = false;
    previousChart.innerHTML = data.previousResults.map(renderCard).join('');
  }
}

countrySelect?.addEventListener('change', renderCountryComparison);
downloadButton?.addEventListener('click', () => window.print());
loadResult().catch(() => {
  app.hidden = true;
  errorView.hidden = false;
});
