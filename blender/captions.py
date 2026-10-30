#!/usr/bin/env python3
"""Napisy rolki jako przezroczysta warstwa wideo (MOV, qtrle z alfą).
  python3 captions.py <katalog_odcinka> [--fps 30] [--fonts DIR]
Czyta episode.json (beats[].headline, cta_sub) i timeline.json (słowa z czasami).
Nagłówek beatu u góry (Unbounded), napisy do lektora w dolnej części (Sora), na końcu wezwanie do obserwacji.
Bez etykiet, kropek, pasków postępu i numeracji scen.
Kolory akcentu: episode.json -> "accents": lista kolorów hex na beat (opcjonalnie).
"""
import json, os, sys, subprocess, math, argparse
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ap = argparse.ArgumentParser(); ap.add_argument('ep'); ap.add_argument('--fps', type=int, default=30)
ap.add_argument('--fonts', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts'))
o = ap.parse_args()
EP = o.ep; FPS = o.fps; W, H = 1080, 1920
ep = json.load(open(os.path.join(EP, 'episode.json'))); tl = json.load(open(os.path.join(EP, 'timeline.json')))
DUR = tl['duration']; NF = int(round(DUR * FPS))
F = lambda n, s: ImageFont.truetype(os.path.join(o.fonts, n), s)
HEAD = F('Unbounded_800ExtraBold.ttf', 92); SUB = F('Sora_700Bold.ttf', 60); CTA_B = F('Unbounded_800ExtraBold.ttf', 74); CTA_S = F('Sora_600SemiBold.ttf', 44)
DEF_ACC = ['#35D8FF', '#35D8FF', '#FF8A3D', '#FF4FB0', '#35D8FF', '#3DFF9A', '#FFD23D']
ACC = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in ep.get('accents', DEF_ACC)]
HL_COLOR = (255, 214, 64)
Y_HEAD = 250            # górna strefa bezpieczna IG ~ 220 px
Y_SUB = 1330            # dolna strefa: interfejs IG zasłania ~ 380 px od dołu


def clamp(x, a=0, b=1): return max(a, min(b, x))
def ease_out(u): u = clamp(u); return 1 - (1 - u) ** 3
def back_out(u, s=1.7): u = clamp(u) - 1; return 1 + (s + 1) * u ** 3 + s * u ** 2


# ---------- grupowanie słów lektora w krótkie frazy (max ~22 znaki, przerwa na interpunkcji)
words = tl['words']; chunks = []; cur = []
for i, w in enumerate(words):
    cur.append(w); txt = ' '.join(x['w'] for x in cur)
    nxt = words[i + 1] if i + 1 < len(words) else None
    brk = (nxt is None or nxt['beat'] != w['beat'] or w['w'][-1] in '.,:?!' or len(txt) > 16
           or (nxt and nxt['s'] - w['e'] > 0.35))
    if brk: chunks.append(cur); cur = []
for k, c in enumerate(chunks):
    c_end = chunks[k + 1][0]['s'] if k + 1 < len(chunks) else DUR
    for w in c: w['chunk_end'] = min(c_end, c[-1]['e'] + 0.6)


def text_layer(draw_fn):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); draw_fn(ImageDraw.Draw(im)); return im


def shadowed(base, layer, blur=10, alpha=170, dy=6):
    a = layer.split()[3].filter(ImageFilter.GaussianBlur(blur)).point(lambda v: v * alpha // 255)
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sh.putalpha(a)
    base.alpha_composite(sh, (0, dy)); base.alpha_composite(layer)


# ---------- nagłówki: dwa wiersze, drugi w kolorze akcentu
cache = {}
def headline_img(bi):
    if bi in cache: return cache[bi]
    l1, l2 = ep['beats'][bi]['headline']; acc = ACC[bi % len(ACC)]
    def d(dr):
        dr.text((W / 2, Y_HEAD), l1.upper(), font=HEAD, fill=(255, 255, 255), anchor='mt')
        dr.text((W / 2, Y_HEAD + 112), l2.upper(), font=HEAD, fill=acc, anchor='mt')
    lay = text_layer(d)
    bb = max(HEAD.getlength(l1.upper()), HEAD.getlength(l2.upper()))
    if bb > W - 90:   # za długie: zmniejsz
        sc = (W - 90) / bb; lay = lay.resize((int(W * sc), int(H * sc)), Image.LANCZOS)
        pad = Image.new('RGBA', (W, H), (0, 0, 0, 0)); pad.alpha_composite(lay, ((W - lay.width) // 2, int(Y_HEAD * (1 - sc)))); lay = pad
    cache[bi] = lay; return lay


def place(base, lay, scale, alpha, dy=0, anchor_y=Y_HEAD + 100):
    if alpha <= 0.01: return
    if abs(scale - 1) > 1e-3:
        w2, h2 = int(W * scale), int(H * scale); l2 = lay.resize((w2, h2), Image.BILINEAR)
        tmp = Image.new('RGBA', (W, H), (0, 0, 0, 0)); tmp.alpha_composite(l2, ((W - w2) // 2, int(anchor_y - anchor_y * scale))); lay = tmp
    if alpha < 1: lay = lay.copy(); lay.putalpha(lay.split()[3].point(lambda v: int(v * alpha)))
    shadowed(base, lay if dy == 0 else lay.transform(lay.size, Image.AFFINE, (1, 0, 0, 0, 1, -dy)), blur=14, alpha=200, dy=5)


def subtitle(base, t):
    for c in chunks:
        if c[0]['s'] - 0.05 <= t < c[-1]['chunk_end']:
            k = clamp((t - c[0]['s'] + 0.05) / 0.14)
            toks = [w['w'] for w in c]; widths = [SUB.getlength(x) for x in toks]; sp = SUB.getlength(' ')
            total = sum(widths) + sp * (len(toks) - 1); x = W / 2 - total / 2
            def d(dr):
                xx = x
                for w, tw in zip(c, widths):
                    on = w['s'] <= t
                    col = HL_COLOR if (w['s'] <= t < w['e'] + 0.08) else ((255, 255, 255) if on else (205, 210, 225))
                    dr.text((xx, Y_SUB), w['w'], font=SUB, fill=col, anchor='ls', stroke_width=7, stroke_fill=(8, 10, 22))
                    xx += tw + sp
            lay = text_layer(d)
            place(base, lay, 0.86 + 0.14 * back_out(k), k, anchor_y=Y_SUB - 20)
            return


def cta(base, t, t0):
    u = t - t0
    if u < 0: return
    k = back_out(clamp(u / 0.35)); a = clamp(u / 0.2)
    def d(dr):
        bw, bh = 640, 132; x0, y0 = W / 2 - bw / 2, 760
        dr.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=66, fill=(255, 64, 140))
        dr.text((W / 2, y0 + bh / 2 + 4), '+ OBSERWUJ', font=CTA_B, fill='white', anchor='mm')
        dr.text((W / 2, y0 + bh + 70), ep.get('cta_sub', 'codziennie nowa technologia w 3D'), font=CTA_S, fill=(235, 240, 255), anchor='mm', stroke_width=5, stroke_fill=(8, 10, 22))
    lay = text_layer(d)
    pulse = 1 + 0.03 * math.sin(max(0, u - 0.4) * 6.0) * (u > 0.4)
    place(base, lay, (0.6 + 0.4 * k) * pulse, a, anchor_y=830)


beats = tl['beats']
t_cta = next((w['s'] for w in words if w['w'].lower().startswith('obserwuj')), DUR - 4)
proc = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                         '-c:v', 'qtrle', os.path.join(EP, 'captions.mov')], stdin=subprocess.PIPE)
for fr in range(NF):
    t = fr / FPS; base = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bi = max(i for i, b in enumerate(beats) if b['start'] <= t + 1e-6)
    u = t - beats[bi]['start'] - (0.0 if bi == 0 else 0.05)
    out_u = beats[bi]['end'] - t
    head_alpha = clamp(u / 0.12) * clamp(out_u / 0.12)
    if bi == len(beats) - 1 and t >= t_cta - 0.15: head_alpha *= clamp((t_cta - t) / 0.15)
    place(base, headline_img(bi), 0.7 + 0.3 * back_out(u / 0.32), head_alpha)
    if t < t_cta - 0.1: subtitle(base, t)   # podczas CTA bez napisów lektora (nie dublujemy tekstu)
    cta(base, t, t_cta)
    proc.stdin.write(base.tobytes())
    if fr % 300 == 0: print('captions', fr, '/', NF, flush=True)
proc.stdin.close(); proc.wait(); print('captions.mov ok')
