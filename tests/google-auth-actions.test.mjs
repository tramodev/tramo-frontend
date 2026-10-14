import { expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup(response) {
  const exports = {};
  const fetch = jest.fn(async () => response);
  const setAuthCookies = jest.fn();
  runInNewContext(ts.transpileModule(readFileSync('lib/google-auth-actions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, fetch,
    require: name => ({
      './config': { API_BASE_URL: 'http://localhost:8080' },
      './auth': { setAuthCookies },
    })[name],
  });
  return { googleAuthHandler: exports.googleAuthHandler, fetch, setAuthCookies };
}

test('an email collision requests explicit linking without creating a session', async () => {
  const app = setup({ ok: false, json: async () => ({ code: 'GOOGLE_LINK_REQUIRED', message: 'Password required' }) });
  const result = await app.googleAuthHandler('google-token');
  expect(result).toEqual({ success: false, error: 'Password required', linkRequired: true });
  expect(JSON.parse(app.fetch.mock.calls[0][1].body)).toEqual({ idToken: 'google-token' });
  expect(app.setAuthCookies).not.toHaveBeenCalled();
});

test('the password is sent only when explicitly linking and tokens stay in server cookies', async () => {
  const app = setup({ ok: true, json: async () => ({ accessToken: 'access', refreshToken: 'refresh', username: 'existing' }) });
  const result = await app.googleAuthHandler('google-token', 'existing-password');
  expect(JSON.parse(app.fetch.mock.calls[0][1].body)).toEqual({ idToken: 'google-token', password: 'existing-password' });
  expect(app.setAuthCookies).toHaveBeenCalledWith({ accessToken: 'access', refreshToken: 'refresh', username: 'existing' });
  expect(result).toEqual({ success: true, requiresBirthDate: false });
});

test('unverified accounts do not get a password-link prompt or session', async () => {
  const app = setup({ ok: false, json: async () => ({ code: 'GOOGLE_LINK_VERIFICATION_REQUIRED', message: 'Verify and recover' }) });
  expect(await app.googleAuthHandler('google-token')).toEqual({ success: false, error: 'Verify and recover', linkRequired: false });
  expect(app.setAuthCookies).not.toHaveBeenCalled();
});
