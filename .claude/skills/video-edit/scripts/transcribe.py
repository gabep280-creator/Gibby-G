import sys, json
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
import subprocess, numpy as np
pcm = np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",sys.argv[1],"-f","s16le","-ac","1","-ar","16000","-"],capture_output=True).stdout, np.int16).astype(np.float32)/32768
segs, _ = m.transcribe(pcm, word_timestamps=True, vad_filter=True)
words=[]
for s in segs:
    print(f"[{s.start:5.2f}-{s.end:5.2f}] {s.text.strip()}")
    words += [{"w":w.word.strip(),"s":round(w.start,2),"e":round(w.end,2)} for w in s.words]
json.dump(words, open(sys.argv[2],"w"))
