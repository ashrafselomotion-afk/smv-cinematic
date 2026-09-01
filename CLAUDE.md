# SMV — Singer Media Vision

Bilingual (EN / AR) static site for a UAE film production company, aimed at
government and institutional procurement teams. No framework. Deployed by
GitHub Pages from `main`, live about a minute after a push:
https://ashrafselomotion-afk.github.io/smv-cinematic/

---

## The two things that will catch you out

**1. Editing `src/` is not enough — you must rebuild.**

`src/site.css`, `src/site.js`, `src/theme.js`, `src/page.js` and `src/space.js`
are minified into content-hashed files (`assets/site.<hash>.min.css`) and the
filenames are rewritten across every page. Edit a source file, push without
rebuilding, and **the live site will not change and nothing will tell you why.**

```bash
./scripts/build.sh
```

Run it after every `src/` edit, before committing.

**2. The gallery pages are generated. Do not hand-edit them.**

Anything between `<!-- BUILD:… -->` markers in `index.html`, `ar/index.html`,
`work.html` and `ar/work.html` is rendered from `content/media.json`:

| Region | What it is |
|---|---|
| `BUILD:SELWORK` | homepage selected-work shortlist |
| `BUILD:CLIENTS` | homepage selected-productions strip |
| `BUILD:PROJECTS` | every film, Videography panel |
| `BUILD:PHOTOS` | category list + album grid, Photography panel |

Edit `content/media.json`, then:

```bash
python3 scripts/build-gallery.py
```

A test fails if the pages and the manifest disagree, so hand-edits get caught —
but only if you run the tests. A GitHub Action re-renders automatically when the
manifest changes on `main`.

---

## Content rules — read before writing any copy

This site is for procurement panels. The client has explicit standing
instructions, and `content/PENDING-VERIFICATION.md` is the register of every
fact still awaiting confirmation. **Read it before adding content.**

- **Never invent business information.** No fake clients, government
  relationships, project names, testimonials, statistics, licences or
  accreditations.
- **Never display placeholder text** in square brackets on the live site, and
  never publish a counter showing zero.
- **Never present stock imagery as SMV's own work.** The photography panel
  deliberately shows empty albums rather than stock; a test enforces this.
- **Never draw an approximation of another organisation's trademark.** The
  client strip typesets names; logos appear only when a real file is supplied.
- Anything unresolved goes in `PENDING-VERIFICATION.md`, marked
  `TODO: CLIENT VERIFICATION`, and stays off the public interface.

## Bilingual parity

Every route exists twice: `/foo.html` and `/ar/foo.html`. If you change one,
change the other. Two traps that have already bitten:

- Arabic pages live one directory down, so `media/x.mp4` resolves to
  `/ar/media/x.mp4`. Use `../` for the Arabic pages (the generator's `local()`
  helper does this).
- A `width: max-content` element inside an RTL block overflows **leftwards** and
  can land off screen entirely.

Arabic copy is engineer-written unless the register says otherwise and needs a
native government-communications editor before tenders rely on it.

## Accessibility bar

Zero serious/critical axe violations across 11 pages × 4 viewports, enforced by
`tests/a11y.spec.js`. Watch for:

- Text on translucent (glass) surfaces — the classic contrast failure here.
- Every interactive target ≥ 44×44 on mobile.
- Motion respects `prefers-reduced-motion`; transparency respects
  `prefers-reduced-transparency`.

---

## Layout

```
src/           editable CSS + JS            → build.sh → assets/*.min.*
content/       media.json (the manifest), PENDING-VERIFICATION.md
scripts/       build.sh, build-gallery.py, serve-gzip.py
admin/         browser-based editor for the manifest (see admin/README.md)
ar/            Arabic routes
media/         previews/, photos/, logos/
tests/         Playwright specs
```

`/admin/` edits `content/media.json` and commits it via the GitHub API using a
fine-grained token the user supplies. It never needs a server.

## Tests

```bash
npx playwright test                    # full suite, 4 viewports
npx playwright test --project=desktop-1440
```

The suite runs a local server itself — don't start one. Some tests spawn
`scripts/build-gallery.py` and restore the tree afterwards.

**A failing test here usually means a real defect.** Several have caught genuine
bugs: a manifest section being deleted on publish, dead internal links after a
page removal, an overlay covering the whole admin page. Fix the cause, not the
assertion — and if an assertion is genuinely wrong, say so explicitly rather
than loosening it quietly.

## Deploy

Push to `main`. Pages rebuilds in about a minute. Verify the live asset hash
matches the local one before declaring it shipped:

```bash
curl -s https://ashrafselomotion-afk.github.io/smv-cinematic/index.html | grep -o 'assets/site\.[0-9a-f]\{8\}\.min\.css'
```
