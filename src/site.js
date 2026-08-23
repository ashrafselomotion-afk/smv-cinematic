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

  window.__reduced = reduced;
  if (!hasGSAP || reduced) {
    document.documentElement.classList.remove('leader','cur');
    const ld = document.getElementById('leader'); if (ld) ld.style.display = 'none';
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  if (window.ScrollSmoother) gsap.registerPlugin(ScrollSmoother);
  if (window.SplitText) gsap.registerPlugin(SplitText);

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
  function scramble(el, dur){
    const final = el.dataset.text || el.textContent, glyphs = '▮▯/\\|<>-_=+*#';
    const t0 = performance.now();
    (function tick(){
      const p = Math.min(1, (performance.now() - t0) / dur);
      el.textContent = [...final].map((ch, i) => ch === ' ' ? ' ' : (i / final.length < p ? ch : glyphs[Math.floor(Math.random() * glyphs.length)])).join('');
      if (p < 1) requestAnimationFrame(tick); else el.textContent = final;
    })();
  }
  function heroIntro(){
    gsap.set('#hero .mid, #hero .meta, #hero .scrolldn, #nav', { visibility:'visible' });
    gsap.to('#hero h1 .ch', { y:0, duration:1.1, ease:'power4.out', stagger:.08 });
    gsap.fromTo('#hero h1 .row', { '--sweep':'120%' }, { '--sweep':'-20%', duration:1.4, delay:.9, ease:'power2.inOut' });
    gsap.to('#hero .tag', { opacity:1, y:0, duration:.8, delay:.6, ease:'power3.out', onStart(){ scramble(document.getElementById('heroTag'), 900); } });
    gsap.from('#hero .meta, #hero .scrolldn, #nav', { opacity:0, y:16, duration:1, delay:.9, ease:'power3.out' });
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

  /* ---------- REELS: staggered entrance + 3D tilt with glare ---------- */
  const reelEls = gsap.utils.toArray('.reel');
  if (reelEls.length) {
    gsap.from(reelEls, { y:70, opacity:0, scale:.92, duration:.9, ease:'power3.out', stagger:{ each:.06, grid:'auto', from:'start' },
      scrollTrigger:{ trigger:'#reelTrack', start:'top 85%', once:true } });
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
    gsap.fromTo(card, { clipPath:'inset(100% 0 0 0 round 26px)' }, { clipPath:'inset(0% 0 0 0 round 26px)', duration:1.1, ease:'power4.out', delay:(i%4)*.08,
      scrollTrigger:{ trigger:card, start:'top 88%', once:true } });
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
  /* pinned hero: the shader zooms through the letters while the DOM layers fade */
  window.__heroProgress = 0;
  ScrollTrigger.create({ trigger:'#hero', start:'top top', end:'+=140%', pin:true, scrub:.6, anticipatePin:1,
    onUpdate(s){ window.__heroProgress = s.progress; } });
  gsap.to('#hero .mid, #hero .meta, #hero .scrolldn', { yPercent:-14, opacity:0, ease:'none',
    scrollTrigger:{ trigger:'#hero', start:'top top', end:'+=32%', scrub:true } });

  /* ---------- SCROLL REVEALS ---------- */
  document.querySelectorAll('.reveal').forEach(el=>{
    gsap.to(el, { opacity:1, y:0, duration:1, ease:'power3.out',
      scrollTrigger:{ trigger:el, start:'top 88%' } });
  });

  /* ---------- MASKED LINE REVEALS on section titles (SplitText) ---------- */
  const headlines = gsap.utils.toArray('h2.wipe');
  const revealHeads = () => headlines.forEach(h => {
    let lines = null;
    if (window.SplitText) { try { lines = SplitText.create(h, { type:'lines', mask:'lines', linesClass:'line' }).lines; } catch(e){} }
    if (lines && lines.length) {
      gsap.from(lines, { yPercent:115, rotate:2, duration:1.15, ease:'power4.out', stagger:.09, scrollTrigger:{ trigger:h, start:'top 86%', once:true } });
    } else {
      gsap.from(h, { y:40, opacity:0, duration:1, ease:'power3.out', scrollTrigger:{ trigger:h, start:'top 86%', once:true } });
    }
  });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { revealHeads(); ScrollTrigger.refresh(); });

  /* ---------- MORPHING ORANGE BLOOM (CTA) ---------- */
  const bloomG = document.getElementById('bloomG');
  if (bloomG) {
    const noise = document.getElementById('bloomNoise');
    const disp  = document.getElementById('bloomDisp');
    const bloomTweens = [
      gsap.to(bloomG, { rotation: 360, duration: 90, ease: 'none', repeat: -1, transformOrigin: '300px 300px' }),
      gsap.to(bloomG, { scale: 1.18, duration: 7, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '300px 300px' }),
      gsap.to(noise, { attr: { baseFrequency: 0.010 }, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
      gsap.to(disp,  { attr: { scale: 130 }, duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    ];
    new IntersectionObserver(([e]) => bloomTweens.forEach(t => e.isIntersecting ? t.play() : t.pause()))
      .observe(document.getElementById('contact'));
  }

  /* ---------- STROKE-DRAW client emblems ---------- */
  const strokes = document.querySelectorAll('#clients .clogo .ln');
  const fills   = document.querySelectorAll('#clients .clogo .fl');
  strokes.forEach(el => {
    const len = el.getTotalLength ? el.getTotalLength() : 200;
    el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
  });
  gsap.set(fills, { opacity: 0 });
  ScrollTrigger.create({ trigger: '#clients', start: 'top 80%', once: true, onEnter(){
    gsap.to(strokes, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: .04 });
    gsap.to(fills, { opacity: 1, duration: 1, delay: .8, ease: 'power2.out', stagger: .05 });
  }});

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
  addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); closeLB(); } });

  /* ---------- REEL LIGHTBOX ---------- */
  const lb = document.getElementById('lb'), lbVideo = document.getElementById('lbVideo');
  let lbIndex = 0, lastFocus = null;
  function showLB(i){
    lbIndex = (i + REELS.length) % REELS.length;
    const r = REELS[lbIndex];
    document.getElementById('lbLabel').textContent = r.label;
    document.getElementById('lbTitle').textContent = r.title;
    document.getElementById('lbDesc').textContent = 'Vertical reel · 9:16 · sound on';
    document.getElementById('lbCount').textContent = String(lbIndex+1).padStart(2,'0') + ' / ' + String(REELS.length).padStart(2,'0');
    lbVideo.poster = r.poster; lbVideo.src = r.src; lbVideo.currentTime = 0; lbVideo.muted = false;
    const p = lbVideo.play(); if (p && p.catch) p.catch(()=>{ lbVideo.muted = true; lbVideo.play().catch(()=>{}); });
  }
  openLB = function(i){
    lastFocus = document.activeElement;
    lb.classList.add('open'); lb.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('menu-open');
    showLB(i);
    document.getElementById('lbClose').focus();
  };
  closeLB = function(){
    if (!lb.classList.contains('open')) return;
    lb.classList.remove('open'); lb.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('menu-open');
    lbVideo.pause(); lbVideo.removeAttribute('src'); lbVideo.load();
    if (lastFocus) lastFocus.focus();
  };
  document.getElementById('lbClose').addEventListener('click', closeLB);
  lb.querySelector('.lb-bg').addEventListener('click', closeLB);
  document.getElementById('lbPrev').addEventListener('click', () => showLB(lbIndex - 1));
  document.getElementById('lbNext').addEventListener('click', () => showLB(lbIndex + 1));

  /* ---------- BRIEF SENT ---------- */
  if (location.search.includes('sent=1')) {
    document.getElementById('sentMsg').hidden = false;
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

  /* ---------- STATS COUNT-UP ---------- */
  document.querySelectorAll('[data-count]').forEach(el=>{
    const target = +el.dataset.count;
    ScrollTrigger.create({
      trigger: el, start:'top 90%', once:true,
      onEnter(){
        gsap.to({v:0}, { v:target, duration:1.6, ease:'power2.out',
          onUpdate(){ el.textContent = Math.round(this.targets()[0].v); } });
      }
    });
  });
})();
