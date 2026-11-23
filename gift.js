const form = document.getElementById('gift-form');
const statusEl = document.getElementById('gift-status');
const success = document.getElementById('gift-success');
const fileLink = 'https://docs.google.com/spreadsheets/d/1BHEPGL6dJ8WY-knFEolGDMdYilW9iEKkdwRvQr9s8O0/edit';
let pendingFingerprint = '';
let pendingRequestId = '';

function utmValues() {
  const params = new URLSearchParams(location.search);
  const result = {};
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(k => { if (params.get(k)) result[k] = params.get(k); });
  return result;
}
function newRequestId() {
  return window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  statusEl.classList.remove('success');
  statusEl.textContent = '';
  if (!form.reportValidity()) return;
  const button = form.querySelector('button[type=submit]');
  const data = new FormData(form);
  if (!data.get('deliveryConsent')) { statusEl.textContent = 'Vui lòng đồng ý để chúng tôi cấp quyền xem và gửi email hướng dẫn nhận quà.'; return; }

  const submission = {
    action: 'gift-submit',
    name: data.get('name'),
    email: data.get('email'),
    phone: data.get('phone'),
    role: data.get('role'),
    studentStage: data.get('studentStage'),
    timeline: data.get('timeline'),
    need: data.get('need'),
    deliveryConsent: Boolean(data.get('deliveryConsent')),
    marketingConsent: Boolean(data.get('marketingConsent')),
    website: data.get('website'),
    source: 'gift-short-programs',
    landingPageUrl: location.href,
    referrer: document.referrer,
    utm: utmValues()
  };
  const fingerprint = JSON.stringify([submission.email, submission.role, submission.studentStage, submission.timeline, submission.need]);
  if (fingerprint !== pendingFingerprint) {
    pendingFingerprint = fingerprint;
    pendingRequestId = newRequestId();
  }
  submission.requestId = pendingRequestId;

  button.disabled = true;
  button.textContent = 'Đang cấp quyền xem tài liệu…';
  try {
    const response = await fetch('/api/consultation', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(submission)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Chưa cấp được quyền xem. Vui lòng thử lại sau.');
    form.hidden = true;
    document.getElementById('gift-success-email').textContent = 'Quyền xem được cấp cho: ' + result.email + '. Email hướng dẫn đã được gửi từ ' + result.sender + '.';
    document.getElementById('gift-file-link').href = result.fileUrl || fileLink;
    success.hidden = false;
    pendingFingerprint = '';
    pendingRequestId = '';
    success.scrollIntoView({behavior:'smooth',block:'center'});
  } catch (error) {
    statusEl.textContent = error.message || 'Chưa hoàn tất được việc chia sẻ. Vui lòng thử lại sau.';
  } finally {
    button.disabled = false;
    button.innerHTML = 'Nhận bảng chương trình <span aria-hidden=true>→</span>';
  }
});
