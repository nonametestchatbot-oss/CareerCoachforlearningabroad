const form = document.getElementById('lead-form');
const status = document.getElementById('form-status');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Đang ghi nhận yêu cầu…';
  status.classList.remove('error');
  status.textContent = '';
  const payload = new URLSearchParams(new FormData(form));
  try {
    const response = await fetch('/api/consultation', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
      body: payload.toString()
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Could not save request');
    form.reset();
    status.textContent = 'Đã nhận yêu cầu. Linh Coach sẽ liên hệ để xác nhận lịch tư vấn.';
  } catch {
    status.classList.add('error');
    status.textContent = 'Chưa ghi nhận được yêu cầu. Vui lòng thử lại hoặc liên hệ qua email ở cuối trang.';
  } finally {
    button.disabled = false;
    button.textContent = 'Gửi yêu cầu tư vấn ↗';
  }
});
