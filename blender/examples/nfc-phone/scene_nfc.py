"""Rolka: jak działa płatność telefonem przez NFC. Blender 5.x, EEVEE.
Uruchomienie:  blender -b -P scene_nfc.py -- MODE [klatki]
  MODE=test  -> pojedyncze klatki (np. 30,120,450) do kontroli
  MODE=full  -> cała animacja do frames/
Zmienne: ENGINE=eevee|cycles, SAMPLES, SCALE (procent rozdzielczości).
W katalogu obok: reelkit.py, timeline.json, studio.hdr, fonts/, tex/ (z screens.py).
"""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy
import bmesh
from mathutils import Vector, Euler
import reelkit as K
from reelkit import lerp, clamp, seg, smooth, ease_out, ease_io, rand, spline

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = args[0] if args else 'test'
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
DUR = TL['duration']
BEATS = [(b['start'], b['end']) for b in TL['beats']]
ENGINE = os.environ.get('ENGINE', 'eevee')
SAMPLES = int(os.environ.get('SAMPLES', '48'))
FONT_B = os.path.join(HERE, 'fonts', 'Sora_700Bold.ttf')
FONT_U = os.path.join(HERE, 'fonts', 'Unbounded_800ExtraBold.ttf')
TEX = lambda n: os.path.join(HERE, 'tex', n)

# kolory
CYAN = (0.05, 0.75, 1.0)
ORANGE = (1.0, 0.42, 0.08)
GREEN = (0.1, 1.0, 0.45)
MAGENTA = (1.0, 0.15, 0.6)
RED = (1.0, 0.12, 0.12)


def mixc(a, b, t): t = clamp(t); return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


# ------------------------------------------------------------------ czasy wydarzeń (z lektora)
def word_t(prefix, beat=None):
    for w in TL['words']:
        if w['w'].lower().startswith(prefix) and (beat is None or w['beat'] == beat): return w['s']
    raise KeyError(prefix)


T_PIK = word_t('pik', 0)
T_COIL_T = word_t('cewka', 1)
T_POLE = word_t('pole', 1)
T_13 = word_t('13', 1)
T_KILKA = word_t('kilka', 2)
T_COIL_P = word_t('cewkę', 3)
T_POLE_P = word_t('pole', 3)
T_UDAWAC = word_t('udawać', 3)
T_NUMER = word_t('numeru', 4)
T_TOKEN = word_t('token', 4)
T_KOD = word_t('kod', 4)
T_BANK = word_t('banku', 5)
T_ZGODA = word_t('zgoda', 5)
B = BEATS

sc = K.setup(DUR, engine=ENGINE, samples=SAMPLES)
K.world(os.path.join(HERE, 'studio.hdr'), strength=0.45)
K.compositor(bloom=0.55, threshold=0.9, saturation=1.15)

# ------------------------------------------------------------------ podłoga i tło
bpy.ops.mesh.primitive_plane_add(size=60)
floor = bpy.context.object
K.assign(floor, K.mat_principled('Floor', (0.012, 0.014, 0.022), metal=0.2, rough=0.38, coat=0.25, coat_rough=0.25))
bd = K.plane_uv('Backdrop', 60, 30, loc=(0, 14, 8)); bd.rotation_euler = (math.radians(90), 0, 0)
bdm = K.mat_emit('Backdrop', (0.05, 0.035, 0.12), 0.25)
K.assign(bd, bdm)

# ------------------------------------------------------------------ terminal
TERM = K.empty('Terminal')
body = K.rounded_box('TermBody', (1.3, 2.2, 0.34), 0.07, parent=TERM, loc=(0, 0, 0.17))
K.assign(body, K.mat_principled('Graphite', (0.035, 0.04, 0.055), metal=0.4, rough=0.32, coat=0.8, coat_rough=0.08))
TOP = 0.34
scr = K.plane_uv('TermScreen', 1.04, 0.666, parent=TERM, loc=(0, 0.52, TOP + 0.009), radius=0.05)
term_scr_mat = K.mat_screen('TermScreen', TEX('term_idle.png'), TEX('term_ok.png'), strength=1.5)
K.assign(scr, term_scr_mat)
bez = K.rounded_rect_slab('TermBezel', 1.12, 0.74, 0.008, 0.07, bevel=0, parent=TERM); bez.location = (0, 0.52, TOP + 0.001)
K.assign(bez, K.mat_principled('Bezel', (0.005, 0.005, 0.008), rough=0.05, coat=1))
PAD = Vector((0, -0.5, TOP))
# cewka terminala (pod płytką)
pts = []
for i in range(7 * 80 + 1):
    u = i / 80; r = 0.1 + 0.04 * u; a = u * 2 * math.pi
    pts.append((math.cos(a) * r, -0.5 + math.sin(a) * r, TOP + 0.003))
tcoil = K.tube_path('TermCoil', pts, 0.008, parent=TERM)
tcoil_mat = K.mat_principled('TermCoil', (0.85, 0.45, 0.2), metal=1, rough=0.25, emission=ORANGE, estr=0.0)
K.assign(tcoil, tcoil_mat)
pad = K.cylinder('PadGlass', 0.43, 0.014, parent=TERM, loc=(0, -0.5, TOP + 0.009), verts=96)
pad_mat = K.mat_principled('PadGlass', (0.01, 0.012, 0.02), rough=0.12, coat=1, alpha=1.0)
K.assign(pad, pad_mat)
ring = K.torus('PadRing', 0.47, 0.014, parent=TERM, loc=(0, -0.5, TOP + 0.01), maj=160)
ring_mat = K.mat_emit('PadRing', ORANGE, 6)
K.assign(ring, ring_mat)
strip = K.rounded_box('FrontStrip', (1.0, 0.02, 0.02), 0.009, parent=TERM, loc=(0, -1.105, 0.2))
strip_mat = K.mat_emit('Strip', ORANGE, 4)
K.assign(strip, strip_mat)
# ikona zbliżeniowa na płytce
icon_mat = K.mat_emit('PadIcon', (1.0, 0.7, 0.4), 3)
for k, r in enumerate((0.07, 0.13, 0.19)):
    arc = []
    for j in range(25):
        a = math.radians(-45 + 90 * j / 24); arc.append((-0.06 + math.cos(a) * r, -0.5 + math.sin(a) * r, TOP + 0.018))
    K.assign(K.tube_path(f'IconArc{k}', arc, 0.009, parent=TERM), icon_mat)

# ------------------------------------------------------------------ telefon
PH = K.empty('Phone')
PW, PL, PT = 1.0, 2.06, 0.1
frame = K.rounded_rect_slab('PhoneFrame', PW, PL, PT, 0.16, bevel=0.03, parent=PH)
K.assign(frame, K.mat_principled('Titanium', (0.16, 0.27, 0.62), metal=1, rough=0.28, coat=0.3))
screen = K.plane_uv('PhoneScreen', PW - 0.06, PL - 0.07, parent=PH, loc=(0, 0, PT / 2 + 0.0065), radius=0.13)
ph_scr_mat = K.mat_screen('PhoneScreen', TEX('phone_idle.png'), TEX('phone_ok.png'), strength=2.0)
K.assign(screen, ph_scr_mat)
_p = ph_scr_mat.node_tree.nodes['Principled BSDF']
_p.inputs['Specular IOR Level'].default_value = 0.04; _p.inputs['Coat Weight'].default_value = 0.04; _p.inputs['Roughness'].default_value = 0.4
glass_front = K.rounded_rect_slab('FrontGlass', PW - 0.03, PL - 0.03, 0.004, 0.15, bevel=0, parent=PH); glass_front.location = (0, 0, PT / 2 + 0.002)
K.assign(glass_front, K.mat_principled('Black', (0.003, 0.003, 0.005), rough=0.05, coat=1))
back = K.rounded_rect_slab('BackGlass', PW - 0.03, PL - 0.03, 0.004, 0.15, bevel=0, parent=PH); back.location = (0, 0, -PT / 2 - 0.001)
K.assign(back, K.mat_principled('BackGlass', (0.13, 0.2, 0.55), metal=0.2, rough=0.32, coat=1, coat_rough=0.03))
bump = K.rounded_rect_slab('CamBump', 0.4, 0.4, 0.03, 0.09, bevel=0.01, parent=PH); bump.location = (-0.24, 0.76, -PT / 2 - 0.016)
K.assign(bump, K.mat_principled('BumpGlass', (0.09, 0.14, 0.36), metal=0.3, rough=0.15, coat=1))
ring_m = K.mat_principled('LensRing', (0.75, 0.78, 0.85), metal=1, rough=0.2)
lens_m = K.mat_principled('Lens', (0.01, 0.015, 0.05), rough=0.02, coat=1, emission=(0.1, 0.2, 0.6), estr=0.15)
for (x, y) in ((-0.325, 0.845), (-0.155, 0.845), (-0.325, 0.675)):
    K.assign(K.cylinder('LensRing', 0.07, 0.03, parent=PH, loc=(x, y, -PT / 2 - 0.04), verts=64, bevel=0.004), ring_m)
    K.assign(K.cylinder('LensGlass', 0.052, 0.032, parent=PH, loc=(x, y, -PT / 2 - 0.042), verts=64), lens_m)
K.assign(K.cylinder('Flash', 0.025, 0.02, parent=PH, loc=(-0.155, 0.675, -PT / 2 - 0.035)), K.mat_emit('Flash', (1, 0.9, 0.7), 0.6))
btn = K.mat_principled('Btn', (0.16, 0.27, 0.62), metal=1, rough=0.25)
for y, l in ((0.45, 0.22), (0.1, 0.22)): K.assign(K.rounded_box('BtnL', (0.02, l, 0.035), 0.008, parent=PH, loc=(-PW / 2 - 0.005, y, 0)), btn)
K.assign(K.rounded_box('BtnR', (0.02, 0.32, 0.035), 0.008, parent=PH, loc=(PW / 2 + 0.005, 0.3, 0)), btn)
# antena NFC + chip zabezpieczający (warstwa, która "wysuwa się" w rozbitym widoku)
PCOIL = K.empty('PhoneCoil', parent=PH, loc=(0, 0.05, -0.03))
cpts = []
for i in range(4 * 120 + 1):
    u = i / 120; ins = 0.02 * u; a = (u % 1) * 2 * math.pi
    w, l = 0.34 - ins, 0.4 - ins
    x = max(-w, min(w, math.cos(a) * w * 1.35)); y = max(-l, min(l, math.sin(a) * l * 1.35))
    cpts.append((x, y, 0))
pcoil = K.tube_path('PhoneCoilTube', cpts, 0.006, parent=PCOIL)
pcoil_mat = K.mat_principled('PhoneCoil', (0.85, 0.45, 0.2), metal=1, rough=0.25, emission=MAGENTA, estr=0.0)
K.assign(pcoil, pcoil_mat)
board = K.rounded_rect_slab('CoilBoard', 0.82, 0.96, 0.006, 0.06, bevel=0, parent=PCOIL); board.location = (0, 0, 0.006)
board_mat = K.mat_principled('CoilBoard', (0.02, 0.03, 0.06), rough=0.4, alpha=0.85)
K.assign(board, board_mat)
chip = K.rounded_box('SecureChip', (0.14, 0.14, 0.03), 0.01, parent=PCOIL, loc=(0, 0, -0.01))
chip_mat = K.mat_principled('Chip', (0.95, 0.72, 0.3), metal=1, rough=0.2, emission=GREEN, estr=0.0)
K.assign(chip, chip_mat)
ph_light = K.point_light('PhoneGlow', (0, 0.05, -0.2), 0.0, MAGENTA, parent=PH)

# wirtualna karta (telefon "udaje" kartę)
vcard = K.plane_uv('VirtualCard', 0.86, 0.54, parent=PH, loc=(0, 0, 0.06), radius=0.04)
vmat = bpy.data.materials.new('VCard'); nt = vmat.node_tree; n = nt.nodes; n.clear()
tx = n.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(TEX('card.png'))
em = n.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.4
trn = n.new('ShaderNodeBsdfTransparent'); mx = n.new('ShaderNodeMixShader'); mx.name = 'Mix'
mul = n.new('ShaderNodeMath'); mul.name = 'AlphaMul'; mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0.0
out = n.new('ShaderNodeOutputMaterial')
nt.links.new(tx.outputs['Color'], em.inputs['Color']); nt.links.new(tx.outputs['Alpha'], mul.inputs[0])
nt.links.new(mul.outputs[0], mx.inputs[0]); nt.links.new(trn.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2])
nt.links.new(mx.outputs[0], out.inputs[0]); vmat.surface_render_method = 'BLENDED'
K.assign(vcard, vmat)

# ------------------------------------------------------------------ pole NFC
RINGS = []
for i in range(4):
    r = K.torus(f'Field{i}', 1.0, 0.0045, loc=(0, -0.5, TOP), maj=160, mi=10)
    m = K.mat_emit(f'Field{i}', CYAN, 0.0, alpha=1.0)
    K.assign(r, m); RINGS.append((r, m))
shock = K.torus('Shock', 1.0, 0.012, loc=(0, -0.5, TOP + 0.01), maj=200, mi=10)
shock_mat = K.mat_emit('Shock', GREEN, 0.0); K.assign(shock, shock_mat)

# ------------------------------------------------------------------ pakiety danych
PKTS = []
for i in range(8):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=24, ring_count=12)
    p = bpy.context.object; p.name = f'Pkt{i}'; K.smooth_shade(p)
    m = K.mat_emit(f'Pkt{i}', CYAN, 0.0); K.assign(p, m); PKTS.append((p, m))

# ------------------------------------------------------------------ bank
BANK_POS = Vector((0, 4.2, 5.4))
BK = K.empty('Bank', loc=BANK_POS)
marble = K.mat_principled('Marble', (0.32, 0.4, 0.75), metal=0.2, rough=0.28, coat=0.6)
K.assign(K.rounded_box('BankBase', (2.0, 1.0, 0.16), 0.02, parent=BK, loc=(0, 0, -0.62)), marble)
K.assign(K.rounded_box('BankBase2', (1.8, 0.85, 0.1), 0.02, parent=BK, loc=(0, 0, -0.5)), marble)
for x in (-0.66, -0.22, 0.22, 0.66): K.assign(K.cylinder('Col', 0.085, 0.86, parent=BK, loc=(x, 0, -0.02), verts=32), marble)
K.assign(K.rounded_box('BankBeam', (1.9, 0.9, 0.1), 0.02, parent=BK, loc=(0, 0, 0.46)), marble)
rm = bpy.data.meshes.new('Roof'); bm = bmesh.new()
tri = [(-1.0, 0.0), (1.0, 0.0), (0.0, 0.42)]
vf = [bm.verts.new((x, -0.45, z)) for x, z in tri]; vb = [bm.verts.new((x, 0.45, z)) for x, z in tri]
bm.faces.new(vf); bm.faces.new(vb[::-1])
for i in range(3): bm.faces.new((vf[i], vb[i], vb[(i + 1) % 3], vf[(i + 1) % 3]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(rm); bm.free()
roof = K.link(bpy.data.objects.new('Roof', rm), BK); roof.location = (0, 0, 0.51)
K.assign(roof, marble)
bank_glow = K.mat_emit('BankGlow', CYAN, 0.0)
K.assign(K.rounded_box('BankTrim', (2.02, 0.02, 0.02), 0.009, parent=BK, loc=(0, -0.51, -0.54)), bank_glow)
K.assign(K.rounded_box('BankTrim2', (1.92, 0.02, 0.02), 0.009, parent=BK, loc=(0, -0.46, 0.41)), bank_glow)
sign = K.text3d('BankSign', 'BANK', FONT_U, size=0.16, extrude=0.01, parent=BK, loc=(0, -0.47, 0.46), rot=(math.radians(90), 0, 0))
K.assign(sign, bank_glow)
bank_light = K.point_light('BankLight', BANK_POS + Vector((0, -1.2, 0)), 0.0, CYAN, radius=0.5)

# ------------------------------------------------------------------ teksty 3D (numer karty -> token)
TXT = K.empty('Texts')
num = K.text3d('CardNumber', '5412 7534 0099 4821', FONT_B, size=0.085, extrude=0.008, parent=TXT, rot=(math.radians(80), 0, 0))
num_mat = K.mat_principled('NumMat', (0.9, 0.92, 1), rough=0.3, emission=(1, 1, 1), estr=1.5)
K.assign(num, num_mat)
strike = K.rounded_box('Strike', (1.05, 0.015, 0.015), 0.009, parent=TXT, loc=(0, 0, 0)); strike.rotation_euler = (math.radians(80), 0, 0)
strike_mat = K.mat_emit('Strike', RED, 6); K.assign(strike, strike_mat)
tok = K.text3d('Token', 'TOKEN  7F3A 91C2', FONT_U, size=0.085, extrude=0.008, parent=TXT, rot=(math.radians(80), 0, 0))
tok_mat = K.mat_principled('TokMat', (0.6, 0.95, 1), rough=0.3, emission=CYAN, estr=3.0); K.assign(tok, tok_mat)
code = K.text3d('Code', 'KOD JEDNORAZOWY', FONT_B, size=0.06, extrude=0.006, parent=TXT, rot=(math.radians(80), 0, 0))
code_mat = K.mat_principled('CodeMat', (1, 0.8, 0.6), rough=0.3, emission=ORANGE, estr=3.0); K.assign(code, code_mat)

# ------------------------------------------------------------------ światła
K.area_light('Key', (-2.8, -3.6, 4.6), 3.5, 900, (0.95, 0.97, 1.0), target=(0, -0.3, 0.4))
K.area_light('RimCyan', (3.6, 1.8, 2.0), 1.2, 600, (0.3, 0.8, 1.0), target=(0, -0.3, 0.5), size_y=4)
K.area_light('RimMagenta', (-3.6, 2.2, 2.2), 1.2, 650, (1.0, 0.3, 0.75), target=(0, -0.3, 0.5), size_y=4)
K.area_light('Top', (0, 0, 6), 5, 300, (0.85, 0.9, 1.0), target=(0, 0, 0))
pad_light = K.point_light('PadLight', (0, -0.5, TOP + 0.25), 0.0, CYAN, radius=0.2)

cam, cam_tgt = K.make_camera(fstop=2.2)


# ------------------------------------------------------------------ stan sceny jako funkcja czasu
def phone_pose(t):
    keys = [
        (0.0, [1.9, -2.6, 2.7, 0.7, -0.5, 1.0]),
        (1.7, [0.08, -0.55, 0.86, -0.1, 0.05, 0.3]),
        (T_PIK, [0.0, -0.5, 0.74, -0.12, 0.04, 0.22]),
        (T_PIK + 2.2, [0.0, -0.48, 0.78, -0.12, 0.04, 0.2]),
        (B[0][1] - 0.6, [0.6, -1.0, 2.4, 0.5, 0.1, 0.7]),
        (B[1][0] + 0.3, [2.6, -0.4, 4.2, 0.6, 0.2, 0.9]),
        (B[2][0], [2.6, -0.4, 4.2, 0.6, 0.2, 0.9]),
        (B[2][0] + 0.9, [0.5, -0.7, 2.5, 0.0, 0.0, 0.5]),
        (T_KILKA + 0.2, [0.04, -0.52, 0.8, -0.1, 0.04, 0.25]),
        (B[2][1], [0.0, -0.5, 0.79, -0.1, 0.03, 0.22]),
        (B[5][1], [0.0, -0.5, 0.8, -0.1, 0.03, 0.2]),
        (B[6][0] + 1.4, [0.0, -0.5, 1.05, -0.32, 0.0, 0.7]),
        (DUR, [0.0, -0.5, 1.15, -0.36, 0.0, 1.3]),
    ]
    v = spline(keys, t)
    bob = math.sin(t * 2.1) * 0.012
    return Vector((v[0], v[1], v[2] + bob)), Euler((v[3] + math.sin(t * 1.3) * 0.015, v[4], v[5]))


def state(t):
    s = {}
    s['term_ok'] = max(smooth(seg(t, T_PIK, T_PIK + 0.15)) * (1 - smooth(seg(t, B[0][1] - 1.2, B[0][1] - 0.9))),
                       smooth(seg(t, T_ZGODA - 0.1, T_ZGODA + 0.1)))
    s['phone_ok'] = s['term_ok']
    # pole: aktywne od pierwszej klatki (hook), mocne od "cewka"
    f = 0.55 + 0.45 * smooth(seg(t, T_COIL_T, T_POLE))
    s['field'] = f
    s['dim'] = 1 - 0.65 * smooth(seg(t, B[3][0], B[3][0] + 0.6)) * (1 - smooth(seg(t, B[5][0] - 0.4, B[5][0])))
    s['speed'] = lerp(0.55, 1.6, smooth(seg(t, T_13 - 0.3, T_13 + 0.6))) * (1 - 0.5 * smooth(seg(t, B[2][0], B[2][0] + 1)))
    s['reach'] = lerp(1.0, 0.55, smooth(seg(t, B[2][0], B[2][0] + 0.8)) * (1 - smooth(seg(t, B[3][0], B[3][0] + 1))))
    s['reveal'] = smooth(seg(t, T_COIL_T - 0.4, T_COIL_T + 0.5)) * (1 - smooth(seg(t, B[2][0] - 0.6, B[2][0])))
    s['tcoil'] = smooth(seg(t, T_COIL_T - 0.2, T_COIL_T + 0.6)) * (0.6 + 0.4 * math.sin(t * 9) ** 2)
    s['explode'] = smooth(seg(t, T_COIL_P - 0.3, T_COIL_P + 0.6)) * (1 - smooth(seg(t, B[4][0] - 0.5, B[4][0] + 0.2)))
    s['pcoil'] = max(smooth(seg(t, T_POLE_P - 0.2, T_POLE_P + 0.4)) * (1 - smooth(seg(t, B[4][0] - 0.3, B[4][0] + 0.3))),
                     smooth(seg(t, T_KILKA - 0.1, T_KILKA + 0.2)) * (1 - smooth(seg(t, T_KILKA + 0.6, T_KILKA + 1.4))),
                     0.8 * smooth(seg(t, T_PIK - 0.3, T_PIK)) * (1 - smooth(seg(t, T_PIK + 0.4, T_PIK + 1.2))))
    s['vcard'] = smooth(seg(t, T_UDAWAC - 0.2, T_UDAWAC + 0.6)) * (1 - smooth(seg(t, B[4][0] - 0.5, B[4][0])))
    s['num'] = smooth(seg(t, T_NUMER - 0.6, T_NUMER - 0.1)) * (1 - smooth(seg(t, T_TOKEN - 0.9, T_TOKEN - 0.4)))
    s['strike'] = smooth(seg(t, T_NUMER + 0.7, T_NUMER + 1.1)) * (1 - smooth(seg(t, T_TOKEN - 0.9, T_TOKEN - 0.4)))
    s['token'] = ease_out(seg(t, T_TOKEN - 0.25, T_TOKEN + 0.35)) * (1 - smooth(seg(t, B[4][1] - 0.5, B[4][1])))
    s['code'] = ease_out(seg(t, T_KOD - 0.15, T_KOD + 0.35)) * (1 - smooth(seg(t, B[4][1] - 0.5, B[4][1])))
    s['up'] = seg(t, T_BANK - 0.4, T_BANK + 1.0)          # pakiety terminal -> bank
    s['send'] = seg(t, T_KOD + 0.5, B[4][1] - 0.2)         # pakiety telefon -> terminal
    s['down'] = seg(t, T_ZGODA - 1.1, T_ZGODA - 0.05)       # zgoda bank -> terminal
    s['bank'] = smooth(seg(t, T_BANK + 0.6, T_BANK + 1.2)) * (1 - 0.6 * smooth(seg(t, T_ZGODA + 0.5, T_ZGODA + 2)))
    s['success'] = smooth(seg(t, T_ZGODA - 0.05, T_ZGODA + 0.3))
    s['shock'] = seg(t, T_ZGODA, T_ZGODA + 1.3)
    s['pik_shock'] = seg(t, T_PIK, T_PIK + 1.0)
    return s


PAD_V = Vector((0, -0.5, TOP + 0.02))


def gap_point(t):
    p, _ = phone_pose(t); return (p + PAD_V) / 2


# ------------------------------------------------------------------ montaż (max 3 s na ujęcie)
P = lambda t: phone_pose(t)[0]
TXT_POS = lambda t: phone_pose(t)[0] + Vector((0, -0.15, 0.62))
fix = lambda v: (lambda t: Vector(v))
PLAN = [
    [dict(target=P, az=(-62, -28), el=(40, 26), dist=(4.6, 3.0), lens=(28, 34)),
     dict(target=fix((0, -0.3, 0.5)), az=(35, 75), el=(38, 24), dist=(3.4, 2.7), lens=(30, 34)),
     dict(target=lambda t: P(t) * 0.6 + Vector((0, 0, 0.2)), az=(205, 150), el=(10, 26), dist=(4.0, 5.2), lens=(28, 28))],
    [dict(target=fix((0, -0.5, 0.35)), az=(-25, 15), el=(78, 58), dist=(3.0, 2.0), lens=(30, 34)),
     dict(target=fix((0.05, -0.5, 0.38)), az=(115, 65), el=(16, 24), dist=(2.1, 1.6), lens=(42, 50)),
     dict(target=fix((0, -0.5, 1.0)), az=(-150, -95), el=(6, 24), dist=(5.0, 4.0), lens=(26, 28))],
    [dict(target=P, az=(70, 40), el=(34, 22), dist=(4.4, 3.4), lens=(28, 30)),
     dict(target=gap_point, az=(-92, -80), el=(3, 6), dist=(3.0, 2.3), lens=(32, 36)),
     dict(target=fix((0, -0.4, 0.6)), az=(25, -25), el=(42, 26), dist=(4.6, 3.8), lens=(28, 28))],
    [dict(target=lambda t: P(t) + Vector((0, 0, -0.3)), az=(-38, 0), el=(5, 11), dist=(3.2, 2.4), lens=(30, 34)),
     dict(target=lambda t: P(t) + Vector((0, 0.05, -0.35)), az=(140, 100), el=(8, 16), dist=(2.0, 1.6), lens=(40, 46)),
     dict(target=lambda t: P(t) + Vector((0, 0, 0.35)), az=(-12, 30), el=(36, 22), dist=(3.2, 2.6), lens=(30, 32))],
    [dict(target=TXT_POS, az=(-14, 8), el=(9, 13), dist=(3.6, 3.0), lens=(28, 30)),
     dict(target=TXT_POS, az=(24, -6), el=(16, 7), dist=(3.2, 2.7), lens=(30, 32)),
     dict(target=TXT_POS, az=(-36, -8), el=(10, 18), dist=(3.4, 2.8), lens=(28, 30)),
     dict(target=gap_point, az=(60, 110), el=(6, 14), dist=(3.0, 2.2), lens=(30, 34))],
    [dict(target=lambda t: Vector((0, 0.9, 1.6)).lerp(BANK_POS + Vector((0, 0, -0.5)), smooth(clamp((t - T_BANK + 1.2) / 1.8))), az=(-30, -10), el=(10, 16), dist=(8.5, 6.0), lens=(28, 30)),
     dict(target=fix((0, -0.4, 0.5)), az=(40, 80), el=(32, 20), dist=(3.6, 2.8), lens=(28, 32))],
    [dict(target=P, az=(-62, -22), el=(38, 48), dist=(3.6, 3.0), lens=(30, 34)),
     dict(target=fix((0, -0.2, 0.6)), az=(150, 210), el=(16, 24), dist=(4.8, 4.2), lens=(28, 28)),
     dict(target=fix((0, -0.2, 0.7)), az=(10, 45), el=(25, 42), dist=(4.2, 7.2), lens=(28, 26))],
]
SHOTS = K.plan_shots(BEATS, PLAN, max_len=3.0)

# ------------------------------------------------------------------ zapis animacji
frames = list(range(sc.frame_start, sc.frame_end + 1))
bk = K.Baker(frames)
for fr in frames:
    t = (fr - 1) / K.FPS
    s = state(t)
    pos, rot = phone_pose(t)
    bk.loc(PH, pos); bk.rot(PH, rot)
    # ekrany
    bk.node_input(ph_scr_mat, 'ScreenMix', 'Factor', s['phone_ok'])
    bk.node_input(term_scr_mat, 'ScreenMix', 'Factor', s['term_ok'])
    # terminal: odsłonięcie cewki, kolor pierścienia
    bk.node_input(pad_mat, 'Principled BSDF', 'Alpha', lerp(1.0, 0.1, s['reveal']))
    bk.node_input(tcoil_mat, 'Principled BSDF', 'Emission Strength', 4.0 * s['tcoil'])
    rc = mixc(mixc(ORANGE, CYAN, smooth(seg(t, 0.0, 0.3)) * (s['field'] > 0)), GREEN, max(s['success'], s['term_ok']))
    for i in range(3): bk.node_input(ring_mat, 'Emission', 'Color', rc[i], index=i)
    bk.node_input(ring_mat, 'Emission', 'Strength', 5 + 4 * s['field'])
    for i in range(3): bk.node_input(strip_mat, 'Emission', 'Color', rc[i], index=i)
    bk.prop(pad_light.data, 'energy', 40 * s['field'] + 60 * s['success'])
    for i in range(3): bk.prop(pad_light.data, 'color', rc[i], index=i)
    # pole: pierścienie unoszą się z płytki
    for k, (r, m) in enumerate(RINGS):
        x = ((t * s['speed'] + k / len(RINGS)) % 1.0)
        bk.loc(r, (0, -0.5, TOP + 0.03 + x * 0.85 * s['reach']))
        sc_r = 0.47 + x * 0.32 * s['reach']
        bk.scale(r, (sc_r, sc_r, 1))
        env = math.sin(math.pi * x) ** 1.5
        fc = mixc(CYAN, GREEN, s['success'])
        for i in range(3): bk.node_input(m, 'Emission', 'Color', fc[i], index=i)
        bk.node_input(m, 'Emission', 'Strength', 6 * env * s['field'] * s['dim'] * (1 - 0.4 * s['success']))
    # fale "pik" i "zgoda"
    sh = max(s['shock'], 0)
    e_sh = 0
    if 0 < s['pik_shock'] < 1: sh, e_sh = s['pik_shock'], 1
    elif 0 < s['shock'] < 1: e_sh = 1
    rr = 0.5 + ease_out(sh) * 1.8
    bk.scale(shock, (rr, rr, 1) if e_sh else (0.001, 0.001, 0.001))
    bk.node_input(shock_mat, 'Emission', 'Strength', 14 * (1 - sh) ** 2 * e_sh)
    # telefon: rozbity widok, antena, chip, karta wirtualna
    bk.loc(PCOIL, (0, 0.05, -0.03 - 0.42 * ease_io(s['explode'])))
    bk.node_input(pcoil_mat, 'Principled BSDF', 'Emission Strength', 6 * s['pcoil'])
    bk.node_input(chip_mat, 'Principled BSDF', 'Emission Strength', 4 * s['pcoil'] * s['explode'] + 3 * s['send'] * (s['send'] < 1))
    bk.prop(ph_light.data, 'energy', 25 * s['pcoil'])
    bk.loc(vcard, (0, 0.0, 0.06 + 0.55 * ease_out(s['vcard'])))
    bk.scale(vcard, max(0.001, ease_out(s['vcard'])))
    bk.rot(vcard, (math.radians(-10) * s['vcard'], 0, math.sin(t * 2) * 0.08 * s['vcard']))
    bk.node_input(vmat, 'AlphaMul', 1, s['vcard'])
    # teksty
    bk.loc(TXT, TXT_POS(t))
    bk.loc(num, (0, 0, 0.1)); bk.scale(num, max(0.001, ease_out(s['num'])))
    for i, c in enumerate(mixc((1, 1, 1), RED, s['strike'])): bk.node_input(num_mat, 'Principled BSDF', 'Emission Color', c, index=i)
    bk.loc(strike, (0, -0.02, 0.125)); st = ease_out(s['strike']); bk.scale(strike, (max(0.001, st), max(0.001, min(1, st * 20)), max(0.001, min(1, st * 20))))
    bk.loc(tok, (0, 0, 0.1 - 0.05 * (1 - s['token']))); bk.scale(tok, max(0.001, s['token']))
    bk.loc(code, (0, 0, -0.03)); bk.scale(code, max(0.001, s['code']))
    # pakiety: telefon -> terminal, terminal -> bank, bank -> terminal
    for k, (p, m) in enumerate(PKTS):
        ph = k / len(PKTS)
        if 0 < s['send'] < 1:
            u = clamp((s['send'] * 2.2 - ph) % 1.0)
            a, b, col, size = pos + Vector((0, 0.05, -0.08)), PAD_V, CYAN, 0.035
        elif 0 < s['up'] < 1:
            u = clamp(s['up'] * 1.6 - ph * 0.6)
            a, b, col, size = PAD_V + Vector((0, 0, 0.1)), BANK_POS + Vector((0, -0.6, -0.3)), CYAN, 0.05
        elif 0 < s['down'] < 1:
            u = clamp(s['down'] * 1.6 - ph * 0.6)
            a, b, col, size = BANK_POS + Vector((0, -0.6, -0.3)), PAD_V + Vector((0, 0, 0.1)), GREEN, 0.05
        else:
            u, a, b, col, size = 0, PAD_V, PAD_V, CYAN, 0.0
        v = a.lerp(b, u) + Vector((0, 0, math.sin(math.pi * u) * 0.25))
        bk.loc(p, v)
        on = math.sin(math.pi * u) ** 0.4 if 0 < u < 1 else 0
        bk.scale(p, (max(0.001, size * on), max(0.001, size * on), max(0.001, size * on * 2.2)))
        for i in range(3): bk.node_input(m, 'Emission', 'Color', col[i], index=i)
        bk.node_input(m, 'Emission', 'Strength', 18 * on)
    # bank
    bk.node_input(bank_glow, 'Emission', 'Strength', 2 + 10 * s['bank'])
    for i, c in enumerate(mixc(CYAN, GREEN, smooth(seg(t, T_ZGODA - 1.2, T_ZGODA - 0.8)))): bk.node_input(bank_glow, 'Emission', 'Color', c, index=i)
    bk.prop(bank_light.data, 'energy', 300 * s['bank'])
    # kamera
    shot = K.shot_at(SHOTS, t)
    cpos, ctg, lens, roll = K.camera_pose(shot, t)
    bk.loc(cam, cpos); bk.loc(cam_tgt, ctg)
    bk.prop(cam.data, 'lens', lens)

bk.bake(constant_frames=K.last_frames_of_shots(SHOTS))
cuts = [s.t0 for s in SHOTS[1:]]
json.dump({'cuts': cuts, 'events': {'pik': T_PIK, 'kilka': T_KILKA, 'coil': T_COIL_P, 'token': T_TOKEN, 'bank': T_BANK, 'zgoda': T_ZGODA}},
          open(os.path.join(HERE, 'edit.json'), 'w'))
print('SHOTS', len(SHOTS), 'max', max(s.t1 - s.t0 for s in SHOTS))

if MODE == 'test':
    fr = [int(x) for x in (args[1].split(',') if len(args) > 1 else ['30', '300', '600', '900', '1200', '1500'])]
    K.render_frames(fr, os.path.join(HERE, 'check'))
elif MODE == 'full':
    K.render_animation(os.path.join(HERE, 'frames'))
elif MODE == 'save':
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'scene.blend'))
print('ALL_DONE', flush=True)
