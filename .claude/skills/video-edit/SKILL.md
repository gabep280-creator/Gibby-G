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

## 5. Check and deliver

Make a contact sheet of the render and Read it: caption placement, no stacked lines,
face not cropped on zoomed segments. Then send the mp4 with SendUserFile. Number versions
(`cut-v1`, `cut-v2`) and keep the source untouched. Publishing goes through the `blotato` skill.
