import { test, expect } from '@playwright/test';

const api = 'http://127.0.0.1:3180';
const text = value => ({ type: 'text', version: 1, text: value, detail: 0, format: 0, mode: 'normal', style: '' });
const paragraph = value => ({ type: 'paragraph', version: 1, children: [text(value)], direction: null, format: '', indent: 0 });
const note = (label, lines) => JSON.stringify({ root: { type: 'root', version: 1, children: Array.from({ length: lines }, (_, index) => paragraph(`${label} line ${index + 1}`)), direction: null, format: '', indent: 0 } });

test.beforeEach(async ({ context }) => {
  const payload = Buffer.from(JSON.stringify({ sub: '1', exp: Math.floor(Date.now() / 1000) + 3600, role: 'USER' })).toString('base64url');
  await context.addCookies([{ name: 'accessToken', value: `test.${payload}.fixture`, url: 'http://127.0.0.1:3100', httpOnly: true }, { name: 'username', value: 'embedtester', url: 'http://127.0.0.1:3100', httpOnly: true }]);
});

function watchPaintedTop(id) {
  window.__tops = [];
  let pending = null;
  let observer = null;
  const read = () => {
    const inner = document.querySelector('.editor-inner');
    const target = inner?.querySelector(`section[data-item-id="${id}"]`);
    return inner && target && getComputedStyle(inner).visibility === 'visible' ? Math.round(target.getBoundingClientRect().top) : null;
  };
  const frame = () => {
    if (pending !== null) window.__tops.push(pending);
    pending = read();
    if (pending !== null && !observer) {
      observer = new ResizeObserver(() => { const value = read(); if (value !== null) pending = value; });
      observer.observe(document.querySelector('.editor-inner').firstElementChild);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

for (const { name, notes, selected } of [
  { name: 'a middle note', notes: [note('One', 20), note('Two', 20), note('Three', 3), note('Four', 3)], selected: 3 },
  { name: 'the last note', notes: [note('One', 20), note('Two', 20), note('Three', 20), note('Four', 3)], selected: 4 },
]) {
  test(`reloading on ${name} keeps it still while the trail loads`, async ({ page, request }) => {
    await page.setViewportSize({ width: 1280, height: 850 });
    await request.post(`${api}/fixture`, { data: { notes, selected } });
    await page.addInitScript(watchPaintedTop, String(selected));
    await page.goto('/editor/embeds');
    await expect(page.locator(`.editor-inner section[data-item-id="${selected}"]`)).toBeInViewport();
    await page.waitForTimeout(1500);
    const tops = await page.evaluate(() => window.__tops);
    expect(tops.length).toBeGreaterThan(10);
    expect(new Set(tops)).toEqual(new Set([tops[0]]));
  });
}

test('the reload anchor lets go once something else scrolls the editor', async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await request.post(`${api}/fixture`, { data: { notes: [note('One', 20), note('Two', 20), note('Three', 3), note('Four', 20)], selected: 3 } });
  await page.goto('/editor/embeds');
  await expect(page.locator('.editor-inner section[data-item-id="3"]')).toBeInViewport();
  const scrollTop = await page.evaluate(async () => {
    const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const inner = document.querySelector('.editor-inner');
    inner.scrollTop = 0;
    await frames();
    const spacer = document.createElement('div');
    spacer.style.height = '300px';
    inner.querySelector('section[data-item-id="1"]').append(spacer);
    await frames();
    return inner.scrollTop;
  });
  expect(scrollTop).toBe(0);
});
