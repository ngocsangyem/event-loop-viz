"""QA for a rendered lesson: transcribes its audio with local Whisper and checks that every beat's
words are heard inside that beat's time window (no clipped, missing or drifting narration).
    motion/.venv/bin/python motion/lessons/pipeline/check-voice-sync.py <example-id> <lang>
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

root = Path(__file__).resolve().parents[3]
example, lang = sys.argv[1], sys.argv[2]
out = root / 'motion/lessons/out' / example
plan = json.loads((out / f'plan.{lang}.json').read_text())
timing = json.loads((out / f'timing.{lang}.json').read_text())
video = root / 'public/videos/event-loop' / example / f'{lang}.mp4'

model = WhisperModel('small', device='cpu', compute_type='int8')
# Decode with ffmpeg: 16 kHz mono float, the input Whisper expects.
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(video), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32)
segments, _ = model.transcribe(audio, language=lang, word_timestamps=True, vad_filter=False)
words = [(w.start, w.end, w.word) for s in segments for w in s.words]
norm = lambda s: re.sub(r'[^\w]+', ' ', s.lower()).split()

problems = []
for beat, t in zip(plan['beats'], timing['beats']):
    heard = [w for (a, b, w) in words if a >= t['start'] - 0.3 and b <= t['end'] + 0.3]
    said = set(norm(beat['say']))
    got = set(norm(' '.join(heard)))
    recall = len(said & got) / max(1, len(said))
    if recall < 0.6:
        problems.append(f"{beat['id']}: only {recall:.0%} of its words heard in [{t['start']:.1f}, {t['end']:.1f}]")
# Clipped ending: Whisper stretches the last word over trailing silence, so measure the audio
# itself: the final half second must be silent.
tail = audio[-8000:]
tail_db = 20 * np.log10(max(1e-9, float(np.sqrt(np.mean(tail ** 2)))))
if tail_db > -45:
    problems.append(f'audio is still sounding at the end ({tail_db:.0f} dBFS in the last 0.5 s): voice is cut off')
print(f'{example} {lang}: {len(words)} words heard, {len(problems)} problems')
for p in problems:
    print('  -', p)
sys.exit(1 if problems else 0)
