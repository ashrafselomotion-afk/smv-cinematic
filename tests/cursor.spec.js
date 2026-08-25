const { test, expect } = require('@playwright/test');

const INNER = ['/work.html','/contact.html','/capabilities.html','/approach.html','/about.html',
  '/government-production.html','/privacy.html','/404.html',
  '/ar/work.html','/ar/contact.html','/ar/capabilities.html','/ar/approach.html',
  '/ar/about.html','/ar/government-production.html','/ar/privacy.html'];

test.describe('mouse pointer is never hidden without a replacement', () => {
  for (const p of INNER) {
    test(`native pointer visible on ${p}`, async ({ page }) => {
      await page.goto(p);
      await page.waitForTimeout(500);
      const s = await page.evaluate(() => ({
        curClass: document.documentElement.classList.contains('cur'),
        curEl: !!document.getElementById('cur'),
        body: getComputedStyle(document.body).cursor,
        link: getComputedStyle(document.querySelector('a')).cursor
      }));
      expect(s.curClass, 'inner pages must not claim the custom cursor').toBe(false);
      expect(s.body).not.toBe('none');
      expect(s.link).not.toBe('none');
    });
  }

  for (const p of ['/index.html','/ar/index.html']) {
    test(`custom cursor only where it is rendered — ${p}`, async ({ page }) => {
      await page.goto(p);
      await page.waitForTimeout(1200);
      const s = await page.evaluate(() => ({
        curClass: document.documentElement.classList.contains('cur'),
        curEl: !!document.getElementById('cur')
      }));
      // whenever the pointer is hidden, the replacement element must exist
      if (s.curClass) expect(s.curEl).toBe(true);
    });
  }

  test('native media controls keep a usable pointer', async ({ page }) => {
    await page.goto('/work.html');
    const c = await page.evaluate(() => getComputedStyle(document.querySelector('video')).cursor);
    expect(c).not.toBe('none');
  });
});

test('section 04 journey: compact spacing, rail pinned to the nodes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const p of ['/index.html','/ar/index.html']) {
    await page.goto(p);
    await page.waitForTimeout(1600);
    const s = await page.evaluate(() => {
      const sec = document.getElementById('confidence');
      const journey = sec.querySelector('.service-journey');
      const nodes = [...sec.querySelectorAll('.service-node')];
      const svg = sec.querySelector('.service-line');
      const sr = svg.getBoundingClientRect();
      const first = nodes[0].getBoundingClientRect();
      const last = nodes[nodes.length - 1].getBoundingClientRect();
      const cx = sr.left + sr.width / 2;
      return {
        stops: sec.querySelectorAll('.service-stop').length,
        sectionH: Math.round(sec.getBoundingClientRect().height),
        stopH: Math.round(sec.querySelector('.service-stop').getBoundingClientRect().height),
        railTopGap: Math.round(sr.top - (first.top + first.height / 2)),
        railBottomGap: Math.round(sr.bottom - (last.top + last.height / 2)),
        nodeOffsets: nodes.map(n => { const r = n.getBoundingClientRect(); return Math.round(r.left + r.width / 2 - cx); })
      };
    });
    expect(s.stops, `${p} stop count`).toBe(6);
    // the rail must begin and end exactly on the first and last node
    expect(Math.abs(s.railTopGap), `${p} rail overshoots the top`).toBeLessThanOrEqual(2);
    expect(Math.abs(s.railBottomGap), `${p} rail overshoots the bottom`).toBeLessThanOrEqual(2);
    // every node sits on the rail
    for (const o of s.nodeOffsets) expect(Math.abs(o), `${p} node off the rail`).toBeLessThanOrEqual(2);
    // spacing must stay content-driven, not a reserved 56vh per stop
    expect(s.stopH, `${p} stop is too tall`).toBeLessThan(360);
    expect(s.sectionH, `${p} section is too tall`).toBeLessThan(2600);
  }
});

test('section 04 rail draws and stops activate while scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html');
  await page.waitForTimeout(1800);
  const box = await page.evaluate(() => {
    const e = document.getElementById('confidence').getBoundingClientRect();
    return { top: e.top + scrollY, h: e.height };
  });
  const seen = [];
  for (const f of [0.1, 0.4, 0.9]) {
    await page.evaluate(y => window.scrollTo(0, y), box.top + f * box.h);
    await page.waitForTimeout(900);
    seen.push(await page.evaluate(() => {
      const lp = document.querySelector('.service-line-live');
      const len = parseFloat(lp.style.strokeDasharray) || 1;
      const off = parseFloat(lp.style.strokeDashoffset) || 0;
      return {
        drawn: Math.round((1 - off / len) * 100),
        active: [...document.querySelectorAll('.service-stop')].findIndex(s => s.classList.contains('is-active'))
      };
    }));
  }
  // the rail must progress, not sit frozen at its initial value
  expect(seen[1].drawn).toBeGreaterThan(seen[0].drawn);
  expect(seen[2].drawn).toBeGreaterThan(seen[1].drawn);
  expect(seen[2].drawn).toBeGreaterThanOrEqual(95);
  expect(seen[2].active).toBeGreaterThan(seen[0].active);
});
