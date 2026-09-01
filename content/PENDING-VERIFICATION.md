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
  stay on YouTube. The client's separate hosting is NOT used for site media.
  It is AEserver "Advanced Hosting" — cPanel shared hosting, purchased and live,
  50GB disk (the 2TB figure the client was originally given was wrong), traffic advertised as unlimited but subject to the usual
  shared-hosting fair-use clause, which typically forbids using the account
  primarily to store or stream video. GitHub Pages is the better home for the
  loops regardless: they total ~12MB, it is already wired into the admin page,
  and it serves from a global CDN rather than a single box. Revisit only if the
  full films move off YouTube. Self-hosting the loops is what removes Google from the page
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

- OPTION (not taken): the client's cPanel hosting runs PHP, so the contact form
  could POST to a self-hosted handler instead of the FormSubmit.co relay. That
  would remove the last third party the site hands visitor data to — the same
  argument that made self-hosted preview loops worth it. The hosting is bought
  and live (confirmed 2026-08-31), so the only thing still missing is a decision
  on which mailbox enquiries should land in. Not built.
- privacy.html is a factual description of what the site actually does (FormSubmit
  relay, local theme preference, no analytics). Have it reviewed by counsel before
  relying on it for procurement.
- Terms page: not created (nothing to state yet without legal input).

## Site structure (2026-08-31)

- REMOVED at the client's instruction: the Government Production, Capabilities
  and Approach pages (English and Arabic — six files), their nav and mobile-menu
  links, their footer links and their sitemap entries. The site is now Work,
  About, Contact, Privacy. Everything is recoverable from git history if the
  decision is reversed.
- The homepage KEPT its Capabilities (02) and Approach (03) sections, per the
  client's choice. The eight capability cards on the English homepage used to
  link into capabilities.html; they are now plain articles with the "→" affordance
  removed, so the content stays and nothing dangles.
- Arabic parity gap CLOSED: the Arabic homepage's Capabilities section never
  carried the eight cards the English one has — its only substance was a button
  into capabilities.html, which went with that page. Removing the intro
  paragraph would have left a bare heading, so the eight cards were mirrored
  across. The card titles are the approved Arabic capability names recovered
  from the deleted ar/capabilities.html, in the English order; only the image
  alt text is newly written and needs the usual Arabic review.
- Section 02's heading is now "OUR SERVICES" / "خدماتنا" and its introductory
  paragraph is gone, at the client's request. NOTE: the section label and the
  chapter rail still read CAPABILITIES / قدراتنا, so the label and the heading
  now disagree. Change both if that matters.
- STILL UNVERIFIED, unchanged by the above: two of the eight cards claim LIVE
  BROADCAST & STREAMING and AERIAL & SPECIALISED CAPTURE. This register lists
  both as removed from the rest of the site pending confirmation, yet they have
  been published on the English homepage throughout, and are now published in
  Arabic too as a consequence of closing the parity gap. Confirm the licence and
  clean-feed positions or cut those two cards from both locales.
- A test now crawls every internal link on every page and fails on any that does
  not return 200, so a future removal cannot leave dead links behind.
- The navigation bar is now glass — translucent, blurred and saturated over
  whatever sits behind it. It falls back to the previous solid bar where
  backdrop-filter is unsupported and under prefers-reduced-transparency, and the
  link colour was lifted off --dim because a glass bar over moving video cannot
  rely on a dim grey staying legible.
- The admin page gained a Clients tab, so the selected-productions strip is
  editable rather than being the one part of the manifest with no interface.
  FIXED: publishing used to rebuild media.json from a hardcoded key list, which
  would have silently deleted the entire client strip the first time anyone
  pressed Publish. A test now fails if any manifest section is lost on publish.
- The FAQ ("Questions, answered") is no longer its own numbered section — it now
  sits inside the contact section, under its own sub-heading, after the call to
  action. The homepage runs 01–06 and the chapter rail lost its FAQ stop. The
  FAQPage JSON-LD in the head is unaffected.
- Two CSS defects fixed in passing, both pre-dating this work and both silently
  dropping rules from the minified stylesheet: `.hero-copy .eyebrow` had lost its
  selector, so the hero eyebrow shipped unstyled (body font instead of the mono
  treatment), and a stray closing brace was swallowing the section-heading rule
  that followed it. The stylesheet now minifies with zero warnings.
- Homepage restructured again (2026-08-31, client instruction): the eight
  services moved into the section-04 journey layout — the drawn vertical line,
  the numbered stops, the copy blocks and the side cards — and the placeholder
  images now sit inside those cards. The old services grid (section 02) is
  deleted, and the homepage renumbers to 01 Selected work, 02 Approach,
  03 Services, 04 Credentials, 05 Contact.
- DELETED with it: the six "production confidence" blocks that occupied
  section 04 — protocol and access, permissions and planning, backup and
  continuity, confidentiality, rapid turnaround, UAE-wide deployment. That was
  evidence-led procurement copy and it is now published nowhere on the site.
  Recoverable from git if it should return somewhere.
- The eight service descriptions and their chips are the approved copy
  recovered from the deleted capabilities.html / ar/capabilities.html, not
  newly written. Card labels use each service's "typical deliverables", cut to
  the first three items.
- The card images remain generic stock, not SMV work. They are now larger and
  more prominent than before, which raises rather than lowers the case for
  replacing them with real frames.
- STILL UNVERIFIED: services 05 (live broadcast and streaming) and 06 (aerial
  and specialised capture) carry the same claims this register lists as
  unconfirmed, now with fuller descriptions attached in both languages.
- Photography panel (final shape): a category LIST beside a grid of ALBUM
  cards. The cards reuse the retired services-card treatment — portrait 3:4.5
  frame, bottom gradient, orange arrow, direction-aware orange wash on hover —
  so both halves of the Work page read as one product. Portrait at every width,
  including phones. Choosing a category filters the grid and announces the
  result; the homepage's GSAP is not loaded here, so the wash is a CSS
  transition with JS only supplying the entry edge.
- Four categories: press coverage, executive portraits, ceremony stills, venue
  documentation — taken from wording the old empty state already published —
  holding 14 placeholder albums in total.
- The albums are EMPTY on purpose and say "awaiting stills". The only imagery
  in the repository is behind-the-scenes stock: camera bodies, an editing
  suite, a projector, a Porsche on a highway. Presenting that under "The
  archive / Stills in focus" would pass stock off as SMV's photography. A test
  fails if an image appears in the panel while no album has a cover.
- Data model: `photoCategories` (key, labels, slots) and `photoAlbums`
  (key, category, titles, cover). A real album takes a placeholder's place
  rather than adding a tile; with no categories the honest empty state returns.
  Photos carry an `album` key, and the album's first photo becomes its cover.
- TODO: CLIENT VERIFICATION — the four category names and their Arabic labels
  are the engineer's, derived from approved English copy. Album titles are
  placeholders ("Album 01"); real ones will name events or clients, which needs
  the same written approval as everything else in this register.
- Glass is now a system rather than a one-off on the navigation: four tokens
  (fill, edge, sheen, cast) plus a blur radius, defined for dark, light and
  system-default, applied to the nav, the buttons and the cards.
- The blur is spent selectively, because backdrop-filter is the expensive part:
  the nav and the buttons always have it; cards get it on desktop pointers only
  (a page can hold 37 cards, and that many backdrop roots is a scroll cost a
  phone should not pay); the 23 project cards never get it, since each holds a
  YouTube iframe and there is nothing behind them worth blurring. Every one of
  them still takes the glass look — translucent fill, lit edge, soft cast.
- The primary call to action stays opaque orange. Making it translucent would
  cost it both contrast and its position in the hierarchy; it takes the finish
  (edge and sheen) but not the fill.
- Fallbacks: where backdrop-filter is unsupported, and under
  prefers-reduced-transparency, every glass surface falls back to the solid
  panel colour. Axe found no contrast regression across 11 pages × 4 viewports.
- The navigation carries a travelling orange edge line (Magic UI border beam) —
  the same conic-gradient-plus-mask technique already used on the bento tiles,
  run around the nav pill on a 7s loop. It holds still under
  prefers-reduced-motion and on save-data.
