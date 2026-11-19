let COUNTRY_PROFILES = [];
try {
  ({ COUNTRY_PROFILES = [] } = await import('/country-profiles.js'));
} catch {
  // Keep the personal result usable if reference data is unavailable.
}

const chart = document.getElementById('result-chart');
const app = document.getElementById('result-app');
const errorView = document.getElementById('result-error');
const expiry = document.getElementById('result-expiry');
const profileTypeBadge = document.getElementById('result-profile-type');
const countryPicker = document.getElementById('country-picker');
const countryPickerGrid = document.getElementById('country-picker-grid');
const countryPickerToggle = document.getElementById('country-picker-toggle');
const countryStatus = document.getElementById('country-status');
const countryResults = document.getElementById('country-results');
const nearestCountryResults = document.getElementById('nearest-country-results');
const token = new URLSearchParams(window.location.search).get('token');
const attemptId = new URLSearchParams(window.location.search).get('id');
const previousResult = document.getElementById('previous-result');
const previousChart = document.getElementById('previous-chart');
const downloadButton = document.getElementById('download-result');
let userResults = [];
const selectedCountryIds = new Set();

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'}[character]));
}

function flagEmoji(iso2) {
  return String(iso2 || '').toUpperCase().replace(/[A-Z]/g, character => String.fromCodePoint(127397 + character.charCodeAt(0)));
}

function countryLabel(profile) {
  return `${profile.nameVi} / ${profile.nameEn}`;
}

function formatExpiry(timestamp) {
  return new Intl.DateTimeFormat('vi-VN', {dateStyle: 'long', timeStyle: 'short'}).format(new Date(timestamp * 1000));
}

function renderCard(result) {
  const position = Math.max(0, Math.min(100, Number(result.position) || 50));
  const markerColor = result.level === 'middle' ? 'var(--teal)' : result.level.includes('left') ? 'var(--orange)' : 'var(--gold)';
  return `<article class="result-card">
    <div class="result-card-header"><div><h3>${escapeHtml(result.left)} <span aria-hidden="true">—</span> ${escapeHtml(result.right)}</h3><p class="result-theme">${escapeHtml(result.theme)}</p></div></div>
    <p class="result-phrase">${escapeHtml(result.phrase)}</p>
    <div class="axis-labels"><span>${escapeHtml(result.left)}</span><span>${escapeHtml(result.right)}</span></div>
    <div class="axis-track" role="img" aria-label="Vị trí của bạn giữa ${escapeHtml(result.left)} và ${escapeHtml(result.right)}"><span class="axis-marker" style="left:${position}%;background:${markerColor}"></span></div>
    <div class="result-detail-grid"><div class="result-detail"><h4>${escapeHtml(result.left)}</h4><p>${escapeHtml(result.leftDetail || '')}</p></div><div class="result-detail"><h4>${escapeHtml(result.right)}</h4><p>${escapeHtml(result.rightDetail || '')}</p></div></div>
    <p class="result-context"><strong>Gợi ý:</strong> ${escapeHtml(result.context)}</p>
  </article>`;
}

function distanceToCountry(profile) {
  const squared = userResults.reduce((sum, result) => sum + Math.pow(Number(result.position) - Number(profile.scores[result.key]), 2), 0);
  return userResults.length ? Math.sqrt(squared / userResults.length) : Infinity;
}

function countryScoreRows(profile) {
  return userResults.map(result => {
    const userScore = Math.max(0, Math.min(100, Number(result.position) || 0));
    const countryScore = Math.max(0, Math.min(100, Number(profile.scores[result.key]) || 0));
    return `<div class="country-profile-row">
      
      <span class="country-axis-end">${escapeHtml(result.left)}</span>
      <span class="country-score-track" role="img" aria-label="Đối chiếu trục ${escapeHtml(result.key)}: hồ sơ ${escapeHtml(countryLabel(profile))} và kết quả của bạn"><span class="country-score-fill" style="width:${countryScore}%"></span><i class="country-user-marker" style="left:${userScore}%"></i></span>
      <span class="country-axis-end">${escapeHtml(result.right)}</span>
    </div>`;
  }).join('');
}

function renderCountryPicker() {
  if (!countryPickerGrid) return;
  const atLimit = selectedCountryIds.size >= 3;
  countryPickerGrid.innerHTML = COUNTRY_PROFILES.map(profile => {
    const selected = selectedCountryIds.has(profile.id);
    const disabled = atLimit && !selected;
    return `<button class="country-choice" type="button" data-country-id="${escapeHtml(profile.id)}" aria-pressed="${selected}" ${disabled ? 'disabled' : ''}>
      <span class="country-choice-flag" aria-hidden="true">${flagEmoji(profile.iso2)}</span><span class="country-choice-name">${escapeHtml(profile.nameVi)}<br><span lang="en">${escapeHtml(profile.nameEn)}</span></span>
    </button>`;
  }).join('');
  countryPickerGrid.querySelectorAll('[data-country-id]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.countryId;
    if (selectedCountryIds.has(id)) selectedCountryIds.delete(id);
    else if (selectedCountryIds.size < 3) selectedCountryIds.add(id);
    renderCountryPicker();
    renderCountryComparison();
  }));
}

function renderCountryComparison() {
  if (!countryResults || !nearestCountryResults || !COUNTRY_PROFILES.length || !userResults.length) return;
  const selected = COUNTRY_PROFILES.filter(profile => selectedCountryIds.has(profile.id));
  const nearest = COUNTRY_PROFILES.map(profile => ({profile, distance: distanceToCountry(profile)}))
    .sort((a, b) => a.distance - b.distance).slice(0, 3);
  const selectedCards = selected.map(profile => `<article class="country-compare-card"><h3>${escapeHtml(countryLabel(profile))}</h3><div class="country-profile-chart">${countryScoreRows(profile)}</div><div class="country-chart-legend"><span><i class="legend-country"></i> Hồ sơ quốc gia</span><span><i class="legend-user"></i> Kết quả của bạn</span></div></article>`).join('');
  const nearestCards = nearest.map((item, index) => `<article class="nearest-country-card"><header><span class="nearest-country-rank">#${index + 1}</span><span class="nearest-country-name"><strong>${escapeHtml(countryLabel(item.profile))}</strong></span></header><div class="country-profile-chart country-mini-chart">${countryScoreRows(item.profile)}</div></article>`).join('');
  const comparisons = selectedCards || '<div class="country-compare-card"><p>Chọn tối đa ba quốc gia ở phía trên để xem so sánh.</p></div>';
  nearestCountryResults.innerHTML = nearestCards;
  countryResults.innerHTML = `<div class="country-compare-grid">${comparisons}</div>`;
}

function renderCountryOptions() {
  if (!countryPickerToggle || !countryPicker || !countryStatus) return;
  if (!COUNTRY_PROFILES.length) {
    countryPickerToggle.disabled = true;
    countryStatus.textContent = 'Bảng tham chiếu quốc gia hiện chưa khả dụng. Bạn vẫn có thể xem và tải kết quả 5 chiều.';
    return;
  }
  for (const iso2 of ['US', 'GB', 'AU']) {
    const profile = COUNTRY_PROFILES.find(item => item.iso2 === iso2);
    if (profile) selectedCountryIds.add(profile.id);
  }
  countryStatus.textContent = 'Chọn tối đa 3 nước. Biểu đồ là mốc tham chiếu xu hướng văn hóa, không mô tả mọi cá nhân trong một quốc gia.';
  renderCountryPicker();
  renderCountryComparison();
}

async function loadResult() {
  if (!token && !attemptId) throw new Error('Missing result identifier');
  const auth = sessionStorage.getItem('linhCoachAssessmentAuth') || '';
  const query = attemptId ? `id=${encodeURIComponent(attemptId)}` : `token=${encodeURIComponent(token)}`;
  const response = await fetch(`/api/assessment-result?${query}`, {cache: 'no-store', headers: auth ? {Authorization: `Bearer ${auth}`} : {}});
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Result unavailable');
  userResults = data.results;
  if (Array.isArray(data.countryProfiles) && data.countryProfiles.length) COUNTRY_PROFILES = data.countryProfiles;
  expiry.textContent = `Đường dẫn kết quả có hiệu lực đến ${formatExpiry(data.expiresAt)}.`;
  if (data.profileType && profileTypeBadge) { profileTypeBadge.hidden = false; profileTypeBadge.textContent = data.profileType === 'student' ? 'Nhóm: học sinh / sinh viên' : 'Nhóm: người đi làm'; }
  chart.innerHTML = userResults.map(renderCard).join('');
  renderCountryOptions();
  if (data.previousResults?.length && previousResult && previousChart) {
    previousResult.hidden = false;
    previousChart.innerHTML = data.previousResults.map(renderCard).join('');
  }
}

countryPickerToggle?.addEventListener('click', () => {
  countryPicker.hidden = !countryPicker.hidden;
  countryPickerToggle.setAttribute('aria-expanded', String(!countryPicker.hidden));
});
downloadButton?.addEventListener('click', () => window.print());
loadResult().catch(() => {
  app.hidden = true;
  errorView.hidden = false;
  const hasIdentifier = Boolean(token || attemptId);
  const heading = errorView.querySelector('h1');
  const message = document.getElementById('result-error-message');
  heading.textContent = hasIdentifier ? 'Chưa mở được kết quả.' : 'Mở đường dẫn kết quả riêng của bạn.';
  message.textContent = hasIdentifier
    ? 'Mã đăng nhập có thể sai hoặc quyền đã hết hạn. Hãy mở bài test, nhập đúng email và mã trong email cấp quyền rồi thử lại. Nếu vẫn gặp lỗi, liên hệ Linh.'
    : 'Trang này cần đường dẫn kết quả riêng được tạo sau khi hoàn thành bài test. Hãy mở bài test hoặc liên hệ Linh nếu bạn chưa nhận được đường dẫn.';
});
