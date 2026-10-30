"""Tekstury ekranów (telefon, terminal) jako PNG. Uruchom: python3 screens.py <katalog_wyjściowy>"""
import os, sys, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else 'tex'
os.makedirs(OUT, exist_ok=True)
F = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
U8 = lambda s: ImageFont.truetype(os.path.join(F, 'Unbounded_800ExtraBold.ttf'), s)
U5 = lambda s: ImageFont.truetype(os.path.join(F, 'Unbounded_500Medium.ttf'), s)
S7 = lambda s: ImageFont.truetype(os.path.join(F, 'Sora_700Bold.ttf'), s)
S6 = lambda s: ImageFont.truetype(os.path.join(F, 'Sora_600SemiBold.ttf'), s)


def grad(w, h, stops, diag=False):
    im = Image.new('RGB', (w, h)); px = im.load()
    for y in range(h):
        for x in range(w if diag else 1):
            t = (x / w * 0.55 + y / h * 0.45) if diag else y / (h - 1)
            for i in range(len(stops) - 1):
                p0, c0 = stops[i]; p1, c1 = stops[i + 1]
                if p0 <= t <= p1:
                    u = (t - p0) / max(1e-6, p1 - p0)
                    c = tuple(int(c0[k] + (c1[k] - c0[k]) * u) for k in range(3)); break
            else:
                c = stops[-1][1]
            if diag: px[x, y] = c
            else:
                for xx in range(w): px[xx, y] = c
    return im


def glow(base, mask_img, color, radius):
    blur = mask_img.filter(ImageFilter.GaussianBlur(radius))
    base.paste(Image.new('RGB', base.size, color), (0, 0), blur)


def contactless(d, cx, cy, s, color, width):
    for i in range(4):
        r = s * (0.35 + i * 0.42); x0 = cx - s * 0.9
        d.arc([x0 - r, cy - r, x0 + r, cy + r], -48, 48, fill=color, width=width)


def card(w, h):
    c = grad(w, h, [(0, (255, 122, 69)), (0.5, (233, 48, 140)), (1, (98, 54, 255))], diag=True)
    d = ImageDraw.Draw(c)
    sh = Image.new('L', (w, h), 0); ImageDraw.Draw(sh).ellipse([-w * 0.3, -h * 1.2, w * 0.9, h * 0.55], fill=60)
    c.paste(Image.new('RGB', (w, h), (255, 255, 255)), (0, 0), sh.filter(ImageFilter.GaussianBlur(40)))
    d.rounded_rectangle([60, int(h * 0.36), 60 + 150, int(h * 0.36) + 112], radius=22, fill=(250, 214, 120))
    for k in range(3):
        d.line([60, int(h * 0.36) + 28 + k * 28, 210, int(h * 0.36) + 28 + k * 28], fill=(200, 160, 70), width=4)
    contactless(d, w - 110, 120, 54, (255, 255, 255), 9)
    d.text((60, h - 150), '•••• 4821', font=S7(64), fill='white')
    d.text((w - 60, h - 70), 'DEBIT', font=U8(46), fill='white', anchor='rs')
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w, h], radius=56, fill=255)
    return c, m


def phone_base(W, H):
    im = grad(W, H, [(0, (16, 22, 52)), (0.6, (8, 10, 26)), (1, (4, 5, 12))])
    d = ImageDraw.Draw(im)
    d.text((100, 130), '9:41', font=S7(58), fill='white', anchor='lm')
    d.rounded_rectangle([W / 2 - 190, 70, W / 2 + 190, 190], radius=60, fill='black')
    d.rounded_rectangle([W - 210, 108, W - 110, 154], radius=12, outline='white', width=6)
    d.rounded_rectangle([W - 200, 118, W - 140, 144], radius=6, fill='white')
    return im, d


def phone_idle(W=1200, H=2580):
    im, d = phone_base(W, H)
    d.text((96, 330), 'Portfel', font=U8(104), fill='white', anchor='ls')
    cw, ch = W - 160, 680
    c, m = card(cw, ch)
    sh = Image.new('L', (W, H), 0); ImageDraw.Draw(sh).rounded_rectangle([80, 430, 80 + cw, 430 + ch], radius=56, fill=170)
    glow(im, sh, (233, 48, 140), 70)
    im.paste(c, (80, 410), m)
    d = ImageDraw.Draw(im)
    ic = Image.new('L', (W, H), 0); contactless(ImageDraw.Draw(ic), W / 2 + 40, 1640, 150, 255, 26)
    glow(im, ic, (60, 220, 255), 40)
    im.paste(Image.new('RGB', (W, H), (170, 240, 255)), (0, 0), ic)
    d.text((W / 2, 2010), 'Zbliż do terminala', font=S7(78), fill='white', anchor='ms')
    d.text((W / 2, 2110), 'Kawiarnia Orbita · 24 zł', font=S6(54), fill=(150, 160, 190), anchor='ms')
    return im


def phone_ok(W=1200, H=2580):
    im, d = phone_base(W, H)
    cx, cy = W / 2, 1050
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).ellipse([cx - 330, cy - 330, cx + 330, cy + 330], fill=200)
    glow(im, m, (40, 230, 150), 120)
    d = ImageDraw.Draw(im)
    d.ellipse([cx - 300, cy - 300, cx + 300, cy + 300], fill=(22, 200, 120))
    d.line([(cx - 140, cy + 10), (cx - 40, cy + 115), (cx + 160, cy - 105)], fill='white', width=58, joint='curve')
    d.text((cx, 1620), 'Zapłacono', font=U8(120), fill='white', anchor='ms')
    d.text((cx, 1760), '24 zł', font=S7(96), fill=(180, 255, 220), anchor='ms')
    return im


def terminal(ok=False, W=1000, H=640):
    im = grad(W, H, [(0, (10, 16, 30)), (1, (4, 6, 12))])
    d = ImageDraw.Draw(im)
    if not ok:
        d.text((W / 2, 230), '24,00 zł', font=U8(132), fill='white', anchor='ms')
        ic = Image.new('L', (W, H), 0); contactless(ImageDraw.Draw(ic), W / 2 + 30, 420, 95, 255, 20)
        glow(im, ic, (255, 150, 60), 30)
        im.paste(Image.new('RGB', (W, H), (255, 200, 120)), (0, 0), ic)
        ImageDraw.Draw(im).text((W / 2, 600), 'Zbliż kartę lub telefon', font=S6(44), fill=(160, 170, 195), anchor='ms')
    else:
        cx, cy = W / 2, 260
        m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).ellipse([cx - 170, cy - 170, cx + 170, cy + 170], fill=200)
        glow(im, m, (40, 230, 150), 70)
        d = ImageDraw.Draw(im)
        d.ellipse([cx - 150, cy - 150, cx + 150, cy + 150], fill=(22, 200, 120))
        d.line([(cx - 70, cy + 5), (cx - 20, cy + 58), (cx + 80, cy - 52)], fill='white', width=30, joint='curve')
        d.text((W / 2, 560), 'Zaakceptowano', font=U8(70), fill='white', anchor='ms')
    return im


phone_idle().save(os.path.join(OUT, 'phone_idle.png'))
phone_ok().save(os.path.join(OUT, 'phone_ok.png'))
terminal(False).save(os.path.join(OUT, 'term_idle.png'))
terminal(True).save(os.path.join(OUT, 'term_ok.png'))
c, m = card(1712, 1080); cc = Image.new('RGBA', c.size); cc.paste(c, (0, 0), m); cc.save(os.path.join(OUT, 'card.png'))
print('ok')
