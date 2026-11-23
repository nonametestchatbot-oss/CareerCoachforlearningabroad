const ROLE_FIT = { parent: 100, student: 100, educator: 65, other: 40 };
const ROLE_LABEL = { parent: 'Phụ huynh', student: 'Học sinh/sinh viên', educator: 'Người hỗ trợ học sinh', other: 'Khác' };
const STAGE_FIT = { middle_school: 75, high_school: 100, university: 50, abroad: 65, exploring: 50 };
const STAGE_LABEL = { middle_school: 'THCS', high_school: 'THPT', university: 'Đại học', abroad: 'Đang du học', exploring: 'Đang tìm hiểu' };
const TIMELINE_INTENT = { within_6_months: 100, within_12_months: 85, one_to_two_years: 65, exploring: 45 };
const TIMELINE_LABEL = { within_6_months: 'Trong 6 tháng tới', within_12_months: 'Trong 12 tháng tới', one_to_two_years: 'Trong 1–2 năm tới', exploring: 'Đang tìm hiểu, chưa có mốc cụ thể' };

export function scoreGiftLead({ role, studentStage, timeline, need, phone }) {
  const cleanNeed = String(need || '').trim().replace(/\s+/g, ' ');
  if (!Object.hasOwn(ROLE_FIT, role)) throw new Error('Vai trò đăng ký không hợp lệ.');
  if (!Object.hasOwn(STAGE_FIT, studentStage)) throw new Error('Giai đoạn học tập không hợp lệ.');
  if (!Object.hasOwn(TIMELINE_INTENT, timeline)) throw new Error('Thời gian dự định không hợp lệ.');
  if (cleanNeed.length < 12) throw new Error('Vui lòng mô tả điều gia đình muốn tìm hiểu (ít nhất 12 ký tự).');

  const fitScore = Math.round(ROLE_FIT[role] * 0.6 + STAGE_FIT[studentStage] * 0.4);
  const intentScore = TIMELINE_INTENT[timeline];
  const needSignal = cleanNeed.length >= 60 ? 25 : 15;
  const contactSignal = String(phone || '').trim() ? 15 : 0;
  const engagementScore = Math.min(100, 60 + needSignal + contactSignal);
  const score = Math.round(fitScore * 0.4 + intentScore * 0.35 + engagementScore * 0.25);

  return {
    fitScore,
    intentScore,
    engagementScore,
    score,
    studentContext: STAGE_LABEL[studentStage] + ' · ' + TIMELINE_LABEL[timeline],
    scoreReasons: {
      source: 'gift-intake-v1',
      fit: ROLE_LABEL[role] + ' phù hợp với tài liệu dành cho gia đình học sinh (' + ROLE_FIT[role] + '/100); giai đoạn ' + STAGE_LABEL[studentStage] + ' (' + STAGE_FIT[studentStage] + '/100). Trọng số vai trò 60%, giai đoạn 40%.',
      intent: TIMELINE_LABEL[timeline] + ' (' + intentScore + '/100). Đây là mức quan tâm theo thời điểm dự định, không phải kết luận về năng lực.',
      engagement: 'Hoàn tất form (' + engagementScore + '/100); mô tả nhu cầu ' + cleanNeed.length + ' ký tự' + (contactSignal ? ', có cung cấp số điện thoại tùy chọn' : '') + '.'
    }
  };
}
