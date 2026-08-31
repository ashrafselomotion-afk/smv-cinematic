/* The homepage uses GSAP ScrollSmoother, whose wrapper is position:fixed.
   Native scrollIntoView cannot move it, so scroll the document (the smoother
   follows window scroll) and let the smoothing settle before interacting. */
async function bring(page, selector, offset = 240) {
  await page.evaluate(({ sel, off }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top = r.top + window.scrollY, vh = window.innerHeight;
    let y = top - off;                       // `off` px of headroom above it
    if (r.height <= vh) {                    // ...but never leave its end below the fold
      y = Math.min(Math.max(y, top + r.height - vh), top);
    }
    window.scrollTo(0, Math.max(0, y));
  }, { sel: selector, off: offset });
  await page.waitForTimeout(900);           // smoother easing (1.1s config)
  await page.waitForFunction(sel => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    // a block taller than the viewport can never fit inside it; require that it
    // starts on screen with a usable amount of it showing.
    if (r.height >= window.innerHeight) return r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.5;
    return r.top >= 0 && r.bottom <= window.innerHeight;
  }, selector, { timeout: 8000 });
}
async function clickAt(page, selector) {
  await bring(page, selector);
  await page.locator(selector).click();
}
module.exports = { bring, clickAt };
