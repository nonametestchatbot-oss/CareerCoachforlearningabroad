import test from 'node:test';
import assert from 'node:assert/strict';
import crm from '../api/crm.js';

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

async function withAuthConfig(run) {
  const oldFetch = globalThis.fetch;
  const oldEnv = { ...process.env };
  process.env.SUPABASE_URL = 'https://project.example.test';
  process.env.SUPABASE_ANON_KEY = 'anon-test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test';
  process.env.CRM_ADMIN_EMAILS = 'admin@example.com';
  try { await run(); }
  finally {
    globalThis.fetch = oldFetch;
    for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'CRM_ADMIN_EMAILS']) {
      if (oldEnv[key] === undefined) delete process.env[key];
      else process.env[key] = oldEnv[key];
    }
  }
}

test('magic-link callback validates CRM admin and returns the session', async () => {
  await withAuthConfig(async () => {
    globalThis.fetch = async url => {
      assert.equal(String(url), 'https://project.example.test/auth/v1/user');
      return { ok: true, json: async () => ({ email: 'admin@example.com' }) };
    };
    const res = response();
    await crm({ method: 'POST', query: { action: 'auth-session' }, headers: {}, body: { accessToken: 'access', refreshToken: 'refresh' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ok: true, accessToken: 'access', refreshToken: 'refresh', user: { email: 'admin@example.com' } });
  });
});

test('expired CRM session refresh validates admin and returns rotated tokens', async () => {
  await withAuthConfig(async () => {
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), 'https://project.example.test/auth/v1/token?grant_type=refresh_token');
      assert.deepEqual(JSON.parse(options.body), { refresh_token: 'old-refresh' });
      return { ok: true, json: async () => ({ access_token: 'new-access', refresh_token: 'new-refresh', user: { email: 'admin@example.com' } }) };
    };
    const res = response();
    await crm({ method: 'POST', query: { action: 'auth-refresh' }, headers: {}, body: { refreshToken: 'old-refresh' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ok: true, accessToken: 'new-access', refreshToken: 'new-refresh', user: { email: 'admin@example.com' } });
  });
});
