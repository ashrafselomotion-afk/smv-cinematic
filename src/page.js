(function(){
  /* Static subpage runtime: theme toggle, mobile menu, reveals, year, form states. */
  document.documentElement.classList.add('no-anim', 'static-page');

  const themeBtn = document.getElementById('themeBtn');
  const sysLight = matchMedia('(prefers-color-scheme: light)');
  const sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>';
  const moonIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.2 14.5A8.5 8.5 0 0 1 9.5 3.8 8.5 8.5 0 1 0 20.2 14.5Z"/></svg>';
  function effectiveTheme(){ return document.documentElement.dataset.theme || (sysLight.matches ? 'light' : 'dark'); }
  function paintThemeBtn(){ if (themeBtn) themeBtn.innerHTML = effectiveTheme() === 'dark' ? sunIcon : moonIcon; }
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('smv-theme', next); } catch(e){}
      paintThemeBtn();
    });
    sysLight.addEventListener('change', paintThemeBtn);
    paintThemeBtn();
  }

  const menuBtn = document.getElementById('menuBtn'), mmenu = document.getElementById('mmenu');
  if (menuBtn && mmenu) {
    menuBtn.addEventListener('click', () => {
      const open = !document.documentElement.classList.contains('menu-open');
      document.documentElement.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', open);
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mmenu.setAttribute('aria-hidden', !open);
    });
    mmenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      document.documentElement.classList.remove('menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      mmenu.setAttribute('aria-hidden', 'true');
    }));
  }

  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* Brief form: success state after redirect, inline validation message hook */
  if (location.search.includes('sent=1')) {
    const ok = document.getElementById('sentMsg');
    if (ok) { ok.hidden = false; ok.scrollIntoView({ block: 'center' }); }
    history.replaceState(null, '', location.pathname);
  }
})();
