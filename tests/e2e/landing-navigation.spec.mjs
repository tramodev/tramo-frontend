import { test, expect } from '@playwright/test';

for (const width of [1280, 375]) {
  test(`landing navigation scrolls without changing the URL at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const originalUrl = page.url();
    for (const [label, id] of [['Product', 'product'], ['Plans', 'pricing']]) {
      if (width < 1024) await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      const navigation = width < 1024 ? page.getByRole('dialog') : page.locator('nav').first();
      await navigation.getByRole('link', { name: label, exact: true }).click();
      await expect.poll(async () => Math.abs((await page.locator(`#${id}`).boundingBox()).y)).toBeLessThan(100);
      await expect(page).toHaveURL(originalUrl);
      if (width < 1024) await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    await page.locator('nav').first().getByRole('link', { name: 'Tramo', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page).toHaveURL(originalUrl);
    if (width >= 1024) await expect(page.getByRole('button', { name: 'Resources', exact: true })).toHaveCSS('cursor', 'pointer');
  });
}
