import { test, expect } from '@playwright/test';
import { SECTIONS } from '@/app/wiki/content';

test('wiki screenshots preserve their dimensions without resize warnings', async ({ page }) => {
  test.setTimeout(120000);
  const warnings = [];
  page.on('console', message => {
    if (message.text().includes('has either width or height modified')) warnings.push(message.text());
  });
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const { id: slug } of SECTIONS) {
      await page.goto(`/wiki/${slug}`);
      for (const image of await page.locator('article img').all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
        const dimensions = await image.evaluate(element => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height, naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight, left: rect.left, right: rect.right };
        });
        expect(Math.abs(dimensions.height - dimensions.width * dimensions.naturalHeight / dimensions.naturalWidth)).toBeLessThan(1);
        expect(dimensions.left).toBeGreaterThanOrEqual(0);
        expect(dimensions.right).toBeLessThanOrEqual(width);
      }
    }
  }
  expect(warnings).toEqual([]);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test(`wiki loads only the leading screenshot eagerly at ${viewport.width}px`, async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      window.wikiLcp = [];
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.wikiLcp.push({ tag: entry.element?.tagName, src: entry.element?.getAttribute('src'), size: entry.size });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    const results = [];
    for (const section of SECTIONS) {
      await page.goto(`/wiki/${section.id}`);
      const images = page.locator('article img');
      await expect(images.first()).toHaveAttribute('loading', 'eager');
      await expect(page.locator('article img[loading="eager"]')).toHaveCount(1);
      await expect(page.locator('article img:not([loading="eager"]):not([loading="lazy"])')).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('article img')].filter(image => {
        const rect = image.getBoundingClientRect();
        return rect.top < innerHeight && rect.bottom > 0;
      }).every(image => image.complete))).toBe(true);
      await page.waitForLoadState('networkidle');
      const lcp = await page.evaluate(() => window.wikiLcp.at(-1));
      if (lcp?.tag === 'IMG') await expect(page.locator(`article img[src="${lcp.src}"]`)).toHaveAttribute('loading', 'eager');
      results.push(await page.evaluate(slug => ({
        slug,
        lcp: window.wikiLcp.at(-1),
        images: [...document.querySelectorAll('article img')].map(image => ({ src: image.getAttribute('src'), top: Math.round(image.getBoundingClientRect().top), loading: image.loading })).filter(image => image.top < innerHeight),
      }), section.id));
    }
    await testInfo.attach('wiki-image-loading.json', { body: JSON.stringify({ viewport, results }, null, 2), contentType: 'application/json' });
  });
}

test('measure a direct link to a later wiki screenshot', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const warnings = [];
  page.on('console', message => {
    if (message.text().includes('Largest Contentful Paint')) warnings.push(message.text());
  });
  await page.goto('/wiki/projects#feature-3');
  const image = page.locator('img[src="/wiki/projects/delete.webp"]');
  await expect(image).toBeInViewport();
  await expect.poll(() => image.evaluate(element => element.complete)).toBe(true);
  await page.waitForLoadState('networkidle');
  await testInfo.attach('wiki-deep-link.json', { body: JSON.stringify({ warnings, loading: await image.getAttribute('loading') }, null, 2), contentType: 'application/json' });
});
