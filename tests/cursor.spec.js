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

test('section 04 uses the card layout on desktop and stays compact', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const p of ['/index.html','/ar/index.html']) {
    await page.goto(p);
    await page.waitForTimeout(1200);
    const s = await page.evaluate(() => {
      const sec = document.getElementById('confidence');
      const rows = sec.querySelectorAll('.flow-3');
      return {
        cards: sec.querySelectorAll('.fcard').length,
        rows: rows.length,
        cols: getComputedStyle(rows[0]).gridTemplateColumns.split(' ').length,
        height: Math.round(sec.getBoundingClientRect().height),
        legacyTimeline: sec.querySelectorAll('.service-journey, .service-line').length
      };
    });
    expect(s.cards).toBe(6);
    expect(s.rows).toBe(2);
    expect(s.cols).toBe(3);
    expect(s.legacyTimeline).toBe(0);
    expect(s.height).toBeLessThan(1800);
  }
});

test('mini panels never collide with their captions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const p of ['/index.html','/ar/index.html']) {
    await page.goto(p);
    await page.waitForTimeout(1200);
    const collisions = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.mini').forEach((m, i) => {
        const label = m.querySelector('b'); if (!label) return;
        const lr = label.getBoundingClientRect();
        [...m.children].forEach(c => {
          if (c === label) return;
          const cr = c.getBoundingClientRect();
          const oy = Math.min(cr.bottom, lr.bottom) - Math.max(cr.top, lr.top);
          const ox = Math.min(cr.right, lr.right) - Math.max(cr.left, lr.left);
          if (oy > 2 && ox > 2) out.push(`${i}:${c.className}`);
        });
      });
      return out;
    });
    expect(collisions, `${p} mini collisions`).toEqual([]);
  }
});
