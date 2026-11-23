import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreGiftLead } from '../lib/gift-scoring.js';

test('gift intake scores an imminent high-school family lead transparently', () => {
  const lead = scoreGiftLead({
    role: 'parent',
    studentStage: 'high_school',
    timeline: 'within_6_months',
    need: 'Gia đình muốn tìm học bổng hè cho con lớp 11.',
    phone: '+84 90 123 4567'
  });
  assert.equal(lead.fitScore, 100);
  assert.equal(lead.intentScore, 100);
  assert.equal(lead.engagementScore, 75);
  assert.equal(lead.score, 94);
  assert.match(lead.scoreReasons.fit, /trọng số vai trò 60%/i);
});

test('gift intake distinguishes longer planning horizons and detailed engagement', () => {
  const lead = scoreGiftLead({
    role: 'student',
    studentStage: 'middle_school',
    timeline: 'one_to_two_years',
    need: 'Con muốn tìm hiểu các chương trình trải nghiệm quốc tế và điều kiện học bổng phù hợp.',
    phone: ''
  });
  assert.equal(lead.fitScore, 90);
  assert.equal(lead.intentScore, 65);
  assert.equal(lead.engagementScore, 85);
  assert.equal(lead.score, 80);
  assert.equal(lead.studentContext, 'THCS · Trong 1–2 năm tới');
});

test('gift intake rejects unknown options and an empty need', () => {
  assert.throws(() => scoreGiftLead({ role: 'other', studentStage: 'university', timeline: 'later', need: 'Tìm học bổng', phone: '' }), /thời gian/i);
  assert.throws(() => scoreGiftLead({ role: 'other', studentStage: 'university', timeline: 'exploring', need: 'Tìm hiểu', phone: '' }), /ít nhất 12/i);
});
