#!/usr/bin/env python3
"""Auto-edit a vertical talking-head clip for Reels/TikTok/Shorts.

- Jump cuts: removes pauses between words longer than --gap seconds
- Punch-in: alternates 1.0x / --zoom on each cut so jump cuts feel intentional
- Color: gentle lift + contrast + saturation (phone footage is usually dark/flat)
- Audio: tiny fades at every cut (no clicks), high-pass, compression, -14 LUFS
- Captions: word-by-word burned-in captions, current word highlighted

Needs words.json from transcribe.py: [{"w": "Hello", "s": 0.0, "e": 0.3}, ...]

Usage:
  autocut.py SOURCE WORDS_JSON OUT.mp4 [--gap 0.4] [--zoom 1.12] [--no-captions]
             [--caption-y 0.66] [--words-per-line 3] [--highlight 00D7FF]
"""
import argparse, json, os, subprocess, tempfile

p = argparse.ArgumentParser()
p.add_argument("src"); p.add_argument("words"); p.add_argument("out")
p.add_argument("--gap", type=float, default=0.4, help="cut pauses longer than this (s)")
p.add_argument("--pad-in", type=float, default=0.05)
p.add_argument("--pad-out", type=float, default=0.12)
p.add_argument("--zoom", type=float, default=1.12)
p.add_argument("--face-y", type=float, default=0.3, help="where the face sits, 0=top 1=bottom; zoom anchors here")
p.add_argument("--no-captions", action="store_true")
p.add_argument("--caption-y", type=float, default=0.66, help="caption baseline as fraction of height")
p.add_argument("--words-per-line", type=int, default=3)
p.add_argument("--font", default="Inter Black")
p.add_argument("--font-size", type=int, default=96)
p.add_argument("--highlight", default="00D7FF", help="ASS BGR hex for the active word (00D7FF = yellow)")
p.add_argument("--crf", type=int, default=19)
p.add_argument("--vad", action="store_true",
               help="decide cuts from audio loudness instead of transcript timings (safer: Whisper timings can drift and clip words)")
p.add_argument("--times-out", help="write [{w, s, e}] word times in the EDITED timeline here (for timing graphics)")
p.add_argument("--vad-db", type=float, default=-48, help="speech threshold in dBFS for --vad")
a = p.parse_args()

words = json.load(open(a.words))
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                     "-of", "csv=p=0", a.src]).strip())
probe = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                 "stream=width,height", "-of", "csv=p=0", a.src]).decode().strip().split(",")
W, H = int(probe[0]), int(probe[1])

# 1. keep intervals ---------------------------------------------------------
groups = [[words[0]]]
for w in words[1:]:
    (groups[-1].append(w) if w["s"] - groups[-1][-1]["e"] <= a.gap else groups.append([w]))
keep = []
for g in groups:
    s, e = max(0.0, g[0]["s"] - a.pad_in), min(dur, g[-1]["e"] + a.pad_out)
    if keep and s <= keep[-1][1]:
        keep[-1][1] = e
    else:
        keep.append([s, e])

if a.vad:
    import numpy as np
    pcm = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", a.src, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                                       capture_output=True, check=True).stdout, np.int16).astype(float) / 32768
    rms = np.sqrt(np.convolve(pcm ** 2, np.ones(400) / 400, "same"))[::160]   # 25 ms window, 10 ms hop
    sp = 20 * np.log10(rms + 1e-9) > a.vad_db
    regs, i = [], 0
    while i < len(sp):
        if sp[i]:
            j = i
            while j < len(sp) and sp[j]: j += 1
            if j - i >= 4: regs.append([i / 100, j / 100])
            i = j
        else: i += 1
    merged = []
    for s_, e_ in regs:                      # merge on the raw silence length
        if merged and s_ - merged[-1][1] <= a.gap: merged[-1][1] = e_
        else: merged.append([s_, e_])
    keep = []
    for s_, e_ in merged:
        s_, e_ = max(0.0, s_ - a.pad_in), min(dur, e_ + a.pad_out)
        if keep and s_ <= keep[-1][1]: keep[-1][1] = e_
        else: keep.append([s_, e_])
    # snap caption words that start or end inside a removed gap onto kept audio
    for w in words:
        if not any(s_ <= w["s"] < e_ for s_, e_ in keep):
            nxt = [s_ for s_, e_ in keep if s_ > w["s"]]
            if nxt: w["s"] = nxt[0]
        if not any(s_ < w["e"] <= e_ for s_, e_ in keep):
            prv = [e_ for s_, e_ in keep if e_ < w["e"]]
            if prv and prv[-1] > w["s"]: w["e"] = prv[-1]
        w["e"] = max(w["e"], w["s"] + 0.05)

def remap(t):
    """source time -> output time"""
    out = 0.0
    for s, e in keep:
        if t >= e: out += e - s
        elif t >= s: return out + t - s
        else: return out
    return out

if a.times_out:
    json.dump({"keep": keep, "total": sum(e - s for s, e in keep),
               "words": [{"w": w["w"], "s": round(remap(w["s"]), 3), "e": round(remap(w["e"]), 3)} for w in words]},
              open(a.times_out, "w"), indent=1)

# 2. captions (ASS) ---------------------------------------------------------
def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"

def esc(x): return x.replace("{", "(").replace("}", ")")

ass_path = None
if not a.no_captions:
    lines, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= a.words_per_line or w["w"][-1:] in ".,!?:;":
            lines.append(cur); cur = []
    if cur: lines.append(cur)
    margin_v = int(H * (1 - a.caption_y))
    ev = []
    for li, ln in enumerate(lines):
        nxt = remap(lines[li + 1][0]["s"]) if li + 1 < len(lines) else 1e9
        txt = [esc(w["w"].upper().strip(".,;:")) if w["w"][-1:] in ",;:" else esc(w["w"].upper()) for w in ln]
        for i, w in enumerate(ln):
            st = remap(w["s"])
            en = remap(ln[i + 1]["s"]) if i + 1 < len(ln) else min(remap(w["e"]) + 0.15, nxt)
            if en - st < 0.04: continue
            parts = [(f"{{\\c&H{a.highlight}&\\fscx108\\fscy108}}{t}{{\\c&HFFFFFF&\\fscx100\\fscy100}}" if j == i else t)
                     for j, t in enumerate(txt)]
            ev.append(f"Dialogue: 0,{ts(st)},{ts(en)},Cap,,0,0,0,,{' '.join(parts)}")
    ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{a.font},{a.font_size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,7,3,2,70,70,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(ev) + "\n"
    fd, ass_path = tempfile.mkstemp(suffix=".ass"); os.write(fd, ass.encode()); os.close(fd)

# 3. filter graph -----------------------------------------------------------
f, vl, al = [], [], []
for i, (s, e) in enumerate(keep):
    z = a.zoom if i % 2 else 1.0
    cw, ch = f"trunc(iw/{z}/2)*2", f"trunc(ih/{z}/2)*2"
    zoom = f",crop={cw}:{ch}:(iw-{cw})/2:(ih-{ch})*{a.face_y},scale={W}:{H}" if z != 1.0 else ""
    f.append(f"[0:v]trim={s:.3f}:{e:.3f},setpts=PTS-STARTPTS{zoom}[v{i}]")
    fo = max(0.0, e - s - 0.015)
    f.append(f"[0:a]atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st={fo:.3f}:d=0.015[a{i}]")
    vl.append(f"[v{i}]"); al.append(f"[a{i}]")
n = len(keep)
f.append("".join(v + a_ for v, a_ in zip(vl, al)) + f"concat=n={n}:v=1:a=1[vc][ac]")
vf = "[vc]eq=brightness=0.03:contrast=1.07:saturation=1.12,curves=all='0/0 0.5/0.56 1/1',format=yuv420p"
if ass_path: vf += f",ass={ass_path}"
f.append(vf + "[vout]")
f.append("[ac]highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,"
         "loudnorm=I=-14:TP=-1.5:LRA=9[aout]")

cmd = ["ffmpeg", "-v", "error", "-stats", "-y", "-i", a.src, "-filter_complex", ";".join(f),
       "-map", "[vout]", "-map", "[aout]", "-r", "30", "-c:v", "libx264", "-preset", "medium",
       "-crf", str(a.crf), "-profile:v", "high", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
       "-movflags", "+faststart", a.out]
subprocess.run(cmd, check=True)
total = sum(e - s for s, e in keep)
print(f"cuts: {n} segments, {dur:.2f}s -> {total:.2f}s (removed {dur - total:.2f}s)")
