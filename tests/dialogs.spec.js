const { bring, clickAt } = require('./helpers');
const { test, expect } = require('@playwright/test');

test.describe('showreel dialog', () => {
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

  test('exposes play state, mute, time, duration and an accessible slider', async ({ page }) => {
    await page.goto('/index.html');
    await clickAt(page, '#openShowreel');
    const range = page.locator('#rpRange');
    await expect(range).toHaveAttribute('aria-label', /seek/i);
    await expect(page.locator('#rpPlay')).toHaveAttribute('aria-pressed', /true|false/);
    await expect(page.locator('#rpMute')).toHaveAttribute('aria-pressed', /true|false/);
    await expect.poll(() => page.locator('#rpDur').textContent()).not.toBe('00:00:00');
    await page.locator('#rpPlay').click();
    await expect(page.locator('#rpPlay')).toHaveAttribute('aria-pressed', /true|false/);
  });
});

test.describe('selected-work viewer', () => {
  test('opens filtered and reports the filtered count', async ({ page }) => {
    await page.goto('/index.html');
    await clickAt(page, '[data-filter="aerial"]');
    await page.waitForTimeout(900);

    const visible = page.locator('.reel:not(.is-hidden)');
    const n = await visible.count();
    expect(n).toBe(3);

    await visible.first().locator('.reel-open').click({ force: true });
    const feed = page.locator('#feed');
    await expect(feed).toHaveClass(/open/);
    await expect(page.locator('#feedCol .feed-item')).toHaveCount(n);
    await expect(page.locator('#feedCount')).toHaveText(new RegExp(`/ 0?${n}`));

    // keyboard play/pause control exists inside the viewer
    expect(await page.locator('.feed-item .feed-toggle').count()).toBe(n);
    expect(await page.locator('.feed-item .feed-toggle').first().getAttribute('aria-pressed')).toMatch(/true|false/);

    await page.keyboard.press('Escape');
    await expect(feed).not.toHaveClass(/open/);
  });
});

test.describe('mobile menu', () => {
  test('traps focus, Escape closes, focus restored, background inert', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/capabilities.html');
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
