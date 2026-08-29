(function(){
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const hasGSAP = typeof gsap !== 'undefined';
  if (!hasGSAP || reduced) document.documentElement.classList.add('no-anim');
  const L = window.__smvL || {};
  const M = window.__smvModal;
  /* media lives at the site root; Arabic routes sit one level deeper */
  const MEDIA = (() => {
    const v = document.querySelector('#hero .vid');
    const p = v && v.getAttribute('poster');
    const m = p && p.match(/^(.*?)media\//);
    return m ? m[1] + 'media/' : 'media/';
  })();

  /* ---------- SELECTED WORK: lazy sources + demand-driven playback (39) ---------- */
  let openLB = function(){}, closeLB = function(){};
  const track = document.getElementById('reelTrack');
  const reels = track ? [...track.querySelectorAll('.reel')] : [];
  const REELS = reels.map(f => ({
    title: f.querySelector('h3').textContent,
    label: f.querySelector('.label').textContent,
    cat:   f.dataset.cat,
    src:   f.querySelector('video').dataset.src,
    poster:f.querySelector('video').poster,
    drive: f.dataset.drive || '',
    ratio: f.dataset.ratio || '9/16'
  }));
  reels.forEach((f, i) => {
    const btn = f.querySelector('.reel-open') || f;
    btn.addEventListener('click', () => openLB(i));
  });
  const vids = reels.map(f => f.querySelector('video'));
  /* Save-Data / reduced motion: posters only — never fetch preview footage */
  const attach = v => {
    if (!v || saveData || reduced) return;
    if (!v.getAttribute('src')) { v.src = v.dataset.src; v.preload = 'metadata'; }
  };
  const canPlayPreview = () => !reduced && !saveData;
  const startPreview = card => {
    if (!canPlayPreview() || card.dataset.drive) return;   // Drive tiles show their thumbnail
    const v = card.querySelector('video'); if (!v) return;
    attach(v); card.classList.add('is-live');
    const p = v.play(); if (p && p.catch) p.catch(()=>{});
  };
  const stopPreview = card => {
    const v = card.querySelector('video'); if (!v) return;
    if (!v.paused) v.pause();
    card.classList.remove('is-live');
  };
  const near = (saveData || reduced) ? { observe(){}, unobserve(){}, disconnect(){} }
    : new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) {
          if (!e.target.dataset.drive) attach(e.target.querySelector('video'));
          near.unobserve(e.target);
        }
      }), { rootMargin: '300px' });
  const offscreen = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) stopPreview(e.target);
  }), { threshold: .01 });
  reels.forEach(card => {
    near.observe(card); offscreen.observe(card);
    card.addEventListener('pointerenter', () => startPreview(card));
    card.addEventListener('pointerleave', () => stopPreview(card));
    card.addEventListener('focusin', () => startPreview(card));
    card.addEventListener('focusout', () => stopPreview(card));
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) reels.forEach(stopPreview); });

  /* ---------- HERO VIDEO: poster first, motion/data aware, pause control (13) ---------- */
  const vid = document.querySelector('#hero .vid');
  const heroPause = document.getElementById('heroPause');
  if (vid) {
    if (reduced || saveData) {
      if (heroPause) heroPause.hidden = true;               // poster stays, nothing autoplays
    } else {
      const startVid = () => {
        if (vid.getAttribute('src')) return;
        vid.autoplay = true; vid.muted = true;
        vid.src = MEDIA + (innerWidth <= 820 ? 'hero-480.mp4' : 'hero.mp4');
        vid.load();
        const tryPlay = () => { if (vid.paused) { const p = vid.play(); if (p && p.catch) p.catch(()=>{}); } };
        tryPlay();
        vid.addEventListener('canplay', tryPlay, { once:true });
        ['pointerdown','touchstart','keydown','scroll'].forEach(ev => addEventListener(ev, tryPlay, { once:true, passive:true }));
        document.addEventListener('visibilitychange', () => { if (!document.hidden && !vid.dataset.userPaused) tryPlay(); else if (document.hidden) vid.pause(); });
        if (heroPause) {
          heroPause.hidden = false;
          heroPause.classList.add('on');
          const paint = () => {
            const playing = !vid.paused;
            heroPause.textContent = playing ? '❚❚' : '▶';
            heroPause.setAttribute('aria-pressed', String(!playing));
            heroPause.setAttribute('aria-label', playing ? (L.pause || 'Pause') : (L.play || 'Play'));
          };
          heroPause.addEventListener('click', () => {
            if (vid.paused) { vid.dataset.userPaused = ''; vid.play().catch(()=>{}); }
            else { vid.dataset.userPaused = '1'; vid.pause(); }
            paint();
          });
          vid.addEventListener('play', paint); vid.addEventListener('pause', paint); paint();
        }
      };
      if (document.readyState === 'complete') startVid(); else addEventListener('load', startVid, { once:true });
    }
  }

  /* ---------- 6/7 · SELECTED WORK VIEWER (accessible dialog) ---------- */
  const feed = document.getElementById('feed'), feedCol = document.getElementById('feedCol'),
        feedCount = document.getElementById('feedCount'), feedMute = document.getElementById('feedMute'),
        feedClose = document.getElementById('feedClose');
  let feedVids = [], feedMuted = true, feedFocus = null, feedIO = null, feedTrap = null, feedList = [];
  function buildFeed(list){
    feedCol.innerHTML = '';
    list.forEach((r, i) => {
      const it = document.createElement('div');
      it.className = 'feed-item'; it.dataset.i = i;
      const media = r.drive
        ? '<iframe class="feed-frame" title="' + r.title + '" loading="lazy" style="aspect-ratio:' + r.ratio + '"' +
          ' allow="autoplay; fullscreen; encrypted-media" allowfullscreen' +
          ' referrerpolicy="strict-origin-when-cross-origin" data-drive="' + r.drive + '"></iframe>'
        : '<video playsinline loop preload="none" poster="' + r.poster + '" data-src="' + r.src + '" aria-label="' + r.title + '"></video>' +
          '<button type="button" class="feed-toggle" aria-pressed="false"></button>';
      it.innerHTML = '<div class="frame">' + media +
        '<div class="cap"><span class="label">' + r.label + '</span><h3>' + r.title + '</h3></div></div>';
      feedCol.appendChild(it);
    });
    feedVids = [...feedCol.querySelectorAll('video')];
    const feedFrames = [...feedCol.querySelectorAll('.feed-frame')];
    if (feedIO) feedIO.disconnect();
    if (feedFrames.length) {
      const fio = new IntersectionObserver(es => es.forEach(e => {
        const fr = e.target, i = +fr.closest('.feed-item').dataset.i;
        if (e.isIntersecting) {
          if (!fr.getAttribute('src'))
            fr.src = 'https://drive.google.com/file/d/' + fr.dataset.drive + '/preview';
          feedCount.textContent = String(i+1).padStart(2,'0') + ' / ' + String(list.length).padStart(2,'0');
          feed.classList.add('no-sound');
        } else if (fr.getAttribute('src')) {
          fr.removeAttribute('src');            // cross-origin playback can only be stopped by unloading
        }
      }), { root: feedCol, threshold: .6 });
      feedFrames.forEach(fr => fio.observe(fr));
    }
    feedIO = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target, item = v.closest('.feed-item'), i = +item.dataset.i;
      if (e.isIntersecting) {
        if (!v.getAttribute('src') && !saveData) v.src = v.dataset.src;
        v.muted = feedMuted;
        if (!reduced) { const p = v.play(); if (p && p.catch) p.catch(()=>{}); }
        feedCount.textContent = String(i+1).padStart(2,'0') + ' / ' + String(list.length).padStart(2,'0');
        feed.classList.remove('no-sound');
      } else v.pause();
    }), { root: feedCol, threshold: .6 });
    feedVids.forEach(v => {
      feedIO.observe(v);
      const item = v.closest('.feed-item');
      const toggle = item.querySelector('.feed-toggle');
      const paint = () => {
        const playing = !v.paused;
        item.classList.toggle('paused', !playing);
        toggle.textContent = playing ? '❚❚' : '▶';
        toggle.setAttribute('aria-pressed', String(!playing));
        toggle.setAttribute('aria-label', (playing ? (L.pause || 'Pause') : (L.play || 'Play')) + ' — ' + (v.getAttribute('aria-label') || ''));
      };
      toggle.addEventListener('click', () => { v.paused ? v.play().catch(()=>{}) : v.pause(); });
      v.addEventListener('play', paint); v.addEventListener('pause', paint); paint();
    });
  }
  openLB = function(i){
    if (!feed) return;
    const key = window.__smvFilter || 'all';
    feedList = key === 'all' ? REELS : REELS.filter(r => r.cat === key);
    const cardTitle = reels[i] && reels[i].querySelector('h3').textContent;
    let idx = feedList.findIndex(r => r.title === cardTitle && r.src === REELS[i].src);
    if (idx < 0) idx = 0;
    buildFeed(feedList);
    feedFocus = document.activeElement;
    feed.classList.add('open'); feed.setAttribute('aria-hidden','false'); feed.removeAttribute('inert');
    M.lockScroll(true); M.setBackgroundInert(true, feed);
    feedTrap = M.trapTab(feed); document.addEventListener('keydown', feedTrap, true);
    const item = feedCol.children[idx];
    if (item) feedCol.scrollTo({ top: item.offsetTop, behavior: 'auto' });
    feedCount.textContent = String(idx+1).padStart(2,'0') + ' / ' + String(feedList.length).padStart(2,'0');
    M.focusWhenReady(feedClose);
  };
  closeLB = function(){
    if (!feed || !feed.classList.contains('open')) return;
    feed.classList.remove('open'); feed.setAttribute('aria-hidden','true');
    if (feedTrap) { document.removeEventListener('keydown', feedTrap, true); feedTrap = null; }
    feedVids.forEach(v => v.pause());
    feedCol.querySelectorAll('.feed-frame[src]').forEach(fr => fr.removeAttribute('src'));
    M.setBackgroundInert(false); M.lockScroll(false);
    if (feedFocus && feedFocus.focus) feedFocus.focus();
  };
  if (feed) {
    feedClose.addEventListener('click', closeLB);
    feed.querySelector('.feed-bg').addEventListener('click', closeLB);
    feedMute.addEventListener('click', () => {
      feedMuted = !feedMuted;
      feedMute.setAttribute('aria-pressed', String(!feedMuted));
      feedMute.textContent = feedMuted ? 'SOUND OFF' : 'SOUND ON';
      feedVids.forEach(v => v.muted = feedMuted);
    });
    feedMute.setAttribute('aria-pressed','false');
    addEventListener('keydown', e => {
      if (!feed.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeLB(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); feedCol.scrollBy({ top:(e.key==='ArrowDown'?1:-1)*feedCol.clientHeight, behavior:'smooth' }); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) feedVids.forEach(v => v.pause()); });
  }

  /* ---------- 6 · SHOWREEL DIALOG (native-grade controls, exposed state) ---------- */
  const rp = document.getElementById('rp'), rpV = document.getElementById('rpVideo'),
        rpPlay = document.getElementById('rpPlay'), rpTc = document.getElementById('rpTc'),
        rpDur = document.getElementById('rpDur'), rpRange = document.getElementById('rpRange'),
        rpMute = document.getElementById('rpMute'), rpClose = document.getElementById('rpClose');
  const tc = s => { s = Math.max(0, s|0); return [s/3600|0, (s/60|0)%60, s%60].map(n => String(n).padStart(2,'0')).join(':'); };
  let rpFocus = null, rpTrap = null, seeking = false;
  function paintRP(){
    const playing = !rpV.paused;
    rpPlay.classList.toggle('playing', playing);
    rpPlay.setAttribute('aria-pressed', String(playing));
    rpPlay.setAttribute('aria-label', playing ? (L.pause || 'Pause') : (L.play || 'Play'));
  }
  function openRP(){
    if (!rp) return;
    rpFocus = document.activeElement;
    rp.classList.add('open'); rp.setAttribute('aria-hidden','false'); rp.removeAttribute('inert');
    M.lockScroll(true); M.setBackgroundInert(true, rp);
    rpTrap = M.trapTab(rp); document.addEventListener('keydown', rpTrap, true);
    if (!rpV.getAttribute('src')) rpV.src = MEDIA + 'showreel.mp4';
    rpV.currentTime = 0;
    if (reduced) { rpV.pause(); }
    else { rpV.muted = false; rpV.play().catch(() => { rpV.muted = true; rpMute.setAttribute('aria-pressed','true'); rpV.play().catch(()=>{}); }); }
    paintRP();
    M.focusWhenReady(rpClose);
  }
  function closeRP(){
    if (!rp || !rp.classList.contains('open')) return;
    rpV.pause();
    rp.classList.remove('open'); rp.setAttribute('aria-hidden','true');
    if (rpTrap) { document.removeEventListener('keydown', rpTrap, true); rpTrap = null; }
    M.setBackgroundInert(false); M.lockScroll(false);
    if (rpFocus && rpFocus.focus) rpFocus.focus();
  }
  const openShowreel = document.getElementById('openShowreel');
  if (openShowreel && rp) {
    openShowreel.addEventListener('click', openRP);
    rpClose.addEventListener('click', closeRP);
    rp.querySelector('.rp-bg').addEventListener('click', closeRP);
    rpPlay.addEventListener('click', () => { rpV.paused ? rpV.play().catch(()=>{}) : rpV.pause(); });
    rpV.addEventListener('click', () => { rpV.paused ? rpV.play().catch(()=>{}) : rpV.pause(); });
    rpV.addEventListener('play', paintRP); rpV.addEventListener('pause', paintRP);
    rpV.addEventListener('loadedmetadata', () => {
      rpDur.textContent = tc(rpV.duration);
      if (rpRange) { rpRange.max = String(Math.floor(rpV.duration) || 0); rpRange.disabled = false; }
    });
    rpV.addEventListener('timeupdate', () => {
      rpTc.textContent = tc(rpV.currentTime);
      if (rpRange && !seeking && rpV.duration) {
        rpRange.value = String(Math.floor(rpV.currentTime));
        rpRange.setAttribute('aria-valuetext', tc(rpV.currentTime) + ' / ' + tc(rpV.duration));
        rpRange.style.setProperty('--p', (rpV.currentTime / rpV.duration * 100) + '%');
      }
    });
    if (rpRange) {
      rpRange.addEventListener('input', () => { seeking = true; rpV.currentTime = +rpRange.value; });
      rpRange.addEventListener('change', () => { seeking = false; });
    }
    rpV.addEventListener('ended', () => { rpV.currentTime = 0; if (!reduced) rpV.play().catch(()=>{}); });
    rpMute.addEventListener('click', () => {
      rpV.muted = !rpV.muted;
      rpMute.setAttribute('aria-pressed', String(rpV.muted));
      rpMute.classList.toggle('off', rpV.muted);
    });
    addEventListener('keydown', e => {
      if (!rp.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRP(); }
      if (e.key === ' ' && e.target === rpV) { e.preventDefault(); rpV.paused ? rpV.play() : rpV.pause(); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) rpV.pause(); });
  }

  /* pause previews whenever a dialog opens */
  document.addEventListener('smv:filter', () => { if (feed && feed.classList.contains('open')) closeLB(); });

  /* ---------- SPOTLIGHT TILES ---------- */
  document.querySelectorAll('.tile').forEach(t => {
    t.addEventListener('pointermove', e => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive:true });
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
      e.preventDefault(); smoother.scrollTo(t, true, 'top 120px');
    }));
    /* 16 · keyboard focus must never land off-screen: the smoother owns the visual
       offset, so follow the browser's focus scroll instead of fighting it. */
    document.addEventListener('focusin', e => {
      const el = e.target;
      if (!el || !el.getBoundingClientRect || el.closest('#feed, #rp, #mmenu, #nav')) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 120 || r.top > innerHeight - 40) smoother.scrollTo(el, false, 'center center');
    });
    /* Deep links arriving with a hash must clear the fixed nav. One early scroll is
       not enough: fonts, reveals and image loads shift the page underneath it, so
       re-apply until the layout settles — and stop the moment the visitor scrolls. */
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) {
        let settled = false;
        const land = () => { if (!settled) smoother.scrollTo(target, false, 'top 120px'); };
        const stop = () => { settled = true; };
        ['wheel','touchstart','keydown','pointerdown'].forEach(ev =>
          addEventListener(ev, stop, { once: true, passive: true }));
        requestAnimationFrame(land);
        addEventListener('load', () => setTimeout(land, 80), { once: true });
        (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())
          .then(() => { ScrollTrigger.refresh(); setTimeout(land, 120); });
        [400, 900, 1500].forEach(ms => setTimeout(land, ms));
        setTimeout(stop, 2000);
      }
    }
  }

  /* ---------- HERO INTRO (letters, light sweep, decoded tagline) ---------- */
  /* The hero intro is CSS-driven so the largest text paints on the first frame
     instead of waiting for the animation library. Nothing to do here. */
  function heroIntro(){}

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
    gsap.delayedCall(.05, heroIntro);
  }

  /* ---------- CUSTOM CURSOR ---------- */
  const cur = document.getElementById('cur');
  const wantsCursor = matchMedia('(hover:hover) and (pointer:fine)').matches && !reduced;
  if (cur && wantsCursor) document.documentElement.classList.add('cur');
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
  const reelEls = gsap.utils.toArray('.reel-preview');
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


  /* ---------- 04 · SERVICE JOURNEY (rail draws with scroll, stops light up) ---------- */
  const journey = document.querySelector('.service-journey');
  if (journey) {
    const stops = [...journey.querySelectorAll('.service-stop')];
    const nodes = stops.map(s => s.querySelector('.service-node'));
    const svg = journey.querySelector('.service-line');
    const livePath = journey.querySelector('.service-line-live');
    let plen = 1;

    /* The rail must start at the first node and end at the last one — spanning the
       whole block made it overshoot both ends. Measure and pin it. */
    function sizeRail(){
      if (!nodes.length) return;
      const base = journey.getBoundingClientRect();
      const first = nodes[0].getBoundingClientRect();
      const last = nodes[nodes.length - 1].getBoundingClientRect();
      const top = (first.top + first.height / 2) - base.top;
      const h = (last.top + last.height / 2) - base.top - top;
      journey.style.setProperty('--rail-top', top + 'px');
      journey.style.setProperty('--rail-h', Math.max(h, 1) + 'px');
      /* The rail uses vector-effect:non-scaling-stroke, so its dash pattern is
         measured in screen pixels — not the path's 1000 user units. Feeding it
         getTotalLength() left the fill short by the difference. */
      plen = Math.max(h, 1);
      livePath.style.strokeDasharray = String(plen);
      livePath.style.strokeDashoffset = String(plen);
    }

    function update(){
      const first = nodes[0].getBoundingClientRect();
      const last = nodes[nodes.length - 1].getBoundingClientRect();
      const start = first.top + first.height / 2;
      const end = last.top + last.height / 2;
      const mark = innerHeight * 0.55;                       // the reading line
      const span = Math.max(end - start, 1);
      const progress = Math.max(0, Math.min(1, (mark - start) / span));
      livePath.style.strokeDashoffset = String(plen * (1 - progress));
      let active = -1;
      nodes.forEach((n, i) => { if (n.getBoundingClientRect().top < mark) active = i; });
      stops.forEach((s, i) => s.classList.toggle('is-active', i === active));
    }

    sizeRail(); update();
    addEventListener('resize', () => { sizeRail(); update(); });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())
      .then(() => { sizeRail(); update(); ScrollTrigger.refresh(); });
    /* A trigger scoped to the section measures its range once and can go stale when
       the layout settles later. Drive the rail from the page-wide scroll instead and
       skip the work whenever the section is nowhere near the viewport. */
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate(){
      const r = journey.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      update();
    }, onRefresh(){ sizeRail(); update(); } });
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
