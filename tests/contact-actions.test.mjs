import { expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const FAILURE = 'Could not send your message. Please try again or email contact@tramo.dev.';

function setup(response) {
  const exports = {};
  const fetch = jest.fn(async () => response);
  runInNewContext(ts.transpileModule(readFileSync('app/contact/actions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: name => ({
      '@/lib/backend-fetch': { backendFetch: fetch },
      '@/lib/config': { API_BASE_URL: 'https://configured-api.example.com' },
    })[name],
  });
  const form = new FormData();
  form.set('email', 'reader@example.com');
  form.set('topic', 'BUG');
  form.set('message', 'It broke');
  form.set('captchaToken', 'contact-captcha');
  return { run: () => exports.contactHandler(null, form), fetch, form };
}

test('contact posts the form to the public endpoint and reports success', async () => {
  const app = setup(new Response(null, { status: 204 }));
  expect(await app.run()).toEqual({ sent: true });
  expect(app.fetch.mock.calls[0][0]).toBe('https://configured-api.example.com/api/public/contact');
  expect(JSON.parse(app.fetch.mock.calls[0][1].body)).toEqual({
    email: 'reader@example.com', topic: 'BUG', message: 'It broke', captchaToken: 'contact-captcha',
  });
});

test.each([
  ['email', '', 'Email is required'],
  ['topic', 'SPAM', 'Choose a topic'],
  ['message', '   ', 'Message is required'],
  ['message', 'x'.repeat(2001), 'Message must be 2000 characters or fewer'],
  ['captchaToken', '', 'Captcha verification failed. Please try again.'],
])('contact rejects an invalid %s without calling the backend', async (field, value, error) => {
  const app = setup();
  app.form.set(field, value);
  expect(await app.run()).toEqual({ error });
  expect(app.fetch).not.toHaveBeenCalled();
});

test('contact explains rate limiting', async () => {
  const app = setup(new Response(null, { status: 429 }));
  expect(await app.run()).toEqual({ error: 'Too many messages. Please try again later.' });
});

test.each([403, 500])('contact shows a fallback on HTTP %s', async status => {
  const app = setup(new Response(null, { status }));
  expect(await app.run()).toEqual({ error: FAILURE });
});

test('contact shows a fallback on network failure', async () => {
  const app = setup();
  app.fetch.mockRejectedValue(new Error('offline'));
  expect(await app.run()).toEqual({ error: FAILURE });
});
