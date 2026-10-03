const chart = document.getElementById('result-chart');
const app = document.getElementById('result-app');
const errorView = document.getElementById('result-error');
const expiry = document.getElementById('result-expiry');
const token = new URLSearchParams(window.location.search).get('token');

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'}[character]));
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
    <div class="axis-track" aria-label="Vị trí tương đối giữa hai xu hướng"><span class="axis-marker" style="left:${position}%;background:${markerColor}"></span></div>
    <div class="result-detail-grid"><div class="result-detail"><h4>${escapeHtml(result.left)}</h4><p>${escapeHtml(result.leftDetail || '')}</p></div><div class="result-detail"><h4>${escapeHtml(result.right)}</h4><p>${escapeHtml(result.rightDetail || '')}</p></div></div>
    <p class="result-context"><strong>Gợi ý cho con:</strong> ${escapeHtml(result.context)}</p>
  </article>`;
}

async function loadResult() {
  if (!token) throw new Error('Missing result token');
  const response = await fetch(`/api/assessment-result?token=${encodeURIComponent(token)}`, {cache: 'no-store'});
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Result unavailable');
  expiry.textContent = `Đường dẫn kết quả có hiệu lực đến ${formatExpiry(data.expiresAt)}.`;
  chart.innerHTML = data.results.map(renderCard).join('');
}

loadResult().catch(() => {
  app.hidden = true;
  errorView.hidden = false;
});
