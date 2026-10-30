import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const api = 'http://127.0.0.1:3180';
const element = (type, children) => ({ type, version: 1, children, direction: null, format: '', indent: 0 });
const paragraph = text => element('paragraph', text ? [{ type: 'text', version: 1, text, detail: 0, format: 0, mode: 'normal', style: '' }] : []);
const equation = source => ({ type: 'equation', version: 1, equation: source, inline: false });
const music = source => ({ type: 'music', version: 1, abc: source });
const state = nodes => JSON.stringify({ root: element('root', nodes) });
const invalidMath = '\\frac{1}{';
const invalidMusic = 'X:1\nK:C\nCDE [';
const validMusic = 'X:1\nK:C\nCDEF|';
async function seed(request, nodes, visibility = 'private') {
  await request.post(`${api}/fixture`, { data: { content: state(nodes), visibility } });
}
async function saved(request) { return (await (await request.get(`${api}/fixture`)).json()); }

test.beforeEach(async ({ context }) => {
  const payload = Buffer.from(JSON.stringify({ sub: '1', exp: Math.floor(Date.now() / 1000) + 3600, role: 'USER' })).toString('base64url');
  await context.addCookies([{ name: 'accessToken', value: `test.${payload}.fixture`, url: 'http://127.0.0.1:3100', httpOnly: true }, { name: 'username', value: 'embedtester', url: 'http://127.0.0.1:3100', httpOnly: true }]);
});

test('invalid equation and score save on Escape and remain marked after reload', async ({ page, request }) => {
  await seed(request, [equation('x'), music(validMusic), paragraph()]);
  await page.goto('/editor/embeds');
  await page.locator('.editor-equation-rendered').dblclick();
  await page.getByRole('textbox', { name: 'LaTeX equation' }).fill(invalidMath);
  await page.getByRole('textbox', { name: 'LaTeX equation' }).press('Escape');
  await expect(page.locator('.editor-equation-rendered.embed-invalid')).toBeVisible();
  await page.locator('.editor-music-rendered').dblclick();
  await page.getByRole('textbox', { name: 'ABC notation' }).fill(invalidMusic);
  await page.getByRole('textbox', { name: 'ABC notation' }).press('Escape');
  await expect(page.locator('.editor-music-rendered.embed-invalid')).toBeVisible();
  await expect(page.getByRole('button', { name: /1 equation with errors.*1 music score with errors/ })).toBeVisible();
  await expect.poll(async () => (await saved(request)).content).toContain('CDE [');
  await page.reload();
  await expect(page.locator('.embed-invalid')).toHaveCount(2);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect((await saved(request)).content).toContain('frac');
});

test('reader uses raw source without author errors or audio', async ({ page, request }) => {
  await seed(request, [equation(invalidMath), music(`${invalidMusic}\n?\n?\n?\n?`), paragraph()], 'published');
  await page.goto('/p/embeds');
  await expect(page.getByRole('note', { name: 'Unrendered equation' })).toContainText('could not render');
  const score = page.getByRole('note', { name: 'Unrendered music score' });
  await expect(score).toContainText('could not render');
  await score.locator('summary').click();
  await expect(score.locator('pre')).toContainText('CDE [');
  await expect(page.locator('.embed-invalid, [aria-invalid="true"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /play/i })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include('[role="note"]').analyze()).violations).toEqual([]);
});

test('publishing warns without blocking and Review focuses the first invalid embed', async ({ page, request }) => {
  await seed(request, [paragraph('Introduction'), equation(invalidMath), music(invalidMusic), paragraph()]);
  await page.goto('/projects/embeds/share');
  await page.getByRole('button', { name: 'Published', exact: false }).click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('2 equations or music scores have errors');
  expect((await saved(request)).published).toBe(0);
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect(page.locator('.editor-equation-rendered.embed-invalid')).toBeFocused();
  await page.goto('/projects/embeds/share');
  await page.getByRole('button', { name: 'Published', exact: false }).click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('button', { name: 'Publish anyway', exact: true }).click();
  await expect.poll(async () => (await saved(request)).published).toBe(1);
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect.poll(async () => (await saved(request)).published).toBe(2);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('adjacent embeds leave a caret between them and author errors are accessible', async ({ page, request }) => {
  await seed(request, [paragraph('Original'), equation('x'), music(validMusic), paragraph()]);
  await page.goto('/editor/embeds');
  await page.locator('.editor-equation-rendered').dblclick();
  await page.getByRole('textbox', { name: 'LaTeX equation' }).press('Escape');
  await page.keyboard.type('D1');
  await expect.poll(async () => (await saved(request)).content).toContain('D1');
  const children = JSON.parse((await saved(request)).content).root.children;
  expect(children[0].children[0].text).toBe('Original');
  expect(children[2].children[0].text).toBe('D1');
  await page.locator('.editor-equation-rendered').dblclick();
  await page.getByRole('textbox', { name: 'LaTeX equation' }).fill(invalidMath);
  await page.getByRole('textbox', { name: 'LaTeX equation' }).press('Escape');
  await expect(page.locator('.embed-invalid')).toHaveCount(1);
  expect((await new AxeBuilder({ page }).include('.trail-item-editor').analyze()).violations).toEqual([]);
});

test('10k source saves and 10k+1 stays editable without a dialog', async ({ page, request }) => {
  await seed(request, [equation('x'), paragraph()]);
  await page.goto('/editor/embeds');
  await page.locator('.editor-equation-rendered').dblclick();
  const field = page.getByRole('textbox', { name: 'LaTeX equation' });
  await field.fill('x'.repeat(10001));
  await field.press('Escape');
  await expect(field).toHaveValue('x'.repeat(10001));
  await expect(page.locator('.editor-equation-error')).toContainText('10,000');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await field.fill('x'.repeat(10000));
  await field.press('Escape');
  await expect(field).toHaveCount(0);
  await expect.poll(async () => JSON.parse((await saved(request)).content).root.children[0].equation.length).toBe(10000);
});

test('malicious and pathological sources render safely', async ({ page, request }) => {
  const faults = [];
  page.on('pageerror', error => faults.push(error.message));
  page.on('dialog', async dialog => { faults.push(dialog.message()); await dialog.dismiss(); });
  const math = ['\\href{javascript:alert(1)}{x}', '\\htmlClass{evil}{x}', '\\def\\a{\\a\\a}\\a', 'x^{'.repeat(3000)];
  await seed(request, [...math.map(equation), music('X:1\nT:<img src=x onerror=alert(1)>\nK:C\nC'), music('X:1\nK:C\n<svg onload=alert(1)>'), paragraph()], 'published');
  const start = Date.now();
  await page.goto('/p/embeds');
  await expect(page.getByRole('note', { name: 'Unrendered equation' })).toHaveCount(2);
  expect(await page.locator('a[href^="javascript:"], .evil, img[onerror], [onload]').count()).toBe(0);
  expect(faults).toEqual([]);
  expect(Date.now() - start).toBeLessThan(5000);
});

for (const [label, fieldName] of [['Equation', 'LaTeX equation'], ['Music', 'ABC notation']]) {
  test(`empty ${label} still disappears on Escape`, async ({ page, request }) => {
    await seed(request, [paragraph()]);
    await page.goto('/editor/embeds');
    await page.locator('.editor-input').pressSequentially(`/${label.toLowerCase()}`);
    await page.getByRole('option', { name: label, exact: true }).click();
    await page.getByRole('textbox', { name: fieldName }).press('Escape');
    await expect(page.getByRole('textbox', { name: fieldName })).toHaveCount(0);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    expect((await saved(request)).content).not.toContain(`"type":"${label.toLowerCase()}"`);
  });
}

test('an invalid equation as the first action creates the deferred project', async ({ page, request }) => {
  await seed(request, [paragraph()]);
  await page.goto('/editor/new');
  await page.locator('.editor-input').pressSequentially('/equation');
  await page.getByRole('option', { name: 'Equation', exact: true }).click();
  expect((await saved(request)).creations).toBe(0);
  await page.getByRole('textbox', { name: 'LaTeX equation' }).fill(invalidMath);
  await page.getByRole('textbox', { name: 'LaTeX equation' }).press('Escape');
  await expect.poll(async () => (await saved(request)).creations).toBe(1);
  expect((await saved(request)).content).toContain('frac');
  await expect(page.locator('.embed-invalid')).toHaveCount(1);
});

test('pasted invalid HTML source is retained and external source is bounded to 10k', async ({ page, request }) => {
  await seed(request, [paragraph()]);
  await page.goto('/editor/embeds');
  const editor = page.locator('.editor-input');
  await editor.click();
  const paste = html => editor.evaluate((element, value) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html', value);
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
  }, html);
  await paste(`<div data-lexical-equation="${invalidMath}">${invalidMath}</div>`);
  await expect(page.locator('.embed-invalid')).toHaveCount(1);
  await expect.poll(async () => (await saved(request)).content).toContain('frac');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+End');
  await paste(`<div data-lexical-equation="${'x'.repeat(10001)}">x</div>`);
  await expect.poll(async () => {
    const nodes = JSON.parse((await saved(request)).content).root.children;
    return nodes.filter(node => node.type === 'equation').some(node => node.equation.length === 10000);
  }).toBe(true);
});

test('the counter focuses the first invalid score on a narrow screen', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(request, [paragraph('Introduction'), music(invalidMusic), paragraph()]);
  await page.goto('/editor/embeds');
  await page.getByRole('button', { name: '1 music score with errors', exact: true }).click();
  await expect(page.locator('.editor-music-rendered.embed-invalid')).toBeFocused();
  await expect(page.locator('.embed-error-label')).toHaveText('music score with errors');
});

for (const width of [1280, 390]) {
  for (const kind of ['equation', 'music']) {
    test(`${kind} oversized draft stays local while surrounding text saves at ${width}px`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: 850 });
      await seed(request, [kind === 'equation' ? equation('x') : music(validMusic), paragraph('Surrounding text')]);
      await page.goto('/editor/embeds');
      await page.locator(kind === 'equation' ? '.editor-equation-rendered' : '.editor-music-rendered').dblclick();
      const field = page.getByRole('textbox', { name: kind === 'equation' ? 'LaTeX equation' : 'ABC notation' });
      const draft = 'x'.repeat(10001);
      await field.fill(draft);
      await field.press(kind === 'equation' ? 'Enter' : 'ControlOrMeta+Enter');
      await field.press('Escape');
      await expect(field).toHaveValue(draft);
      await page.locator('.trail-item-editor [contenteditable="true"] p').last().click();
      await page.keyboard.type(' remainder saved');
      await expect.poll(async () => (await saved(request)).content).toContain('remainder saved');
      const nodes = JSON.parse((await saved(request)).content).root.children;
      expect(nodes[0][kind === 'equation' ? 'equation' : 'abc']).toBe(kind === 'equation' ? 'x' : validMusic);
      await expect(field).toHaveValue(draft);
      await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
      await expect(field).toHaveCount(0);
    });
  }
}

test('editing surrounding text preserves marked numeric and oversized legacy sources', async ({ page, request }) => {
  const oversized = 'x'.repeat(10001);
  await seed(request, [equation(42), music(oversized), paragraph('Legacy note')]);
  await page.goto('/editor/embeds');
  await expect(page.locator('.embed-invalid')).toHaveCount(2);
  await page.locator('.trail-item-editor [contenteditable="true"] p').last().click();
  await page.keyboard.type(' legacy remainder saved');
  await expect.poll(async () => (await saved(request)).content).toContain('legacy remainder saved');
  const children = JSON.parse((await saved(request)).content).root.children;
  expect(children[0].equation).toBe(42);
  expect(children[1].abc).toBe(oversized);
  await page.reload();
  await expect(page.locator('.embed-invalid')).toHaveCount(2);
});

test('toolbar palette color is saved and survives a reload', async ({ page, request }) => {
  await seed(request, [paragraph('Colored words')]);
  await page.goto('/editor/embeds');
  const editor = page.locator('.editor-input');
  await editor.click();
  await editor.press('ControlOrMeta+A');
  if (await page.getByRole('button', { name: 'More formatting', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'More formatting', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Text color', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Red', exact: true }).click();
  await expect.poll(async () => (await saved(request)).content).toContain('color: var(--ed-red)');
  await page.reload();
  await expect(page.locator('.editor-input [style*="--ed-red"]')).toContainText('Colored words');
});

for (const width of [1280, 390]) {
  test(`history preview restores the selected version at ${width}px`, async ({ page, context, request }) => {
    await page.setViewportSize({ width, height: 850 });
    const previous = state([paragraph('Restored version text')]);
    await request.post(`${api}/fixture`, { data: { content: state([paragraph('Current draft text')]), historyContent: previous } });
    await page.goto('/editor/embeds');
    await page.getByRole('button', { name: 'Version history', exact: true }).click();
    const previewOpened = context.waitForEvent('page');
    await page.getByRole('link', { name: /Preview Earlier version/ }).click();
    const preview = await previewOpened;
    await preview.bringToFront();
    await preview.waitForLoadState();
    await preview.setViewportSize({ width, height: 850 });
    await expect(preview.getByRole('button', { name: 'Restore this version', exact: true })).toBeVisible();
    await preview.getByRole('button', { name: 'Restore this version', exact: true }).click();
    await preview.getByRole('alertdialog').getByRole('button', { name: 'Restore version', exact: true }).click();
    await expect.poll(async () => (await saved(request)).restores).toBe(1);
    await expect(preview.getByRole('status')).toContainText('Version restored.');
    await preview.getByRole('button', { name: 'Open editor', exact: true }).click();
    await expect(preview.locator('.editor-input')).toContainText('Restored version text');
    expect((await saved(request)).content).toBe(previous);
    await preview.close();
  });
}
