#!/usr/bin/env python3
"""Original procedural music bed + SFX, synced to the episode.
  python3 tools/music.py episodes/<dir>
Reads timeline.json and sfx.json (written by tools/render.js). Writes music.wav (stereo 48 kHz).
The musical key/progression/tempo is chosen from the episode slug, so episodes vary but stay on-brand.
"""
import json, os, sys, wave, hashlib
import numpy as np
from scipy.signal import lfilter

SR = 48000
ep = sys.argv[1]
tl = json.load(open(os.path.join(ep, 'timeline.json')))
sfx = json.load(open(os.path.join(ep, 'sfx.json'))) if os.path.exists(os.path.join(ep, 'sfx.json')) else []
slug = json.load(open(os.path.join(ep, 'episode.json'))).get('slug', ep)
h = int(hashlib.md5(slug.encode()).hexdigest(), 16)
rng = np.random.default_rng(h % 2**32)
DUR = tl['duration']; N = int(DUR * SR)
L = np.zeros(N); R = np.zeros(N)

PROGS = [  # (chords as midi triads, bass roots)
    ([[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]], [45, 41, 48, 43]),   # Am F C G
    ([[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 48, 52]], [38, 34, 36, 33]),   # Dm Bb C Am
    ([[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]], [40, 36, 43, 38]),   # Em C G D
    ([[48, 52, 55], [45, 48, 52], [53, 57, 60], [55, 59, 62]], [36, 33, 41, 43]),   # C Am F G
]
chords, bass = PROGS[h % len(PROGS)]
BPM = [112, 116, 120, 124][(h >> 4) % 4]; BEAT = 60 / BPM; BAR = BEAT * 4


def put(sig, t, pan=0.0, gain=1.0):
    i = int(t * SR)
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), N - i)
    if n <= 0: return
    l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    L[i:i+n] += sig[:n] * gain * l; R[i:i+n] += sig[:n] * gain * r


def env(n, a=.005, d=.3):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); return lfilter([1 - a], [1, -a], x)


def midi(m): return 440 * 2 ** ((m - 69) / 12)


def pluck(f, dur=.3):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2*np.pi*f*t) + .4*np.sin(4*np.pi*f*t) + .15*np.sin(6*np.pi*f*t)) * env(n, .003, .11)


def pad(freqs, dur):
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for f in freqs:
        for det in (-.12, 0, .11):
            s += 2 * ((f * 2 ** (det / 12) * t + rng.random()) % 1) - 1
    s = lp(lp(s / (len(freqs) * 3), 800), 1600)
    return s * np.minimum(1, t / .4) * np.minimum(1, (dur - t) / .4)


def kick():
    n = int(.35 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(48 + 110 * np.exp(-t * 28)) / SR) * np.exp(-t * 9)


def noise(n): return rng.standard_normal(n)


def hat(dec=.03):
    n = int(.12 * SR); x = noise(n); x = x - lp(x, 7000); return x * np.exp(-np.arange(n) / SR / dec)


def clap():
    n = int(.25 * SR); x = lp(noise(n) - lp(noise(n), 1200), 5000); t = np.arange(n) / SR
    e = np.exp(-t / .07) + sum(.6 * np.exp(-np.maximum(0, t - k) / .006) * (t >= k) for k in (0, .012, .024))
    return x * e * .6


def whoosh(dur=.55):
    n = int(dur * SR); x = noise(n); t = np.arange(n) / SR
    y = lp(x, 900) * np.linspace(0.3, 1, n) + (x - lp(x, 2500)) * np.linspace(0, .5, n) ** 2
    return y * np.sin(np.pi * t / dur) ** 2 * 1.6


def blip(f=880, dur=.12):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2*np.pi*f*t*(1 + .4*np.exp(-t*40))) * env(n, .002, .04)


def click():
    n = int(.04 * SR); x = noise(n); x = x - lp(x, 2500); return x * np.exp(-np.arange(n) / SR / .006)


# --- music (kept modest: it sits under a voice-over) ---
bars = int(np.ceil(DUR / BAR)) + 1
pattern = [0, 1, 2, 1, 2, 0, 1, 2]
for b in range(bars):
    t0 = b * BAR; ch = chords[b % 4]
    put(pad([midi(m) for m in ch], BAR + .1), t0, 0, .14)
    for k in range(4):
        n = int(BEAT * .9 * SR); tt = np.arange(n) / SR; f = midi(bass[b % 4])
        put((np.sin(2*np.pi*f*tt) + .25*np.sin(4*np.pi*f*tt)) * env(n, .01, .22), t0 + k * BEAT, 0, .22 if t0 > 1 else .0)
    for k in range(16):
        tt = t0 + k * BEAT / 4
        m = ch[pattern[k % 8]] + 12 + (12 if k % 4 == 2 else 0)
        put(pluck(midi(m)), tt, -.35 if k % 2 else .35, .06)
nb = int(DUR / BEAT)
for b in range(nb):
    t = b * BEAT
    if t > DUR - 1.2: break
    if t >= BEAT * 4: put(kick(), t, 0, .42)
    if t >= BEAT * 8:
        put(hat(), t + BEAT / 2, .25, .09)
        if b % 2: put(clap(), t, 0, .2)

# --- sfx ---
for e in sfx:
    if e['type'] == 'whoosh': put(whoosh(), e['t'] - .28, 0, .2)
    elif e['type'] == 'blip': put(blip(900 + rng.integers(0, 6) * 80), e['t'], rng.uniform(-.3, .3), .14)
    elif e['type'] == 'click': put(click(), e['t'], 0, .35)
    elif e['type'] == 'pop': put(blip(620, .1), e['t'], 0, .16)
    elif e['type'] == 'thud':
        n = int(.25 * SR); t = np.arange(n) / SR; put(np.sin(2*np.pi*(90 + 120*np.exp(-t*40))*t) * np.exp(-t*22), e['t'], 0, .4)
    elif e['type'] == 'rise':
        n = int(1.2 * SR); t = np.arange(n) / SR; put(noise(n) * (t / 1.2) ** 3 * .22, e['t'] - 1.2, 0, 1)
    elif e['type'] == 'power':
        n = int(.4 * SR); t = np.arange(n) / SR; put(np.sin(2*np.pi*(500*t + 900*t**2)) * env(n, .005, .15), e['t'], 0, .18)

mix = np.stack([L, R], 1); t = np.arange(N) / SR
mix *= (np.minimum(1, t / .08) * np.clip((DUR - t) / 1.4, 0, 1))[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix /= (np.max(np.abs(mix)) or 1) / .8
w = wave.open(os.path.join(ep, 'music.wav'), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close()
print(f'music: {DUR:.1f}s, {BPM} bpm, prog {h % len(PROGS)}, {len(sfx)} sfx')
