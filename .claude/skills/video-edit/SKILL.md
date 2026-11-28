---
name: video-edit
description: Edit short vertical videos (Reels/TikTok/Shorts) with ffmpeg in this container — pull footage from a Google Drive link, transcribe it, auto jump-cut pauses, punch-in zooms, color and loudness correction, and burned-in word-by-word captions. Use when the user shares footage or asks to edit, cut, caption, or tighten a video.
---

# Video editing

Footage and renders live in `content/footage/` (gitignored, never commit video).

## 1. Get the footage

Chat uploads cap at 30 MB. For bigger files, have the user share a Google Drive link
("Anyone with the link"), then:

```bash
ID=<file id from /file/d/<ID>/view>
curl -sSL -o content/footage/source.mov "https://drive.usercontent.google.com/download?id=$ID&export=download&confirm=t"
```

Hosts needed in the environment allowlist: `drive.google.com`, `drive.usercontent.google.com`.

## 2. Look at it

```bash
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of compact source.mov
ffmpeg -v error -y -i source.mov -vf "fps=1,scale=270:-2,tile=7x4" -frames:v 1 sheet.jpg   # then Read sheet.jpg
```

## 3. Transcribe (word timestamps)

```bash
pip install -q faster-whisper   # once per container
HF_HUB_DISABLE_XET=1 python3 .claude/skills/video-edit/scripts/transcribe.py source.mov words.json
```

The first run downloads the `small.en` model from Hugging Face (hosts: `huggingface.co`,
`us.aws.cdn.hf.co`). `HF_HUB_DISABLE_XET=1` is required; the Xet transfer hosts are blocked.
Read the transcript before editing. It tells you what the video is actually about.
Fix obvious mis-hearings in `words.json` (brand names, prices) before captioning.

## 4. Auto-edit

```bash
python3 .claude/skills/video-edit/scripts/autocut.py source.mov words.json cut-v1.mp4
```

Knobs: `--gap` (pause length to cut, default 0.4s), `--zoom` (punch-in, 1.12), `--face-y`,
`--caption-y` (0.66 of height), `--words-per-line` (3), `--highlight` (ASS BGR hex,
`00D7FF` = yellow), `--no-captions`. Output is 1080×1920 H.264/AAC at 30 fps, -14 LUFS, faststart.

**Prefer `--vad`.** Whisper word timings drift by up to about 0.5s, especially after long pauses
and near the end, so cutting on them can clip the start or end of real words. `--vad` cuts on
audio loudness instead (pauses longer than `--gap`, measured on raw silence) and snaps caption
words onto kept audio. Use `--pad-in 0.08 --pad-out 0.15`. A repeated last word in the transcript
(for example "years. Years.") is usually one word with bad timing, not a real repeat: check the
loudness envelope before cutting it. When the cut changes after graphics are built, retime them
with a piecewise time map (new→old word anchors) instead of editing every number.

**Brand name rule (always):** pass `--protect START,END` covering the spoken brand name
("Creative Marketing Incentives") and any stat line right after it, using audio-verified times.
Nothing is cut inside or just before it, so the natural pause and the zoom stay put. Put NO sound
effects from 0.5s before the brand name until it ends (no whoosh on the logo entrance, no counter
ticks over it). The client hears anything over or around the brand name as being cut off.

## 5. Check and deliver

Make a contact sheet of the render and Read it: caption placement, no stacked lines,
face not cropped on zoomed segments. Then send the mp4 with SendUserFile. Number versions
(`cut-v1`, `cut-v2`) and keep the source untouched. Publishing goes through the `blotato` skill.

## 6. Motion graphics and sound effects (optional)

Animated cards, stamps, counters, checklists and chips are built as an HTML page with a
deterministic `window.render(t)` (no CSS animations or timers), then rendered to a
transparent PNG sequence and composited over the cut.

1. Get each word's time in the *edited* timeline (remap `words.json` through the cut list,
   which `autocut.py` prints and recomputes the same way). Time every graphic to a spoken word.
2. Copy `examples/travel-ad-graphics.html` as a starting point. Layout on 1080×1920:
   - top pill at y≈120
   - face at 15–50%
   - captions at `--caption-y 0.575`
   - cards in the 1190–1650 zone
   - keep x within 120–960, clear of the TikTok/Reels right rail and bottom UI
   Don't invent stats, prices or claims. Illustrative mock content is fine only if the speech supports it.
3. Preview stills first (cheap):
   `node scripts/render_overlay.js graphics.html stills --stills 3.4,6.4,11.8`,
   overlay them on frames of the base cut, and Read the strip.
4. Full render: `node scripts/render_overlay.js graphics.html gfx_frames <duration>` (about a minute for 20s).
5. SFX: adapt `scripts/sfx_example.py` (synthesized whoosh, pop, ding and thud at given times) → `sfx.wav`.
6. Composite:
   ```bash
   ffmpeg -i base.mp4 -framerate 30 -i gfx_frames/%05d.png -i sfx.wav -filter_complex \
     "[0:v][1:v]overlay=0:0:eof_action=pass:format=auto,format=yuv420p[v];[2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.8[s];[0:a][s]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
     -map "[v]" -map "[a]" -c:v libx264 -crf 19 -c:a aac -b:a 192k -movflags +faststart out.mp4
   ```
