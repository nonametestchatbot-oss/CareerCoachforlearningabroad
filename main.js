const bookingUrl = 'https://linhcoach.nghetrienkhaiai.com/book/coaching';
const form = document.getElementById('lead-form');
const formStatus = document.getElementById('form-status');
const paymentPanel = document.getElementById('payment-panel');
const paymentStatus = document.getElementById('payment-status');
const bookingButton = document.getElementById('booking-after-payment');
const steps = [...document.querySelectorAll('.steps span')];
let paymentTimer;

function showPayment(order) {
  form.hidden = true;
  paymentPanel.hidden = false;
  steps[0].classList.remove('active');
  steps[1].classList.add('active');
  document.getElementById('payment-qr').src = order.qrUrl;
  document.getElementById('payment-bank').textContent = order.bank;
  document.getElementById('payment-account').textContent = order.accountNumber;
  document.getElementById('payment-holder').textContent = order.accountName;
  document.getElementById('payment-code').textContent = order.orderCode;
  paymentStatus.textContent = 'Đang chờ SePay xác nhận thanh toán…';
  bookingButton.hidden = true;
  bookingButton.href = bookingUrl;
  paymentPanel.scrollIntoView({behavior: 'smooth', block: 'center'});
  clearInterval(paymentTimer);
  checkPayment(order.orderCode);
  paymentTimer = setInterval(() => checkPayment(order.orderCode), 5000);
}

async function checkPayment(code) {
  try {
    const response = await fetch('/api/payment-status?code=' + encodeURIComponent(code), {cache: 'no-store'});
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error('Status unavailable');
    if (result.status === 'Paid') {
      clearInterval(paymentTimer);
      paymentStatus.textContent = 'SePay đã xác nhận thanh toán. Đang mở trang chọn lịch…';
      steps[1].classList.remove('active');
      steps[2].classList.add('active');
      bookingButton.hidden = false;
      sessionStorage.removeItem('linhCoachConsultationOrder');
      setTimeout(() => window.location.assign(bookingUrl), 2400);
    } else if (result.status === 'Underpaid') {
      paymentStatus.textContent = 'Số tiền nhận được chưa đủ 1.000.000đ. Vui lòng liên hệ Linh để được hỗ trợ trước khi chuyển thêm.';
    } else {
      paymentStatus.textContent = 'Đang chờ SePay xác nhận thanh toán…';
    }
  } catch {
    paymentStatus.textContent = 'Chưa kiểm tra được trạng thái thanh toán. Trang sẽ tự thử lại; vui lòng không chuyển khoản lần hai.';
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Đang ghi nhận yêu cầu…';
  formStatus.classList.remove('error');
  formStatus.textContent = '';
  const data = new FormData(form);
  const params = new URLSearchParams({
    name: String(data.get('name') || ''),
    contact: String(data.get('phone') || ''),
    student: String(data.get('student') || ''),
    concern: String(data.get('concern') || '')
  });
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
      body: params.toString()
    });
    const order = await response.json();
    if (!response.ok || !order.ok || !order.orderCode || !order.qrUrl) throw new Error('Could not create order');
    sessionStorage.setItem('linhCoachConsultationOrder', JSON.stringify(order));
    showPayment(order);
  } catch {
    formStatus.classList.add('error');
    formStatus.textContent = 'Chưa tạo được yêu cầu thanh toán. Vui lòng thử lại hoặc liên hệ Linh qua email ở cuối trang.';
  } finally {
    button.disabled = false;
    button.textContent = 'Tiếp tục đến mã QR →';
  }
});

try {
  const savedOrder = JSON.parse(sessionStorage.getItem('linhCoachConsultationOrder') || 'null');
  if (savedOrder?.orderCode && savedOrder?.qrUrl) showPayment(savedOrder);
} catch {
  sessionStorage.removeItem('linhCoachConsultationOrder');
}
