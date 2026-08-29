const { bring } = require('./helpers');
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const PAGES = ['/index.html','/work.html','/government-production.html','/capabilities.html',
  '/approach.html','/about.html','/contact.html','/privacy.html','/404.html',
  '/ar/index.html','/ar/work.html','/ar/government-production.html','/ar/capabilities.html',
  '/ar/approach.html','/ar/about.html','/ar/contact.html','/ar/privacy.html'];

for (const p of PAGES) {
  test(`no serious/critical axe violations — ${p}`, async ({ page }) => {
    await page.goto(p);
    // wait for the intro animation to settle: axe must not sample mid-transition colours
    await page.waitForFunction(() => {
      const n = document.getElementById('nav');
      return !n || getComputedStyle(n).opacity === '1';
    }, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);
    const res = await new AxeBuilder({ page })
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])
      .analyze();
    const bad = res.violations.filter(v => ['serious','critical'].includes(v.impact));
    if (bad.length) console.log(p, JSON.stringify(bad.map(v => ({ id:v.id, impact:v.impact, nodes:v.nodes.length, target:v.nodes[0]?.target })), null, 1));
    expect(bad).toEqual([]);
  });
}

test('single H1 and skip link targets #main on both locales', async ({ page }) => {
  for (const p of ['/index.html','/ar/index.html']) {
    await page.goto(p);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('a.skip')).toHaveAttribute('href', '#main');
    expect(await page.locator('main#main').count()).toBe(1);
    // the skip target contains the H1 (does not skip past the hero)
    expect(await page.evaluate(() => document.querySelector('main#main').contains(document.querySelector('h1')))).toBe(true);
  }
});

test('theme toggle exposes state and updates theme-color', async ({ page }) => {
  await page.goto('/index.html');
  const btn = page.locator('#themeBtn');
  await expect(btn).toHaveAttribute('aria-pressed', /true|false/);
  const label1 = await btn.getAttribute('aria-label');
  expect(label1).toMatch(/Switch to (dark|light) mode/);
  await btn.click();
  const label2 = await btn.getAttribute('aria-label');
  expect(label2).not.toBe(label1);
  const tc = await page.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
  expect(['#111418','#DDE0E4']).toContain(tc);
});

test('arabic theme toggle label is localized', async ({ page }) => {
  await page.goto('/ar/index.html');
  const label = await page.locator('#themeBtn').getAttribute('aria-label');
  expect(label).toMatch(/التبديل/);
});

test('mobile interactive targets are at least 44x44', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const p of ['/index.html','/ar/index.html','/contact.html']) {
    await page.goto(p);
    // the 44px rules ride on a media query; wait for layout rather than racing it
    await page.waitForFunction(() => {
      const b = document.getElementById('menuBtn');
      return b && b.getBoundingClientRect().height >= 44;
    }, null, { timeout: 8000 }).catch(() => {});
    const small = await page.evaluate(() => {
      const sel = '#menuBtn,#themeBtn,#nav .lang a,.filters button,#feedClose,#rpClose,#feedMute';
      return [...document.querySelectorAll(sel)].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
      }).map(el => (el.id || el.className) + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height));
    });
    expect(small, `${p} has undersized targets`).toEqual([]);
  }
});

test('focus is never hidden behind the fixed nav on deep links', async ({ page }) => {
  await page.goto('/capabilities.html#cap-01');
  await page.waitForTimeout(500);
  const ok = await page.evaluate(() => {
    const t = document.getElementById('cap-01');
    const navB = document.getElementById('nav').getBoundingClientRect().bottom;
    return t.getBoundingClientRect().top >= navB - 2;
  });
  expect(ok).toBe(true);
});

test('auto-hidden nav returns on focus-within', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => document.documentElement.classList.add('nav-hide'));
  const hidden = await page.evaluate(() => getComputedStyle(document.getElementById('nav')).transform);
  // focus the first control that is actually rendered at this viewport
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('#nav a, #nav button')]
      .find(e => e.offsetParent !== null);
    el.focus();
  });
  await page.waitForTimeout(300);
  const shown = await page.evaluate(() => {
    const n = document.getElementById('nav').getBoundingClientRect();
    return n.bottom > 0 && n.top < innerHeight;
  });
  expect(shown).toBe(true);
});
