/* SMV media admin.

   Everything happens in the browser: the page reads content/media.json through
   the GitHub API, lets you edit it, and writes it back as a commit. A workflow
   in the repository then re-renders the four gallery pages, so nobody has to
   run a build by hand.

   The token is held in memory, and in localStorage only if you ask for it. It
   is sent to api.github.com and nowhere else — the page's own CSP enforces that. */
(function () {
  'use strict';

  var API = 'https://api.github.com';
  var STORE = 'smv-admin';
  var MANIFEST = 'content/media.json';
  var LOOP_DIR = 'media/previews/';
  var PHOTO_DIR = 'media/photos/';
  var LOGO_DIR = 'media/logos/';
  var LOGO_MAX = 512 * 1024;            // a mark this big is a photo, not a logo
  var LOOP_WARN = 2 * 1024 * 1024;      // a loop this big is a sign it is too long
  var LOOP_MAX = 8 * 1024 * 1024;       // above this the repo starts to suffer
  var PHOTO_EDGE = 1600;                // longest side after resizing
  var MAX_FEATURED = 5;

  var token = '', repo = '', sha = '';
  var doc = { videos: [], photos: [], clients: [] };
  var pending = [];                     // files to upload alongside the manifest
  var dirty = false;

  var $ = function (id) { return document.getElementById(id); };

  /* ------------------------------------------------------------------ github */

  function gh(path, opts) {
    opts = opts || {};
    return fetch(API + path, {
      method: opts.method || 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var m = j.message || ('HTTP ' + r.status);
          if (r.status === 401) m = 'That token was rejected. It may be wrong, expired or revoked.';
          if (r.status === 403) m = 'That token cannot write to this repository. Check its Contents permission.';
          if (r.status === 404) m = 'Not found — check the repository name, and that the token can see it.';
          if (r.status === 409) m = 'The file changed on GitHub since this page loaded. Reload and redo this edit.';
          throw new Error(m);
        }
        return j;
      });
    });
  }

  /* GitHub wants base64, and btoa cannot take non-Latin-1 — so go via bytes. */
  function b64(bytes) {
    var s = '', chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(s);
  }
  function b64text(str) { return b64(new TextEncoder().encode(str)); }
  function unb64text(str) {
    var bin = atob(str.replace(/\n/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function putFile(path, contentB64, message, fileSha) {
    return gh('/repos/' + repo + '/contents/' + path, {
      method: 'PUT',
      body: { message: message, content: contentB64, sha: fileSha || undefined, branch: 'main' }
    });
  }

  /* ------------------------------------------------------------------ state */

  function markDirty() {
    dirty = true;
    $('dirty').hidden = false;
    $('publish').disabled = false;
  }
  function markClean() {
    dirty = false;
    $('dirty').hidden = true;
    $('publish').disabled = true;
  }

  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ------------------------------------------------------------------ connect */

  function boot() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
    if (saved && saved.token && saved.repo) {
      $('repo').value = saved.repo;
      $('token').value = saved.token;
      connect(saved.repo, saved.token, false).catch(function () {
        /* a stale token should not trap anyone on a blank screen */
        try { localStorage.removeItem(STORE); } catch (e) {}
        say('The saved token no longer works — please connect again.', 'bad');
      });
    }
  }

  function say(text, kind) {
    var el = $('connectMsg');
    el.textContent = text || '';
    el.className = 'msg' + (kind ? ' ' + kind : '');
  }

  function connect(r, tk, remember) {
    repo = r.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    token = tk.trim();
    say('Connecting…');
    return gh('/repos/' + repo + '/contents/' + MANIFEST).then(function (file) {
      sha = file.sha;
      doc = JSON.parse(unb64text(file.content));
      doc.videos = doc.videos || [];
      doc.photos = doc.photos || [];
      doc.clients = doc.clients || [];
      if (remember) {
        try { localStorage.setItem(STORE, JSON.stringify({ repo: repo, token: token })); } catch (e) {}
      }
      say('');
      $('connect').hidden = true;
      $('editor').hidden = false;
      $('signout').hidden = false;
      renderFilms();
      renderPhotos();
      renderClients();
      markClean();
    }).catch(function (err) { say(err.message, 'bad'); throw err; });
  }

  $('connectForm').addEventListener('submit', function (e) {
    e.preventDefault();
    connect($('repo').value, $('token').value, $('remember').checked).catch(function () {});
  });

  $('signout').addEventListener('click', function () {
    if (dirty && !confirm('You have unpublished changes. Sign out and lose them?')) return;
    try { localStorage.removeItem(STORE); } catch (e) {}
    location.reload();
  });

  /* ------------------------------------------------------------------ tabs */

  var tabs = [$('tFilms'), $('tPhotos'), $('tClients')];
  var panels = [$('pFilms'), $('pPhotos'), $('pClients')];
  function selectTab(i, focus) {
    tabs.forEach(function (t, n) {
      t.setAttribute('aria-selected', String(n === i));
      t.tabIndex = n === i ? 0 : -1;
      panels[n].hidden = n !== i;
    });
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(i, false); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); selectTab((i + 1) % tabs.length, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); selectTab((i + tabs.length - 1) % tabs.length, true); }
    });
  });

  /* ------------------------------------------------------------------ films */

  function ytThumb(id) { return 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; }

  function featuredCount() {
    return doc.videos.filter(function (v) { return v.featured; }).length;
  }

  function renumberFeatured() {
    var n = 0;
    doc.videos.forEach(function (v) { if (v.featured) v.featured = ++n; });
  }

  function renderFilms() {
    var host = $('films');
    host.textContent = '';
    doc.videos.forEach(function (v, i) {
      host.appendChild(filmCard(v, i));
    });
    $('filmCount').textContent =
      doc.videos.length + ' film' + (doc.videos.length === 1 ? '' : 's') + ' · ' +
      featuredCount() + ' on the homepage · ' +
      doc.videos.filter(function (v) { return v.preview; }).length + ' with a preview loop';
  }

  function filmCard(v, i) {
    var node = $('filmTpl').content.firstElementChild.cloneNode(true);
    var head = node.querySelector('.card-head');

    function refreshHead() {
      node.querySelector('.name').textContent = v.titleEn || 'Untitled';
      var bits = [];
      if (v.featured) bits.push('<span class="on">Homepage ' + v.featured + '</span>');
      bits.push(v.preview ? '<span class="on">Loop</span>' : 'Still');
      bits.push(v.youtube || 'no id');
      node.querySelector('.sub').innerHTML = bits.join(' · ');
      var t = node.querySelector('.thumb');
      t.src = v.poster || (v.youtube ? ytThumb(v.youtube) : '');
    }
    refreshHead();

    head.addEventListener('click', function (e) {
      if (e.target.closest('.card-tools')) return;
      node.classList.toggle('open');
    });

    node.querySelectorAll('[data-k]').forEach(function (input) {
      input.value = v[input.dataset.k] || '';
      input.addEventListener('input', function () {
        v[input.dataset.k] = input.value.trim();
        refreshHead();
        markDirty();
      });
    });

    var fav = node.querySelector('.featured');
    fav.checked = !!v.featured;
    fav.addEventListener('change', function () {
      if (fav.checked && featuredCount() >= MAX_FEATURED) {
        fav.checked = false;
        alert('The homepage shows ' + MAX_FEATURED + ' films. Untick another one first.');
        return;
      }
      v.featured = fav.checked ? featuredCount() + 1 : null;
      renumberFeatured();
      renderFilms();
      markDirty();
    });

    /* preview loop */
    var fname = node.querySelector('.filename');
    var clear = node.querySelector('.clearLoop');
    function refreshLoop() {
      fname.textContent = v.preview ? v.preview.split('/').pop() : 'No loop — the grid shows a still';
      fname.classList.toggle('has', !!v.preview);
      clear.hidden = !v.preview;
      refreshHead();
    }
    refreshLoop();

    node.querySelector('.pickLoop').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      if (f.size > LOOP_MAX) {
        alert('That clip is ' + mb(f.size) + '. Keep preview loops under ' + mb(LOOP_MAX) +
              ' — they are meant to be a few silent seconds, not the whole film.');
        return;
      }
      if (f.size > LOOP_WARN &&
          !confirm('That clip is ' + mb(f.size) + '. Preview loops work best under ' +
                   mb(LOOP_WARN) + '. Use it anyway?')) return;
      var ext = /\.webm$/i.test(f.name) ? '.webm' : '.mp4';
      var name = (v.youtube || 'film-' + Date.now()) + ext;
      queue(LOOP_DIR + name, f);
      v.preview = LOOP_DIR + name;
      grabPoster(f).then(function (jpg) {
        if (!jpg) return;
        var pname = (v.youtube || 'film') + '.jpg';
        queue(LOOP_DIR + pname, jpg);
        v.poster = LOOP_DIR + pname;
        refreshLoop();
      });
      refreshLoop();
      markDirty();
    });

    clear.addEventListener('click', function () {
      unqueue(v.preview); unqueue(v.poster);
      v.preview = null; v.poster = null;
      refreshLoop();
      markDirty();
    });

    /* order + removal */
    var up = node.querySelector('.up'), down = node.querySelector('.down');
    up.disabled = i === 0;
    down.disabled = i === doc.videos.length - 1;
    up.addEventListener('click', function () { move(doc.videos, i, -1); renumberFeatured(); renderFilms(); markDirty(); });
    down.addEventListener('click', function () { move(doc.videos, i, 1); renumberFeatured(); renderFilms(); markDirty(); });
    node.querySelector('.del').addEventListener('click', function () {
      if (!confirm('Remove “' + (v.titleEn || 'this film') + '” from the website?')) return;
      unqueue(v.preview); unqueue(v.poster);
      doc.videos.splice(i, 1);
      renumberFeatured(); renderFilms(); markDirty();
    });
    return node;
  }

  $('addFilm').addEventListener('click', function () {
    var id = (prompt('YouTube ID or URL for the new film:') || '').trim();
    if (!id) return;
    var m = id.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
    id = m ? m[1] : id;
    if (!/^[A-Za-z0-9_-]{6,}$/.test(id)) { alert('That does not look like a YouTube ID.'); return; }
    if (doc.videos.some(function (v) { return v.youtube === id; })) {
      alert('That film is already on the site.'); return;
    }
    doc.videos.push({
      youtube: id, featured: null,
      titleEn: '', titleAr: '', typeEn: '', typeAr: '',
      deliverablesEn: '', deliverablesAr: '',
      preview: null, poster: null, ratio: '9/16', noMaxres: false
    });
    renderFilms();
    markDirty();
    var last = $('films').lastElementChild;
    last.classList.add('open');
    last.scrollIntoView({ block: 'center' });
    last.querySelector('input').focus();
  });

  /* ------------------------------------------------------------------ photos */

  function renderPhotos() {
    var host = $('photos');
    host.textContent = '';
    doc.photos.forEach(function (p, i) { host.appendChild(photoCard(p, i)); });
    $('photoEmpty').hidden = doc.photos.length > 0;
    $('photoCount').textContent = doc.photos.length
      ? doc.photos.length + ' photograph' + (doc.photos.length === 1 ? '' : 's')
      : 'Nothing published yet';
  }

  function photoCard(p, i) {
    var node = $('photoTpl').content.firstElementChild.cloneNode(true);
    var img = node.querySelector('.thumb');
    img.src = p._url || ('../' + p.file);
    node.querySelector('.name').textContent = p.file.split('/').pop();
    node.querySelector('.sub').textContent =
      (p.width && p.height ? p.width + '×' + p.height : '') + (p._new ? ' · not yet uploaded' : '');

    node.querySelector('.card-head').addEventListener('click', function (e) {
      if (e.target.closest('.card-tools')) return;
      node.classList.toggle('open');
    });
    node.querySelectorAll('[data-k]').forEach(function (input) {
      input.value = p[input.dataset.k] || '';
      input.addEventListener('input', function () {
        p[input.dataset.k] = input.value.trim();
        markDirty();
      });
    });

    var up = node.querySelector('.up'), down = node.querySelector('.down');
    up.disabled = i === 0;
    down.disabled = i === doc.photos.length - 1;
    up.addEventListener('click', function () { move(doc.photos, i, -1); renderPhotos(); markDirty(); });
    down.addEventListener('click', function () { move(doc.photos, i, 1); renderPhotos(); markDirty(); });
    node.querySelector('.del').addEventListener('click', function () {
      if (!confirm('Remove this photograph from the website?')) return;
      unqueue(p.file);
      doc.photos.splice(i, 1);
      renderPhotos(); markDirty();
    });
    return node;
  }

  $('addPhotos').addEventListener('change', function (e) {
    var files = [].slice.call(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    Promise.all(files.map(shrink)).then(function (out) {
      out.filter(Boolean).forEach(function (r) {
        var name = stamp() + '-' + slug(r.name) + '.jpg';
        queue(PHOTO_DIR + name, r.blob);
        doc.photos.push({
          file: PHOTO_DIR + name, altEn: '', altAr: '', captionEn: '', captionAr: '',
          width: r.width, height: r.height, _url: URL.createObjectURL(r.blob), _new: true
        });
      });
      renderPhotos();
      markDirty();
    });
  });

  /* Re-encode in the browser so a 12MB camera file does not enter the repository. */
  function shrink(file) {
    return new Promise(function (resolve) {
      if (!/^image\//.test(file.type)) { resolve(null); return; }
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, PHOTO_EDGE / Math.max(img.width, img.height));
        var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(img.src);
        cv.toBlob(function (blob) {
          resolve(blob ? { blob: blob, width: w, height: h, name: file.name } : null);
        }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { resolve(null); };
      img.src = URL.createObjectURL(file);
    });
  }

  /* First frame of a loop, so the card has something to show before it decodes. */
  function grabPoster(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      var done = false;
      var finish = function (blob) {
        if (done) return; done = true;
        URL.revokeObjectURL(url); resolve(blob);
      };
      v.addEventListener('loadeddata', function () {
        try {
          var cv = document.createElement('canvas');
          var scale = Math.min(1, 900 / Math.max(v.videoWidth, v.videoHeight));
          cv.width = Math.round(v.videoWidth * scale);
          cv.height = Math.round(v.videoHeight * scale);
          cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
          cv.toBlob(function (b) { finish(b); }, 'image/jpeg', 0.8);
        } catch (e) { finish(null); }
      });
      v.addEventListener('error', function () { finish(null); });
      setTimeout(function () { finish(null); }, 8000);
    });
  }

  /* ------------------------------------------------------------------ clients */

  function renderClients() {
    var host = $('clients');
    host.textContent = '';
    doc.clients.forEach(function (c, i) { host.appendChild(clientCard(c, i)); });
    $('clientEmpty').hidden = doc.clients.length > 0;
    $('clientCount').textContent = doc.clients.length
      ? doc.clients.length + ' organisation' + (doc.clients.length === 1 ? '' : 's') + ' · ' +
        doc.clients.filter(function (c) { return c.logo; }).length + ' with a supplied logo'
      : 'Nothing listed yet';
  }

  function clientCard(c, i) {
    var node = $('clientTpl').content.firstElementChild.cloneNode(true);
    var fname = node.querySelector('.filename');
    var clear = node.querySelector('.clearLogo');

    function refresh() {
      node.querySelector('.name').textContent = c.name || 'Unnamed';
      node.querySelector('.sub').textContent =
        (c.subEn || '') + (c.logo ? ' · LOGO' : ' · TYPESET');
      fname.textContent = c.logo ? c.logo.split('/').pop() : 'No logo — the name is typeset';
      fname.classList.toggle('has', !!c.logo);
      clear.hidden = !c.logo;
    }
    refresh();

    node.querySelector('.card-head').addEventListener('click', function (e) {
      if (e.target.closest('.card-tools')) return;
      node.classList.toggle('open');
    });
    node.querySelectorAll('[data-k]').forEach(function (input) {
      input.value = c[input.dataset.k] || '';
      input.addEventListener('input', function () {
        c[input.dataset.k] = input.value.trim();
        refresh(); markDirty();
      });
    });

    /* Logos are uploaded untouched: re-encoding a mark to JPEG destroys its
       transparency, and these are usually PNG or SVG with a clear background. */
    node.querySelector('.pickLogo').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      if (!/\.(svg|png|webp)$/i.test(f.name)) {
        alert('Use an SVG, PNG or WebP with a transparent background. A JPEG will show a white box.');
        return;
      }
      if (f.size > LOGO_MAX) {
        alert('That file is ' + mb(f.size) + '. Logos should be well under ' + mb(LOGO_MAX) + '.');
        return;
      }
      var ext = f.name.match(/\.[^.]+$/)[0].toLowerCase();
      var name = slug(c.name || 'client-' + i) + ext;
      queue(LOGO_DIR + name, f);
      c.logo = LOGO_DIR + name;
      refresh(); markDirty();
    });
    clear.addEventListener('click', function () {
      unqueue(c.logo); c.logo = null; refresh(); markDirty();
    });

    var up = node.querySelector('.up'), down = node.querySelector('.down');
    up.disabled = i === 0;
    down.disabled = i === doc.clients.length - 1;
    up.addEventListener('click', function () { move(doc.clients, i, -1); renderClients(); markDirty(); });
    down.addEventListener('click', function () { move(doc.clients, i, 1); renderClients(); markDirty(); });
    node.querySelector('.del').addEventListener('click', function () {
      if (!confirm('Remove ' + (c.name || 'this organisation') + ' from the strip?')) return;
      unqueue(c.logo);
      doc.clients.splice(i, 1);
      renderClients(); markDirty();
    });
    return node;
  }

  $('addClient').addEventListener('click', function () {
    var name = (prompt('Organisation name, as it should appear:') || '').trim();
    if (!name) return;
    if (doc.clients.some(function (c) { return c.name.toLowerCase() === name.toLowerCase(); })) {
      alert('That organisation is already listed.'); return;
    }
    doc.clients.push({ name: name, subEn: '', subAr: '', logo: null });
    renderClients(); markDirty();
    var last = $('clients').lastElementChild;
    last.classList.add('open');
    last.scrollIntoView({ block: 'center' });
    last.querySelector('input').focus();
  });

  /* ------------------------------------------------------------------ helpers */

  function move(arr, i, d) {
    var j = i + d;
    if (j < 0 || j >= arr.length) return;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  function queue(path, blob) { unqueue(path); pending.push({ path: path, blob: blob }); }
  function unqueue(path) {
    if (!path) return;
    pending = pending.filter(function (f) { return f.path !== path; });
  }
  function mb(n) { return (n / 1048576).toFixed(1) + 'MB'; }
  function slug(s) {
    return s.replace(/\.[^.]+$/, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'photo';
  }
  function stamp() {
    var d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') +
           String(d.getDate()).padStart(2, '0');
  }
  function bytesOf(blob) {
    return blob.arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
  }

  /* ------------------------------------------------------------------ publish */

  function logLine(text, cls) {
    var li = document.createElement('li');
    li.textContent = text;
    li.className = cls || 'run';
    $('log').appendChild(li);
    li.scrollIntoView({ block: 'nearest' });
    return li;
  }

  function problems() {
    var bad = [];
    doc.videos.forEach(function (v, i) {
      ['youtube', 'titleEn', 'titleAr', 'typeEn', 'typeAr'].forEach(function (k) {
        if (!v[k]) bad.push('Film ' + (i + 1) + ' (' + (v.titleEn || v.youtube || 'untitled') + ') is missing ' + k);
      });
    });
    doc.photos.forEach(function (p, i) {
      if (!p.altEn || !p.altAr) bad.push('Photo ' + (i + 1) + ' needs a description in both languages');
    });
    doc.clients.forEach(function (c, i) {
      if (!c.name) bad.push('Organisation ' + (i + 1) + ' has no name');
      if (!c.subEn || !c.subAr) {
        bad.push((c.name || 'Organisation ' + (i + 1)) + ' needs a descriptor in both languages');
      }
    });
    if (!featuredCount()) bad.push('At least one film must be shown on the homepage');
    return bad;
  }

  $('publish').addEventListener('click', function () {
    var bad = problems();
    if (bad.length) {
      alert('Fix these first:\n\n• ' + bad.slice(0, 8).join('\n• ') +
            (bad.length > 8 ? '\n\n…and ' + (bad.length - 8) + ' more.' : ''));
      return;
    }
    publish();
  });

  function publish() {
    $('sheet').hidden = false;
    $('log').textContent = '';
    $('sheetClose').hidden = true;
    $('viewSite').hidden = true;
    $('publish').disabled = true;

    var files = pending.slice();
    var step = Promise.resolve();

    files.forEach(function (f) {
      step = step.then(function () {
        var li = logLine('Uploading ' + f.path.split('/').pop() + '…');
        return bytesOf(f.blob)
          .then(function (b) { return putFile(f.path, b64(b), 'Add ' + f.path); })
          .then(function () { li.textContent = f.path.split('/').pop(); li.className = 'ok'; });
      });
    });

    step = step.then(function () {
      var li = logLine('Saving the media list…');
      /* strip the browser-only bookkeeping before it reaches the repository */
      /* Start from what was loaded and change only what this page owns. Listing
         the keys by hand meant a manifest section the admin did not know about
         — the client strip, or anything added later — was silently deleted on
         the first publish. */
      var clean = JSON.parse(JSON.stringify(doc));
      clean.updated = new Date().toISOString().slice(0, 10);
      clean.photos = (clean.photos || []).map(function (p) {
        var c = {};
        Object.keys(p).forEach(function (k) { if (k[0] !== '_') c[k] = p[k]; });
        return c;
      });
      var body = JSON.stringify(clean, null, 2) + '\n';
      return putFile(MANIFEST, b64text(body), 'Update media list from the admin page', sha)
        .then(function (res) {
          sha = res.content.sha;
          doc.photos.forEach(function (p) { delete p._new; });
          li.textContent = 'Media list saved'; li.className = 'ok';
        });
    });

    step.then(function () {
      pending = [];
      markClean();
      logLine('GitHub is rebuilding the pages — allow about a minute.', 'ok');
      $('viewSite').hidden = false;
      $('sheetClose').hidden = false;
      renderFilms(); renderPhotos(); renderClients();
    }).catch(function (err) {
      logLine(err.message, 'err');
      logLine('Nothing further was published. Fix the problem and try again.', 'err');
      $('sheetClose').hidden = false;
      $('publish').disabled = false;
    });
  }

  $('sheetClose').addEventListener('click', function () { $('sheet').hidden = true; });

  boot();
})();
