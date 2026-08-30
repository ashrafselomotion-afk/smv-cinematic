const { bring } = require('./helpers');
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

  test('embedded players keep a usable pointer', async ({ page }) => {
    await page.goto('/work.html');
    const c = await page.evaluate(() => {
      const el = document.querySelector('.reel-frame') || document.querySelector('video');
      return el ? getComputedStyle(el).cursor : 'auto';
    });
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

test('preview gallery is visible without hovering', async ({ page }) => {
  for (const p of ['/index.html','/ar/index.html']) {
    await page.goto(p);
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const e = document.getElementById('reels').getBoundingClientRect();
      window.scrollTo(0, e.top + scrollY + 400);
    });
    await page.waitForTimeout(1200);
    const tiles = await page.evaluate(() =>
      [...document.querySelectorAll('.reel-preview .reel-thumb')].map(i => ({
        opacity: +getComputedStyle(i).opacity,
        loaded: i.complete && i.naturalWidth > 0
      })));
    expect(tiles.length).toBeGreaterThanOrEqual(8);
    for (const t of tiles) {
      expect(t.opacity, `${p} preview hidden before hover`).toBeGreaterThan(0.9);
      expect(t.loaded, `${p} thumbnail failed to load`).toBe(true);
    }
  }
});

test('section 04 rail reaches the last node', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html');
  await page.waitForTimeout(1800);
  const box = await page.evaluate(() => {
    const e = document.getElementById('confidence').getBoundingClientRect();
    return { top: e.top + scrollY, h: e.height };
  });
  await page.evaluate(y => window.scrollTo(0, y), box.top + 0.97 * box.h);
  await page.waitForTimeout(1200);
  const s = await page.evaluate(() => {
    const svg = document.querySelector('.service-line');
    const lp = document.querySelector('.service-line-live');
    const len = parseFloat(lp.style.strokeDasharray) || 1;
    const off = parseFloat(lp.style.strokeDashoffset) || 0;
    const railH = svg.getBoundingClientRect().height;
    return { shortfall: Math.round(railH - railH * (1 - off / len)),
             dashMatchesPixels: Math.abs(len - railH) < 2,
             lastLit: document.querySelectorAll('.service-stop')[5].classList.contains('is-active') };
  });
  // the dash length must be in screen pixels, or the fill stops short of the end
  expect(s.dashMatchesPixels).toBe(true);
  expect(s.shortfall).toBeLessThanOrEqual(2);
  expect(s.lastLit).toBe(true);
});

test('centred sections keep every block on the same axis (EN + AR)', async ({ page }) => {
  const PAGES = ['/index.html','/ar/index.html','/contact.html','/ar/contact.html','/404.html'];
  for (const p of PAGES) {
    await page.goto(p);
    await page.waitForTimeout(1400);
    const off = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('section,footer').forEach(sec => {
        const cs = getComputedStyle(sec);
        if (cs.textAlign !== 'center') return;
        const sr = sec.getBoundingClientRect();
        const axis = (sr.left + parseFloat(cs.paddingLeft) + sr.right - parseFloat(cs.paddingRight)) / 2;
        sec.querySelectorAll(':scope > *').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width < 5 || r.height < 5) return;
          if (getComputedStyle(el).position === 'absolute') return;
          const d = Math.round(r.left + r.width / 2 - axis);
          if (Math.abs(d) > 8) out.push(`${sec.id || sec.tagName} > ${el.tagName}.${String(el.className).slice(0,16)} off ${d}px`);
        });
      });
      return out;
    });
    expect(off, `${p} has off-axis blocks in a centred section`).toEqual([]);
  }
});

test('embedded reels play in the viewer without being downloaded', async ({ page }) => {
  // Stub Google so the test asserts our wiring, not Google's uptime.
  await page.route('https://www.youtube-nocookie.com/**', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>stub player</h1>' }));
  await page.route('https://i.ytimg.com/**', route => route.fulfill({ status: 200, contentType: 'image/gif',
    body: Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64') }));
  await page.route('https://drive.google.com/**', route => {
    const u = route.request().url();
    if (u.includes('/preview')) return route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>stub player</h1>' });
    if (u.includes('/thumbnail')) return route.fulfill({ status: 200, contentType: 'image/gif',
      body: Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64') });
    return route.continue();
  });
  for (const p of ['/index.html','/ar/index.html']) {
    await page.goto(p);
    await page.waitForTimeout(1600);
    const card = page.locator('.reel[data-drive], .reel[data-youtube]').first();
    const driveCount = await page.locator('.reel[data-drive], .reel[data-youtube]').count();
    expect(driveCount, `${p} embedded reels`).toBe(await page.locator('.reel').count());

    // the tile shows Drive's own thumbnail and never carries a local source
    const tile = await card.evaluate(c => {
      const img = c.querySelector('.reel-thumb');
      return { poster: img.currentSrc || img.src, lazy: img.loading, hasVideo: !!c.querySelector('video') };
    });
    expect(tile.poster).toMatch(/i\.ytimg\.com/);
    expect(tile.lazy).toBe('lazy');
    expect(tile.hasVideo, 'embedded cards must not ship a local video element').toBe(false);

    await bring(page, '.reel[data-drive], .reel[data-youtube]');
    await card.locator('.reel-open').click({ force: true });

    // the viewer swaps in Drive's player for each Drive-backed entry, and the
    // one actually on screen is the one that loads
    await expect(page.locator('.feed-frame')).toHaveCount(driveCount);
    await expect.poll(() => page.evaluate(() => {
      const col = document.getElementById('feedCol');
      const cr = col.getBoundingClientRect();
      const active = [...document.querySelectorAll('.feed-item')].find(it => {
        const r = it.getBoundingClientRect();
        return r.top >= cr.top - 40 && r.top < cr.top + cr.height * 0.6;
      });
      const fr = active && active.querySelector('.feed-frame');
      return fr ? (fr.getAttribute('src') || '') : 'no-frame';
    }), { timeout: 15000 }).toMatch(/drive\.google\.com\/file\/d\/.+\/preview|youtube-nocookie\.com\/embed\//);

    // closing must unload the frame — cross-origin playback cannot be paused
    await page.keyboard.press('Escape');
    await expect(page.locator('#feed')).not.toHaveClass(/open/);
    expect(await page.evaluate(() => !!document.querySelector('.feed-frame[src]'))).toBe(false);
  }
});

test('work page plays embedded projects inline', async ({ page }) => {
  for (const host of ['https://drive.google.com/**','https://www.youtube-nocookie.com/**'])
    await page.route(host, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>stub</h1>' }));
  for (const p of ['/work.html','/ar/work.html']) {
    await page.goto(p);
    await page.waitForTimeout(1200);
    const frames = page.locator('.reel .reel-frame');
    expect(await frames.count(), `${p} embedded frames`).toBe(await page.locator('.reel').count());
    // each frame must point at Drive's player and sit inside its card
    const ok = await page.evaluate(() => [...document.querySelectorAll('.reel .reel-frame')].every(f => {
      const card = f.closest('.reel').getBoundingClientRect();
      const r = f.getBoundingClientRect();
      return /drive\.google\.com\/file\/d\/.+\/preview|youtube-nocookie\.com\/embed\//.test(f.getAttribute('src') || '')
        && r.width > 0 && Math.abs(r.width - card.width) < 3;
    }));
    expect(ok).toBe(true);
    // every project title stays unique
    const titles = await page.locator('.reel h3').allTextContents();
    expect(new Set(titles).size).toBe(titles.length);
  }
});
