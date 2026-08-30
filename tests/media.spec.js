const { bring } = require('./helpers');
const { test, expect } = require('@playwright/test');

const WORK_PAGES = [];   // work pages now embed YouTube players, covered in cursor.spec.js

test.describe('P0 — native video playback', () => {
  for (const page_ of WORK_PAGES) {
    test(`controls are clickable and play works on ${page_}`, async ({ page }) => {
      await page.goto(page_);
      const video = page.locator('.reel video').first();
      await video.scrollIntoViewIfNeeded();

      // pointer-events must not be disabled on pages that expose native controls
      await expect(video).toHaveCSS('pointer-events', 'auto');
      await expect(video).toHaveAttribute('controls', '');

      // nothing decorative may intercept the control strip
      const box = await video.boundingBox();
      const topTag = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el ? el.tagName : null;
      }, [box.x + box.width / 2, box.y + box.height - 12]);
      expect(topTag).toBe('VIDEO');

      // paused true -> false via the media API driven by a user gesture
      expect(await video.evaluate(v => v.paused)).toBe(true);
      await video.evaluate(v => v.play());
      await expect.poll(() => video.evaluate(v => v.paused)).toBe(false);
    });

    test(`keyboard reaches the video on ${page_}`, async ({ page }) => {
      await page.goto(page_);
      const reachable = await page.evaluate(() => {
        const v = document.querySelector('.reel video');
        v.focus();
        return document.activeElement === v;
      });
      expect(reachable).toBe(true);
    });
  }
});

test.describe('homepage previews', () => {
  test('cards are real buttons with unique accessible names', async ({ page }) => {
    await page.goto('/index.html');
    const buttons = page.locator('.reel-open');
    const n = await page.locator('.reel').count();
    await expect(buttons).toHaveCount(n);
    const names = await buttons.evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
    expect(new Set(names).size).toBe(n);
    for (const n of names) expect(n).toMatch(/View project \d\d: .+/);
    // no figure is a fake button any more
    await expect(page.locator('figure[role="button"]')).toHaveCount(0);
  });

  test('gallery tiles are images, so nothing autoplays in the grid', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForTimeout(1500);
    const state = await page.evaluate(() => ({
      videos: document.querySelectorAll('.reel-preview video').length,
      playing: [...document.querySelectorAll('.reel-preview video')].filter(v => !v.paused).length,
      thumbs: document.querySelectorAll('.reel-preview .reel-thumb').length
    }));
    expect(state.playing).toBe(0);
    expect(state.thumbs).toBeGreaterThanOrEqual(8);
  });
});
