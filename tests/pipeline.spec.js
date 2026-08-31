const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const manifest = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'content/media.json'), 'utf8'));
const PAGES = ['index.html', 'ar/index.html', 'work.html', 'ar/work.html'];

test.describe('content pipeline', () => {
  test('the pages match content/media.json', () => {
    // Anyone editing the gallery HTML by hand would have their work silently
    // overwritten by the next admin publish. Catch that here instead.
    const before = PAGES.map(p => fs.readFileSync(path.join(ROOT, p), 'utf8'));
    execFileSync('python3', ['scripts/build-gallery.py'], { cwd: ROOT });
    const after = PAGES.map(p => fs.readFileSync(path.join(ROOT, p), 'utf8'));
    const drifted = PAGES.filter((p, i) => before[i] !== after[i]);
    // put the tree back before asserting, so a failure never leaves a mess
    PAGES.forEach((p, i) => fs.writeFileSync(path.join(ROOT, p), before[i]));
    expect(drifted, 'these pages were edited by hand and no longer match the manifest').toEqual([]);
  });

  test('every page keeps its build markers', () => {
    for (const p of PAGES) {
      const src = fs.readFileSync(path.join(ROOT, p), 'utf8');
      const want = p.endsWith('work.html') ? ['PROJECTS', 'PHOTOS'] : ['SELWORK'];
      for (const m of want) {
        expect(src, `${p} lost its BUILD:${m} region`).toContain(`<!-- BUILD:${m} -->`);
        expect(src, `${p} lost its /BUILD:${m} region`).toContain(`<!-- /BUILD:${m} -->`);
      }
    }
  });

  test('the manifest is complete enough to publish', () => {
    const doc = manifest();
    expect(doc.videos.length).toBeGreaterThanOrEqual(20);
    const ids = doc.videos.map(v => v.youtube);
    expect(new Set(ids).size, 'duplicate YouTube id in the manifest').toBe(ids.length);
    for (const v of doc.videos) {
      for (const k of ['youtube', 'titleEn', 'titleAr', 'typeEn', 'typeAr']) {
        expect(v[k], `${v.youtube} is missing ${k}`).toBeTruthy();
      }
    }
    const feat = doc.videos.filter(v => v.featured);
    expect(feat.length, 'homepage shortlist').toBeGreaterThanOrEqual(3);
    expect(feat.length).toBeLessThanOrEqual(5);
    // featured order must be 1..n with no gaps, or the homepage numbering lies
    expect(feat.map(v => v.featured).sort((a, b) => a - b))
      .toEqual(feat.map((_, i) => i + 1));
    // photography is published only with a description in both languages
    for (const p of doc.photos || []) {
      expect(p.file, 'photo without a file').toBeTruthy();
      expect(p.altEn, `${p.file} has no English description`).toBeTruthy();
      expect(p.altAr, `${p.file} has no Arabic description`).toBeTruthy();
    }
  });

  test('every self-hosted media file the manifest names actually exists', () => {
    const doc = manifest();
    const missing = [];
    const check = f => {
      if (!f || f.includes('://')) return;
      if (!fs.existsSync(path.join(ROOT, f))) missing.push(f);
    };
    doc.videos.forEach(v => { check(v.preview); check(v.poster); });
    (doc.photos || []).forEach(p => check(p.file));
    expect(missing, 'the manifest points at files that are not in the repository').toEqual([]);
  });

  test('locale-relative media paths resolve from the page that uses them', () => {
    for (const p of PAGES) {
      const src = fs.readFileSync(path.join(ROOT, p), 'utf8');
      const ar = p.startsWith('ar/');
      const refs = [...src.matchAll(/(?:src|poster)="(media\/[^"]+|\.\.\/media\/[^"]+)"/g)].map(m => m[1]);
      for (const r of refs) {
        if (ar) expect(r, `${p} points at ${r}, which resolves inside /ar/`).toMatch(/^\.\.\/media\//);
        else expect(r, `${p} should not climb out of the root`).toMatch(/^media\//);
      }
    }
  });
});

test.describe('admin page', () => {
  test('stays out of search results and out of the sitemap', async ({ page }) => {
    const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    expect(sitemap).not.toContain('/admin');
    const res = await page.goto('/admin/index.html');
    expect(res.status()).toBe(200);
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  });

  test('can only talk to GitHub, and starts signed out', async ({ page }) => {
    await page.goto('/admin/index.html');
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    // a compromised admin page must not be able to post the token anywhere else
    expect(csp).toContain("connect-src 'self' https://api.github.com");
    expect(csp).toContain("form-action 'none'");
    await expect(page.locator('#connect')).toBeVisible();
    await expect(page.locator('#editor')).toBeHidden();
    // the publish overlay must never sit on top of the page while idle
    await expect(page.locator('#sheet')).toBeHidden();
    expect(await page.evaluate(() =>
      getComputedStyle(document.getElementById('sheet')).display)).toBe('none');
  });

  test('the token field is a password field and is never pre-filled', async ({ page }) => {
    await page.goto('/admin/index.html');
    await expect(page.locator('#token')).toHaveAttribute('type', 'password');
    expect(await page.locator('#token').inputValue()).toBe('');
    expect(await page.locator('#token').getAttribute('autocomplete')).toBe('off');
  });
});

test.describe('photography panel', () => {
  test('emptying the photo list restores the empty state instead of stranding a grid', () => {
    const file = path.join(ROOT, 'content/media.json');
    const original = fs.readFileSync(file, 'utf8');
    const pages = ['work.html', 'ar/work.html'];
    const snapshot = pages.map(p => fs.readFileSync(path.join(ROOT, p), 'utf8'));
    try {
      const doc = JSON.parse(original);
      doc.photos = [{ file: 'media/photos/probe.jpg', altEn: 'probe', altAr: 'probe',
                      width: 10, height: 10 }];
      fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
      execFileSync('python3', ['scripts/build-gallery.py'], { cwd: ROOT });
      for (const p of pages) {
        expect(fs.readFileSync(path.join(ROOT, p), 'utf8'), `${p} should show a grid`)
          .toContain('photo-grid');
      }
      fs.writeFileSync(file, original);
      execFileSync('python3', ['scripts/build-gallery.py'], { cwd: ROOT });
      for (const p of pages) {
        const src = fs.readFileSync(path.join(ROOT, p), 'utf8');
        expect(src, `${p} kept a grid with no photos behind it`).not.toContain('photo-grid');
        expect(src, `${p} lost the empty state`).toContain('photo-empty');
      }
    } finally {
      fs.writeFileSync(file, original);
      pages.forEach((p, i) => fs.writeFileSync(path.join(ROOT, p), snapshot[i]));
    }
  });
});

test.describe('selected-productions strip', () => {
  const HOMES = ['/index.html', '/ar/index.html'];

  test('renders every client from the manifest, twice, with the copy hidden', async ({ page }) => {
    const want = manifest().clients.length;
    for (const p of HOMES) {
      await page.goto(p);
      await page.waitForTimeout(600);
      const groups = page.locator('.cred-strip .logo-group');
      await expect(groups).toHaveCount(2);
      await expect(page.locator('.cred-strip .client-logo')).toHaveCount(want * 2);
      // the seam copy must not make a screen reader announce every name twice
      await expect(groups.nth(1)).toHaveAttribute('aria-hidden', 'true');
      expect(await groups.nth(0).getAttribute('aria-hidden')).toBeNull();
      await expect(page.locator('.cred-strip')).toHaveAttribute('aria-label', /.+/);
    }
  });

  test('shows no logo image the manifest has not supplied', async ({ page }) => {
    // We never draw approximations of other organisations' trademarks. A mark
    // is an image only when a real file exists; otherwise it is typeset.
    const supplied = manifest().clients.filter(c => c.logo).length;
    for (const p of HOMES) {
      await page.goto(p);
      await expect(page.locator('.cred-strip img')).toHaveCount(supplied * 2);
      const marks = await page.locator('.cred-strip .textmark').count();
      expect(marks).toBe((manifest().clients.length - supplied) * 2);
    }
  });

  test('replaced the kinetic band rather than sitting alongside it', async ({ page }) => {
    for (const p of HOMES) {
      await page.goto(p);
      await expect(page.locator('.band, #bandTrack')).toHaveCount(0);
      await expect(page.locator('.cred-strip')).toHaveCount(1);
    }
  });

  test('the marquee parks itself when motion is not wanted', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/index.html');
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => {
      const rail = document.querySelector('.logo-rail');
      const cs = getComputedStyle(rail);
      const dup = document.querySelector('.logo-group[aria-hidden="true"]');
      return { anim: cs.animationName, dupShown: getComputedStyle(dup).display !== 'none' };
    });
    expect(state.anim, 'the strip keeps scrolling under reduced motion').toBe('none');
    expect(state.dupShown, 'the seam copy is pointless once the rail is parked').toBe(false);
    await ctx.close();
  });

  test('does not push the page sideways in either locale', async ({ page }) => {
    for (const p of HOMES) {
      await page.goto(p);
      await page.waitForTimeout(700);
      const over = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `${p} overflows by ${over}px`).toBeLessThanOrEqual(1);
      // and the rail must actually be on screen, not parked off to one side
      const onScreen = await page.evaluate(() =>
        [...document.querySelectorAll('.client-logo')].filter(el => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.right > 0 && b.left < innerWidth;
        }).length);
      expect(onScreen, `${p} shows no client marks`).toBeGreaterThan(2);
    }
  });

  test('every client in the manifest is named in both languages', () => {
    for (const c of manifest().clients) {
      expect(c.name, 'client without a name').toBeTruthy();
      expect(c.subEn, `${c.name} has no English descriptor`).toBeTruthy();
      expect(c.subAr, `${c.name} has no Arabic descriptor`).toBeTruthy();
    }
  });
});
