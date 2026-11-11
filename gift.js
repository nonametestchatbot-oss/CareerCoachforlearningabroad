const form = document.getElementById('gift-form');
const statusEl = document.getElementById('gift-status');
const success = document.getElementById('gift-success');
const fileLink = 'https://docs.google.com/spreadsheets/d/1BHEPGL6dJ8WY-knFEolGDMdYilW9iEKkdwRvQr9s8O0/edit';
function utmValues() {
  const params = new URLSearchParams(location.search);
  const result = {};
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(k => { if (params.get(k)) result[k] = params.get(k); });
  return result;
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  statusEl.classList.remove('success');
  statusEl.textContent = '';
  if (!form.reportValidity()) return;
  const button = form.querySelector('button[type=submit]');
  const data = new FormData(form);
  if (!data.get('deliveryConsent')) { statusEl.textContent = 'Vui lòng đồng ý để chúng tôi cấp quyền xem và gửi email hướng dẫn nhận quà.'; return; }
  button.disabled = true;
  button.textContent = 'Đang cấp quyền xem tài liệu…';
  try {
    const response = await fetch('/api/consultation', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        action: 'gift-submit', name: data.get('name'), email: data.get('email'), phone: data.get('phone'), role: data.get('role'),
        deliveryConsent: Boolean(data.get('deliveryConsent')), marketingConsent: Boolean(data.get('marketingConsent')),
        website: data.get('website'), source: 'gift-short-programs', landingPageUrl: location.href,
        referrer: document.referrer, utm: utmValues()
      })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Chưa cấp được quyền xem. Vui lòng thử lại sau.');
    form.hidden = true;
    document.getElementById('gift-success-email').textContent = 'Quyền xem được cấp cho: ' + result.email + '. Hãy đăng nhập bằng đúng email này.';
    document.getElementById('gift-file-link').href = result.fileUrl || fileLink;
    success.hidden = false;
    success.scrollIntoView({behavior:'smooth',block:'center'});
  } catch (error) {
    statusEl.textContent = error.message || 'Chưa hoàn tất được việc chia sẻ. Vui lòng thử lại sau.';
  } finally {
    button.disabled = false;
    button.innerHTML = 'Nhận bảng chương trình <span aria-hidden=true>→</span>';
  }
});
