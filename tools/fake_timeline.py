#!/usr/bin/env python3
"""Syntetyczny timeline.json bez syntezy mowy (do testów silnika i przykładu).
  python3 tools/fake_timeline.py episodes/<dir>
Czas słowa szacowany z liczby znaków (ok. 16 znaków na sekundę), pauza 0,25 s między beatami.
Prawdziwe odcinki zawsze używają tools/tts.py, które nadpisuje ten plik.
"""
import json, os, re, sys

LEAD, TAIL, CPS, GAP = 0.35, 1.7, 16.5, 0.25
ep = sys.argv[1]
episode = json.load(open(os.path.join(ep, 'episode.json')))
t = LEAD
words, firsts = [], []
for bi, b in enumerate(episode['beats']):
    toks = re.sub(r'\s+', ' ', b['vo'].strip()).split(' ')
    for k, w in enumerate(toks):
        d = max(0.18, (len(w) + 1) / CPS)
        if k == 0:
            firsts.append(t)
        words.append({'w': w, 's': round(t, 3), 'e': round(t + d * 0.92, 3), 'beat': bi})
        t += d + (0.18 if re.search(r'[.,!?;:]$', w) else 0)
    t += GAP
duration = round(t + TAIL, 2)
starts = [0.0] + [max(0.0, f - 0.2) for f in firsts[1:]]
tl = {'duration': duration, 'lead': LEAD, 'engine': 'fake',
      'beats': [{'start': round(starts[i], 3), 'end': round(starts[i + 1] if i + 1 < len(starts) else duration, 3)} for i in range(len(starts))],
      'words': words}
json.dump(tl, open(os.path.join(ep, 'timeline.json'), 'w'), indent=1)
print(f'fake timeline: {duration:.1f}s, {len(words)} words')
