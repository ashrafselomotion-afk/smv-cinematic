const { bring, clickAt } = require('./helpers');
const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });
test.describe('showreel dialog', () => {
  test.beforeEach(async ({ page }) => {
    for (const host of ['https://drive.google.com/**','https://www.youtube-nocookie.com/**'])
      await page.route(host, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>stub</h1>' }));
  });
  test('focus moves in, Escape closes, focus returns, background inert', async ({ page }) => {
    await page.goto('/index.html');
    const opener = page.locator('#openShowreel');
    await clickAt(page, '#openShowreel');

    const rp = page.locator('#rp');
    await expect(rp).toHaveClass(/open/);
    await expect(page.locator('#rpClose')).toBeFocused();
    // background removed from the a11y tree
    expect(await page.evaluate(() => document.getElementById('nav').hasAttribute('inert'))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.classList.contains('modal-open'))).toBe(true);

    // Tab stays inside the dialog
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.getElementById('rp').contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => document.getElementById('rp').contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(rp).not.toHaveClass(/open/);
    await expect(opener).toBeFocused();
    expect(await page.evaluate(() => document.getElementById('nav').hasAttribute('inert'))).toBe(false);
  });

  test('player transport matches the configured source', async ({ page }) => {
    await page.goto('/index.html');
    await clickAt(page, '#openShowreel');
    const embed = await page.evaluate(() => !!document.getElementById('rp').dataset.drive);

    if (embed) {
      // Drive supplies its own player: the frame must load and be titled,
      // and our non-functional custom transport must be hidden, not shown broken.
      const frame = page.locator('#rpFrame');
      await expect(frame).toBeVisible();
      await expect(frame).toHaveAttribute('title', /showreel/i);
      await expect.poll(() => page.evaluate(() => document.getElementById('rpFrame').getAttribute('src') || ''))
        .toMatch(/drive\.google\.com\/file\/d\/.+\/preview/);
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('.rp-ui')).display)).toBe('none');
      // the frame must fit inside the viewport at the declared aspect
      const fits = await page.evaluate(() => {
        const r = document.getElementById('rpFrame').getBoundingClientRect();
        return r.top >= -1 && r.bottom <= innerHeight + 1 && r.width > 50;
      });
      expect(fits).toBe(true);
    } else {
      const range = page.locator('#rpRange');
      await expect(range).toHaveAttribute('aria-label', /seek/i);
      await expect(page.locator('#rpPlay')).toHaveAttribute('aria-pressed', /true|false/);
      await expect(page.locator('#rpMute')).toHaveAttribute('aria-pressed', /true|false/);
      await expect.poll(() => page.locator('#rpDur').textContent()).not.toBe('00:00:00');
    }
  });

  test('closing the embed stops playback by clearing the frame', async ({ page }) => {
    await page.goto('/index.html');
    const embed = await page.evaluate(() => !!document.getElementById('rp').dataset.drive);
    test.skip(!embed, 'self-hosted transport in use');
    await clickAt(page, '#openShowreel');
    await expect.poll(() => page.evaluate(() => !!document.getElementById('rpFrame').getAttribute('src'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#rp')).not.toHaveClass(/open/);
    expect(await page.evaluate(() => document.getElementById('rpFrame').getAttribute('src'))).toBeNull();
  });
});

test.describe('selected-work viewer', () => {
  test('opens on the chosen card and lists the whole gallery', async ({ page }) => {
    await page.goto('/index.html');
    await bring(page, '.selwork');
    const total = await page.locator('#swList .sw-item').count();

    // activate the stage directly: this asserts the viewer's behaviour, not
    // pixel hit-testing (covered separately), and cannot race the smooth scroll
    await page.evaluate(() => document.getElementById('swOpen').click());
    const feed = page.locator('#feed');
    await expect(feed).toHaveClass(/open/);
    await expect(page.locator('#feedCol .feed-item')).toHaveCount(total);
    await expect(page.locator('#feedCount')).toHaveText(new RegExp(`/ ${String(total).padStart(2, '0')}`));

    // every entry is an embedded player; none ship a local video
    expect(await page.locator('#feedCol .feed-frame').count()).toBe(total);
    expect(await page.locator('#feedCol video').count()).toBe(0);

    await page.keyboard.press('Escape');
    await expect(feed).not.toHaveClass(/open/);
  });
});

test.describe('mobile menu', () => {
  test('traps focus, Escape closes, focus restored, background inert', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/capabilities.html');
    // the shared runtime attaches the menu handler on load; don't race it
    await page.waitForFunction(() => typeof window.__smvSetMenu === 'function', null, { timeout: 10000 });
    const btn = page.locator('#menuBtn');
    await btn.click();
    expect(await page.evaluate(() => document.documentElement.classList.contains('menu-open'))).toBe(true);
    expect(await page.evaluate(() => document.getElementById('nav').hasAttribute('inert'))).toBe(true);
    for (let i = 0; i < 10; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.getElementById('mmenu').contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.documentElement.classList.contains('menu-open'))).toBe(false);
    await expect(btn).toBeFocused();
  });
});

test.describe('selected-work viewer', () => {
  const activeFrame = page => () => page.evaluate(() => {
    const col = document.getElementById('feedCol'), cr = col.getBoundingClientRect();
    const active = [...document.querySelectorAll('.feed-item')].find(it => {
      const r = it.getBoundingClientRect();
      return r.top >= cr.top - 40 && r.top < cr.top + cr.height * 0.6;
    });
    const fr = active && active.querySelector('.feed-frame');
    return fr ? (fr.getAttribute('src') || '') : 'no-frame';
  });

  test('opens on whichever entry is current', async ({ page }) => {
    await page.route('https://www.youtube-nocookie.com/**', r =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>stub player</h1>' }));
    await page.goto('/index.html');
    await bring(page, '.selwork');

    // path 1 — activating an entry opens that entry
    const third = page.locator('#swList .sw-item').nth(2);
    const thirdId = await third.evaluate(el => el.dataset.youtube);
    // activate directly: hit-testing through the smooth-scroll wrapper is covered elsewhere
    await third.evaluate(el => el.click());
    await expect(page.locator('#feed')).toHaveClass(/open/);
    await expect(page.locator('#feedCount')).toHaveText(/^03/);
    await expect.poll(activeFrame(page), { timeout: 15000 }).toContain(thirdId);
    await page.keyboard.press('Escape');
    await expect(page.locator('#feed')).not.toHaveClass(/open/);

    // path 2 — highlighting an entry, then pressing play on the stage, opens the same film
    const fourth = page.locator('#swList .sw-item').nth(3);
    const fourthId = await fourth.evaluate(el => el.dataset.youtube);
    await fourth.evaluate(el => el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false })));
    await expect(fourth).toHaveAttribute('aria-current', 'true');
    await page.evaluate(() => document.getElementById('swOpen').click());
    await expect(page.locator('#feedCount')).toHaveText(/^04/);
    await expect.poll(activeFrame(page), { timeout: 15000 }).toContain(fourthId);
    await page.keyboard.press('Escape');
    await expect(page.locator('#feed')).not.toHaveClass(/open/);
  });
});
