/* Shared runtime for every SMV page (English + Arabic).
   Loaded before site.js on the homepage; loaded alone on inner pages. */
(function(){
  const root = document.documentElement;
  const AR = root.lang === 'ar';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const L = AR ? {
    openMenu:'فتح القائمة', closeMenu:'إغلاق القائمة',
    toDark:'التبديل إلى الوضع الداكن', toLight:'التبديل إلى الوضع الفاتح',
    filtered:(n,f)=>`عرض ${n} من الأعمال · التصنيف: ${f}`,
    required:'هذا الحقل مطلوب.', email:'يرجى إدخال بريد عمل صحيح.',
    consent:'يلزم الموافقة للمتابعة.', choose:'يرجى الاختيار من القائمة.',
    errTitle:(n)=>`يوجد ${n} من الحقول تحتاج إلى مراجعة`,
    sending:'جارٍ الإرسال…', play:'تشغيل', pause:'إيقاف مؤقت'
  } : {
    openMenu:'Open menu', closeMenu:'Close menu',
    toDark:'Switch to dark mode', toLight:'Switch to light mode',
    filtered:(n,f)=>`Showing ${n} ${n===1?'project':'projects'} · filter: ${f}`,
    required:'This field is required.', email:'Enter a valid work email address.',
    consent:'Consent is required to continue.', choose:'Please choose an option.',
    errTitle:(n)=>`${n} ${n===1?'field needs':'fields need'} your attention`,
    sending:'Sending…', play:'Play', pause:'Pause'
  };
  window.__smvL = L; window.__smvAR = AR;

  /* ---------- inert / scroll-lock helpers shared by every overlay ---------- */
  const lockTargets = () => [...document.body.children].filter(el =>
    el.id !== 'mmenu' && el.id !== 'feed' && el.id !== 'rp' && el.tagName !== 'SCRIPT');
  let lockDepth = 0;
  function setBackgroundInert(on, keep){
    lockTargets().forEach(el => {
      if (keep && (el === keep || el.contains(keep))) return;
      if (on) { el.setAttribute('inert',''); el.setAttribute('aria-hidden','true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }
  function lockScroll(on){
    if (on) {
      if (lockDepth++ === 0) {
        const sbw = innerWidth - root.clientWidth;
        root.style.setProperty('--sbw', sbw > 0 ? sbw + 'px' : '0px');
        root.classList.add('modal-open');
      }
    } else if (lockDepth > 0 && --lockDepth === 0) {
      root.classList.remove('modal-open');
    }
  }
  const FOCUSABLE = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),video[controls],[tabindex]:not([tabindex="-1"])';
  function trapTab(container){
    return function(e){
      if (e.key !== 'Tab') return;
      let items = [...container.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) items = [...container.querySelectorAll(FOCUSABLE)];
      if (!items.length) { e.preventDefault(); return; }
      if (!container.contains(document.activeElement)) { e.preventDefault(); items[0].focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
  }
  /* a dialog fades in via a visibility transition; retry until focus actually lands */
  function focusWhenReady(el){
    if (!el) return;
    let tries = 0;
    const go = () => {
      el.focus();
      if (document.activeElement === el || ++tries > 12) return;
      setTimeout(go, 40);
    };
    requestAnimationFrame(go);
  }
  window.__smvModal = { setBackgroundInert, lockScroll, trapTab, FOCUSABLE, focusWhenReady };

  /* ---------- 23/24 · theme toggle: state, localized label, theme-color ---------- */
  const themeBtn = document.getElementById('themeBtn');
  const sysLight = matchMedia('(prefers-color-scheme: light)');
  const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>';
  const moon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M20.2 14.5A8.5 8.5 0 0 1 9.5 3.8 8.5 8.5 0 1 0 20.2 14.5Z"/></svg>';
  const themeOf = () => root.dataset.theme || (sysLight.matches ? 'light' : 'dark');
  function paintTheme(){
    const dark = themeOf() === 'dark';
    if (themeBtn) {
      themeBtn.innerHTML = dark ? sun : moon;
      themeBtn.setAttribute('aria-pressed', String(dark));
      themeBtn.setAttribute('aria-label', dark ? L.toLight : L.toDark);
      themeBtn.title = dark ? L.toLight : L.toDark;
    }
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());
    const m = document.createElement('meta');
    m.name = 'theme-color'; m.content = dark ? '#111418' : '#DDE0E4';
    document.head.appendChild(m);
  }
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = themeOf() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('smv-theme', next); } catch(e){}
    paintTheme();
  });
  sysLight.addEventListener('change', paintTheme);
  paintTheme();

  /* ---------- 15 · mobile menu: landmark, focus trap, inert, Escape, restore ---------- */
  const menuBtn = document.getElementById('menuBtn'), mmenu = document.getElementById('mmenu');
  let menuTrap = null, menuOpener = null;
  function setMenu(open){
    if (!menuBtn || !mmenu) return;
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? L.closeMenu : L.openMenu);
    mmenu.setAttribute('aria-hidden', String(!open));
    if (open) {
      menuOpener = menuBtn;
      lockScroll(true); setBackgroundInert(true, mmenu);
      menuTrap = trapTab(mmenu); document.addEventListener('keydown', menuTrap, true);
      /* the panel fades in, so a plain focus() call can land on a still-hidden
         element and silently do nothing — retry until focus actually moves */
      focusWhenReady(mmenu.querySelector(FOCUSABLE));
    } else {
      if (menuTrap) { document.removeEventListener('keydown', menuTrap, true); menuTrap = null; }
      setBackgroundInert(false); lockScroll(false);
      if (menuOpener && menuOpener.focus) menuOpener.focus();
      menuOpener = null;
    }
  }
  window.__smvSetMenu = setMenu;
  if (menuBtn && mmenu) {
    menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
    mmenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { e.preventDefault(); setMenu(false); }
    });
  }

  /* ---------- dynamic year ---------- */
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- 19/20 · work filters: aria-pressed, live count, URL sync ---------- */
  const filterBar = document.querySelector('.filters');
  if (filterBar) {
    const buttons = [...filterBar.querySelectorAll('button')];
    const status = document.getElementById('filterStatus');
    const cards = () => [...document.querySelectorAll('.reel')];
    function applyFilter(key, push, animate){
      const btn = buttons.find(b => b.dataset.filter === key) || buttons[0];
      key = btn.dataset.filter;
      buttons.forEach(b => {
        const on = b === btn;
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('on', on);
        b.removeAttribute('aria-selected');
      });
      const items = cards();
      const run = () => items.forEach(el => el.classList.toggle('is-hidden', key !== 'all' && el.dataset.cat !== key));
      /* The Flip transition absolutely-positions the cards mid-flight, which briefly
         pushes them outside the grid — fine on interaction, but on first paint it
         shows a horizontal scrollbar. Restore state instantly on load. */
      if (animate && window.gsap && window.Flip && !reduced && !root.classList.contains('static-page')) {
        const state = Flip.getState(items);
        run();
        Flip.from(state, { duration:.7, ease:'power3.inOut', stagger:.02, absolute:true, scale:true,
          onEnter: els => gsap.fromTo(els, { opacity:0, scale:.85 }, { opacity:1, scale:1, duration:.6 }),
          onLeave: els => gsap.to(els, { opacity:0, scale:.85, duration:.4 }) });
        if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 800);
      } else run();
      const visible = items.filter(el => !el.classList.contains('is-hidden'));
      if (status) status.textContent = L.filtered(visible.length, btn.textContent.trim());
      window.__smvFilter = key;
      document.dispatchEvent(new CustomEvent('smv:filter', { detail:{ key, visible } }));
      if (push) {
        const url = new URL(location.href);
        if (key === 'all') url.searchParams.delete('work'); else url.searchParams.set('work', key);
        history.pushState({ work:key }, '', url);
      }
    }
    buttons.forEach(b => b.addEventListener('click', () => applyFilter(b.dataset.filter, true, true)));
    const fromURL = () => {
      const key = new URL(location.href).searchParams.get('work') || 'all';
      applyFilter(buttons.some(b => b.dataset.filter === key) ? key : 'all', false, false);
    };
    addEventListener('popstate', fromURL);
    fromURL();
  }

  /* ---------- projects: videography / photography tabs ---------- */
  const tablist = document.querySelector('.pv-switch');
  if (tablist) {
    const tabs = [...tablist.querySelectorAll('[role=tab]')];
    const panelOf = t => document.getElementById(t.getAttribute('aria-controls'));
    function select(tab, focus){
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = panelOf(t);
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      const url = new URL(location.href);
      const key = tab.id === 'tabPhoto' ? 'photography' : 'videography';
      if (key === 'videography') url.searchParams.delete('view'); else url.searchParams.set('view', key);
      history.replaceState(null, '', url);
    }
    tabs.forEach(t => t.addEventListener('click', () => select(t, false)));
    tablist.addEventListener('keydown', e => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const rtl = getComputedStyle(tablist).direction === 'rtl';
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + (rtl ? -1 : 1) + tabs.length) % tabs.length];
      if (e.key === 'ArrowLeft')  next = tabs[(i + (rtl ? 1 : -1) + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End')  next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); select(next, true); }
    });
    const want = new URL(location.href).searchParams.get('view');
    if (want === 'photography') select(document.getElementById('tabPhoto'), false);
  }

  /* ---------- SILENT PREVIEW LOOPS ----------
     Cards backed by a self-hosted loop play by themselves, but only while they
     are on screen: preload="none" means an off-screen card costs nothing, and
     pausing on exit keeps a long grid from decoding twenty videos at once.
     Anyone who asked for less motion, or is on a metered connection, keeps the
     poster frame and the play control. */
  const loops = [...document.querySelectorAll('.reel-prev')];
  if (loops.length) {
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    const motionOK = !reduced && !saveData;
    const roll = v => { if (!motionOK) return; const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    if (motionOK && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) roll(e.target);
        else { try { e.target.pause(); } catch (err) {} }
      }), { rootMargin: '150px 0px', threshold: 0.15 });
      loops.forEach(v => io.observe(v));
    } else if (motionOK) {
      loops.forEach(roll);
    }
    /* a loop is a taste of the film, not the film: opening one swaps the real
       player into the same box, so playback never leaves the card */
    document.querySelectorAll('.reel-preview .reel-open').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.reel');
        const id = card && card.dataset.youtube;
        if (!id || card.querySelector('.reel-frame')) return;
        const title = (card.querySelector('h3') || {}).textContent || '';
        const f = document.createElement('iframe');
        f.className = 'reel-frame';
        f.title = title;
        f.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
                '?rel=0&modestbranding=1&autoplay=1';
        const v = card.querySelector('.reel-prev');
        if (v) { try { v.pause(); } catch (e) {} v.remove(); }
        btn.remove();
        const badge = card.querySelector('.play');
        if (badge) badge.remove();
        card.classList.remove('reel-preview');
        card.insertBefore(f, card.firstChild);
        f.focus({ preventScroll: true });
      });
    });
  }

  /* ---------- 26-30 · brief form: validation, submit state, success ---------- */
  const form = document.getElementById('brief');
  if (form) {
    const summary = document.getElementById('formErrors');
    const submitBtn = form.querySelector('button[type=submit]');
    const label = f => {
      const l = form.querySelector(`label[for="${f.id}"]`);
      return l ? l.textContent.replace(/\s*\*\s*$/, '').trim() : f.name;
    };
    function problem(f){
      if (f.type === 'checkbox') return f.required && !f.checked ? L.consent : '';
      if (f.required && !f.value.trim()) return f.tagName === 'SELECT' ? L.choose : L.required;
      if (f.type === 'email' && f.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value)) return L.email;
      if (f.validity && f.validity.badInput) return L.required;
      return '';
    }
    function showError(f, msg){
      const wrap = f.closest('.f') || f.parentElement;
      let box = wrap.querySelector('.field-error');
      if (msg) {
        if (!box) {
          box = document.createElement('span');
          box.className = 'field-error';
          box.id = (f.id || f.name) + '-err';
          wrap.appendChild(box);
        }
        box.textContent = msg;
        f.setAttribute('aria-invalid', 'true');
        const d = (f.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
        if (!d.includes(box.id)) { d.push(box.id); f.setAttribute('aria-describedby', d.join(' ')); }
      } else {
        if (box) {
          const d = (f.getAttribute('aria-describedby') || '').split(/\s+/).filter(x => x && x !== box.id);
          d.length ? f.setAttribute('aria-describedby', d.join(' ')) : f.removeAttribute('aria-describedby');
          box.remove();
        }
        f.removeAttribute('aria-invalid');
      }
    }
    const fields = () => [...form.querySelectorAll('input:not([type=hidden]):not(.hp), select, textarea')];
    fields().forEach(f => {
      f.addEventListener('blur', () => { if (f.dataset.touched) showError(f, problem(f)); });
      f.addEventListener('input', () => { f.dataset.touched = '1'; if (f.getAttribute('aria-invalid')) showError(f, problem(f)); });
      f.addEventListener('change', () => { f.dataset.touched = '1'; showError(f, problem(f)); });
    });
    let submitting = false;
    form.addEventListener('submit', e => {
      if (submitting) { e.preventDefault(); return; }
      const bad = [];
      fields().forEach(f => { f.dataset.touched = '1'; const m = problem(f); showError(f, m); if (m) bad.push([f, m]); });
      if (bad.length) {
        e.preventDefault();
        if (summary) {
          summary.innerHTML = `<h2>${L.errTitle(bad.length)}</h2><ol>${bad.map(([f,m]) =>
            `<li><a href="#${f.id}">${label(f)} — ${m}</a></li>`).join('')}</ol>`;
          summary.hidden = false;
          summary.setAttribute('tabindex','-1');
          summary.focus();
          summary.querySelectorAll('a').forEach(a => a.addEventListener('click', ev => {
            ev.preventDefault();
            const t = document.getElementById(a.getAttribute('href').slice(1));
            if (t) t.focus();
          }));
        }
        bad[0][0].focus();
        return;
      }
      if (summary) summary.hidden = true;
      submitting = true;
      if (submitBtn) {
        submitBtn.dataset.idle = submitBtn.textContent;
        submitBtn.textContent = L.sending;
        submitBtn.setAttribute('aria-disabled','true');
        setTimeout(() => { submitBtn.disabled = true; }, 0);
      }
    });
  }

  /* ---------- 29 · success confirmation ---------- */
  if (location.search.includes('sent=1')) {
    const ok = document.getElementById('sentMsg');
    if (ok) {
      ok.hidden = false;
      ok.setAttribute('tabindex','-1');
      requestAnimationFrame(() => { ok.focus(); ok.scrollIntoView({ block:'center' }); });
    }
    const url = new URL(location.href);
    url.searchParams.delete('sent');
    history.replaceState(null, '', url.pathname + url.search);
  }
})();
