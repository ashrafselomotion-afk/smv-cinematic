# SMV — Singer Media Vision

Bilingual (English / Arabic) static site for a UAE film production company.
No framework. Deployed by GitHub Pages from `main`.

**Live:** https://ashrafselomotion-afk.github.io/smv-cinematic/
**Media admin:** https://ashrafselomotion-afk.github.io/smv-cinematic/admin/

## Getting started

```bash
git clone https://github.com/ashrafselomotion-afk/smv-cinematic.git
cd smv-cinematic
npm install                # Playwright, for the test suite
```

There is no dev server to run — the pages are static. Open a file directly, or:

```bash
python3 scripts/serve-gzip.py 8743      # http://127.0.0.1:8743
```

## Two rules that are not obvious from the code

**Rebuild after editing `src/`.** The CSS and JS are minified into
content-hashed files and referenced by hash from every page. Skip this and the
live site simply will not change.

```bash
./scripts/build.sh
```

**Don't hand-edit the gallery pages.** Everything between `<!-- BUILD:… -->`
markers comes from `content/media.json`. Edit the manifest (or use `/admin/`),
then:

```bash
python3 scripts/build-gallery.py
```

## Tests

```bash
npx playwright test
```

Runs across four viewports and includes accessibility scans. The suite starts
its own server.

## Before writing any copy

Read [`content/PENDING-VERIFICATION.md`](content/PENDING-VERIFICATION.md). This
site is written for government procurement review, and the client's standing
instruction is that nothing unverified gets published — no invented clients,
statistics, testimonials or accreditations, and no stock imagery presented as
SMV's own work.

[`CLAUDE.md`](CLAUDE.md) has the fuller working notes, including the bilingual
parity traps and the accessibility bar.
