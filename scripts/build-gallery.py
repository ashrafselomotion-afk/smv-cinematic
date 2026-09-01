#!/usr/bin/env python3
"""Render content/media.json into the marked regions of the four gallery pages.

  index.html / ar/index.html   BUILD:SELWORK    the homepage shortlist (stage + switcher)
                               BUILD:CLIENTS    the selected-productions strip
  work.html  / ar/work.html    BUILD:PROJECTS   every film, in the Videography panel
                               BUILD:PHOTOS     the Photography panel

Every card prefers a self-hosted silent loop ("preview") and falls back to a
YouTube still when no loop has been supplied yet, so the pages degrade to
exactly what they showed before rather than to an empty box.

Run after editing content/media.json:   python3 scripts/build-gallery.py
"""
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'content', 'media.json')

# Copy that belongs to the shell rather than to any one item.
T = {
    'play':      ('Play the selected film', 'شاهد الفيلم المختار'),
    'all':       ('All projects', 'كل الأعمال'),
    'deliver':   ('Deliverables', 'التسليمات'),
    'view':      ('View project %s: %s — %s', 'عرض العمل %s: %s — %s'),
    'silent':    ('Silent preview', 'معاينة صامتة'),
    'photo_of':  ('Photograph %s', 'صورة %s'),
    'cred':      ('Selected productions', 'إنتاجات مختارة'),
    'cred_note': ('UAE + Global / Institutions + Events', 'الإمارات والعالم / مؤسسات وفعاليات'),
    'cred_aria': ('Selected productions', 'إنتاجات مختارة'),
    'slot':      ('Awaiting stills', 'بانتظار الصور'),
    'album':     ('Album %02d', 'ألبوم %02d'),
    'all_albums':('All albums', 'كل الألبومات'),
    'stills':    ('%d stills', '%d صورة'),
    'photo_note':('Layout preview. Each album fills as approved photography is released.',
                  'معاينة للتصميم. يمتلئ كل ألبوم فور اعتماد الصور ونشرها.'),
}


def t(key, ar):
    return T[key][1 if ar else 0]


def esc(s):
    """Escape for an attribute value or text node. Never emit raw user text."""
    return html.escape(s or '', quote=True)


# ---------------------------------------------------------------- YouTube stills

def thumb(v):
    return 'https://i.ytimg.com/vi/%s/hqdefault.jpg' % v


def thumbset(v, no_maxres):
    b = 'https://i.ytimg.com/vi/%s' % v
    s = ['%s/mqdefault.jpg 320w' % b, '%s/hqdefault.jpg 480w' % b, '%s/sddefault.jpg 640w' % b]
    if not no_maxres:
        s.append('%s/maxresdefault.jpg 1280w' % b)
    return ', '.join(s)


def poster_for(v):
    """The still a <video> shows before it has decoded a frame."""
    return v.get('poster') or thumb(v['youtube'])


def local(path, ar):
    """Repo-relative media path, seen from the page that references it.

    The Arabic pages live one directory down, so a bare "media/x.mp4" would
    resolve to /ar/media/x.mp4 and 404. Absolute URLs are left alone."""
    if not path or '://' in path or path.startswith('/'):
        return path
    return '../' + path if ar else path


# ---------------------------------------------------------------- media elements

def stage_media(v, i, first, ar):
    """One layer of the homepage stage: a looping clip if we have one, else a still."""
    cls = 'sw-shot on' if first else 'sw-shot'
    lazy = '' if first else ' loading="lazy"'
    if v.get('preview'):
        # muted+playsinline are what make inline autoplay legal on iOS; preload
        # stays off because site.js decides which layer is worth fetching.
        return ('<video class="%s" data-i="%d" src="%s" poster="%s" muted loop playsinline '
                'preload="none" disablepictureinpicture aria-hidden="true"></video>'
                % (cls, i, esc(local(v['preview'], ar)), esc(local(poster_for(v), ar))))
    return ('<img class="%s" src="%s" srcset="%s" sizes="(max-width:900px) 290px, 340px" '
            'alt="" data-i="%d"%s decoding="async">'
            % (cls, thumb(v['youtube']), thumbset(v['youtube'], v.get('noMaxres')), i, lazy))


def card_media(v, title, ar):
    """The moving part of a projects-grid card."""
    if v.get('preview'):
        return ('<video class="reel-prev" src="%s" poster="%s" muted loop playsinline '
                'preload="none" disablepictureinpicture aria-label="%s — %s"></video>'
                % (esc(local(v['preview'], ar)), esc(local(poster_for(v), ar)),
                   esc(title), esc(t('silent', ar))))
    # no loop supplied yet: keep the embedded player the page already shipped
    return ('<iframe class="reel-frame" title="%s" loading="lazy" '
            'src="https://www.youtube-nocookie.com/embed/%s?rel=0&amp;modestbranding=1" '
            'allow="fullscreen; encrypted-media; picture-in-picture" allowfullscreen '
            'referrerpolicy="strict-origin-when-cross-origin"></iframe>' % (esc(title), v['youtube']))


# ---------------------------------------------------------------- regions

def selwork(videos, ar):
    feat = sorted([v for v in videos if v.get('featured')], key=lambda v: v['featured'])
    if not feat:
        raise SystemExit('media.json: mark at least one video as featured')
    stage, rows = [], []
    for n, v in enumerate(feat):
        title = v['titleAr'] if ar else v['titleEn']
        meta = v['typeAr'] if ar else v['typeEn']
        stage.append('      ' + stage_media(v, n, n == 0, ar))
        rows.append(
            '        <li><button type="button" class="sw-item" data-i="%d" data-youtube="%s" '
            'data-ratio="%s" data-title="%s" data-meta="%s" aria-current="%s">'
            '<span class="n">%02d</span><span class="t">%s</span></button></li>'
            % (n, v['youtube'], esc(v.get('ratio') or '9/16'), esc(title), esc(meta),
               'true' if n == 0 else 'false', n + 1, esc(title)))
    first = feat[0]
    return '\n'.join([
        '<div class="selwork reveal">',
        '    <div class="sw-stage">',
        '\n'.join(stage),
        '      <span class="sw-play" aria-hidden="true"><span class="tri"></span></span>',
        '      <div class="sw-cap"><b id="swTitle">%s</b><span id="swMeta">%s</span></div>'
        % (esc(first['titleAr'] if ar else first['titleEn']),
           esc(first['typeAr'] if ar else first['typeEn'])),
        '      <button type="button" class="sw-open" id="swOpen" data-cursor="PLAY" aria-label="%s"></button>'
        % esc(t('play', ar)),
        '    </div>',
        '    <div>',
        '      <ol class="sw-list" id="swList">',
        '\n'.join(rows),
        '      </ol>',
        '      <a class="sw-all" href="work.html">%s <span aria-hidden="true">&#8594;</span></a>'
        % esc(t('all', ar)),
        '    </div>',
        '  </div>',
    ])


def clients(items, ar):
    """The marquee of organisations SMV has produced for.

    A mark is only ever an image when a real, supplied logo file exists. We do
    not draw approximations of other people's trademarks: a hand-made ADNEC
    lockup is more damaging than no lockup at all. Until a file arrives the
    name is typeset in the site's own display face, which is honest and is what
    the reference design does for half its entries anyway."""
    if not items:
        return '<!-- no clients listed -->'
    marks = []
    for c in items:
        sub = c.get('subAr' if ar else 'subEn') or ''
        if c.get('logo'):
            inner = ('<img src="%s" alt="%s" loading="lazy" decoding="async">'
                     % (esc(local(c['logo'], ar)), esc(c['name'])))
        else:
            inner = ('<span class="textmark">%s%s</span>'
                     % (esc(c['name']),
                        ('<small>%s</small>' % esc(sub)) if sub else ''))
        marks.append('        <li class="client-logo">%s</li>' % inner)
    group = '\n'.join(marks)
    # the run is duplicated so translateX(-50%) meets itself seamlessly; the
    # copy is hidden from assistive tech so names are not announced twice
    return '\n'.join([
        '<section class="cred-strip" aria-label="%s">' % esc(t('cred_aria', ar)),
        '  <div class="cred-heading">',
        '    <span class="label">%s</span>' % esc(t('cred', ar)),
        '    <span class="note">%s</span>' % esc(t('cred_note', ar)),
        '  </div>',
        '  <div class="logo-rail">',
        '    <ul class="logo-group">',
        group,
        '    </ul>',
        '    <ul class="logo-group" aria-hidden="true">',
        group,
        '    </ul>',
        '  </div>',
        '</section>',
    ])


def projects(videos, ar):
    out = []
    for i, v in enumerate(videos, start=1):
        title = v['titleAr'] if ar else v['titleEn']
        typ = v['typeAr'] if ar else v['typeEn']
        deliv = v['deliverablesAr'] if ar else v['deliverablesEn']
        num = '%02d' % i
        # a loop-backed card carries no native controls, so it wants the same
        # scrim, caption offset and pointer handling as the homepage previews
        cls = 'reel reel-preview' if v.get('preview') else 'reel'
        card = ['      <figure class="%s" data-youtube="%s" data-ratio="%s">'
                % (cls, v['youtube'], esc(v.get('ratio') or '9/16')),
                '        ' + card_media(v, title, ar)]
        if v.get('preview'):
            # a loop is a preview, not the film: it needs a control that opens the film
            name = t('view', ar) % (num, title, typ)
            card.append('        <button type="button" class="reel-open" data-cursor="PLAY" '
                        'aria-label="%s"></button>' % esc(name))
            card.append('        <span class="play" aria-hidden="true">&#9654;</span>')
        card.append('        <figcaption><span class="label">%s</span><h3>%s</h3>'
                    '<span class="meta-line">%s · %s: %s</span></figcaption>'
                    % (num, esc(title), esc(typ), esc(t('deliver', ar)), esc(deliv)))
        card.append('      </figure>')
        out.append('\n'.join(card))
    return '\n'.join(out)


# Shown while no photography has been approved for publication. It lives here,
# not in the pages, because reading it back out of a page the generator has
# already written would resurrect a stale grid the moment the list is emptied.
EMPTY_PHOTOS = {
    False: (
        '<div class="photo-empty">\n'
        '      <h3>The stills archive is being prepared.</h3>\n'
        '      <p>Our photography — press coverage, executive portraits, ceremony stills and '
        'venue documentation — is catalogued and released with the client approvals each set '
        'requires. We publish nothing here until those approvals are in place.</p>\n'
        '      <a class="cta-link" href="contact.html">Request the photography archive '
        '<span class="arr">→</span></a>\n'
        '    </div>'),
    True: (
        '<div class="photo-empty">\n'
        '      <h3>أرشيف الصور قيد التجهيز.</h3>\n'
        '      <p>تشمل أعمالنا الفوتوغرافية التغطيات الصحفية والصور التنفيذية ولقطات المراسم '
        'وتوثيق المواقع، وتُفهرس وتُنشر مع الاعتمادات التي تتطلبها كل مجموعة. ولا ننشر هنا شيئاً '
        'قبل اكتمال تلك الاعتمادات.</p>\n'
        '      <a class="cta-link" href="contact.html">اطلب أرشيف الصور '
        '<span class="arr">→</span></a>\n'
        '    </div>'),
}


def photos(items, cats, albums, ar):
    """The photography panel: a list of categories beside a grid of albums.

    Each tile is an album, not a single photograph, and carries the same
    portrait shape and orange hover as the old services cards. Albums with no
    stills yet say so — filling them with stock would present generic imagery
    as SMV's archive, which is what this panel exists not to do."""
    if not cats:
        return EMPTY_PHOTOS[bool(ar)]

    cards, counts = [], {}
    for c in cats:
        label = c.get('labelAr' if ar else 'labelEn') or c['key']
        mine = [a for a in albums if a.get('category') == c['key']]
        n = 0
        for a in mine:
            n += 1
            shots = [p for p in items if p.get('album') == a.get('key')]
            title = a.get('titleAr' if ar else 'titleEn') or (t('album', ar) % n)
            state = (t('stills', ar) % len(shots)) if shots else t('slot', ar)
            cover = shots[0]['file'] if shots else a.get('cover')
            cards.append(album_card(c['key'], label, title, state, cover, n, ar))
        for n in range(len(mine) + 1, int(c.get('slots') or 0) + 1):
            cards.append(album_card(c['key'], label, t('album', ar) % n,
                                    t('slot', ar), None, n, ar))
        counts[c['key']] = max(len(mine), int(c.get('slots') or 0))

    if not cards:
        return EMPTY_PHOTOS[bool(ar)]

    rows = ['        <li><button type="button" class="pcat on" data-cat="all" '
            'aria-pressed="true">%s <i>%02d</i></button></li>'
            % (esc(t('all_albums', ar)), sum(counts.values()))]
    for c in cats:
        rows.append('        <li><button type="button" class="pcat" data-cat="%s" '
                    'aria-pressed="false">%s <i>%02d</i></button></li>'
                    % (esc(c['key']), esc(c.get('labelAr' if ar else 'labelEn') or c['key']),
                       counts.get(c['key'], 0)))

    return '\n'.join([
        '<p class="photo-note">%s</p>' % esc(t('photo_note', ar)),
        '    <div class="photo-shell">',
        '      <ul class="photo-cats">',
        '\n'.join(rows),
        '      </ul>',
        '      <div class="album-grid">',
        '\n'.join(cards),
        '      </div>',
        '    </div>',
    ])


def album_card(cat, cat_label, title, state, cover, n, ar):
    img = ('<img src="%s" alt="" loading="lazy" decoding="async">' % esc(local(cover, ar))) \
          if cover else ''
    return ('        <article class="album%s" data-cat="%s">\n'
            '          %s<span class="k label">%s</span>\n'
            '          <div class="inner"><h3>%s</h3><span class="arr" aria-hidden="true">&#8594;</span></div>\n'
            '          <span class="album-state">%s</span>\n'
            '        </article>'
            % ('' if cover else ' is-empty', esc(cat), img,
               esc(cat_label), esc(title), esc(state)))


# ---------------------------------------------------------------- write-back

def replace(path, name, body):
    p = os.path.join(ROOT, path)
    src = open(p, encoding='utf-8').read()
    pat = re.compile(r'(<!-- BUILD:%s -->\n).*?(\n<!-- /BUILD:%s -->)' % (name, name), re.S)
    if not pat.search(src):
        raise SystemExit('%s: no BUILD:%s region — did someone delete the markers?' % (path, name))
    out = pat.sub(lambda m: m.group(1) + body.replace('\\', '\\\\') + m.group(2), src)
    if out == src:
        return False
    open(p, 'w', encoding='utf-8').write(out)
    return True


def main():
    doc = json.load(open(MANIFEST, encoding='utf-8'))
    videos = doc.get('videos') or []
    pics = doc.get('photos') or []
    crew = doc.get('clients') or []
    cats = doc.get('photoCategories') or []
    albums = doc.get('photoAlbums') or []
    if not videos:
        raise SystemExit('media.json lists no videos')

    seen = set()
    for v in videos:
        for k in ('youtube', 'titleEn', 'titleAr', 'typeEn', 'typeAr'):
            if not v.get(k):
                raise SystemExit('media.json: %s is missing "%s"' % (v.get('youtube', '?'), k))
        if v['youtube'] in seen:
            raise SystemExit('media.json: %s appears twice' % v['youtube'])
        seen.add(v['youtube'])

    changed = []
    for page, ar in (('index.html', False), ('ar/index.html', True)):
        if replace(page, 'SELWORK', selwork(videos, ar)):
            changed.append(page + ':SELWORK')
        if replace(page, 'CLIENTS', clients(crew, ar)):
            changed.append(page + ':CLIENTS')
    for page, ar in (('work.html', False), ('ar/work.html', True)):
        if replace(page, 'PROJECTS', projects(videos, ar)):
            changed.append(page + ':PROJECTS')
        if replace(page, 'PHOTOS', photos(pics, cats, albums, ar)):
            changed.append(page + ':PHOTOS')

    loops = sum(1 for v in videos if v.get('preview'))
    named = sum(1 for c in crew if c.get('logo'))
    print('%d films (%d with a self-hosted loop, %d still on a YouTube still), %d photos, '
          '%d clients (%d with a supplied logo)'
          % (len(videos), loops, len(videos) - loops, len(pics), len(crew), named))
    print('changed: %s' % (', '.join(changed) if changed else 'nothing'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
