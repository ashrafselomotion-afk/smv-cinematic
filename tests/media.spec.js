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

test.describe('projects grid', () => {
  test('every project player is named, and no figure fakes a button', async ({ page }) => {
    for (const p of ['/work.html','/ar/work.html']) {
      await page.goto(p);
      const frames = page.locator('#panelVideo .reel .reel-frame');
      const n = await page.locator('#panelVideo .reel').count();
      expect(n, `${p} projects`).toBeGreaterThanOrEqual(20);
      await expect(frames).toHaveCount(n);
      // an iframe's accessible name is its title, and each must identify its own film
      const titles = await frames.evaluateAll(els => els.map(e => e.getAttribute('title')));
      expect(titles.every(t => t && t.trim().length > 3), `${p} unnamed player`).toBe(true);
      expect(new Set(titles).size).toBe(n);
      // the card heading and the player name agree
      const heads = await page.locator('#panelVideo .reel h3').allTextContents();
      expect(titles.map(t => t.trim())).toEqual(heads.map(h => h.trim()));
      // no figure is a fake button any more
      await expect(page.locator('figure[role="button"]')).toHaveCount(0);
    }
  });
});

test.describe('homepage selected work', () => {
  test('the shortlist is buttons with unique accessible names', async ({ page }) => {
    await page.goto('/index.html');
    const items = page.locator('#swList .sw-item');
    const n = await items.count();
    expect(n).toBeGreaterThanOrEqual(3);
    expect(await items.evaluateAll(els => els.every(e => e.tagName === 'BUTTON'))).toBe(true);
    const names = await items.evaluateAll(els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    expect(new Set(names).size).toBe(n);
    // the stage's own control is a button too, with its own label
    await expect(page.locator('#swOpen')).toHaveAttribute('aria-label', /.+/);
  });

  test('the stage is an image, so nothing autoplays on the homepage', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForTimeout(1500);
    const state = await page.evaluate(() => ({
      videos: document.querySelectorAll('.sw-stage video, .reel video').length,
      frames: document.querySelectorAll('.selwork iframe').length,
      shots: document.querySelectorAll('.sw-stage img').length
    }));
    expect(state.videos, 'no video element in the selected-work block').toBe(0);
    expect(state.frames, 'no player is embedded until the viewer opens').toBe(0);
    expect(state.shots).toBeGreaterThanOrEqual(3);
  });
});
