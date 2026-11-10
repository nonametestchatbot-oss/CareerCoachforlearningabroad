import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraftEdit, defaultNurtureTemplates } from '../lib/nurture.js';

test('email draft edits require content and keep only the intended fields', () => {
  assert.deepEqual(validateDraftEdit({ subject: '  Chủ đề  ', body: '  Nội dung  ', cta: '  Xem thêm  ', status: 'sent' }), {
    subject: 'Chủ đề', body: 'Nội dung', cta: 'Xem thêm'
  });
  assert.throws(() => validateDraftEdit({ subject: 'Chủ đề', body: '', cta: 'Xem thêm' }), /Cần nhập/);
  assert.throws(() => validateDraftEdit({ subject: 'a'.repeat(201), body: 'Nội dung', cta: 'Xem thêm' }), /độ dài/);
});

test('all eight nurture emails are available for editing', () => {
  const templates = defaultNurtureTemplates();
  assert.equal(templates.length, 8);
  assert.deepEqual(templates.reduce((count, item) => ({ ...count, [item.sequence_key]: (count[item.sequence_key] || 0) + 1 }), {}), {
    score_70_100: 2,
    score_40_69: 3,
    score_0_39: 3
  });
});

