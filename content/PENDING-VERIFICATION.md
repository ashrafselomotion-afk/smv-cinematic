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
- Portfolio media: all 16 reel clips are licensed placeholder footage with neutral
  service-category titles. Replace with owned footage and approved project names.
- Social profiles (LinkedIn · Instagram · Vimeo): links removed — no live profiles
  supplied. Do not publish dead links.
- OG/social share image: current og.jpg is a generated skyline frame; replace with
  one approved flagship-project frame (no unapproved emblems or client marks).

## Arabic localisation (not yet implemented)

- The العربية navigation item is NOT rendered anywhere: no Arabic experience exists
  yet, and the plan forbids a language button that leads nowhere.
- Approved Arabic hero copy from the content plan (master line, eyebrow, body, CTAs)
  is ready in `SMV-premium-website-content-plan.md` §15 for when RTL routing exists.
- Required for launch: full RTL layout, Arabic metadata, localised case-study depth,
  review by an Arabic government-communications editor.
- Untranslated content: every page (Home, Work, Government Production, Capabilities,
  Approach, About, Contact, Privacy, 404) is English-only today.

## Legal

- privacy.html is a factual description of what the site actually does (FormSubmit
  relay, local theme preference, no analytics). Have it reviewed by counsel before
  relying on it for procurement.
- Terms page: not created (nothing to state yet without legal input).
