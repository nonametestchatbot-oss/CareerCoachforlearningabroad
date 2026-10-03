import {QUESTIONS} from '/questions.js';

const intro = document.getElementById('intro-view');
const quiz = document.getElementById('quiz-view');
const startButton = document.getElementById('start-button');
const accessStatus = document.getElementById('access-status');
const form = document.getElementById('quiz-form');
const questionList = document.getElementById('question-list');
const nextButton = document.getElementById('next-button');
const quizStatus = document.getElementById('quiz-status');
const progressLabel = document.getElementById('progress-label');
const progressPercent = document.getElementById('progress-percent');
const progressBar = document.getElementById('progress-bar');
const orderCode = (new URLSearchParams(window.location.search).get('code') || '').trim().toUpperCase();
const answers = {};
let accessToken = '';
let currentIndex = 0;

const choices = [
  ['1', 'Hoàn toàn không giống tôi'], ['2', 'Khá không giống tôi'], ['3', 'Hơi không giống tôi'],
  ['4', 'Ở giữa / tùy hoàn cảnh'], ['5', 'Hơi giống tôi'], ['6', 'Khá giống tôi'], ['7', 'Rất giống tôi']
];

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle('error', isError);
}

function renderQuestion() {
  const question = QUESTIONS[currentIndex];
  const selected = String(answers[question.id] || '');
  const percentage = Math.round((currentIndex / QUESTIONS.length) * 100);
  progressLabel.textContent = `Câu ${currentIndex + 1} / ${QUESTIONS.length}`;
  progressPercent.textContent = `${percentage}%`;
  progressBar.style.width = `${Math.max(4, percentage)}%`;
  nextButton.innerHTML = currentIndex === QUESTIONS.length - 1
    ? 'Xem bản đồ kết quả <span aria-hidden="true">→</span>'
    : 'Câu tiếp theo <span aria-hidden="true">→</span>';
  questionList.innerHTML = `<fieldset class="question-card">
    <legend>${currentIndex + 1}. ${question.text}</legend>
    <div><div class="scale-note"><span>Không giống tôi</span><span>Giống tôi</span></div>
      <div class="scale-options" role="radiogroup" aria-label="Mức độ phù hợp">
        ${choices.map(([value, label]) => `<label title="${label}"><input type="radio" name="answer" value="${value}" ${selected === value ? 'checked' : ''}><span>${value}</span></label>`).join('')}
      </div>
    </div></fieldset>`;
  questionList.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
    answers[question.id] = Number(input.value);
    setStatus(quizStatus, '');
  }));
}

async function loadAccess() {
  if (!/^LC\d{8}$/.test(orderCode)) {
    startButton.disabled = true;
    setStatus(accessStatus, 'Đường dẫn này cần được mở từ bước xác nhận thanh toán.', true);
    return;
  }
  try {
    const response = await fetch(`/api/assessment-access?code=${encodeURIComponent(orderCode)}`, {cache: 'no-store'});
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Access unavailable');
    accessToken = data.accessToken;
    sessionStorage.setItem(`linhCoachAssessment:${orderCode}`, JSON.stringify(data));
    startButton.disabled = false;
    setStatus(accessStatus, 'Đã xác nhận quyền truy cập. Con có thể bắt đầu khi sẵn sàng.');
  } catch {
    startButton.disabled = true;
    setStatus(accessStatus, 'Thanh toán chưa được xác nhận hoặc đường dẫn đã hết hạn. Vui lòng thử lại sau ít phút.', true);
  }
}

startButton.addEventListener('click', () => {
  intro.hidden = true;
  quiz.hidden = false;
  renderQuestion();
  window.scrollTo({top: 0, behavior: 'smooth'});
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const question = QUESTIONS[currentIndex];
  if (!answers[question.id]) {
    setStatus(quizStatus, 'Con hãy chọn một mức độ trước khi tiếp tục.', true);
    return;
  }
  if (currentIndex < QUESTIONS.length - 1) {
    currentIndex += 1;
    renderQuestion();
    window.scrollTo({top: 0, behavior: 'smooth'});
    return;
  }
  nextButton.disabled = true;
  setStatus(quizStatus, 'Đang tạo bản đồ kết quả…');
  try {
    const response = await fetch('/api/assessment-submit', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({accessToken, answers})
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Submit failed');
    window.location.assign(`/result?token=${encodeURIComponent(data.resultToken)}`);
  } catch {
    nextButton.disabled = false;
    setStatus(quizStatus, 'Chưa lưu được câu trả lời. Vui lòng thử lại; câu trả lời hiện tại vẫn được giữ trên trang này.', true);
  }
});

loadAccess();
