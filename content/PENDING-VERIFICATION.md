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

- Client proof strip ("Selected organisations and destinations we have supported"):
  HIDDEN — previous SVG logo lockups (ADNEC, Shurooq, Dubai Design Week, Khorfakkan,
  WIC, SIF) were unapproved implied relationships and have been deleted.
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
- PHOTOGRAPHY PANEL — BLOCKER: no photography has been supplied, so the panel
  publishes an honest empty state ("The stills archive is being prepared") and a
  route to request the archive. No stock images, no placeholder tiles and no
  square-bracket text are used. Supply approved stills — with the same client
  approvals and individual consents the films need — before anything ships here.
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
