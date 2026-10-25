import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup(response) {
  const exports = {}, calls = [], cookies = [], redirects = [];
  runInNewContext(ts.transpileModule(readFileSync('app/(auth)/login/actions.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: name => ({
      '@/lib/backend-fetch': { backendFetch: async (...args) => { calls.push(args); return response; } },
      '@/lib/config': { API_BASE_URL: 'https://api.tramo.test' },
      '@/lib/auth': { setAuthCookies: async value => cookies.push(value) },
      'next/navigation': { redirect: path => redirects.push(path) },
    })[name],
  });
  const data = new FormData();
  data.set('username', 'victim'); data.set('password', 'password'); data.set('captchaToken', 'login-captcha');
  return { run: state => exports.authenticateHandler(state, data), calls, cookies, redirects };
}

test('captcha challenges do not show email verification controls', async () => {
  const s = setup(Response.json({ code: 'CAPTCHA_REQUIRED', message: 'Captcha verification failed' }, { status: 403 }));
  const result = await s.run(null);
  expect(result.captchaRequired).toBe(true);
  expect(result.needsVerification).toBe(false);
  expect(JSON.parse(s.calls[0][1].body).captchaToken).toBe('login-captcha');
  expect(s.cookies).toHaveLength(0);
});

test('failed passwords preserve the captcha requirement for the next attempt', async () => {
  const s = setup(Response.json({ message: 'Invalid username or password' }, { status: 401 }));
  expect((await s.run({ captchaRequired: true })).captchaRequired).toBe(true);
});

test('successful challenged login stores tokens and respects onboarding', async () => {
  const s = setup(Response.json({ accessToken: 'access', refreshToken: 'refresh', requiresBirthDate: true }));
  await s.run({ captchaRequired: true });
  expect(s.cookies).toEqual([{ accessToken: 'access', refreshToken: 'refresh', username: 'victim' }]);
  expect(s.redirects).toEqual(['/onboarding/birth-date']);
});
