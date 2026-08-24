(function(){
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof gsap !== 'undefined';
  if (!hasGSAP || reduced) document.documentElement.classList.add('no-anim');

  /* ---------- THEME TOGGLE ---------- */
  const themeBtn = document.getElementById('themeBtn');
  const sysLight = matchMedia('(prefers-color-scheme: light)');
  const sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>';
  const moonIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.2 14.5A8.5 8.5 0 0 1 9.5 3.8 8.5 8.5 0 1 0 20.2 14.5Z"/></svg>';
  function effectiveTheme(){
    return document.documentElement.dataset.theme || (sysLight.matches ? 'light' : 'dark');
  }
  function paintThemeBtn(){
    themeBtn.innerHTML = effectiveTheme() === 'dark' ? sunIcon : moonIcon;
  }
  themeBtn.addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('smv-theme', next); } catch(e){}
    paintThemeBtn();
  });
  sysLight.addEventListener('change', paintThemeBtn);
  paintThemeBtn();

  /* ---------- REELS GALLERY (lazy sources, autoplay in view, drag + arrows) ---------- */
  let openLB = function(){}, closeLB = function(){};
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const track = document.getElementById('reelTrack');
  const reels = [...track.querySelectorAll('.reel')];
  const REELS = reels.map(f => ({ title: f.querySelector('h3').textContent, label: f.querySelector('.label').textContent,
                                  src: f.querySelector('video').dataset.src, poster: f.querySelector('video').poster }));
  reels.forEach((f, i) => {
    f.addEventListener('click', () => openLB(i));
    f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLB(i); } });
  });
  const vids = reels.map(f => f.querySelector('video'));
  const attach = v => { if (!v.getAttribute('src')) { v.src = v.dataset.src; v.preload = 'metadata'; } };
  const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { attach(e.target); near.unobserve(e.target); } }), { rootMargin: '300px' });
  const vis = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting && !reduced && !saveData) { attach(v); const p = v.play(); if (p && p.catch) p.catch(()=>{}); }
    else if (!v.paused) v.pause();
  }), { threshold: .5 });
  vids.forEach(v => { near.observe(v); vis.observe(v); });

  /* ---------- LOGO MARQUEE (duplicate unit for seamless loop) ---------- */
  const logoTrack = document.querySelector('#logoMarq .track');
  if (logoTrack) {
    const clone = logoTrack.firstElementChild.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    logoTrack.appendChild(clone);
  }

  /* ---------- HERO VIDEO: poster paints first (LCP); the loop loads after the page has loaded ---------- */
  const vid = document.querySelector('#hero .vid');
  if (vid && !reduced && !saveData) {
    const startVid = () => {
      if (vid.getAttribute('src')) return;
      vid.autoplay = true; vid.muted = true;
      vid.src = innerWidth <= 820 ? 'media/hero-480.mp4' : 'media/hero.mp4';
      vid.load();
      const tryPlay = () => { if (vid.paused) { const p = vid.play(); if (p && p.catch) p.catch(()=>{}); } };
      tryPlay();
      vid.addEventListener('canplay', tryPlay, { once: true });
      ['pointerdown','touchstart','keydown','scroll'].forEach(ev => addEventListener(ev, tryPlay, { once: true, passive: true }));
      document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(); });
    };
    if (document.readyState === 'complete') startVid(); else addEventListener('load', startVid, { once: true });
  }

  /* ---------- MOBILE MENU ---------- */
  const menuBtn = document.getElementById('menuBtn'), mmenu = document.getElementById('mmenu');
  function setMenu(open){
    document.documentElement.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mmenu.setAttribute('aria-hidden', !open);
  }
  menuBtn.addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));
  mmenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); closeLB(); closeRP(); } });

  /* ---------- VERTICAL REEL FEED (swipe / arrow keys, sound on) ---------- */
  const feed = document.getElementById('feed'), feedCol = document.getElementById('feedCol'), feedCount = document.getElementById('feedCount'), feedMute = document.getElementById('feedMute');
  let feedVids = [], feedMuted = false, lastFocus = null, feedIO = null;
  function buildFeed(){
    if (feedVids.length) return;
    REELS.forEach((r, i) => {
      const it = document.createElement('div'); it.className = 'feed-item'; it.dataset.i = i;
      it.innerHTML = `<div class="frame"><video playsinline loop preload="none" poster="${r.poster}" data-src="${r.src}"></video><div class="cap"><span class="label">${r.label}</span><h3>${r.title}</h3></div></div>`;
      feedCol.appendChild(it);
    });
    feedVids = [...feedCol.querySelectorAll('video')];
    feedIO = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target, i = +v.closest('.feed-item').dataset.i;
      if (e.isIntersecting) {
        if (!v.getAttribute('src')) { v.src = v.dataset.src; }
        v.muted = feedMuted; v.play().catch(() => { v.muted = true; feedMuted = true; feedMute.textContent = 'SOUND OFF'; v.play().catch(()=>{}); });
        feedCount.textContent = String(i+1).padStart(2,'0') + ' / ' + String(REELS.length).padStart(2,'0');
      } else { v.pause(); }
    }), { root: feedCol, threshold: .6 });
    feedVids.forEach(v => feedIO.observe(v));
    feedVids.forEach(v => v.addEventListener('click', () => v.paused ? v.play() : v.pause()));
  }
  openLB = function(i){
    buildFeed(); lastFocus = document.activeElement;
    feed.classList.add('open'); feed.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('menu-open');
    const item = feedCol.children[i]; if (item) feedCol.scrollTo({ top: item.offsetTop, behavior: 'instant' });
    document.getElementById('feedClose').focus();
  };
  closeLB = function(){
    if (!feed.classList.contains('open')) return;
    feed.classList.remove('open'); feed.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('menu-open');
    feedVids.forEach(v => v.pause());
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
  document.getElementById('feedClose').addEventListener('click', closeLB);
  feed.querySelector('.feed-bg').addEventListener('click', closeLB);
  feedMute.addEventListener('click', () => { feedMuted = !feedMuted; feedMute.textContent = feedMuted ? 'SOUND OFF' : 'SOUND ON'; feedVids.forEach(v => v.muted = feedMuted); });
  addEventListener('keydown', e => {
    if (!feed.classList.contains('open')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); feedCol.scrollBy({ top: (e.key === 'ArrowDown' ? 1 : -1) * feedCol.clientHeight, behavior: 'smooth' }); }
  });

  /* ---------- SHOWREEL PLAYER (custom controls) ---------- */
  const rp = document.getElementById('rp'), rpV = document.getElementById('rpVideo'), rpPlay = document.getElementById('rpPlay'), rpTc = document.getElementById('rpTc'), rpDur = document.getElementById('rpDur'), rpBar = document.getElementById('rpBar'), rpFill = document.getElementById('rpFill'), rpBuf = document.getElementById('rpBuf'), rpMute = document.getElementById('rpMute');
  const tc = s => { s = Math.max(0, s|0); return [s/3600|0, (s/60|0)%60, s%60].map(n => String(n).padStart(2,'0')).join(':'); };
  let rpFocus = null;
  function openRP(){
    rpFocus = document.activeElement; rp.classList.add('open'); rp.setAttribute('aria-hidden','false'); document.documentElement.classList.add('menu-open');
    if (!rpV.getAttribute('src')) rpV.src = 'media/showreel.mp4';
    rpV.muted = false; rpV.currentTime = 0; rpV.play().catch(() => { rpV.muted = true; rpMute.classList.add('off'); rpV.play().catch(()=>{}); });
    document.getElementById('rpClose').focus();
  }
  function closeRP(){ if (!rp.classList.contains('open')) return; rpV.pause(); rp.classList.remove('open'); rp.setAttribute('aria-hidden','true'); document.documentElement.classList.remove('menu-open'); if (rpFocus && rpFocus.focus) rpFocus.focus(); }
  document.getElementById('openShowreel').addEventListener('click', openRP);
  document.getElementById('rpClose').addEventListener('click', closeRP);
  rp.querySelector('.rp-bg').addEventListener('click', closeRP);
  rpPlay.addEventListener('click', () => rpV.paused ? rpV.play() : rpV.pause());
  rpV.addEventListener('click', () => rpV.paused ? rpV.play() : rpV.pause());
  rpV.addEventListener('play', () => rpPlay.classList.add('playing')); rpV.addEventListener('pause', () => rpPlay.classList.remove('playing'));
  rpV.addEventListener('loadedmetadata', () => { rpDur.textContent = tc(rpV.duration); });
  rpV.addEventListener('timeupdate', () => { rpTc.textContent = tc(rpV.currentTime); if (rpV.duration) rpFill.style.width = (rpV.currentTime / rpV.duration * 100) + '%'; });
  rpV.addEventListener('progress', () => { if (rpV.buffered.length && rpV.duration) rpBuf.style.width = (rpV.buffered.end(rpV.buffered.length-1) / rpV.duration * 100) + '%'; });
  rpV.addEventListener('ended', () => { rpV.currentTime = 0; rpV.play().catch(()=>{}); });
  rpBar.addEventListener('pointerdown', e => { const r = rpBar.getBoundingClientRect(); if (rpV.duration) rpV.currentTime = ((e.clientX - r.left) / r.width) * rpV.duration; });
  rpMute.addEventListener('click', () => { rpV.muted = !rpV.muted; rpMute.classList.toggle('off', rpV.muted); });
  addEventListener('keydown', e => { if (!rp.classList.contains('open')) return; if (e.key === ' ') { e.preventDefault(); rpV.paused ? rpV.play() : rpV.pause(); } if (e.key === 'ArrowRight') rpV.currentTime += 5; if (e.key === 'ArrowLeft') rpV.currentTime -= 5; });

  /* ---------- REEL FILTERS (Flip layout animation when available) ---------- */
  const filters = document.querySelectorAll('.filters button');
  filters.forEach(btn => btn.addEventListener('click', () => {
    filters.forEach(b => { b.classList.toggle('on', b === btn); b.setAttribute('aria-selected', b === btn); });
    const f = btn.dataset.filter;
    const items = [...document.querySelectorAll('.reel')];
    if (window.gsap && window.Flip && !reduced) {
      const state = Flip.getState(items);
      items.forEach(el => el.classList.toggle('is-hidden', f !== 'all' && el.dataset.cat !== f));
      Flip.from(state, { duration: .7, ease: 'power3.inOut', stagger: .02, absolute: true, scale: true,
        onEnter: els => gsap.fromTo(els, { opacity: 0, scale: .85 }, { opacity: 1, scale: 1, duration: .6 }),
        onLeave: els => gsap.to(els, { opacity: 0, scale: .85, duration: .4 }) });
      if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 800);
    } else {
      items.forEach(el => el.classList.toggle('is-hidden', f !== 'all' && el.dataset.cat !== f));
    }
  }));

  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- BRIEF SENT ---------- */
  if (location.search.includes('sent=1')) {
    const sentMsg = document.getElementById('sentMsg');
    if (sentMsg) sentMsg.hidden = false;
    history.replaceState(null, '', location.pathname + '#contact');
  }

  /* ---------- SPOTLIGHT TILES (cursor-tracked glow) ---------- */
  document.querySelectorAll('.tile').forEach(t => {
    t.addEventListener('pointermove', e => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  window.__reduced = reduced;
  if (!hasGSAP || reduced) {
    document.documentElement.classList.remove('leader','cur');
    const ld = document.getElementById('leader'); if (ld) ld.style.display = 'none';
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  if (window.ScrollSmoother) gsap.registerPlugin(ScrollSmoother);
  if (window.Flip) gsap.registerPlugin(Flip);

  /* ---------- INERTIAL SMOOTH SCROLL + DEPTH (data-speed parallax) ---------- */
  let smoother = null;
  if (window.ScrollSmoother && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    smoother = ScrollSmoother.create({ wrapper:'#smooth-wrapper', content:'#smooth-content', smooth:1.1, effects:true, smoothTouch:false });
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href')); if (!t || a.id === 'openPortfolio') return;
      e.preventDefault(); smoother.scrollTo(t, true, 'top 80px');
    }));
  }

  /* ---------- HERO INTRO (letters, light sweep, decoded tagline) ---------- */
  function heroIntro(){
    gsap.set('#hero .hero-copy, #nav', { visibility:'visible' });
    gsap.to('#hero h1 .l > span', { y:0, duration:1.15, ease:'power4.out', stagger:.12, delay:.1 });
    gsap.fromTo('#hero .eyebrow, #hero .sub, #hero .hero-ctas, #hero .trust', { opacity:0, y:16 }, { opacity:1, y:0, duration:.9, delay:.55, ease:'power3.out', stagger:.12 });
    gsap.fromTo('#nav', { opacity:0, y:16 }, { opacity:1, y:0, duration:1, delay:.7, ease:'power3.out', clearProps:'all' });
  }

  /* ---------- FILM LEADER (3·2·1 countdown, letterbox opens onto the hero) ---------- */
  const leader = document.getElementById('leader');
  if (document.documentElement.classList.contains('leader') && leader) {
    const num = document.getElementById('leaderNum'), ring = document.getElementById('leaderRing');
    const tl = gsap.timeline({ onComplete(){ leader.style.display = 'none'; document.documentElement.classList.remove('leader'); } });
    [3,2,1].forEach((n, i) => {
      tl.call(() => { num.textContent = n; }, null, i * .42)
        .fromTo(num, { scale:1.25, opacity:0 }, { scale:1, opacity:1, duration:.28, ease:'power3.out' }, i * .42)
        .fromTo(ring, { strokeDashoffset:289 }, { strokeDashoffset:0, duration:.4, ease:'none' }, i * .42);
    });
    tl.to('#leader .count, #leader .slate', { opacity:0, duration:.2 }, 1.3)
      .to('#leader .bar.top', { scaleY:0, duration:.7, ease:'power4.inOut' }, 1.35)
      .to('#leader .bar.bot', { scaleY:0, duration:.7, ease:'power4.inOut' }, 1.35)
      .to(leader, { backgroundColor:'rgba(12,14,18,0)', duration:.5 }, 1.4)
      .call(heroIntro, null, 1.45);
  } else {
    gsap.delayedCall(.15, heroIntro);
  }

  /* ---------- CUSTOM CURSOR ---------- */
  const cur = document.getElementById('cur');
  if (cur && document.documentElement.classList.contains('cur')) {
    const label = document.getElementById('curLabel');
    const cx = gsap.quickTo(cur, 'x', { duration:.18, ease:'power3.out' }), cy = gsap.quickTo(cur, 'y', { duration:.18, ease:'power3.out' });
    addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); }, { passive:true });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('[data-cursor]');
      if (t) { label.textContent = t.dataset.cursor; cur.classList.add('big'); } else cur.classList.remove('big');
    });
  }

  /* ---------- SCROLL PROGRESS + CHAPTER RAIL ---------- */
  gsap.to('#progress i', { scaleX:1, ease:'none', scrollTrigger:{ trigger:document.body, start:'top top', end:'bottom bottom', scrub:.3 } });
  const chNum = document.getElementById('chapterNum'), chName = document.getElementById('chapterName');
  document.querySelectorAll('[data-chapter]').forEach((sec, i) => {
    ScrollTrigger.create({ trigger:sec, start:'top 55%', end:'bottom 55%',
      onToggle(s){ if (s.isActive) { chNum.textContent = String(i+1).padStart(2,'0'); chName.textContent = sec.dataset.chapter; document.documentElement.classList.add('chapters'); } },
      onLeaveBack(){ if (i === 0) document.documentElement.classList.remove('chapters'); } });
  });

  /* ---------- KINETIC BAND (speed + skew follow scroll velocity) ---------- */
  const bandTrack = document.getElementById('bandTrack');
  if (bandTrack) {
    const loop = gsap.to(bandTrack, { xPercent:-50, duration:26, ease:'none', repeat:-1 });
    const skew = gsap.quickTo(bandTrack, 'skewX', { duration:.5, ease:'power2.out' });
    ScrollTrigger.create({ trigger:'.band', start:'top bottom', end:'bottom top',
      onUpdate(self){ const v = self.getVelocity(); loop.timeScale(gsap.utils.clamp(-4, 4, 1 + v / 600)); skew(gsap.utils.clamp(-12, 12, -v / 180)); },
      onLeave(){ loop.timeScale(1); skew(0); }, onLeaveBack(){ loop.timeScale(1); skew(0); } });
    ScrollTrigger.addEventListener('scrollEnd', () => { gsap.to(loop, { timeScale:1, duration:.8 }); skew(0); });
  }

  /* ---------- one-shot reveal helper: fires on enter, jump-past, or load-already-past ---------- */
  const enterOnce = (trigger, start, fn) => {
    let fired = false;
    const go = self => { if (!fired && self.progress > 0) { fired = true; fn(); self.kill(); } };
    const st = ScrollTrigger.create({ trigger, start, onUpdate:go, onEnter:go, onRefresh:go });
    go(st);
  };

  /* ---------- REELS: staggered entrance + 3D tilt with glare ---------- */
  const reelEls = gsap.utils.toArray('.reel');
  if (reelEls.length) {
    gsap.set(reelEls, { y:70, opacity:0, scale:.92 });
    enterOnce('#reelTrack', 'top 85%', () => gsap.to(reelEls, { y:0, opacity:1, scale:1, duration:.9, ease:'power3.out', stagger:{ each:.06, grid:'auto', from:'start' }, overwrite:'auto', clearProps:'opacity,transform' }));
    if (document.documentElement.classList.contains('cur')) reelEls.forEach(r => {
      const g = document.createElement('span'); g.className = 'glare'; r.appendChild(g);
      const rx = gsap.quickTo(r, 'rotationX', { duration:.5, ease:'power2.out' }), ry = gsap.quickTo(r, 'rotationY', { duration:.5, ease:'power2.out' });
      r.addEventListener('pointermove', e => { const b = r.getBoundingClientRect(); const px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
        ry((px - .5) * 14); rx((.5 - py) * 14); r.style.setProperty('--gx', (px*100)+'%'); r.style.setProperty('--gy', (py*100)+'%'); });
      r.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  /* ---------- SERVICES: wipe reveal + in-card parallax ---------- */
  gsap.utils.toArray('#services .card').forEach((card, i) => {
    gsap.set(card, { clipPath:'inset(100% 0 0 0 round 26px)' });
    enterOnce(card, 'top 88%', () => gsap.to(card, { clipPath:'inset(0% 0 0 0 round 26px)', duration:1.1, ease:'power4.out', delay:(i%4)*.08, clearProps:'clipPath' }));
    gsap.fromTo(card.querySelector('img'), { yPercent:-8, scale:1.16 }, { yPercent:8, scale:1.16, ease:'none',
      scrollTrigger:{ trigger:card, start:'top bottom', end:'bottom top', scrub:true } });
  });

  /* ---------- MAGNETIC PILLS ---------- */
  if (document.documentElement.classList.contains('cur')) document.querySelectorAll('#nav .cta, .btn.hot, #brief button, .cta-link').forEach(el => {
    const qx = gsap.quickTo(el, 'x', { duration:.4, ease:'power3.out' }), qy = gsap.quickTo(el, 'y', { duration:.4, ease:'power3.out' });
    el.addEventListener('pointermove', e => { const b = el.getBoundingClientRect(); qx((e.clientX - (b.left + b.width/2)) * .25); qy((e.clientY - (b.top + b.height/2)) * .25); });
    el.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });

  /* ---------- HERO PARALLAX ---------- */
  gsap.to('#hero .hero-copy', { yPercent:-8, opacity:0, ease:'none',
    scrollTrigger:{ trigger:'#hero', start:'top top', end:'+=340', scrub:true } });

  /* ---------- SCROLL REVEALS ---------- */
  document.querySelectorAll('.reveal').forEach(el=>{
    gsap.to(el, { opacity:1, y:0, duration:1, ease:'power3.out',
      scrollTrigger:{ trigger:el, start:'top 88%' } });
  });

  /* ---------- SECTION TITLE REVEALS (simple, clip-proof) ---------- */
  gsap.utils.toArray('h2.wipe').forEach(h => {
    gsap.set(h, { y: 40, opacity: 0 });
    enterOnce(h, 'top 88%', () => gsap.to(h, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', clearProps: 'opacity,transform' }));
  });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => ScrollTrigger.refresh());

  /* ---------- STROKE-DRAW client emblems ---------- */
  if (document.getElementById('clients')) {
    const strokes = document.querySelectorAll('#clients .clogo .ln');
    const fills   = document.querySelectorAll('#clients .clogo .fl');
    strokes.forEach(el => {
      const len = el.getTotalLength ? el.getTotalLength() : 200;
      el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
    });
    gsap.set(fills, { opacity: 0 });
    enterOnce('#clients', 'top 80%', () => {
      gsap.to(strokes, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: .04 });
      gsap.to(fills, { opacity: 1, duration: 1, delay: .8, ease: 'power2.out', stagger: .05 });
    });
  }

  /* ---------- DELIVERY TIMELINE ---------- */
  const tl = document.querySelector('.tl');
  if (tl) {
    const bars = tl.querySelectorAll('.bar i'), dots = tl.querySelectorAll('.dot');
    ScrollTrigger.create({ trigger: tl, start: 'top 85%', once: true, onEnter(){
      const seq = gsap.timeline();
      seq.add(() => dots[0].classList.add('on'))
         .to(bars[0], { scaleX: 1, duration: .9, ease: 'power2.inOut' })
         .add(() => dots[1].classList.add('on'))
         .to(bars[1], { scaleX: 1, duration: .9, ease: 'power2.inOut' })
         .add(() => dots[2].classList.add('on'));
    }});
  }

  /* ---------- Aceternity · Direction Aware Hover (services) ---------- */
  if (document.documentElement.classList.contains('cur')) document.querySelectorAll('#services .card').forEach(card => {
    const ov = document.createElement('span'); ov.className = 'dah'; card.appendChild(ov);
    const dir = e => { const r = card.getBoundingClientRect(); const x = (e.clientX - r.left - r.width/2) * (r.width > r.height ? r.height/r.width : 1); const y = e.clientY - r.top - r.height/2;
      const d = Math.round(((Math.atan2(y, x) * 180 / Math.PI) + 180) / 90 + 3) % 4; return d; };  // 0 top 1 right 2 bottom 3 left
    const vec = d => [[0,-100],[100,0],[0,100],[-100,0]][d];
    card.addEventListener('pointerenter', e => { const v = vec(dir(e)); gsap.fromTo(ov, { xPercent:v[0], yPercent:v[1], opacity:1 }, { xPercent:0, yPercent:0, duration:.45, ease:'power3.out', overwrite:true }); });
    card.addEventListener('pointerleave', e => { const v = vec(dir(e)); gsap.to(ov, { xPercent:v[0], yPercent:v[1], opacity:0, duration:.4, ease:'power3.in', overwrite:true }); });
  });

  /* ---------- Aceternity · Glowing Effect (bento borders follow the pointer) ---------- */
  const why = document.getElementById('why'), tilesAll = gsap.utils.toArray('.tile');
  if (why && tilesAll.length) {
    tilesAll[0].classList.add('beam');
    why.addEventListener('pointermove', e => tilesAll.forEach(t => {
      if (t.classList.contains('beam')) return;
      const r = t.getBoundingClientRect(), cx = r.left + r.width/2, cy = r.top + r.height/2;
      const dx = e.clientX - cx, dy = e.clientY - cy, dist = Math.hypot(Math.max(0, Math.abs(dx) - r.width/2), Math.max(0, Math.abs(dy) - r.height/2));
      t.style.setProperty('--ang', (Math.atan2(dy, dx) * 180 / Math.PI + 90) + 'deg');
      t.style.setProperty('--glow', dist < 160 ? 1 : 0);
    }), { passive:true });
    why.addEventListener('pointerleave', () => tilesAll.forEach(t => t.style.setProperty('--glow', 0)));
  }

  /* ---------- Aceternity · Lamp Effect (contact) ---------- */
  const lamp = document.querySelector('.lamp');
  if (lamp) {
    gsap.set(lamp.querySelector('.bar'), { width:0 });
    gsap.set(lamp.querySelector('.glow'), { width:0 });
    enterOnce(lamp, 'top 75%', () => {
      gsap.timeline()
        .to(lamp.querySelectorAll('.l1,.l2'), { opacity:1, duration:1.2, ease:'power2.out' }, 0)
        .to(lamp.querySelector('.bar'), { width:'min(30rem,70vw)', duration:1.1, ease:'power3.inOut' }, .1)
        .to(lamp.querySelector('.glow'), { width:'min(18rem,50vw)', duration:1.1, ease:'power3.inOut' }, .1);
    });
  }

  /* ---------- Aceternity · Floating Navbar (hide on scroll down, show on up) ---------- */
  ScrollTrigger.create({ start:0, end:'max', onUpdate(self){ document.documentElement.classList.toggle('nav-hide', self.direction === 1 && self.scroll() > 600); } });

  /* ---------- SERVICE JOURNEY (production confidence line-draw) ---------- */
  const journey = document.querySelector('.service-journey');
  if (journey) {
    const stops = [...journey.querySelectorAll('.service-stop')];
    const livePath = journey.querySelector('.service-line-live');
    let plen = 1;
    const sizePath = () => { plen = livePath.getTotalLength() || 1; livePath.style.strokeDasharray = String(plen); livePath.style.strokeDashoffset = String(plen); };
    const updateJourney = () => {
      const rect = journey.getBoundingClientRect();
      const travel = Math.max(rect.height - innerHeight * .55, 1);
      const progress = Math.max(0, Math.min(1, (innerHeight * .42 - rect.top) / travel));
      livePath.style.strokeDashoffset = String(plen * (1 - progress));
      let active = 0;
      stops.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * .58) active = i; });
      stops.forEach((s, i) => s.classList.toggle('is-active', i === active));
    };
    sizePath(); updateJourney();
    ScrollTrigger.create({ trigger: journey, start: 'top bottom', end: 'bottom top',
      onUpdate: updateJourney, onRefresh(){ sizePath(); updateJourney(); } });
  }

  /* ---------- STATS COUNT-UP ---------- */
  document.querySelectorAll('[data-count]').forEach(el=>{
    const target = +el.dataset.count;
    enterOnce(el, 'top 90%', () => {
      gsap.to({v:0}, { v:target, duration:1.6, ease:'power2.out',
        onUpdate(){ el.textContent = Math.round(this.targets()[0].v); } });
    });
  });
})();
