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
  const PAGES = ['work.html', 'ar/work.html'];

  function withManifest(mutate, check) {
    const file = path.join(ROOT, 'content/media.json');
    const original = fs.readFileSync(file, 'utf8');
    const snapshot = PAGES.map(p => fs.readFileSync(path.join(ROOT, p), 'utf8'));
    try {
      const doc = JSON.parse(original);
      mutate(doc);
      fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
      execFileSync('python3', ['scripts/build-gallery.py'], { cwd: ROOT });
      check(PAGES.map(p => fs.readFileSync(path.join(ROOT, p), 'utf8')));
    } finally {
      fs.writeFileSync(file, original);
      PAGES.forEach((p, i) => fs.writeFileSync(path.join(ROOT, p), snapshot[i]));
    }
  }
  const panelOf = src => src.slice(src.indexOf('BUILD:PHOTOS'), src.indexOf('/BUILD:PHOTOS'));

  test('every category is listed, with an album for each of its slots', () => {
    const cats = manifest().photoCategories;
    expect(cats.length, 'no photo categories defined').toBeGreaterThan(0);
    const want = cats.reduce((n, c) => n + c.slots, 0);
    for (const p of PAGES) {
      const panel = panelOf(fs.readFileSync(path.join(ROOT, p), 'utf8'));
      expect((panel.match(/class="album[" ]/g) || []).length, `${p} album count`).toBe(want);
      // "all" plus one entry per category
      expect((panel.match(/class="pcat/g) || []).length, `${p} category list`).toBe(cats.length + 1);
      for (const c of cats) {
        const label = p.startsWith('ar/') ? c.labelAr : c.labelEn;
        expect(panel, `${p} is missing the ${c.key} entry`).toContain(label);
        expect(panel, `${p} has no album tagged ${c.key}`).toContain(`data-cat="${c.key}"`);
      }
    }
  });

  test('an album with no stills carries no image and says so', () => {
    for (const p of PAGES) {
      const panel = panelOf(fs.readFileSync(path.join(ROOT, p), 'utf8'));
      // stock imagery must never stand in for the archive
      expect(panel, `${p} put an image in an empty archive`).not.toContain('<img');
      expect((panel.match(/class="album is-empty"/g) || []).length,
        `${p} empty albums are not marked`).toBeGreaterThan(0);
    }
  });

  test('a real album takes a slot in its own category and keeps its cover', () => {
    const cats = manifest().photoCategories;
    const target = cats[0];
    const before = (fs.readFileSync(path.join(ROOT, 'work.html'), 'utf8')
      .match(/class="album[" ]/g) || []).length;

    withManifest(doc => {
      doc.photoAlbums = [{ key: 'probe', category: target.key,
                           titleEn: 'Probe album', titleAr: 'ألبوم تجريبي',
                           cover: 'media/photos/probe.jpg' }];
    }, srcs => {
      srcs.forEach((src, i) => {
        const panel = panelOf(src);
        // PAGES order is [work.html, ar/work.html]; sniffing lang="ar" would
        // match the English page's own language switcher
        const ar = PAGES[i].startsWith('ar/');
        expect(panel).toContain(ar ? 'ألبوم تجريبي' : 'Probe album');
        // the cover must resolve from the page that references it
        expect(panel).toContain(ar ? '../media/photos/probe.jpg' : '"media/photos/probe.jpg"');
        // a real album replaces a placeholder rather than adding a tile
        expect((panel.match(/class="album[" ]/g) || []).length).toBe(before);
      });
    });
  });

  test('with no categories at all, the honest empty state comes back', () => {
    withManifest(doc => { doc.photoCategories = []; doc.photos = []; doc.photoAlbums = []; },
      srcs => {
        for (const src of srcs) {
          const panel = panelOf(src);
          expect(panel).toContain('photo-empty');
          expect(panel).not.toContain('album-grid');
        }
      });
  });

  test('every category is named in both languages and has slots', () => {
    for (const c of manifest().photoCategories) {
      expect(c.key, 'category without a key').toBeTruthy();
      expect(c.labelEn, `${c.key} has no English label`).toBeTruthy();
      expect(c.labelAr, `${c.key} has no Arabic label`).toBeTruthy();
      expect(c.slots, `${c.key} has no slots`).toBeGreaterThan(0);
    }
  });

  test('choosing a category filters the albums, in both locales', async ({ page }) => {
    for (const p of ['/work.html', '/ar/work.html']) {
      await page.goto(p + '?view=photography');
      await page.waitForFunction(() => !!document.querySelector('.pcat'), null, { timeout: 8000 });
      const cats = manifest().photoCategories;
      const target = cats[1];
      const all = await page.locator('.album').count();
      expect(await page.locator('.album:not(.is-hidden)').count()).toBe(all);

      await page.click(`.pcat[data-cat="${target.key}"]`);
      expect(await page.locator('.album:not(.is-hidden)').count(),
        `${p} filtered count`).toBe(target.slots);
      await expect(page.locator(`.pcat[data-cat="${target.key}"]`))
        .toHaveAttribute('aria-pressed', 'true');
      // only one entry may be active at a time
      expect(await page.locator('.pcat[aria-pressed="true"]').count()).toBe(1);
      // the change is announced, not just shown
      await expect(page.locator('.photo-shell [role=status]')).not.toBeEmpty();

      await page.click('.pcat[data-cat="all"]');
      expect(await page.locator('.album:not(.is-hidden)').count()).toBe(all);
    }
  });

  test('albums are portrait and carry the orange hover wash', async ({ page }) => {
    await page.goto('/work.html?view=photography');
    await page.waitForFunction(() => !!document.querySelector('.album .dah'), null, { timeout: 8000 });
    const shape = await page.evaluate(() => {
      const r = document.querySelector('.album').getBoundingClientRect();
      return r.width / r.height;
    });
    expect(shape, 'albums must be portrait').toBeLessThan(1);
    expect(await page.locator('.album .dah').count()).toBe(await page.locator('.album').count());
    await page.hover('.album');
    await expect(page.locator('.album').first()).toHaveClass(/lit/);
  });

  test('the admin can put a photo in a category', async ({ page }) => {
    await page.goto('/admin/index.html');
    const tpl = await page.evaluate(() => document.getElementById('photoTpl').innerHTML);
    expect(tpl).toContain('catPick');
    expect(tpl).toContain('data-k="category"');
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

test.describe('admin publish', () => {
  test('preserves manifest sections it does not itself edit', async ({ page }) => {
    // The admin once rebuilt media.json from a hardcoded key list, which meant
    // the client strip was silently deleted the first time anyone published.
    const src = fs.readFileSync(path.join(ROOT, 'content/media.json'), 'utf8');
    const before = JSON.parse(src);
    let committed = null;

    await page.route('https://api.github.com/**', route => {
      const req = route.request();
      if (req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ sha: 'sha0',
            content: Buffer.from(src, 'utf8').toString('base64') }) });
      }
      const body = JSON.parse(req.postData());
      if (req.url().includes('media.json')) {
        committed = Buffer.from(body.content, 'base64').toString('utf8');
      }
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ content: { sha: 'sha1' } }) });
    });
    await page.route('https://i.ytimg.com/**', route => route.fulfill({ status: 200,
      contentType: 'image/gif',
      body: Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64') }));

    await page.goto('/admin/index.html');
    await page.fill('#token', 'test-token');
    await page.click('#connectForm button[type=submit]');
    await page.waitForSelector('#editor:not([hidden])');
    await page.click('#films .card:first-child .card-head');
    await page.fill('#films .card:first-child input[data-k=titleEn]', 'Renamed For Test');
    await page.click('#publish');
    await page.waitForSelector('#sheetClose:not([hidden])', { timeout: 20000 });

    expect(committed, 'nothing was committed').toBeTruthy();
    const after = JSON.parse(committed);
    expect(Object.keys(after).sort(), 'a manifest section was dropped on publish')
      .toEqual(Object.keys(before).sort());
    expect(after.clients.length).toBe(before.clients.length);
    expect(after.videos.length).toBe(before.videos.length);
    expect(after.videos[0].titleEn).toBe('Renamed For Test');
    // browser-only bookkeeping must never reach the repository
    expect(committed).not.toMatch(/"_(?:new|url)"/);
  });

  test('every organisation in the strip is editable from the admin', async ({ page }) => {
    await page.goto('/admin/index.html');
    // the tab exists and is wired to a panel, signed out or not
    await expect(page.locator('#tClients')).toHaveAttribute('aria-controls', 'pClients');
    await expect(page.locator('#pClients')).toHaveCount(1);
    await expect(page.locator('#clientTpl')).toHaveCount(1);
  });
});
