import { expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup() {
  const states = [];
  let stateIndex = 0, effect, cleanup, transition, interval;
  const windowListeners = new Map(), documentListeners = new Map();
  const tab = { opener: {}, closed: false, location: { href: '' }, close: jest.fn() };
  const window = {
    open: jest.fn(() => tab),
    setInterval: jest.fn(fn => { interval = fn; return 1; }),
    clearInterval: jest.fn(),
    addEventListener: (name, fn) => windowListeners.set(name, fn),
    removeEventListener: name => windowListeners.delete(name),
  };
  const document = {
    visibilityState: 'visible',
    addEventListener: (name, fn) => documentListeners.set(name, fn),
    removeEventListener: name => documentListeners.delete(name),
  };
  const getPatreonAuthorizeUrl = jest.fn(async () => 'https://www.patreon.com/oauth2/authorize');
  const getSubscriptionStatus = jest.fn(async () => ({ supporter: false }));
  const onSupporter = jest.fn(), router = { refresh: jest.fn() }, exports = {};
  const code = ts.transpileModule(readFileSync('hooks/use-patreon-connection.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(code, {
    exports, window, document,
    require: name => ({
      react: {
        useState: initial => {
          const index = stateIndex++;
          if (!(index in states)) states[index] = initial;
          return [states[index], value => { states[index] = value; }];
        },
        useTransition: () => [false, fn => { transition = fn(); }],
        useEffect: fn => { effect = fn; },
      },
      'next/navigation': { useRouter: () => router },
      '@/lib/patreon': { getPatreonAuthorizeUrl, syncPatreonSubscription: getSubscriptionStatus },
      '@/lib/subscription': { getSubscriptionStatus },
    })[name],
  });
  const render = () => { stateIndex = 0; return exports.usePatreonConnection(onSupporter); };
  return {
    render, tab, window, document, getPatreonAuthorizeUrl, getSubscriptionStatus, onSupporter, router,
    start: async () => { render().connect(); await transition; render(); cleanup = effect(); },
    focus: () => windowListeners.get('focus')(),
    visibility: () => documentListeners.get('visibilitychange')(),
    tick: async () => { interval(); await new Promise(resolve => setImmediate(resolve)); },
    dispose: () => cleanup(),
    windowListeners, documentListeners,
  };
}

test('authorization opens in a separate tab without exposing the opener', async () => {
  const app = setup();
  await app.start();
  expect(app.window.open).toHaveBeenCalledWith('', '_blank');
  expect(app.tab.opener).toBeNull();
  expect(app.tab.location.href).toBe('https://www.patreon.com/oauth2/authorize');
  expect(app.render().waiting).toBe(true);
});

test('blocked pop-ups show an error without starting authorization', async () => {
  const app = setup();
  app.window.open.mockReturnValue(null);
  await app.start();
  expect(app.render().error).toContain('Allow pop-ups');
  expect(app.getPatreonAuthorizeUrl).not.toHaveBeenCalled();
});

test('authorization failures close the empty tab and allow retrying', async () => {
  const app = setup();
  app.getPatreonAuthorizeUrl.mockRejectedValue(new Error('unavailable'));
  await app.start();
  expect(app.tab.close).toHaveBeenCalledTimes(1);
  expect(app.render().error).toContain('Couldn’t connect');
  expect(app.render().waiting).toBe(false);
});

test('returning to Tramo activates supporter without a manual reload', async () => {
  const app = setup();
  await app.start();
  await app.focus();
  expect(app.onSupporter).not.toHaveBeenCalled();
  const status = { supporter: true, storageQuotaBytes: 10737418240 };
  app.getSubscriptionStatus.mockResolvedValue(status);
  await app.visibility();
  expect(app.onSupporter).toHaveBeenCalledWith(status);
  expect(app.router.refresh).toHaveBeenCalledTimes(1);
  expect(app.render().waiting).toBe(false);
});

test('a delayed webhook is picked up by bounded polling while the tab is visible', async () => {
  const app = setup();
  await app.start();
  await app.tick();
  app.getSubscriptionStatus.mockResolvedValue({ supporter: true });
  await app.tick();
  expect(app.onSupporter).toHaveBeenCalledTimes(1);
});

test('polling stops after two minutes but returning to the tab still checks status', async () => {
  const app = setup();
  await app.start();
  for (let i = 0; i < 8; i++) await app.tick();
  expect(app.window.clearInterval).toHaveBeenCalledWith(1);
  app.getSubscriptionStatus.mockResolvedValue({ supporter: true });
  await app.focus();
  expect(app.onSupporter).toHaveBeenCalledTimes(1);
});

test('hidden tabs and simultaneous events do not issue redundant checks', async () => {
  const app = setup();
  await app.start();
  app.document.visibilityState = 'hidden';
  await app.tick();
  expect(app.getSubscriptionStatus).not.toHaveBeenCalled();
  app.document.visibilityState = 'visible';
  await Promise.all([app.focus(), app.visibility()]);
  expect(app.getSubscriptionStatus).toHaveBeenCalledTimes(1);
});

test('unmount removes listeners and ignores in-flight responses', async () => {
  const app = setup();
  await app.start();
  let resolve;
  app.getSubscriptionStatus.mockImplementation(() => new Promise(done => { resolve = done; }));
  const check = app.focus();
  app.dispose();
  resolve({ supporter: true });
  await check;
  expect(app.windowListeners.size).toBe(0);
  expect(app.documentListeners.size).toBe(0);
  expect(app.onSupporter).not.toHaveBeenCalled();
});

test('a failed status check can recover on the next return', async () => {
  const app = setup();
  await app.start();
  app.getSubscriptionStatus.mockRejectedValueOnce(new Error('unavailable'));
  await app.focus();
  expect(app.render().error).toContain('Couldn’t check');
  app.getSubscriptionStatus.mockResolvedValue({ supporter: true });
  await app.focus();
  expect(app.render().error).toBeNull();
  expect(app.onSupporter).toHaveBeenCalledTimes(1);
});
