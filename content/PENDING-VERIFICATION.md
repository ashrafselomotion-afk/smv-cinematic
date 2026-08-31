# SMV website — facts pending client verification

Central register of every fact that must be verified or supplied by SMV before it can
appear on the public website. Nothing in this file is published. Items marked
`TODO: CLIENT VERIFICATION` are hidden from the public interface until confirmed.

## Company facts (all TODO: CLIENT VERIFICATION)

- Exact legal company name and trade licence number / licensed activities
- Founding year ("UAE-based since …" is omitted from the site until verified)
- Office addresses (Dubai / Sharjah address blocks removed from footer and JSON-LD)
- Approved business phone number (no phone is published; WhatsApp dummy link removed)
- Named new-business contact (name + title) for the "direct conversation" line
- Enquiry response service level ("acknowledged within one UAE business day" is NOT
  published; the site says only "acknowledged by email")
- VAT registration, insurance certificates, HSE / risk-assessment credentials
- Vendor registrations and accreditations (none are claimed on the site)

## Capability confirmations (all TODO: CLIENT VERIFICATION)

- Arabic & English workflow: in-house vs approved partners (trust line omits it;
  FAQ answer kept per content plan — confirm before tenders rely on it)
- Drone / FPV licence status and permit process (FPV removed from deliverables)
- Live broadcast: clean-feed capability and technical specifications (removed)
- Caption-ready media sets (removed from rapid-content deliverables)
- Backup / redundancy internal standard (kept as generic statement only)
- NDA and data-handling policy documents
- Same-day delivery conditions

## Content awaiting approved assets (hidden until supplied)

- Client proof strip: RESTORED 2026-08-31 at the client's explicit instruction,
  reversing the earlier deletion. It now sits on both homepages as "Selected
  productions / UAE + Global / Institutions + Events" and names twenty
  organisations, taken from the client's own reference site
  (heartfelt-brioche-b9f5b3.netlify.app) at their direction.
  SMV asserts these relationships; the engineer has verified none of them.
  TODO: CLIENT VERIFICATION — three separate things are still outstanding:
    1. That each of the twenty is genuinely a client or production credit.
    2. Permission to display each organisation's NAME in a client strip.
    3. Permission to display each organisation's LOGO, if logos are ever added.
       UAE government entities in particular (Invest in Sharjah, ADNEC,
       Government of Dubai, Abu Dhabi Media Office, Shams) commonly restrict
       who may reproduce their mark and how.
  NO LOGO FILES ARE USED, deliberately. The reference site's "logos" are not the
  real marks: nine are hand-drawn SVG approximations (a circle and Arial Black
  text standing in for ITB Berlin, a triangle for ADNEC, and so on) and two are
  hotlinked <img> tags pointing at cntravellerme.com and innovationbox.ae —
  third-party servers that will break and that we should not be leeching. A
  fabricated trademark is worse than none: it misrepresents the brand and is
  obvious to anyone who knows it. Every mark is therefore typeset in the site's
  own display face, which is also what the reference itself does for half its
  entries. `content/media.json` carries a `logo` field per client: drop a real,
  supplied file in and that entry renders as an image instead, with no other
  change. A test fails if an image ever appears without a manifest entry.
- The kinetic word band this strip replaced ("GOVERNMENT FILMS ✦ OFFICIAL EVENTS
  ✦ NATIONAL OCCASIONS ✦ LIVE BROADCAST ✦ AERIAL ✦ PHOTOGRAPHY ✦ POST &
  LOCALISATION") is gone, along with its now-dead CSS and GSAP code. Note this
  removed two capability claims — LIVE BROADCAST and AERIAL — that this register
  already lists as unverified and removed from the rest of the site. They should
  not return without the confirmations recorded above.
- Arabic strip: the twenty names stay in Latin script, as brand names normally
  do; only the small descriptor under each is localised. Those descriptors were
  written by the engineer and need the same Arabic editorial review as the rest.
  The marquee is laid out left-to-right in both locales (a max-content rail
  inside an RTL block overflows off screen) but travels rightward in Arabic so
  it moves with the reading direction.
- Testimonials section: HIDDEN — no approved testimonials exist. Never invent one.
- Credentials counters ("70+ productions", "since 2016", "24H average", "40+ clients"):
  DELETED — unverified. Replace only with verified statements.
- Leadership / team section on About: HIDDEN — needs names, roles, 40–60 word bios,
  portraits, verified accreditations.
- Case studies: none published. Collect 4–6 evidence-led case studies (objective,
  challenge, response, deliverables, outcome, approved credits) before expanding
  the Work page. Data structure: `content/portfolio.schema.json`.
- Government / institutional showreel (60–90 s): current showreel.mp4 is an 8-second
  placeholder loop. The "Play government & institutional reel — 01:30" control text
  from the plan is NOT used until a real reel exists.
- Site structure (2026-08-31): the homepage no longer carries the whole gallery.
  It now shows a SELECTED WORK block — a portrait stage plus a numbered
  switcher of five featured films — and an "All projects" link. The full set
  moved to the projects page (`work.html` / `ar/work.html`), which opens on a
  VIDEOGRAPHY / PHOTOGRAPHY tab switch. The tab choice is reflected in the URL
  (`?view=photography`) and restored from it.
  The five featured films are chosen by hand in the gallery generator
  (`FEATURED`); changing the shortlist means regenerating both homepages.
  The stage is deliberately portrait: every film SMV has supplied is shot
  vertically, so a 16:9 stage would have shown YouTube's blurred filler either
  side of the real frame rather than the work itself. If landscape films are
  added later, the stage aspect needs revisiting.
- Content pipeline (2026-08-31): the gallery is no longer written by hand. Every
  film and photograph lives in `content/media.json`; `scripts/build-gallery.py`
  renders it into the four gallery pages between `<!-- BUILD:… -->` markers, and
  a GitHub Action runs that render whenever the manifest changes. The admin page
  at `/admin/` edits the manifest and commits it. Do not hand-edit the gallery
  HTML — a test fails when the pages and the manifest disagree.
- Preview loops: a film with a `preview` file autoplays silently in the grid and
  on the homepage stage instead of showing a YouTube still; clicking still opens
  the full film. No loops have been supplied yet, so every card currently falls
  back to the still. Loops must be short, silent and under ~1MB.
  DECISION (2026-08-31): loops are self-hosted in this repository and full films
  stay on YouTube. Self-hosting the loops is what removes Google from the page
  load entirely — until a visitor opens a film, nothing is fetched from Google,
  which strengthens the privacy position for procurement. If full films are ever
  self-hosted too, the privacy notice, the CSP `media-src` and the `frame-src`
  YouTube entry all need revisiting.
- ADMIN ACCESS — the page at `/admin/` is publicly reachable (it is a static
  file on GitHub Pages) but does nothing without a GitHub token. It carries
  `noindex` and is absent from the sitemap. Its CSP restricts outbound calls to
  api.github.com, so the token cannot be exfiltrated to another host by injected
  script. Anyone holding the token can change the repository: keep it
  short-lived, scoped to this one repository, and revoke it if exposed.
- PHOTOGRAPHY PANEL — BLOCKER: no photography has been supplied, so the panel
  publishes an honest empty state ("The stills archive is being prepared") and a
  route to request the archive. No stock images, no placeholder tiles and no
  square-bracket text are used. Supply approved stills — with the same client
  approvals and individual consents the films need — before anything ships here.
  Photography is now addable through `/admin/`, which requires a description in
  both languages before it will publish. It does NOT check consent or client
  approval — that judgement stays with SMV.
- Portfolio media: the gallery is 23 cards, ALL real SMV work, embedded from
  YouTube in privacy-enhanced mode (youtube-nocookie.com). No placeholder stock
  footage and no Google Drive embeds remain anywhere on the site.
  Category filters were removed at the client's request — the gallery is now a
  single numbered set, and card captions no longer show a category. The films
  live under the projects page's Videography tab.
  The "representative footage shown" disclaimer was removed at the client's
  request. It was correct while the grid held stock placeholders; now that every
  card is real SMV work it no longer applies. Note this also removed the only
  in-gallery pointer to "case studies and client references shared privately" —
  the Request Credentials CTA elsewhere on the page still covers that.
  Two distinct cuts of the SIBF assignment are published (Exhibition Recap Film
  and Visitor Engagement Coverage) — different footage, same event.
  Six of the newest films came from Invest in Sharjah's channel with no
  descriptive titles ("Video by investinsharjah …"); each was named from its own
  opening frame: Leadership Interview Film, Trade Stand Coverage, Stand Host
  Reel, Sector Spotlight Film, Delegation Welcome Reel, Presenter Piece Film.
  Four uploads have no maxresdefault thumbnail, so their srcset stops at
  sddefault — a test now guards against advertising a size YouTube lacks.
  Unused local clips remain in `media/reels/` but nothing references them — safe
  to delete to shrink the repository.
  TODO: CLIENT VERIFICATION — source video titles identify real clients (Invest
  in Sharjah / IIS, Shurooq / shurooqsharjah, SIF, Sharjah Business Council UAE,
  PBCS) and some footage shows their signage and staff. Published card titles use
  the neutral assignment-type taxonomy and name NO entity. Written approval is
  required before any name appears in copy, a case study or a logo strip.
  NOTE: several films feature identifiable individuals — children at public
  events, and named-organisation staff and speakers on camera. Confirm the client
  holds usage/consent for those individuals before this stays published.
- Third-party embed disclosure: the privacy notice (EN + AR) now states that
  YouTube's player is loaded only when a visitor opens a film, and that Google
  may set cookies and process technical data at that point. The earlier blanket
  "this website sets no cookies" claim would have been inaccurate once players
  were embedded.
- Social profiles (LinkedIn · Instagram · Vimeo): links removed — no live profiles
  supplied. Do not publish dead links.
- OG/social share image: current og.jpg is a generated skyline frame; replace with
  one approved flagship-project frame (no unapproved emblems or client marks).

## Arabic localisation (complete route parity — /ar/)

- The Arabic homepage was missing the chapter rail that the English one shows;
  it has been restored, and the runtime no longer breaks when it is absent.
- Full Arabic route parity now exists under `/ar/`: index, work, government-production,
  capabilities, approach, about, contact (Arabic brief form) and privacy. `ar.html`
  remains as a compatibility redirect to `/ar/`.
- TODO: CLIENT VERIFICATION — the Arabic copy was localised by the engineer from the
  approved English content plan. An Arabic government-communications editor must review
  official terminology, entity names, honorifics and policy language before tenders
  rely on it. The plan's approved Arabic hero copy (§15) is used verbatim.
- Language switch preserves the route in both directions; reciprocal hreflang plus
  x-default are published on every page.
- TODO: CLIENT VERIFICATION — the Arabic wording of the new projects tabs
  ("التصوير الفوتوغرافي" / "أفلام"), the panel headings and the photography
  empty state were written by the engineer and need the same editorial review
  as the rest of the Arabic copy.

## Captions and transcripts (blocker)

- Audio audit (ffprobe, 2026-08-24): `media/hero.mp4`, `media/hero-480.mp4` and all
  sixteen `media/reels/rNN.mp4` clips contain NO audio stream. Captions are therefore
  not applicable to them; each work-page video states "Silent clip — contains no audio"
  in its accessible name.
- `media/showreel.mp4` DOES carry an AAC stereo track. It is an 8-second placeholder.
  BLOCKER — before the real showreel ships we need, for any meaningful audio:
  the script / dialogue list or an approved transcript, speaker identification, and
  confirmation of whether the bed is music-only. No captions have been invented.

## Legal

- privacy.html is a factual description of what the site actually does (FormSubmit
  relay, local theme preference, no analytics). Have it reviewed by counsel before
  relying on it for procurement.
- Terms page: not created (nothing to state yet without legal input).
