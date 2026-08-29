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
- Portfolio media: 3 of the 16 reels are now real SMV work, streamed from the
  client's Google Drive (nothing is downloaded or re-hosted):
    01 Corporate Event Coverage      — "IIS-Padel Day"        (1KwjgBcCAM3bsXj_SMcksknbN5n4rZdiS)
    08 Destination Film — Desert     — "EWD_IIS 2026 V09"     (1-qYes5pGYCvIFzun37PnKlRvgkFFX6lr)
    11 Programme Campaign Film       — "Elite Engineer Summer Camp" (1mK5Yppsdzv10UZU-Sqi4MENGCwfpBnbF)
  Titles use the neutral assignment-type taxonomy. TODO: CLIENT VERIFICATION —
  the Padel Day footage shows third-party marks (Invest in Sharjah, Sharjah
  Business Council UAE, PBCS and others) on the event signage; written approval
  is needed before naming any of those entities in copy. No entity is named today.
  The remaining 13 clips are still licensed placeholder footage.
- Drive as a host: Drive is not a CDN — it applies view quotas, can throttle, and
  serves Google's own player chrome and accessibility defects. Move final films to
  the repo or a CDN before tender use; each card swaps with a one-line change.
- Social profiles (LinkedIn · Instagram · Vimeo): links removed — no live profiles
  supplied. Do not publish dead links.
- OG/social share image: current og.jpg is a generated skyline frame; replace with
  one approved flagship-project frame (no unapproved emblems or client marks).

## Arabic localisation (complete route parity — /ar/)

- Full Arabic route parity now exists under `/ar/`: index, work, government-production,
  capabilities, approach, about, contact (Arabic brief form) and privacy. `ar.html`
  remains as a compatibility redirect to `/ar/`.
- TODO: CLIENT VERIFICATION — the Arabic copy was localised by the engineer from the
  approved English content plan. An Arabic government-communications editor must review
  official terminology, entity names, honorifics and policy language before tenders
  rely on it. The plan's approved Arabic hero copy (§15) is used verbatim.
- Language switch preserves the route in both directions; reciprocal hreflang plus
  x-default are published on every page.

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
