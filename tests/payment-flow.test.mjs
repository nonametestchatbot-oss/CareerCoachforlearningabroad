import test from 'node:test';
import assert from 'node:assert/strict';
import register from '../api/register.js';
import webhook from '../api/sepay-webhook.js';

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('registration uses the OCB virtual account and the 1,000,000 VND offer', async () => {
  const oldFetch = globalThis.fetch;
  const oldEnv = { ...process.env };
  process.env.APPS_SCRIPT_URL = 'https://example.test/exec';
  process.env.APPS_SCRIPT_SECRET = 'test-only';
  process.env.SEPAY_OCB_VA = 'VQRQ12345678';
  globalThis.fetch = async (_url, options) => {
    const params = new URLSearchParams(options.body);
    assert.equal(params.get('amount'), '1000000');
    assert.match(params.get('orderCode'), /^LC\d{8}$/);
    return { ok: true, json: async () => ({ ok: true }) };
  };
  try {
    const res = response();
    await register({ method: 'POST', body: { name: 'A', contact: '0900000000', email: 'a@example.com', student: 'Lớp 12', concern: 'Chọn ngành' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.amount, 1000000);
    assert.equal(res.body.accountNumber, 'VQRQ12345678');
    const qr = new URL(res.body.qrUrl);
    assert.equal(qr.searchParams.get('acc'), 'VQRQ12345678');
    assert.equal(qr.searchParams.get('amount'), '1000000');
    assert.equal(qr.searchParams.get('des'), res.body.orderCode);
  } finally {
    globalThis.fetch = oldFetch;
    process.env = oldEnv;
  }
});

test('webhook acknowledges only authenticated OCB VA transfers', async () => {
  const oldFetch = globalThis.fetch;
  const oldEnv = { ...process.env };
  process.env.APPS_SCRIPT_URL = 'https://example.test/exec';
  process.env.APPS_SCRIPT_SECRET = 'test-only';
  process.env.SEPAY_API_KEY = 'test-key';
  process.env.SEPAY_OCB_VA = 'VQRQ12345678';
  let forwarded = 0;
  globalThis.fetch = async () => { forwarded++; return { ok: true, json: async () => ({ ok: true, status: 'Paid' }) }; };
  const transaction = { gateway: 'OCB', subAccount: 'VQRQ12345678', transferType: 'in', transferAmount: 1000000, content: 'LC12345678', code: 'LC12345678' };
  try {
    const unauthorized = response();
    await webhook({ method: 'POST', headers: {}, body: transaction }, unauthorized);
    assert.equal(unauthorized.statusCode, 401);
    const ignored = response();
    await webhook({ method: 'POST', headers: { authorization: 'Apikey test-key' }, body: { ...transaction, subAccount: 'OTHER' } }, ignored);
    assert.deepEqual(ignored.body, { success: true, ignored: true });
    assert.equal(forwarded, 0);
    const paid = response();
    await webhook({ method: 'POST', headers: { authorization: 'Apikey test-key' }, body: transaction }, paid);
    assert.equal(forwarded, 1);
    assert.equal(paid.statusCode, 200);
    assert.deepEqual(paid.body, { success: true, status: 'Paid' });
  } finally {
    globalThis.fetch = oldFetch;
    process.env = oldEnv;
  }
});
