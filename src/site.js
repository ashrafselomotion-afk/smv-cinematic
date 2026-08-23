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
  let dragged = false;
  reels.forEach((f, i) => {
    f.addEventListener('click', () => { if (!dragged) openLB(i); });
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
  const step = () => (reels[0].getBoundingClientRect().width + 18) * 2;
  document.getElementById('reelPrev').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  document.getElementById('reelNext').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  let down = false, sx = 0, sl = 0;
  track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; dragged = false; sx = e.clientX; sl = track.scrollLeft; });
  addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 6) { dragged = true; track.classList.add('drag'); } track.scrollLeft = sl - dx; });
  addEventListener('pointerup', () => { if (!down) return; down = false; track.classList.remove('drag'); setTimeout(() => { dragged = false; }, 50); });

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

  if (!hasGSAP || reduced) return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- HERO INTRO ---------- */
  gsap.to('#hero h1 .row > span', { y:0, duration:1.2, ease:'power4.out', delay:.15 });
  gsap.to('#hero .tag', { opacity:1, y:0, duration:1, delay:.7, ease:'power3.out' });
  gsap.from('#hero .meta, #hero .scrolldn, #nav', { opacity:0, y:16, duration:1, delay:.9, ease:'power3.out' });

  /* ---------- HERO PARALLAX ---------- */
  gsap.to('#hero .mid', { yPercent:-22, opacity:.3, ease:'none',
    scrollTrigger:{ trigger:'#hero', start:'top top', end:'bottom top', scrub:true } });

  /* ---------- SCROLL REVEALS ---------- */
  document.querySelectorAll('.reveal').forEach(el=>{
    gsap.to(el, { opacity:1, y:0, duration:1, ease:'power3.out',
      scrollTrigger:{ trigger:el, start:'top 88%' } });
  });

  /* ---------- SVG CLIP-PATH WIPE on section titles ---------- */
  const svgNS = 'http://www.w3.org/2000/svg';
  const clipHost = document.createElementNS(svgNS, 'svg');
  clipHost.setAttribute('width', '0'); clipHost.setAttribute('height', '0');
  clipHost.style.position = 'absolute';
  const clipDefs = document.createElementNS(svgNS, 'defs');
  clipHost.appendChild(clipDefs); document.body.appendChild(clipHost);
  document.querySelectorAll('h2.wipe').forEach((h, i) => {
    const id = 'wipe' + i;
    const cp = document.createElementNS(svgNS, 'clipPath');
    cp.setAttribute('id', id); cp.setAttribute('clipPathUnits', 'objectBoundingBox');
    const r = document.createElementNS(svgNS, 'rect');
    r.setAttribute('x', '0'); r.setAttribute('y', '0'); r.setAttribute('width', '1'); r.setAttribute('height', '1');
    cp.appendChild(r); clipDefs.appendChild(cp);
    h.style.clipPath = 'url(#' + id + ')';
    gsap.set(r, { scaleX: 0, transformOrigin: '0 0' });
    gsap.set(h, { y: 24 });
    ScrollTrigger.create({ trigger: h, start: 'top 86%', once: true, onEnter(){
      gsap.to(r, { scaleX: 1, duration: 1.25, ease: 'power4.inOut' });
      gsap.to(h, { y: 0, duration: 1.25, ease: 'power3.out',
        onComplete(){ h.style.clipPath = ''; } });
    }});
  });

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
