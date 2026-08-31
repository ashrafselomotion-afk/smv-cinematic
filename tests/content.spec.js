const { test, expect } = require('@playwright/test');

test('no category filters survive anywhere', async ({ page }) => {
  for (const p of ['/work.html','/ar/work.html','/index.html','/ar/index.html']) {
    await page.goto(p);
    await page.waitForTimeout(800);
    await expect(page.locator('.filters')).toHaveCount(0);
    await expect(page.locator('#filterStatus')).toHaveCount(0);
  }
});

test('the full gallery lives on the projects page and every card is uniquely titled', async ({ page }) => {
  for (const p of ['/work.html','/ar/work.html']) {
    await page.goto(p);
    await page.waitForTimeout(800);
    const titles = await page.locator('#panelVideo .reel h3').allTextContents();
    expect(titles.length, `${p} films`).toBeGreaterThanOrEqual(20);
    expect(new Set(titles).size).toBe(titles.length);
  }
});

test('the homepage shows a selected-work shortlist, not the whole gallery', async ({ page }) => {
  for (const p of ['/index.html','/ar/index.html']) {
    await page.goto(p);
    await page.waitForTimeout(800);
    // the 23-card grid moved to the projects page
    await expect(page.locator('.reel')).toHaveCount(0);
    const items = page.locator('#swList .sw-item');
    const n = await items.count();
    expect(n, `${p} shortlist`).toBeGreaterThanOrEqual(3);
    expect(n, `${p} shortlist stays a shortlist`).toBeLessThan(10);
    const titles = await items.evaluateAll(els => els.map(e => e.dataset.title));
    expect(new Set(titles).size).toBe(n);
    expect(titles.every(Boolean)).toBe(true);
    // exactly one is current, and it drives the stage caption
    await expect(page.locator('#swList .sw-item[aria-current="true"]')).toHaveCount(1);
    await expect(page.locator('#swTitle')).toHaveText(titles[0]);
    // and it points at the full set
    await expect(page.locator('.sw-all')).toHaveAttribute('href', /work\.html/);
  }
});

test.describe('contact form', () => {
  test.beforeEach(async ({ page }) => {
    // never submit the real endpoint
    await page.route('**/formsubmit.co/**', r => r.abort());
  });

  test('required selects start on a disabled placeholder', async ({ page }) => {
    await page.goto('/contact.html');
    const v = await page.locator('#bType').inputValue();
    expect(v).toBe('');
    expect(await page.locator('#bType option:checked').getAttribute('disabled')).not.toBeNull();
  });

  test('invalid submit shows summary, marks fields and focuses the first error', async ({ page }) => {
    await page.goto('/contact.html');
    await page.locator('#brief button[type=submit]').click();
    await expect(page.locator('#formErrors')).toBeVisible();
    await expect(page.locator('#formErrors')).toHaveAttribute('role', 'alert');
    await expect(page.locator('#bName')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#bName')).toHaveAttribute('aria-describedby', /err/);
    await expect(page.locator('#bName')).toBeFocused();
  });

  test('valid submit sets a submitting state and blocks double submission', async ({ page }) => {
    await page.goto('/contact.html');
    // observe the submit event without letting the browser navigate away
    await page.evaluate(() => {
      window.__submits = 0;
      const f = document.getElementById('brief');
      f.addEventListener('submit', e => {
        window.__submits++;
        window.__ariaDisabled = f.querySelector('button[type=submit]').getAttribute('aria-disabled');
        e.preventDefault();
      });
    });
    await page.fill('#bName', 'Test Person');
    await page.fill('#bEmail', 'test@example.gov.ae');
    await page.fill('#bEntity', 'Test Entity');
    await page.selectOption('#bType', { index: 1 });
    await page.fill('#bObjective', 'Testing the brief form.');
    await page.check('#bConsent');
    const btn = page.locator('#brief button[type=submit]');
    await btn.click();
    expect(await page.evaluate(() => window.__submits)).toBe(1);
    expect(await page.evaluate(() => window.__ariaDisabled)).toBe('true');
    await expect(btn).toBeDisabled();                       // hard block on a second press
    expect(await btn.textContent()).toMatch(/Sending/i);
    await btn.click({ force: true }).catch(() => {});
    expect(await page.evaluate(() => window.__submits)).toBe(1);
  });

  test('privacy link opens in a new tab so the brief survives', async ({ page }) => {
    await page.goto('/contact.html');
    const link = page.locator('#brief a[href="privacy.html"]').first();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test('success confirmation is a live status and receives focus', async ({ page }) => {
    await page.goto('/contact.html?sent=1');
    const msg = page.locator('#sentMsg');
    await expect(msg).toBeVisible();
    await expect(msg).toHaveAttribute('role', 'status');
    await expect(msg).toBeFocused();
  });

  test('arabic brief form exists with the same fields', async ({ page }) => {
    await page.goto('/ar/contact.html');
    for (const id of ['#bName','#bEmail','#bEntity','#bType','#bObjective','#bConsent','#bProc','#bRef']) {
      await expect(page.locator(id)).toHaveCount(1);
    }
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('arabic parity and routing', () => {
  const PAIRS = [['/index.html','/ar/index.html'],['/work.html','/ar/work.html'],
    ['/government-production.html','/ar/government-production.html'],
    ['/capabilities.html','/ar/capabilities.html'],['/approach.html','/ar/approach.html'],
    ['/about.html','/ar/about.html'],['/contact.html','/ar/contact.html'],['/privacy.html','/ar/privacy.html']];

  for (const [en, ar] of PAIRS) {
    test(`language switch preserves the route ${en} <-> ${ar}`, async ({ page }) => {
      await page.goto(en);
      const toAr = await page.locator('#nav .lang a[hreflang="ar"]').getAttribute('href');
      await page.goto(ar);
      const toEn = await page.locator('#nav .lang a[hreflang="en"]').getAttribute('href');
      const file = en.split('/').pop();
      expect(toAr.replace('ar/','').replace(/\/$/,'') || 'index.html').toContain(file === 'index.html' ? '' : file);
      expect(toEn).toContain(file);
      // active locale marked
      await expect(page.locator('#nav .lang a[aria-current="page"]')).toHaveCount(1);
    });
  }

  test('portfolio inventory matches between locales', async ({ page }) => {
    await page.goto('/work.html');
    const en = await page.locator('#panelVideo .reel').count();
    await page.goto('/ar/work.html');
    const ar = await page.locator('#panelVideo .reel').count();
    expect(ar).toBe(en);
    expect(ar).toBeGreaterThanOrEqual(8);
  });

  test('ar.html keeps working as a compatibility route', async ({ page }) => {
    const res = await page.goto('/ar.html');
    expect(res.status()).toBe(200);
    await page.waitForURL(/\/ar\//);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('latin runs inside RTL copy are isolated', async ({ page }) => {
    await page.goto('/ar/index.html');
    expect(await page.locator('bdi[dir="ltr"]').count()).toBeGreaterThan(0);
  });

  test('reciprocal hreflang plus x-default', async ({ page }) => {
    await page.goto('/capabilities.html');
    await expect(page.locator('link[hreflang="ar"]')).toHaveAttribute('href', /ar\/capabilities\.html/);
    await expect(page.locator('link[hreflang="x-default"]')).toHaveCount(1);
    await page.goto('/ar/capabilities.html');
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', /\/capabilities\.html/);
  });

  test('arabic social metadata is present', async ({ page }) => {
    await page.goto('/ar/index.html');
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'ar_AE');
    await expect(page.locator('meta[property="og:locale:alternate"]')).toHaveAttribute('content', 'en_AE');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  });
});

test('no horizontal overflow anywhere', async ({ page }) => {
  const PAGES = ['/index.html','/work.html','/contact.html','/capabilities.html','/ar/index.html','/ar/work.html','/ar/contact.html'];
  for (const p of PAGES) {
    await page.goto(p);
    await page.waitForTimeout(400);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, `${p} overflows by ${over}px`).toBeLessThanOrEqual(1);
  }
});

test('portfolio items carry unique, specific context', async ({ page }) => {
  await page.goto('/work.html');
  const titles = await page.locator('#panelVideo .reel h3').allTextContents();
  expect(new Set(titles).size).toBe(titles.length);
  const metas = await page.locator('#panelVideo .reel .meta-line').allTextContents();
  expect(metas.every(m => m.includes('Deliverables'))).toBe(true);
});


test.describe('projects — videography / photography', () => {
  for (const [p, filmsHeading, stillsHeading] of [
    ['/work.html', /Films\./i, /Stills in focus\./i],
    ['/ar/work.html', /الأفلام\./, /الصورة الثابتة\./]
  ]) {
    test(`${p} switches panels and keeps one tab selected`, async ({ page }) => {
      await page.goto(p);
      await page.waitForFunction(() => !!document.querySelector('.pv-switch [role=tab]'), null, { timeout: 8000 });
      const video = page.locator('#tabVideo'), photo = page.locator('#tabPhoto');

      // videography opens by default
      await expect(video).toHaveAttribute('aria-selected', 'true');
      await expect(photo).toHaveAttribute('aria-selected', 'false');
      await expect(page.locator('#panelVideo')).toBeVisible();
      await expect(page.locator('#panelPhoto')).toBeHidden();
      await expect(page.locator('#panelVideo h2')).toHaveText(filmsHeading);

      // only the selected tab is in the tab order
      expect(await video.getAttribute('tabindex')).not.toBe('-1');
      expect(await photo.getAttribute('tabindex')).toBe('-1');

      await photo.click();
      await expect(photo).toHaveAttribute('aria-selected', 'true');
      await expect(video).toHaveAttribute('aria-selected', 'false');
      await expect(page.locator('#panelPhoto')).toBeVisible();
      await expect(page.locator('#panelVideo')).toBeHidden();
      await expect(page.locator('#panelPhoto h2')).toHaveText(stillsHeading);
      // the choice is shareable
      expect(page.url()).toContain('view=photography');

      // ...and restorable
      await page.goto(p + '?view=photography');
      await page.waitForFunction(() => !!document.querySelector('.pv-switch [role=tab]'), null, { timeout: 8000 });
      await expect(page.locator('#tabPhoto')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#panelPhoto')).toBeVisible();
    });
  }

  test('arrow keys move between tabs, in the reading direction of the page', async ({ page }) => {
    for (const [p, forward] of [['/work.html', 'ArrowRight'], ['/ar/work.html', 'ArrowLeft']]) {
      await page.goto(p);
      await page.waitForFunction(() => !!document.querySelector('.pv-switch [role=tab]'), null, { timeout: 8000 });
      await page.locator('#tabVideo').focus();
      await page.keyboard.press(forward);
      await expect(page.locator('#tabPhoto')).toHaveAttribute('aria-selected', 'true');
      expect(await page.evaluate(() => document.activeElement.id)).toBe('tabPhoto');
      await page.keyboard.press('Home');
      await expect(page.locator('#tabVideo')).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('the photography panel states honestly that nothing is published yet', async ({ page }) => {
    for (const p of ['/work.html','/ar/work.html']) {
      await page.goto(p + '?view=photography');
      await page.waitForFunction(() => !!document.querySelector('.pv-switch [role=tab]'), null, { timeout: 8000 });
      // no fabricated stills, and no square-bracket placeholder text
      await expect(page.locator('#panelPhoto img')).toHaveCount(0);
      const copy = await page.locator('#panelPhoto').innerText();
      expect(copy).not.toMatch(/\[[^\]]+\]/);
      expect(copy.trim().length, `${p} empty state says nothing`).toBeGreaterThan(20);
    }
  });
});
