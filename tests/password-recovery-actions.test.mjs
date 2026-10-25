import { expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup(action, response) {
  const exports = {};
  const fetch = jest.fn(async () => response);
  const redirected = new Error('redirect');
  const redirect = jest.fn(() => { throw redirected; });
  runInNewContext(ts.transpileModule(readFileSync(`app/(auth)/${action}/actions.tsx`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, fetch, encodeURIComponent,
    require: name => ({
      '@/lib/backend-fetch': { backendFetch: fetch },
      'next/navigation': { redirect },
      '@/lib/config': { API_BASE_URL: 'https://configured-api.example.com' },
    })[name],
  });
  const form = new FormData();
  form.set('email', 'account+test@example.com');
  return { exports, fetch, redirect, redirected, form };
}

test('forgot password uses the configured API and redirects only on success', async () => {
  const app = setup('forgot-password', new Response(null, { status: 204 }));
  await expect(app.exports.forgotPasswordHandler(null, app.form)).rejects.toBe(app.redirected);
  expect(app.fetch.mock.calls[0][0]).toBe('https://configured-api.example.com/api/auth/forgot-password');
  expect(JSON.parse(app.fetch.mock.calls[0][1].body)).toEqual({ email: 'account+test@example.com' });
  expect(app.redirect).toHaveBeenCalledWith('/forgot-password/check-email?email=account%2Btest%40example.com');
});

test.each([400, 429, 500])('forgot password displays an HTTP %s error without redirecting', async status => {
  const app = setup('forgot-password', new Response(JSON.stringify({ message: 'Try again later' }), { status }));
  expect(await app.exports.forgotPasswordHandler(null, app.form)).toEqual({ error: 'Try again later' });
  expect(app.redirect).not.toHaveBeenCalled();
});

test('forgot password handles a non-JSON error response', async () => {
  const app = setup('forgot-password', new Response('Bad gateway', { status: 502 }));
  expect(await app.exports.forgotPasswordHandler(null, app.form)).toEqual({
    error: 'Could not request a reset link. Please try again.',
  });
  expect(app.redirect).not.toHaveBeenCalled();
});

test('forgot password handles a network failure without redirecting', async () => {
  const app = setup('forgot-password');
  app.fetch.mockRejectedValue(new Error('offline'));
  expect(await app.exports.forgotPasswordHandler(null, app.form)).toEqual({
    error: 'Could not request a reset link. Please try again.',
  });
  expect(app.redirect).not.toHaveBeenCalled();
});

test('forgot password rejects a missing email without calling the backend', async () => {
  const app = setup('forgot-password');
  app.form.delete('email');
  expect(await app.exports.forgotPasswordHandler(null, app.form)).toEqual({ error: 'Email is required' });
  expect(app.fetch).not.toHaveBeenCalled();
  expect(app.redirect).not.toHaveBeenCalled();
});

test('reset password uses the configured API and preserves its request contract', async () => {
  const app = setup('reset-password', new Response(null, { status: 204 }));
  expect(await app.exports.resetPasswordHandler('reset-token', 'NewPassw0rd!')).toEqual({ success: true });
  expect(app.fetch.mock.calls[0][0]).toBe('https://configured-api.example.com/api/auth/reset-password');
  expect(JSON.parse(app.fetch.mock.calls[0][1].body)).toEqual({ token: 'reset-token', newPassword: 'NewPassw0rd!' });
});
