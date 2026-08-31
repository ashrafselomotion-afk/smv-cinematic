# Updating the films and photography

Everything on the Work pages comes from one file: `content/media.json`.
You never edit it by hand — the admin page does it for you.

**Admin page:** https://ashrafselomotion-afk.github.io/smv-cinematic/admin/

---

## First time: getting a token

The admin page needs permission to write to the website repository.

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
2. **Repository access:** Only select repositories → `smv-cinematic`
3. **Permissions → Repository permissions → Contents:** *Read and write*. Nothing else.
4. Set an expiry date. Generate. Copy it.
5. Paste it into the admin page and press Connect.

Treat that token like a password — it can change anything in the repository.
If you ever paste it somewhere by mistake, revoke it on the same GitHub page and
generate a new one. Leave "Keep me signed in" unticked on a shared computer.

---

## What happens when you press Publish

1. Any files you added are uploaded to the repository.
2. `content/media.json` is saved.
3. A GitHub Action re-renders `index.html`, `work.html` and their Arabic twins.
4. GitHub Pages redeploys.

Give it about a minute, then reload the site. If nothing changed after two
minutes, check the **Actions** tab on GitHub for a failed run.

---

## Films

Each film needs a YouTube ID and, in **both English and Arabic**, a title and a
type. Deliverables are optional but appear on the projects page.

**Show on the homepage** puts a film in the numbered shortlist. Five is the
maximum — untick one before ticking another.

### Preview loops — the "already playing" effect

A film with a preview loop **plays by itself** in the grid and on the homepage
stage. Without one it shows a still frame from YouTube and only plays when
clicked. The loop is a taste of the film, not the film — clicking it still opens
the full version.

Make loops **short, silent and small**:

| | |
|---|---|
| Length | 4–6 seconds |
| Sound | none — remove the audio track entirely |
| Size | 720px on the long edge is plenty |
| File | under 1MB; the admin warns above 2MB and refuses above 8MB |
| Format | MP4 (H.264). WebM works but is riskier on iPhones |

From a master file with ffmpeg:

```bash
ffmpeg -i master.mp4 -ss 00:00:03 -t 5 -an -vf "scale=-2:720" -c:v libx264 -crf 30 -preset slow -movflags +faststart loop.mp4
```

`-an` drops the audio, `-ss` picks the start point, `-crf 30` trades a little
quality for a much smaller file. Adobe Media Encoder does the same job — just
disable audio and keep the bitrate low.

The admin grabs the first frame as a poster automatically, so there is no black
box while the clip loads.

---

## Photography

Add photos, then write a **description in English and Arabic** for each one.
That is not optional — it is what a screen reader announces, and Publish will
refuse until every photo has both. Captions are optional and show under the image.

Photos are resized to 1600px and re-encoded before upload, so a 12MB camera file
lands as roughly 200KB. Upload the full-size original; don't shrink it first.

With no photos, the site shows an honest "the archive is being prepared" message
rather than an empty page. Removing every photo brings that message back.

**Before publishing anyone recognisable,** confirm you hold consent and that the
client has approved the set. Nothing here checks that for you.

---

## Where the files live

| | |
|---|---|
| `content/media.json` | the list — the single source of truth |
| `media/previews/` | preview loops and their posters |
| `media/photos/` | photography |
| `scripts/build-gallery.py` | turns the list into HTML |
| `.github/workflows/build-gallery.yml` | runs that script when the list changes |

Don't edit the gallery HTML by hand. Anything between `<!-- BUILD:… -->` markers
is overwritten on the next publish, and a test will fail if the pages and the
list disagree.

To render locally after editing the list by hand:

```bash
python3 scripts/build-gallery.py
```
