/* The homepage uses GSAP ScrollSmoother, whose wrapper is position:fixed.
   Native scrollIntoView cannot move it, so scroll the document (the smoother
   follows window scroll) and let the smoothing settle before interacting. */
async function bring(page, selector, offset = 240) {
  await page.evaluate(({ sel, off }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, top - off));
  }, { sel: selector, off: offset });
  await page.waitForTimeout(900);           // smoother easing (1.1s config)
  await page.waitForFunction(sel => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  }, selector, { timeout: 8000 });
}
async function clickAt(page, selector) {
  await bring(page, selector);
  await page.locator(selector).click();
}
module.exports = { bring, clickAt };
