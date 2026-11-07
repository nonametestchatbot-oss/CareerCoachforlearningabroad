import { QUESTIONS } from '/questions.js';

const intro = document.getElementById('intro-view');
const profileView = document.getElementById('profile-view');
const profileForm = document.getElementById('profile-form');
const quiz = document.getElementById('quiz-view');
const emailForm = document.getElementById('email-form');
const otpForm = document.getElementById('otp-form');
const emailStep = document.getElementById('email-step');
const otpStep = document.getElementById('otp-step');
const emailInput = document.getElementById('email');
const codeInput = document.getElementById('order-code');
const otpInput = document.getElementById('otp');
const emailLabel = document.getElementById('email-label');
const logoutButton = document.getElementById('logout-button');
const accessStatus = document.getElementById('access-status');
const form = document.getElementById('quiz-form');
const questionList = document.getElementById('question-list');
const nextButton = document.getElementById('next-button');
const quizStatus = document.getElementById('quiz-status');
const progressLabel = document.getElementById('progress-label');
const progressPercent = document.getElementById('progress-percent');
const progressBar = document.getElementById('progress-bar');
const answers = {};
const batchSize = 5;
let accessToken = sessionStorage.getItem('linhCoachAssessmentAuth') || '';
let grant = null;
let pendingEmail = '';
let pendingCode = '';
let pageIndex = 0;
let profileType = '';
const choices = [['1','Hoàn toàn không giống tôi'],['2','Khá không giống tôi'],['3','Hơi không giống tôi'],['4','Ở giữa / tùy hoàn cảnh'],['5','Hơi giống tôi'],['6','Khá giống tôi'],['7','Rất giống tôi']];
const queryCode = new URLSearchParams(window.location.search).get('code');
const magicLinkParams = new URLSearchParams(window.location.hash.slice(1));
const magicLinkToken = magicLinkParams.get('access_token');
const magicLinkError = magicLinkParams.get('error_description') || magicLinkParams.get('error');
if (magicLinkToken) {
  accessToken = magicLinkToken;
  sessionStorage.setItem('linhCoachAssessmentAuth', accessToken);
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
if (queryCode) codeInput.value = queryCode.toUpperCase();
function setStatus(element, message, isError = false) { element.textContent = message; element.classList.toggle('error', isError); }
function authHeaders() { return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}; }
function showProfileStep() {
  if (!accessToken || !grant?.id || grant.attemptUsed) return;
  intro.hidden = true;
  profileView.hidden = false;
  quiz.hidden = true;
  logoutButton.hidden = false;
  window.scrollTo({top:0,behavior:'smooth'});
}
function showUsedResult(attemptId) {
  const button = document.createElement('a');
  button.className = 'assessment-button';
  button.href = `/result?id=${encodeURIComponent(attemptId)}`;
  button.textContent = 'Mở kết quả gần nhất →';
  profileView.hidden = true;
  quiz.hidden = true;
  intro.hidden = false;
  document.getElementById('access-card').hidden = true;
  document.getElementById('start-result-link')?.remove();
  button.id = 'start-result-link';
  document.getElementById('logout-button').before(button);
}
function renderQuestions() {
  const start = pageIndex * batchSize;
  const pageQuestions = QUESTIONS.slice(start, start + batchSize);
  const end = start + pageQuestions.length;
  const percent = Math.round((Object.keys(answers).length / QUESTIONS.length) * 100);
  progressLabel.textContent = `Câu ${start + 1}–${end} / ${QUESTIONS.length}`;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${Math.max(4, percent)}%`;
  nextButton.innerHTML = end >= QUESTIONS.length ? 'Xem bản đồ kết quả <span aria-hidden="true">→</span>' : '5 câu tiếp theo <span aria-hidden="true">→</span>';
  questionList.innerHTML = pageQuestions.map((question, offset) => {
    const number = start + offset + 1;
    const selected = String(answers[question.id] || '');
    const titleId = `prompt-${question.id}`;
    return `<article class="question-card" role="group" aria-labelledby="${titleId}">
      <h3 class="question-prompt" id="${titleId}">${number}. ${question.text}</h3>
      <div class="question-response">
        <div class="scale-note"><span>Không giống tôi</span><span>Giống tôi</span></div>
        <div class="scale-options" role="radiogroup" aria-labelledby="${titleId}">${choices.map(([value,label]) => `<label title="${label}"><input type="radio" name="answer-${question.id}" value="${value}" ${selected === value ? 'checked' : ''}><span>${value}</span></label>`).join('')}</div>
      </div>
    </article>`;
  }).join('');
  questionList.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
    const id = input.name.replace('answer-', '');
    answers[id] = Number(input.value);
    const percent = Math.round((Object.keys(answers).length / QUESTIONS.length) * 100);
    progressPercent.textContent = `${percent}%`;
    progressBar.style.width = `${Math.max(4, percent)}%`;
    setStatus(quizStatus, '');
  }));
}
let accessOtpCooldown;
function startAccessOtpCooldown(seconds) {
  const button = emailForm.querySelector('button');
  clearInterval(accessOtpCooldown);
  let remaining = Math.max(0, Number(seconds) || 60);
  const original = button.dataset.originalLabel || button.textContent.trim();
  button.dataset.originalLabel = original;
  button.disabled = remaining > 0;
  const tick = () => {
    if (remaining <= 0) { clearInterval(accessOtpCooldown); button.disabled = false; button.textContent = original; return; }
    button.textContent = `Gửi lại sau ${remaining} giây`;
    remaining -= 1;
  };
  tick();
  accessOtpCooldown = setInterval(tick, 1000);
}
async function requestOtp(event) {
  event.preventDefault();
  pendingEmail = emailInput.value.trim().toLowerCase();
  pendingCode = codeInput.value.trim().toUpperCase();
  const button = emailForm.querySelector('button');
  button.disabled = true;
  let cooldown = false;
  try {
    const response = await fetch('/api/assessment-auth-request', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:pendingEmail,code:pendingCode})});
    let data = {}; try { data = await response.json(); } catch {}
    if (!response.ok || !data.ok) {
      if (response.status === 429) { startAccessOtpCooldown(data.retryAfterSeconds || 60); cooldown = true; }
      throw new Error(data.error || 'Chưa gửi được email đăng nhập. Hãy thử lại sau ít phút.');
    }
    emailStep.hidden = false; otpStep.hidden = true;
    startAccessOtpCooldown(60); cooldown = true;
    setStatus(accessStatus, 'Đã gửi liên kết đăng nhập. Mở email trên thiết bị này để tiếp tục bài test.');
  } catch(error) { setStatus(accessStatus,error.message || 'Chưa gửi được email đăng nhập.',true); }
  finally { if (!cooldown) button.disabled = false; }
}
async function verifyOtp(event) {
  event.preventDefault();
  const button = otpForm.querySelector('button'); button.disabled = true;
  try {
    const response = await fetch('/api/assessment-auth-verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:pendingEmail,code:pendingCode,otp:otpInput.value.trim()})});
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error);
    accessToken = data.accessToken; sessionStorage.setItem('linhCoachAssessmentAuth',accessToken); grant = data.grant;
    emailStep.hidden = true; otpStep.hidden = true;
    if (!grant) { setStatus(accessStatus,'Email quản trị đã xác thực. Hãy dùng trang quản trị để cấp lượt làm bài.'); return; }
    logoutButton.hidden = false;
    if (grant.attemptUsed) {
      setStatus(accessStatus,'Lượt này đã được sử dụng. Bạn có thể mở kết quả gần nhất.');
      const access = await fetch('/api/assessment-access',{headers:authHeaders()}).then(r=>r.json());
      if (access.latestAttemptId) showUsedResult(access.latestAttemptId);
      return;
    }
    setStatus(accessStatus,`Đã xác nhận quyền. Lượt làm bài có hiệu lực đến ${new Date(grant.expiresAt).toLocaleDateString('vi-VN')}.`);
    showProfileStep();
  } catch(error) { setStatus(accessStatus,error.message || 'Mã xác thực không đúng.',true); }
  finally { button.disabled = false; }
}
async function restoreSession() {
  if (!accessToken) return;
  try {
    const response = await fetch('/api/assessment-access',{headers:authHeaders(),cache:'no-store'});
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error);
    grant = data.grant; logoutButton.hidden = false;
    if (!grant) return;
    if (grant.attemptUsed) {
      setStatus(accessStatus,'Lượt này đã được sử dụng.');
      if (data.latestAttemptId) showUsedResult(data.latestAttemptId);
      return;
    }
    setStatus(accessStatus,`Đã xác nhận quyền. Lượt làm bài có hiệu lực đến ${new Date(grant.expiresAt).toLocaleDateString('vi-VN')}.`);
    showProfileStep();
  } catch { sessionStorage.removeItem('linhCoachAssessmentAuth'); accessToken = ''; if (magicLinkError) setStatus(accessStatus,'Liên kết đăng nhập không còn hiệu lực. Hãy yêu cầu email mới.',true); }
}
profileForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!accessToken || !grant?.id || grant.attemptUsed) { setStatus(accessStatus,'Quyền làm bài không còn hiệu lực. Hãy xác thực lại email.',true); profileView.hidden=true; intro.hidden=false; return; }
  profileType = new FormData(profileForm).get('profileType');
  if (!['student','professional'].includes(profileType)) return;
  profileView.hidden = true; quiz.hidden = false; renderQuestions(); window.scrollTo({top:0,behavior:'smooth'});
});
logoutButton.addEventListener('click',()=>{sessionStorage.removeItem('linhCoachAssessmentAuth');window.location.reload();});
emailForm.addEventListener('submit',requestOtp); otpForm.addEventListener('submit',verifyOtp);
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const start=pageIndex*batchSize, pageQuestions=QUESTIONS.slice(start,start+batchSize);
  const missing=pageQuestions.filter(question=>!answers[question.id]);
  if (missing.length) { setStatus(quizStatus,`Con hãy trả lời đủ ${pageQuestions.length} câu trên màn hình trước khi tiếp tục.`,true); document.querySelector(`input[name="answer-${missing[0].id}"]`)?.focus(); return; }
  if (pageIndex < Math.ceil(QUESTIONS.length/batchSize)-1) { pageIndex+=1; renderQuestions(); setStatus(quizStatus,''); window.scrollTo({top:0,behavior:'smooth'}); return; }
  if (!accessToken || !grant?.id || grant.attemptUsed) { setStatus(quizStatus,'Quyền làm bài không hợp lệ. Hãy xác thực lại email.',true); return; }
  nextButton.disabled=true; setStatus(quizStatus,'Đang lưu kết quả…');
  try {
    const response=await fetch('/api/assessment-submit',{method:'POST',headers:{'Content-Type':'application/json',...authHeaders()},body:JSON.stringify({answers,profileType})});
    const data=await response.json(); if(!response.ok||!data.ok)throw new Error(data.error);
    window.location.assign(`/result?id=${encodeURIComponent(data.attemptId)}`);
  } catch(error) { nextButton.disabled=false; setStatus(quizStatus,error.message||'Chưa lưu được câu trả lời. Vui lòng thử lại.',true); }
});
restoreSession();
