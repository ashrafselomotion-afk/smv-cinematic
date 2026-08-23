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

  /* ---------- FEATURED WORK SWAP ---------- */
  let featureIdx = 0, openLB = function(){}, closeLB = function(){};
  const imgs = document.querySelectorAll('#featureBox img');
  const items = document.querySelectorAll('#work .item');
  const fLabel = document.getElementById('featureLabel');
  const fTitle = document.getElementById('featureTitle');
  function setFeature(i){
    featureIdx = i;
    imgs.forEach((im,k)=>im.classList.toggle('on', k===i));
    items.forEach(it=>it.classList.toggle('active', +it.dataset.i===i));
    if (i === 0) {
      fLabel.textContent = '01 / FEATURED';
      fTitle.textContent = 'GLOBAL BRAND COMMERCIAL';
    } else {
      const it = [...items].find(el => +el.dataset.i === i);
      fLabel.textContent = it.querySelector('.num').textContent + ' / ' + it.querySelector('.cat').textContent.toUpperCase();
      fTitle.textContent = it.querySelector('h3').textContent;
    }
  }
  items.forEach(it=>{
    it.addEventListener('mouseenter', ()=>setFeature(+it.dataset.i));
    it.addEventListener('click', ()=>{ setFeature(+it.dataset.i); openLB(+it.dataset.i); });
  });
  document.getElementById('workList').addEventListener('mouseleave', ()=>setFeature(0));

  /* ---------- LOGO MARQUEE (duplicate unit for seamless loop) ---------- */
  const logoTrack = document.querySelector('#logoMarq .track');
  if (logoTrack) {
    const clone = logoTrack.firstElementChild.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    logoTrack.appendChild(clone);
  }

  /* ---------- HERO VIDEO: poster paints first (LCP); the loop loads after the page has loaded ---------- */
  const vid = document.querySelector('#hero .vid');
  const saveData = !!(navigator.connection && navigator.connection.saveData);
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

  /* ---------- PORTFOLIO LIGHTBOX ---------- */
  /* PLACEHOLDER FOOTAGE — swap each `video` URL for the real project film */
  const PROJECTS = [
    { label:'01 / COMMERCIAL',         title:'GLOBAL BRAND COMMERCIAL', desc:'Brand film shot across three locations in a single week — cinema cameras, aerials and a full post pipeline.', video:'https://videos.pexels.com/video-files/2099568/2099568-hd_1920_1080_30fps.mp4' },
    { label:'02 / EVENT COVERAGE',     title:'GOV SUMMIT 2024',         desc:'Two-day government summit: plenary, bilateral and ceremony coverage with same-day highlight films.', video:'https://videos.pexels.com/video-files/3129957/3129957-hd_1920_1080_25fps.mp4' },
    { label:'03 / ARCHITECTURAL FILM', title:'LUXURY REAL ESTATE',      desc:'Architectural film for a waterfront development — golden-hour aerials, interiors, lifestyle.', video:'https://videos.pexels.com/video-files/2099568/2099568-hd_1920_1080_30fps.mp4' },
    { label:'04 / COMMERCIAL',         title:'AUTOMOTIVE CAMPAIGN',     desc:'Launch campaign: hero film, 15-second cutdowns and vertical social edits from one shoot.', video:'https://videos.pexels.com/video-files/3129957/3129957-hd_1920_1080_25fps.mp4' }
  ];
  const lb = document.getElementById('lb'), lbVideo = document.getElementById('lbVideo');
  let lbIndex = 0, lastFocus = null;
  function showLB(i){
    lbIndex = (i + PROJECTS.length) % PROJECTS.length;
    const p = PROJECTS[lbIndex];
    document.getElementById('lbLabel').textContent = p.label;
    document.getElementById('lbTitle').textContent = p.title;
    document.getElementById('lbDesc').textContent = p.desc;
    document.getElementById('lbCount').textContent = String(lbIndex+1).padStart(2,'0') + ' / ' + String(PROJECTS.length).padStart(2,'0');
    lbVideo.src = p.video; lbVideo.currentTime = 0;
    lbVideo.play().catch(()=>{});
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
  const featureBox = document.getElementById('featureBox');
  featureBox.addEventListener('click', () => openLB(featureIdx));
  featureBox.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLB(featureIdx); } });
  document.getElementById('openPortfolio').addEventListener('click', e => { e.preventDefault(); openLB(0); });

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
