/* SMV — minimal site script: theme, menu, hero video, reels, lightbox, reveals, count-up. No animation libraries. */
(function(){
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  /* theme */
  const themeBtn = document.getElementById('themeBtn'), sysLight = matchMedia('(prefers-color-scheme: light)');
  const sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>';
  const moonIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.2 14.5A8.5 8.5 0 0 1 9.5 3.8 8.5 8.5 0 1 0 20.2 14.5Z"/></svg>';
  const effectiveTheme = () => document.documentElement.dataset.theme || (sysLight.matches ? 'light' : 'dark');
  const paint = () => { themeBtn.innerHTML = effectiveTheme() === 'dark' ? sunIcon : moonIcon; };
  themeBtn.addEventListener('click', () => { const next = effectiveTheme() === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; try { localStorage.setItem('smv-theme', next); } catch(e){} paint(); });
  sysLight.addEventListener('change', paint); paint();

  /* menu */
  const menuBtn = document.getElementById('menuBtn'), mmenu = document.getElementById('mmenu');
  function setMenu(open){ document.documentElement.classList.toggle('menu-open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); mmenu.setAttribute('aria-hidden', !open); }
  menuBtn.addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));
  mmenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* hero video: poster paints first, the loop loads after the page has loaded */
  const vid = document.querySelector('#hero .vid');
  if (vid && !reduced && !saveData) {
    const start = () => { if (vid.getAttribute('src')) return; vid.autoplay = true; vid.muted = true; vid.src = innerWidth <= 820 ? 'media/hero-480.mp4' : 'media/hero.mp4'; vid.load();
      const tryPlay = () => { if (vid.paused) { const p = vid.play(); if (p && p.catch) p.catch(()=>{}); } };
      tryPlay(); vid.addEventListener('canplay', tryPlay, { once:true }); document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(); });
      ['pointerdown','touchstart','keydown','scroll'].forEach(ev => addEventListener(ev, tryPlay, { once:true, passive:true })); };
    if (document.readyState === 'complete') start(); else addEventListener('load', start, { once:true });
  }

  /* reveals */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold:.12, rootMargin:'0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* reels: lazy sources, play in view, lightbox */
  const reels = [...document.querySelectorAll('.reel')];
  const REELS = reels.map(f => ({ title:f.querySelector('h3').textContent, label:f.querySelector('.label').textContent, src:f.querySelector('video').dataset.src, poster:f.querySelector('video').poster }));
  const vids = reels.map(f => f.querySelector('video'));
  const attach = v => { if (!v.getAttribute('src')) { v.src = v.dataset.src; v.preload = 'metadata'; } };
  const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { attach(e.target); near.unobserve(e.target); } }), { rootMargin:'300px' });
  const vis = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting && !reduced && !saveData) { attach(v); const p = v.play(); if (p && p.catch) p.catch(()=>{}); } else if (!v.paused) v.pause(); }), { threshold:.5 });
  vids.forEach(v => { near.observe(v); vis.observe(v); });
  const lb = document.getElementById('lb'), lbVideo = document.getElementById('lbVideo'); let lbIndex = 0, lastFocus = null;
  function showLB(i){ lbIndex = (i + REELS.length) % REELS.length; const r = REELS[lbIndex];
    document.getElementById('lbLabel').textContent = r.label; document.getElementById('lbTitle').textContent = r.title;
    document.getElementById('lbCount').textContent = String(lbIndex+1).padStart(2,'0') + ' / ' + String(REELS.length).padStart(2,'0');
    lbVideo.poster = r.poster; lbVideo.src = r.src; lbVideo.currentTime = 0; lbVideo.muted = false;
    const p = lbVideo.play(); if (p && p.catch) p.catch(() => { lbVideo.muted = true; lbVideo.play().catch(()=>{}); }); }
  function openLB(i){ lastFocus = document.activeElement; lb.classList.add('open'); lb.setAttribute('aria-hidden','false'); document.documentElement.classList.add('menu-open'); showLB(i); document.getElementById('lbClose').focus(); }
  function closeLB(){ if (!lb.classList.contains('open')) return; lb.classList.remove('open'); lb.setAttribute('aria-hidden','true'); document.documentElement.classList.remove('menu-open'); lbVideo.pause(); lbVideo.removeAttribute('src'); lbVideo.load(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  reels.forEach((f, i) => { f.addEventListener('click', () => openLB(i)); f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLB(i); } }); });
  document.getElementById('lbClose').addEventListener('click', closeLB);
  lb.querySelector('.lb-bg').addEventListener('click', closeLB);
  document.getElementById('lbPrev').addEventListener('click', () => showLB(lbIndex - 1));
  document.getElementById('lbNext').addEventListener('click', () => showLB(lbIndex + 1));
  addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); closeLB(); } if (lb.classList.contains('open')) { if (e.key === 'ArrowRight') showLB(lbIndex + 1); if (e.key === 'ArrowLeft') showLB(lbIndex - 1); } });

  /* count-up */
  const cio = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; cio.unobserve(e.target); const el = e.target, target = +el.dataset.count;
    if (reduced) { el.textContent = target; return; } const t0 = performance.now(); (function tick(){ const p = Math.min(1, (performance.now() - t0) / 1400); el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target); if (p < 1) requestAnimationFrame(tick); })(); }), { threshold:.6 });
  document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

  /* brief sent */
  if (location.search.includes('sent=1')) { document.getElementById('sentMsg').hidden = false; history.replaceState(null, '', location.pathname + '#contact'); }
})();
