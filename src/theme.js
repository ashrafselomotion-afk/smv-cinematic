(function(){
  var d = document.documentElement;
  /* JS is available: reveal-hiding and other JS-dependent states may apply.
     Without this class every .reveal stays visible (no-JS, failed JS, print, capture). */
  d.classList.add('js');
  try{
    var t = localStorage.getItem('smv-theme');
    if (t === 'light' || t === 'dark') d.dataset.theme = t;
  }catch(e){}
  try{
    var r = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var save = !!(navigator.connection && navigator.connection.saveData);
    if (r || save) d.classList.add('lite');
    var seen = sessionStorage.getItem('smv-leader');
    if (!r && !save && !seen && innerWidth > 820) { d.classList.add('leader'); sessionStorage.setItem('smv-leader','1'); }
    /* the 'cur' class is added by site.js, and only on pages that actually
       render and drive the custom cursor — otherwise the native pointer would
       be hidden with nothing replacing it. */
  }catch(e){}
})();
