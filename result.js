let COUNTRY_PROFILES = [];
try {
  ({ COUNTRY_PROFILES = [] } = await import('/country-profiles.js'));
} catch {
  // Keep the personal result usable if optional country reference data is unavailable.
}

const chart = document.getElementById('result-chart');
const app = document.getElementById('result-app');
const errorView = document.getElementById('result-error');
const expiry = document.getElementById('result-expiry');
const profileTypeBadge = document.getElementById('result-profile-type');
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
    <div class="result-card-header"><div><h3>${escapeHtml(result.left)} <span aria-hidden="true">—</span> ${escapeHtml(result.right)}</h3><p class="result-theme">${escapeHtml(result.theme)}</p></div><strong class="result-score">${result.position}/100</strong></div>
    <p class="result-phrase">${escapeHtml(result.phrase)}</p>
    <div class="axis-labels"><span>${escapeHtml(result.left)}</span><span>${escapeHtml(result.right)}</span></div>
    <div class="axis-track" aria-label="Vị trí trên thang xu hướng 0–100"><span class="axis-marker" style="left:${position}%;background:${markerColor}"></span></div>
    <div class="result-score-note">Điểm xu hướng: <strong>${result.position}/100</strong> · quy đổi từ câu trả lời, không phải percentile hay điểm chuẩn quốc gia.</div>
    <div class="result-detail-grid"><div class="result-detail"><h4>${escapeHtml(result.left)}</h4><p>${escapeHtml(result.leftDetail || '')}</p></div><div class="result-detail"><h4>${escapeHtml(result.right)}</h4><p>${escapeHtml(result.rightDetail || '')}</p></div></div>
    <p class="result-context"><strong>Gợi ý:</strong> ${escapeHtml(result.context)}</p>
  </article>`;
}

function renderCountryOptions() {
  if (!countrySelect || !countryStatus) return;
  if (!COUNTRY_PROFILES.length) {
    countrySelect.disabled = true;
    countryStatus.textContent = 'Bảng tham chiếu quốc gia hiện chưa khả dụng. Bạn vẫn có thể xem và tải kết quả 5 chiều.';
    return;
  }
  countrySelect.innerHTML = '<option value="">Chọn một nước để so sánh</option>' + COUNTRY_PROFILES.map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(countryLabel(profile))}</option>`).join('');
  countrySelect.disabled = false;
  countryStatus.textContent = 'Hồ sơ quốc gia là mốc minh họa do biên tập, không phải số liệu khảo sát hay điểm chuẩn. Chúng không mô tả mọi cá nhân trong một nước.';
  renderCountryComparison();
}

function distanceToCountry(profile) {
  const squared = userResults.reduce((sum, result) => sum + Math.pow(Number(result.position) - Number(profile.scores[result.key]), 2), 0);
  return userResults.length ? Math.sqrt(squared / userResults.length) : Infinity;
}

function countryScoreRows(profile) {
  return userResults.map(result => {
    const userScore = Math.max(0, Math.min(100, Number(result.position) || 0));
    const countryScore = Math.max(0, Math.min(100, Number(profile.scores[result.key]) || 0));
    return `<div class="country-profile-row"><span class="country-profile-axis"><strong>${escapeHtml(result.key)}</strong> · ${escapeHtml(result.left)} — ${escapeHtml(result.right)}</span><span class="country-score-track" role="img" aria-label="Quốc gia ${countryScore}, bạn ${userScore} trên 100"><span class="country-score-fill" style="width:${countryScore}%"></span><i class="country-user-marker" style="left:${userScore}%"></i></span><strong class="country-score-values">${countryScore} / ${userScore}</strong></div>`;
  }).join('');
}

function renderCountryComparison() {
  if (!countryResults || !countrySelect || !COUNTRY_PROFILES.length || !userResults.length) return;
  const selected = COUNTRY_PROFILES.find(profile => profile.id === countrySelect.value);
  const nearest = COUNTRY_PROFILES.map(profile => ({profile, distance: distanceToCountry(profile)}))
    .sort((a, b) => a.distance - b.distance).slice(0, 3);
  const selectedCard = selected
    ? `<div class="country-compare-card"><h3>${escapeHtml(countryLabel(selected))} và hồ sơ của bạn</h3><p>Thanh màu là mốc tham khảo của quốc gia; vạch đậm là vị trí của bạn. Khoảng cách được tính trên 5 trục.</p><div class="country-profile-chart">${countryScoreRows(selected)}</div><div class="country-chart-legend"><span><i class="legend-country"></i> Mốc quốc gia</span><span><i class="legend-user"></i> Kết quả của bạn</span></div></div>`
    : `<div class="country-compare-card"><h3>Chọn một nước để đối chiếu</h3><p>Chọn nước ở phía trên để xem 5 trục cạnh hồ sơ tham khảo. Ba nước gần nhất với điểm của bạn vẫn được hiển thị bên dưới.</p></div>`;
  const nearestCards = nearest.map((item, index) => `<article class="nearest-country-card"><header><span class="nearest-country-rank">#${index + 1}</span><span class="nearest-country-name"><strong>${escapeHtml(countryLabel(item.profile))}</strong><small>Độ lệch trung bình: ${item.distance.toFixed(1)} điểm</small></span></header><div class="country-profile-chart country-mini-chart">${countryScoreRows(item.profile)}</div></article>`).join('');
  countryResults.innerHTML = `${selectedCard}<div class="nearest-country-section"><h3>3 nước có hồ sơ gần nhất với bạn</h3><p>Mỗi thẻ cho thấy 5 trục; thanh màu là hồ sơ tham khảo, vạch đậm là kết quả của bạn.</p><div class="nearest-country-grid">${nearestCards}</div></div>`;
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
  if (data.profileType && profileTypeBadge) { profileTypeBadge.hidden = false; profileTypeBadge.textContent = data.profileType === 'student' ? 'Nhóm: học sinh / sinh viên' : 'Nhóm: người đi làm'; }
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
  const hasIdentifier = Boolean(token || attemptId);
  const heading = errorView.querySelector('h1');
  const message = document.getElementById('result-error-message');
  heading.textContent = hasIdentifier ? 'Chưa mở được kết quả.' : 'Mở đường dẫn kết quả riêng của bạn.';
  message.textContent = hasIdentifier
    ? 'Mã đăng nhập có thể sai hoặc quyền đã hết hạn. Hãy mở bài test, nhập đúng email và mã trong email cấp quyền rồi thử lại. Nếu vẫn gặp lỗi, liên hệ Linh.'
    : 'Trang này cần đường dẫn kết quả riêng được tạo sau khi hoàn thành bài test. Hãy mở bài test hoặc liên hệ Linh nếu bạn chưa nhận được đường dẫn.';
});
