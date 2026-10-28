#!/usr/bin/env python3
"""Voice-over + word timings for an episode.

  python3 tools/tts.py episodes/<dir> [--engine elevenlabs|piper]

ElevenLabs (default when ELEVENLABS_API_KEY is set):
  env ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, optional ELEVENLABS_MODEL (default eleven_multilingual_v2)
Piper (free local fallback): downloads en_US-ryan-high into ~/.piper on first use.

Writes <dir>/voice.wav (48 kHz mono, with lead-in) and <dir>/timeline.json:
  {duration, lead, engine, beats:[{start,end}], words:[{w,s,e,beat}]}
"""
import argparse, base64, json, os, re, subprocess, sys, wave, urllib.request
import numpy as np

LEAD, TAIL, SR = 0.35, 1.7, 48000


def sh(*a):
    subprocess.run(a, check=True)


def wav_read(p):
    w = wave.open(p); n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels()
    a = np.frombuffer(w.readframes(n), np.int16).astype(np.float32) / 32768
    if ch > 1: a = a.reshape(-1, ch).mean(1)
    return a, sr


def wav_write(p, a, sr=SR):
    w = wave.open(p, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()


def to48k(src, dst):
    sh('ffmpeg', '-y', '-v', 'error', '-i', src, '-ar', str(SR), '-ac', '1', dst)


def build_text(beats):
    text, ranges = '', []
    for b in beats:
        vo = re.sub(r'\s+', ' ', b['vo'].strip())
        if text: text += ' '
        ranges.append((len(text), len(text) + len(vo))); text += vo
    return text, ranges


def words_from_chars(text, ranges, starts, ends):
    out = []
    for m in re.finditer(r'\S+', text):
        a, b = m.start(), m.end() - 1
        beat = next(i for i, (s, e) in enumerate(ranges) if s <= a < e)
        out.append({'w': m.group(), 's': float(starts[a]), 'e': float(ends[b]), 'beat': beat})
    return out


def elevenlabs(text, ep):
    key = os.environ['ELEVENLABS_API_KEY']; voice = os.environ['ELEVENLABS_VOICE_ID']
    model = os.environ.get('ELEVENLABS_MODEL', 'eleven_multilingual_v2')
    body = json.dumps({'text': text, 'model_id': model,
                       'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.15, 'use_speaker_boost': True}}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128',
                                 data=body, headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=180) as r:
        js = json.load(r)
    mp3 = os.path.join(ep, 'voice_raw.mp3'); open(mp3, 'wb').write(base64.b64decode(js['audio_base64']))
    al = js['alignment']
    if ''.join(al['characters']) != text:
        print('warning: alignment text differs from input, matching by position', file=sys.stderr)
    tmp = os.path.join(ep, 'voice_raw.wav'); to48k(mp3, tmp)
    a, _ = wav_read(tmp)
    return a, al['character_start_times_seconds'], al['character_end_times_seconds']


def piper_voice():
    d = os.path.expanduser('~/.piper'); m = os.path.join(d, 'en_US-ryan-high.onnx')
    if not os.path.exists(m):
        os.makedirs(d, exist_ok=True)
        sh(sys.executable, '-m', 'piper.download_voices', 'en_US-ryan-high', '--data-dir', d)
    return m


def piper(beats, ep):
    model = piper_voice(); parts, starts_all, ends_all, text_all = [], [], [], ''
    t = 0.0; gap = np.zeros(int(.14 * SR))
    for i, b in enumerate(beats):
        vo = re.sub(r'\s+', ' ', b['vo'].strip())
        raw = os.path.join(ep, f'_p{i}.wav')
        subprocess.run([sys.executable, '-m', 'piper', '-m', model, '-f', raw], input=vo.encode(), check=True, capture_output=True)
        a, sr = wav_read(raw)
        if sr != SR:
            r48 = raw.replace('.wav', '_48.wav'); to48k(raw, r48); a, _ = wav_read(r48); os.remove(r48)
        os.remove(raw)
        # trim silence
        idx = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, idx[0] - 800): idx[-1] + 2400] if len(idx) else a
        dur = len(a) / SR
        if text_all: text_all += ' '; starts_all.append(t); ends_all.append(t)
        # proportional char timing inside the beat
        w = np.array([1.0 if c != ' ' else 0.6 for c in vo]); c = np.cumsum(w) / w.sum() * dur * 0.97
        st = np.concatenate([[0], c[:-1]]) + t
        starts_all += list(st); ends_all += list(c + t); text_all += vo
        parts += [a, gap]; t += dur + len(gap) / SR
    return np.concatenate(parts), starts_all, ends_all


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('ep'); ap.add_argument('--engine', default=None)
    o = ap.parse_args(); ep = o.ep
    episode = json.load(open(os.path.join(ep, 'episode.json')))
    beats = episode['beats']; text, ranges = build_text(beats)
    engine = o.engine or ('elevenlabs' if os.environ.get('ELEVENLABS_API_KEY') else 'piper')
    if engine == 'elevenlabs':
        audio, cs, ce = elevenlabs(text, ep)
    else:
        audio, cs, ce = piper(beats, ep)
    words = words_from_chars(text, ranges, cs, ce)
    for w in words: w['s'] += LEAD; w['e'] += LEAD
    audio = np.concatenate([np.zeros(int(LEAD * SR)), audio])
    peak = np.max(np.abs(audio)) or 1; audio = audio / peak * 0.89
    duration = round(max(len(audio) / SR, words[-1]['e']) + TAIL, 2)
    audio = np.concatenate([audio, np.zeros(int(duration * SR) - len(audio))])
    wav_write(os.path.join(ep, 'voice.wav'), audio)
    first = [next(w for w in words if w['beat'] == i) for i in range(len(beats))]
    starts = [0.0] + [max(0.0, f['s'] - 0.2) for f in first[1:]]
    tl = {'duration': duration, 'lead': LEAD, 'engine': engine,
          'beats': [{'start': round(starts[i], 3), 'end': round(starts[i + 1] if i + 1 < len(starts) else duration, 3)} for i in range(len(beats))],
          'words': [{**w, 's': round(w['s'], 3), 'e': round(w['e'], 3)} for w in words]}
    json.dump(tl, open(os.path.join(ep, 'timeline.json'), 'w'), indent=1)
    print(f'{engine}: {duration:.1f}s, {len(words)} words, beats: ' + ', '.join(f"{b['start']:.1f}" for b in tl['beats']))


if __name__ == '__main__':
    main()
