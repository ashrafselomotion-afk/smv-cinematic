const { test, expect } = require('@playwright/test');

test.describe('content visibility without JS / motion', () => {
  test('all content is visible with JavaScript disabled', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    for (const p of ['/index.html','/ar/index.html','/work.html']) {
      await page.goto('http://127.0.0.1:8742' + p);
      const hidden = await page.evaluate(() => {
        return [...document.querySelectorAll('.reveal, h1, h2, .fcard, .ncell, .reel')]
          .filter(el => !el.closest('#rp, #feed, #mmenu') && !el.classList.contains('sr-only'))
          .filter(el => {
            const s = getComputedStyle(el);
            return +s.opacity < 0.9 || s.visibility === 'hidden';
          }).length;
      });
      expect(hidden, `${p} hides content without JS`).toBe(0);
    }
    await ctx.close();
  });

  test('reduced motion keeps every element visible and the poster in place', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:8742/index.html');
    await page.waitForTimeout(1200);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('.reveal,h1,h2,.fcard,.ncell')]
        .filter(el => !el.closest('#rp, #feed, #mmenu') && !el.classList.contains('sr-only'))
        .filter(el => +getComputedStyle(el).opacity < 0.9).length);
    expect(hidden).toBe(0);
    // hero must not autoplay; poster stays
    const heroPlaying = await page.evaluate(() => {
      const v = document.querySelector('#hero .vid');
      return !!v.getAttribute('src') && !v.paused;
    });
    expect(heroPlaying).toBe(false);
    await ctx.close();
  });

  test('Three.js is not loaded under reduced motion', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const three = [];
    page.on('request', r => { if (r.url().includes('three.module')) three.push(r.url()); });
    await page.goto('http://127.0.0.1:8742/index.html');
    await page.mouse.move(200, 200);
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(1500);
    expect(three).toEqual([]);
    await ctx.close();
  });

  test('print stylesheet reveals everything', async ({ page }) => {
    await page.goto('/index.html');
    await page.emulateMedia({ media: 'print' });
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('.reveal,h2,.fcard,.ncell')]
        .filter(el => !el.closest('#rp, #feed, #mmenu') && !el.classList.contains('sr-only'))
        .filter(el => +getComputedStyle(el).opacity < 0.9).length);
    expect(hidden).toBe(0);
    await page.emulateMedia({ media: 'screen' });
  });
});

test('all internal assets return 200', async ({ page, request }) => {
  const PAGES = ['/index.html','/work.html','/about.html','/contact.html','/privacy.html',
    '/404.html','/ar.html',
    '/ar/index.html','/ar/work.html','/ar/about.html','/ar/contact.html','/ar/privacy.html',
    '/site.webmanifest','/og.jpg','/favicon.ico','/robots.txt','/sitemap.xml'];
  for (const p of PAGES) {
    const r = await request.get(p);
    expect(r.status(), `${p} -> ${r.status()}`).toBe(200);
  }

  // every asset referenced by the two homepages resolves
  for (const home of ['/index.html','/ar/index.html']) {
    await page.goto(home);
    const urls = await page.evaluate(() => {
      const abs = u => new URL(u, location.href).href;
      const out = new Set();
      document.querySelectorAll('link[rel="stylesheet"],link[rel="icon"],link[rel="manifest"],link[rel="preload"],script[src],img[src],video[poster],video[src],video[data-src]').forEach(el => {
        ['href','src','poster','data-src'].forEach(a => {
          const v = el.getAttribute(a);
          if (!v || v.startsWith('data:') || v.startsWith('mailto:')) return;
          const u = abs(v);
          if (new URL(u).origin === location.origin) out.add(u);
        });
      });
      return [...out];
    });
    for (const u of urls) {
      const r = await request.get(u);
      expect(r.status(), `${home} -> ${u} -> ${r.status()}`).toBe(200);
    }
  }
});

test('deep links land below the fixed navigation', async ({ page }) => {
  for (const [url, id] of [['/contact.html#credentials','credentials'], ['/contact.html#brief-sec','brief-sec']]) {
    await page.goto(url);
    await page.waitForTimeout(400);
    const ok = await page.evaluate(id => {
      const t = document.getElementById(id);
      const navB = document.getElementById('nav').getBoundingClientRect().bottom;
      return t.getBoundingClientRect().top >= navB - 2;
    }, id);
    expect(ok, `${url} hidden behind nav`).toBe(true);
  }
});

test('no page links to something that is not there', async ({ page, request }) => {
  // Removing a page is easy; removing every link into it is what gets missed.
  const PAGES = ['/index.html','/work.html','/about.html','/contact.html','/privacy.html',
    '/404.html','/ar/index.html','/ar/work.html','/ar/about.html','/ar/contact.html',
    '/ar/privacy.html'];
  const checked = new Map();
  const broken = [];
  for (const p of PAGES) {
    await page.goto(p);
    const links = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')]
        .map(a => a.getAttribute('href'))
        .filter(h => h && !/^(#|mailto:|tel:|https?:)/.test(h))
        .map(h => new URL(h, location.href).pathname));
    for (const href of new Set(links)) {
      if (!checked.has(href)) checked.set(href, (await request.get(href)).status());
      if (checked.get(href) !== 200) broken.push(`${p} -> ${href} (${checked.get(href)})`);
    }
  }
  expect(checked.size, 'no internal links were found at all').toBeGreaterThan(5);
  expect(broken, 'dead internal links').toEqual([]);
});
