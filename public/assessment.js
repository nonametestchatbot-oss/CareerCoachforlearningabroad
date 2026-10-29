import { QUESTIONS } from '/questions.js';

const intro = document.getElementById('intro-view');
const quiz = document.getElementById('quiz-view');
const emailForm = document.getElementById('email-form');
const otpForm = document.getElementById('otp-form');
const emailStep = document.getElementById('email-step');
const otpStep = document.getElementById('otp-step');
const emailInput = document.getElementById('email');
const codeInput = document.getElementById('order-code');
const otpInput = document.getElementById('otp');
const emailLabel = document.getElementById('email-label');
const startButton = document.getElementById('start-button');
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
let accessToken = sessionStorage.getItem('linhCoachAssessmentAuth') || '';
let grant = null;
let pendingEmail = '';
let pendingCode = '';
let currentIndex = 0;
const choices = [['1','Hoàn toàn không giống tôi'],['2','Khá không giống tôi'],['3','Hơi không giống tôi'],['4','Ở giữa / tùy hoàn cảnh'],['5','Hơi giống tôi'],['6','Khá giống tôi'],['7','Rất giống tôi']];
const queryCode = new URLSearchParams(window.location.search).get('code');
if (queryCode) codeInput.value = queryCode.toUpperCase();
function setStatus(element, message, isError = false) { element.textContent = message; element.classList.toggle('error', isError); }
function authHeaders() { return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}; }
function renderQuestion() { const question = QUESTIONS[currentIndex]; const selected = String(answers[question.id] || ''); const percentage = Math.round((currentIndex / QUESTIONS.length) * 100); progressLabel.textContent = `Câu ${currentIndex + 1} / ${QUESTIONS.length}`; progressPercent.textContent = `${percentage}%`; progressBar.style.width = `${Math.max(4, percentage)}%`; nextButton.innerHTML = currentIndex === QUESTIONS.length - 1 ? 'Xem bản đồ kết quả <span aria-hidden="true">→</span>' : 'Câu tiếp theo <span aria-hidden="true">→</span>'; questionList.innerHTML = `<fieldset class="question-card"><legend>${currentIndex + 1}. ${question.text}</legend><div><div class="scale-note"><span>Không giống tôi</span><span>Giống tôi</span></div><div class="scale-options" role="radiogroup" aria-label="Mức độ phù hợp">${choices.map(([value,label]) => `<label title="${label}"><input type="radio" name="answer" value="${value}" ${selected === value ? 'checked' : ''}><span>${value}</span></label>`).join('')}</div></div></fieldset>`; questionList.querySelectorAll('input').forEach(input => input.addEventListener('change', () => { answers[question.id] = Number(input.value); setStatus(quizStatus, ''); })); }
async function requestOtp(event) { event.preventDefault(); pendingEmail = emailInput.value.trim().toLowerCase(); pendingCode = codeInput.value.trim().toUpperCase(); const button = emailForm.querySelector('button'); button.disabled = true; try { const response = await fetch('/api/assessment-auth-request', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:pendingEmail, code:pendingCode}) }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error); emailStep.hidden = true; otpStep.hidden = false; emailLabel.textContent = pendingEmail; otpInput.focus(); setStatus(accessStatus, 'Mã xác thực đã được gửi.'); } catch(error) { setStatus(accessStatus, error.message || 'Chưa gửi được mã xác thực.', true); } finally { button.disabled = false; } }
async function verifyOtp(event) { event.preventDefault(); const button = otpForm.querySelector('button'); button.disabled = true; try { const response = await fetch('/api/assessment-auth-verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:pendingEmail, code:pendingCode, otp:otpInput.value.trim()}) }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error); accessToken = data.accessToken; sessionStorage.setItem('linhCoachAssessmentAuth', accessToken); grant = data.grant; startButton.hidden = !grant; logoutButton.style.display = 'inline'; emailStep.hidden = true; otpStep.hidden = true; if (!grant) { setStatus(accessStatus, 'Email quản trị đã được xác thực. Hãy dùng trang quản trị để cấp lượt làm bài.'); return; } setStatus(accessStatus, grant.attemptUsed ? 'Lượt này đã được sử dụng. Bạn có thể mở kết quả gần nhất bên dưới.' : `Đã xác nhận quyền. Lượt làm bài có hiệu lực đến ${new Date(grant.expiresAt).toLocaleDateString('vi-VN')}.`); if (grant.attemptUsed) { const access = await fetch('/api/assessment-access', {headers:authHeaders()}).then(r=>r.json()); if (access.latestAttemptId) { startButton.hidden = false; startButton.textContent = 'Mở kết quả gần nhất →'; startButton.onclick = () => window.location.assign(`/result?id=${encodeURIComponent(access.latestAttemptId)}`); } } } catch(error) { setStatus(accessStatus, error.message || 'Mã xác thực không đúng.', true); } finally { button.disabled = false; } }
async function restoreSession() { if (!accessToken) return; try { const response = await fetch('/api/assessment-access', {headers:authHeaders(),cache:'no-store'}); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error); grant = data.grant; startButton.hidden = false; logoutButton.style.display = 'inline'; setStatus(accessStatus, grant.attemptUsed ? 'Lượt này đã được sử dụng.' : `Đã xác nhận quyền. Lượt làm bài có hiệu lực đến ${new Date(grant.expiresAt).toLocaleDateString('vi-VN')}.`); if (grant.attemptUsed && data.latestAttemptId) { startButton.textContent = 'Mở kết quả gần nhất →'; startButton.onclick = () => window.location.assign(`/result?id=${encodeURIComponent(data.latestAttemptId)}`); } } catch { sessionStorage.removeItem('linhCoachAssessmentAuth'); accessToken = ''; } }
startButton.addEventListener('click', () => { if (grant?.attemptUsed) return; intro.hidden = true; quiz.hidden = false; renderQuestion(); window.scrollTo({top:0,behavior:'smooth'}); });
logoutButton.addEventListener('click', () => { sessionStorage.removeItem('linhCoachAssessmentAuth'); window.location.reload(); });
emailForm.addEventListener('submit', requestOtp); otpForm.addEventListener('submit', verifyOtp);
form.addEventListener('submit', async event => { event.preventDefault(); const question = QUESTIONS[currentIndex]; if (!answers[question.id]) { setStatus(quizStatus,'Con hãy chọn một mức độ trước khi tiếp tục.',true); return; } if (currentIndex < QUESTIONS.length - 1) { currentIndex += 1; renderQuestion(); window.scrollTo({top:0,behavior:'smooth'}); return; } nextButton.disabled = true; setStatus(quizStatus,'Đang lưu kết quả…'); try { const response = await fetch('/api/assessment-submit',{method:'POST',headers:{'Content-Type':'application/json',...authHeaders()},body:JSON.stringify({answers})}); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error); window.location.assign(`/result?id=${encodeURIComponent(data.attemptId)}`); } catch(error) { nextButton.disabled = false; setStatus(quizStatus,error.message || 'Chưa lưu được câu trả lời. Vui lòng thử lại.',true); } });
restoreSession();
