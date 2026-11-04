import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLeadScore, leadPayload } from '../lib/crm.js';
import { normalizeEmail, normalizePhone } from '../lib/supabase.js';

test('CRM identity values are normalized consistently', () => {
  assert.equal(normalizeEmail('  Parent@Example.COM '), 'parent@example.com');
  assert.equal(normalizePhone('+84 90 123 4567'), '0901234567');
});

test('lead score uses Fit 40%, Intent 35%, Engagement 25%', () => {
  assert.equal(calculateLeadScore({ fitScore: 80, intentScore: 60, engagementScore: 40 }), 63);
  assert.equal(calculateLeadScore({ fitScore: 80, intentScore: null, engagementScore: 40 }), null);
});

test('lead payload refuses a lead without email and phone', () => {
  assert.throws(() => leadPayload({ name: 'A' }), /email or phone/);
});




