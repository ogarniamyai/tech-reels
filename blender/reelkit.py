"""reelkit: wspólne narzędzia do pionowych rolek 3D w Blenderze (EEVEE/Cycles).

Idea: scena jest budowana raz, a cała animacja (obiekty, materiały, kamera) jest liczona w Pythonie
jako funkcja czasu t i zapisywana jako klatki kluczowe. Dzięki temu Blender renderuje całość jednym
wywołaniem (szybko, z rozmyciem ruchu), a kamera ma twarde cięcia między ujęciami bez smug.
"""
import math, os
import bpy
import bmesh
from mathutils import Vector, Euler

FPS = 30


def lerp(a, b, t): return a + (b - a) * t
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def seg(t, a, b): return clamp((t - a) / (b - a)) if b != a else float(t >= b)
def smooth(x): x = clamp(x); return x * x * (3 - 2 * x)
def ease_out(x): x = clamp(x); return 1 - (1 - x) ** 3
def ease_io(x): x = clamp(x); return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def rand(i): x = math.sin(i * 127.1 + 311.7) * 43758.5453; return x - math.floor(x)


# ---------------------------------------------------------------- scena i render
def setup(duration, engine='eevee', samples=48, res=(1080, 1920), motion_blur=True):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start = 1
    sc.frame_end = int(round(duration * FPS))
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = int(os.environ.get('SCALE', '100'))
    if engine == 'eevee':
        sc.render.engine = 'BLENDER_EEVEE'
        ev = sc.eevee
        ev.taa_render_samples = samples
        for k, v in dict(use_raytracing=True, ray_tracing_method='SCREEN', use_shadows=True, shadow_ray_count=2,
                         shadow_step_count=6, fast_gi_ray_count=4, use_fast_gi=True, motion_blur_steps=1).items():
            try: setattr(ev, k, v)
            except Exception: pass
        try: ev.ray_tracing_options.resolution_scale = '1'
        except Exception: pass
    else:
        sc.render.engine = 'CYCLES'
        sc.cycles.samples = samples
        sc.cycles.use_denoising = True
        gpu_setup(sc)
    sc.render.use_motion_blur = motion_blur
    try:
        sc.render.motion_blur_shutter = 0.5
        sc.render.motion_blur_position = 'START'  # rozmycie "do przodu": brak smug przez cięcia
    except Exception: pass
    sc.view_settings.view_transform = 'AgX'
    for look in ('AgX - Punchy', 'Punchy', 'AgX - Medium High Contrast'):
        try: sc.view_settings.look = look; break
        except TypeError: pass
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_depth = '8'
    sc.render.image_settings.compression = 15
    return sc


def gpu_setup(sc):
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for backend in ('OPTIX', 'CUDA', 'METAL', 'HIP', 'ONEAPI'):
            try: prefs.compute_device_type = backend
            except TypeError: continue
            prefs.get_devices()
            if any(d.type == backend for d in prefs.devices):
                for d in prefs.devices: d.use = d.type == backend
                sc.cycles.device = 'GPU'; print('GPU', backend); return
    except Exception as e:
        print('GPU setup failed', e)


def world(hdri=None, strength=0.35, bg=(0.004, 0.005, 0.012)):
    """Oświetlenie z mapy HDRI (odbicia), ale kamera widzi ciemne tło."""
    w = bpy.data.worlds.new('World'); bpy.context.scene.world = w
    nt = w.node_tree; n = nt.nodes; n.clear()
    out = n.new('ShaderNodeOutputWorld')
    mix = n.new('ShaderNodeMixShader')
    lp = n.new('ShaderNodeLightPath')
    env = n.new('ShaderNodeBackground'); env.inputs['Strength'].default_value = strength
    dark = n.new('ShaderNodeBackground'); dark.inputs['Color'].default_value = (*bg, 1)
    if hdri and os.path.exists(hdri):
        tex = n.new('ShaderNodeTexEnvironment'); tex.image = bpy.data.images.load(hdri)
        nt.links.new(tex.outputs['Color'], env.inputs['Color'])
    else:
        env.inputs['Color'].default_value = (0.5, 0.55, 0.65, 1)
    nt.links.new(lp.outputs['Is Camera Ray'], mix.inputs[0])
    nt.links.new(env.outputs[0], mix.inputs[1]); nt.links.new(dark.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])


def compositor(bloom=0.5, threshold=1.0, saturation=1.12):
    sc = bpy.context.scene
    ng = bpy.data.node_groups.new('Comp', 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    sc.compositing_node_group = ng
    rl = ng.nodes.new('CompositorNodeRLayers')
    gl = ng.nodes.new('CompositorNodeGlare')
    gl.inputs['Type'].default_value = 'Bloom'
    gl.inputs['Quality'].default_value = 'High'
    gl.inputs['Threshold'].default_value = threshold
    gl.inputs['Strength'].default_value = bloom
    gl.inputs['Size'].default_value = 0.55
    hs = ng.nodes.new('CompositorNodeHueSat')
    out = ng.nodes.new('NodeGroupOutput')
    ng.links.new(rl.outputs['Image'], gl.inputs['Image'])
    last = gl.outputs['Image']
    try:
        hs.inputs['Saturation'].default_value = saturation
        ng.links.new(last, hs.inputs['Image']); last = hs.outputs['Image']
    except Exception: pass
    ng.links.new(last, out.inputs[0])
    sc.render.use_compositing = True


# ---------------------------------------------------------------- materiały
def mat_principled(name, color, metal=0.0, rough=0.4, coat=0.0, coat_rough=0.05, emission=None, estr=0.0,
                   alpha=1.0, transmission=0.0, ior=1.45, spec=0.5):
    m = bpy.data.materials.new(name)
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = coat_rough
    p.inputs['Specular IOR Level'].default_value = spec
    p.inputs['IOR'].default_value = ior
    p.inputs['Transmission Weight'].default_value = transmission
    if emission:
        p.inputs['Emission Color'].default_value = (*emission, 1)
        p.inputs['Emission Strength'].default_value = estr
    p.inputs['Alpha'].default_value = alpha
    if alpha < 1 or transmission > 0:
        m.surface_render_method = 'BLENDED'
    return m


def mat_emit(name, color, strength=5.0, alpha=1.0):
    """Czysta emisja (neon). Alpha < 1 -> przezroczysta, addytywna w praktyce."""
    m = bpy.data.materials.new(name)
    nt = m.node_tree; n = nt.nodes; n.clear()
    e = n.new('ShaderNodeEmission'); e.name = 'Emission'
    e.inputs['Color'].default_value = (*color, 1); e.inputs['Strength'].default_value = strength
    tr = n.new('ShaderNodeBsdfTransparent')
    mix = n.new('ShaderNodeMixShader'); mix.name = 'Mix'
    mix.inputs[0].default_value = alpha
    o = n.new('ShaderNodeOutputMaterial')
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(e.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], o.inputs[0])
    m.surface_render_method = 'BLENDED'
    return m


def mat_screen(name, img_a, img_b=None, strength=1.6):
    """Ekran: tekstura A, opcjonalnie płynne przejście do B (wejście 'Fac' węzła Mix)."""
    m = bpy.data.materials.new(name)
    nt = m.node_tree; n = nt.nodes
    p = n['Principled BSDF']
    p.inputs['Base Color'].default_value = (0.0, 0.0, 0.0, 1)
    p.inputs['Roughness'].default_value = 0.22
    p.inputs['Specular IOR Level'].default_value = 0.2
    p.inputs['Coat Weight'].default_value = 0.15
    p.inputs['Coat Roughness'].default_value = 0.12
    ta = n.new('ShaderNodeTexImage'); ta.image = bpy.data.images.load(img_a); ta.interpolation = 'Cubic'
    src = ta.outputs['Color']
    if img_b:
        tb = n.new('ShaderNodeTexImage'); tb.image = bpy.data.images.load(img_b); tb.interpolation = 'Cubic'
        mx = n.new('ShaderNodeMix'); mx.name = 'ScreenMix'; mx.data_type = 'RGBA'
        mx.inputs['Factor'].default_value = 0.0
        nt.links.new(ta.outputs['Color'], mx.inputs[6]); nt.links.new(tb.outputs['Color'], mx.inputs[7])
        src = mx.outputs[2]
    nt.links.new(src, p.inputs['Emission Color'])
    p.inputs['Emission Strength'].default_value = strength
    return m


def assign(obj, mat):
    obj.data.materials.clear(); obj.data.materials.append(mat); return obj


# ---------------------------------------------------------------- geometria
def link(obj, parent=None):
    bpy.context.scene.collection.objects.link(obj)
    if parent is not None: obj.parent = parent
    return obj


def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None); e.location = loc; return link(e, parent)


def smooth_shade(obj):
    for p in obj.data.polygons: p.use_smooth = True
    return obj


def rounded_box(name, size, radius, segments=6, parent=None, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me), parent); ob.location = loc
    mod = ob.modifiers.new('Bevel', 'BEVEL'); mod.width = radius; mod.segments = segments; mod.limit_method = 'NONE'
    mod.harden_normals = False
    return smooth_shade(ob)


def rounded_rect_slab(name, w, l, t, r, bevel=0.02, parent=None, seg=12):
    """Płyta o zaokrąglonych rogach (obrys w XY), grubość t w Z, środek w (0,0,0)."""
    pts = []
    for cx, cy, a0 in ((w / 2 - r, l / 2 - r, 0), (-w / 2 + r, l / 2 - r, 90), (-w / 2 + r, -l / 2 + r, 180), (w / 2 - r, -l / 2 + r, 270)):
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vb = [bm.verts.new((x, y, -t / 2)) for x, y in pts]; vt = [bm.verts.new((x, y, t / 2)) for x, y in pts]
    bm.faces.new(vb[::-1]); bm.faces.new(vt)
    n = len(pts)
    for i in range(n): bm.faces.new((vb[i], vb[(i + 1) % n], vt[(i + 1) % n], vt[i]))
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me), parent)
    if bevel > 0:
        mod = ob.modifiers.new('Bevel', 'BEVEL'); mod.width = bevel; mod.segments = 6; mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(40)
    return smooth_shade(ob)


def plane_uv(name, w, h, parent=None, loc=(0, 0, 0), radius=0.0):
    """Prostokąt (opcjonalnie zaokrąglony) w płaszczyźnie XY z UV 0..1."""
    if radius > 0:
        ob = rounded_rect_slab(name, w, h, 0.0, radius, bevel=0, parent=parent)
        me = ob.data; bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        bm.to_mesh(me); bm.free()
        uv = me.uv_layers.new()
        for poly in me.polygons:
            for li in poly.loop_indices:
                v = me.vertices[me.loops[li].vertex_index].co
                uv.data[li].uv = ((v.x + w / 2) / w, (v.y + h / 2) / h)
    else:
        me = bpy.data.meshes.new(name)
        me.from_pydata([(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)], [], [(0, 1, 2, 3)])
        uv = me.uv_layers.new()
        for li, c in zip(range(4), ((0, 0), (1, 0), (1, 1), (0, 1))): uv.data[li].uv = c
        ob = link(bpy.data.objects.new(name, me), parent)
    ob.location = loc
    return ob


def tube_path(name, pts, radius, parent=None, res=8):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = res // 2
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts): p.co = (*c, 1)
    return link(bpy.data.objects.new(name, cu), parent)


def torus(name, R, r, parent=None, loc=(0, 0, 0), maj=96, mi=16):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=maj, minor_segments=mi, location=loc)
    ob = bpy.context.object; ob.name = name
    if parent: ob.parent = parent
    return smooth_shade(ob)


def cylinder(name, r, depth, parent=None, loc=(0, 0, 0), verts=64, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=verts, location=loc)
    ob = bpy.context.object; ob.name = name
    if parent: ob.parent = parent
    if bevel:
        mod = ob.modifiers.new('Bevel', 'BEVEL'); mod.width = bevel; mod.segments = 4; mod.limit_method = 'ANGLE'
    return smooth_shade(ob)


def text3d(name, body, font_path, size=0.2, extrude=0.01, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body
    cu.font = bpy.data.fonts.load(font_path); cu.size = size; cu.extrude = extrude
    cu.bevel_depth = extrude * 0.3; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    ob = link(bpy.data.objects.new(name, cu), parent); ob.location = loc; ob.rotation_euler = rot
    return ob


def area_light(name, loc, size, energy, color=(1, 1, 1), target=(0, 0, 0), size_y=None):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.color = color
    if size_y: ld.shape = 'RECTANGLE'; ld.size = size; ld.size_y = size_y
    else: ld.size = size
    ob = link(bpy.data.objects.new(name, ld)); ob.location = loc
    d = Vector(target) - Vector(loc); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob


def point_light(name, loc, energy, color, radius=0.1, parent=None):
    ld = bpy.data.lights.new(name, 'POINT'); ld.energy = energy; ld.color = color; ld.shadow_soft_size = radius
    ob = link(bpy.data.objects.new(name, ld), parent); ob.location = loc
    return ob


# ---------------------------------------------------------------- animacja przez klatki kluczowe
class Baker:
    """Zbiera wartości per klatka i zapisuje je hurtowo jako krzywe F (szybko, bez keyframe_insert)."""

    def __init__(self, frames):
        self.frames = frames
        self.tracks = {}  # (id_data, path, index) -> list values

    def set(self, idb, path, index, value):
        self.tracks.setdefault((idb, path, index), []).append(value)

    def loc(self, ob, v):
        for i in range(3): self.set(ob, 'location', i, v[i])

    def rot(self, ob, v):
        for i in range(3): self.set(ob, 'rotation_euler', i, v[i])

    def scale(self, ob, v):
        if not hasattr(v, '__len__'): v = (v, v, v)
        for i in range(3): self.set(ob, 'scale', i, v[i])

    def node_input(self, mat_or_tree, node, inp, value, index=-1):
        tree = mat_or_tree.node_tree if hasattr(mat_or_tree, 'node_tree') and mat_or_tree.node_tree else mat_or_tree
        if isinstance(inp, str): ii = [i for i, s in enumerate(tree.nodes[node].inputs) if s.name == inp][0]
        else: ii = inp
        self.set(tree, f'nodes["{node}"].inputs[{ii}].default_value', index, value)

    def prop(self, idb, path, value, index=-1):
        self.set(idb, path, index, value)

    def bake(self, constant_frames=()):
        cf = set(constant_frames)
        for (idb, path, index), vals in self.tracks.items():
            if idb.animation_data is None: idb.animation_data_create()
            act = idb.animation_data.action
            if act is None:
                act = bpy.data.actions.new(f'{idb.name}_act'); idb.animation_data.action = act
            fc = act.fcurve_ensure_for_datablock(idb, path, index=max(index, 0))
            n = len(vals)
            fc.keyframe_points.add(n)
            co = []
            for f, v in zip(self.frames, vals): co += [f, float(v)]
            fc.keyframe_points.foreach_set('co', co)
            for k in fc.keyframe_points:
                k.interpolation = 'CONSTANT' if int(k.co[0]) in cf else 'LINEAR'
            fc.update()


# ---------------------------------------------------------------- kamera i montaż
class Shot:
    def __init__(self, t0, t1, target, az, el, dist, lens=(35, 35), roll=(0, 0)):
        self.t0, self.t1, self.target, self.az, self.el, self.dist, self.lens, self.roll = t0, t1, target, az, el, dist, lens, roll


def plan_shots(beats, plan, max_len=3.0):
    """beats: [(start,end)], plan: lista list definicji ujęć dla każdego beatu.
    Każdy beat jest dzielony na równe ujęcia nie dłuższe niż max_len."""
    shots = []
    for (t0, t1), defs in zip(beats, plan):
        n = max(len(defs), math.ceil((t1 - t0) / max_len - 1e-6))
        for k in range(n):
            d = defs[k % len(defs)]
            shots.append(Shot(t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n, **d))
    return shots


def shot_at(shots, t):
    for s in shots:
        if s.t0 <= t < s.t1: return s
    return shots[-1]


def move(u):
    # szybki start i ciągły ruch aż do cięcia
    return 0.5 * u + 0.5 * (1 - (1 - u) ** 2.4)


def camera_pose(s, t):
    u = move(clamp((t - s.t0) / (s.t1 - s.t0)))
    tg = Vector(s.target(t))
    az = math.radians(lerp(*s.az, u)); el = math.radians(lerp(*s.el, u)); d = lerp(*s.dist, u)
    pos = tg + Vector((math.sin(az) * math.cos(el) * d, -math.cos(az) * math.cos(el) * d, math.sin(el) * d))
    pos.z = max(0.06, pos.z)
    return pos, tg, lerp(*s.lens, u), math.radians(lerp(*s.roll, u))


def make_camera(fstop=2.0):
    cd = bpy.data.cameras.new('Cam'); cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24
    cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop; cd.dof.aperture_blades = 7
    cam = link(bpy.data.objects.new('Cam', cd))
    tgt = empty('CamTarget')
    c = cam.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    cd.dof.focus_object = tgt
    bpy.context.scene.camera = cam
    return cam, tgt


def last_frames_of_shots(shots):
    return [int(round(s.t1 * FPS)) for s in shots[:-1]]


# ---------------------------------------------------------------- render
def render_frames(frames, outdir):
    sc = bpy.context.scene
    os.makedirs(outdir, exist_ok=True)
    import time
    t0 = time.time()
    for i, f in enumerate(frames):
        sc.frame_set(f)
        sc.render.filepath = os.path.join(outdir, f'f{f:04d}.png')
        bpy.ops.render.render(write_still=True)
        print(f'FRAME_DONE {i + 1}/{len(frames)} f={f} {time.time() - t0:.1f}s', flush=True)


def render_animation(outdir):
    sc = bpy.context.scene
    os.makedirs(outdir, exist_ok=True)
    sc.render.filepath = os.path.join(outdir, 'f')
    import time
    t0 = [time.time()]

    def post(scene, *a):
        print(f'FRAME_DONE {scene.frame_current}/{scene.frame_end} {time.time() - t0[0]:.1f}s', flush=True)
    bpy.app.handlers.render_post.append(post)
    bpy.ops.render.render(animation=True)


def spline(keys, t):
    """Gładka interpolacja (Hermite) listy kluczy [(t, [v...]), ...] z ciągłą prędkością."""
    n = len(keys)
    if t <= keys[0][0]: return list(keys[0][1])
    if t >= keys[-1][0]: return list(keys[-1][1])
    i = 0
    while i < n - 2 and t > keys[i + 1][0]: i += 1
    (ta, va), (tb, vb) = keys[i], keys[i + 1]
    dt = max(1e-4, tb - ta); u = (t - ta) / dt

    def tan(j, k):
        if j <= 0 or j >= n - 1: return 0.0
        return (keys[j + 1][1][k] - keys[j - 1][1][k]) / max(1e-4, keys[j + 1][0] - keys[j - 1][0])
    h00 = 2 * u ** 3 - 3 * u ** 2 + 1; h10 = u ** 3 - 2 * u ** 2 + u; h01 = -2 * u ** 3 + 3 * u ** 2; h11 = u ** 3 - u ** 2
    return [h00 * va[k] + h10 * dt * tan(i, k) + h01 * vb[k] + h11 * dt * tan(i + 1, k) for k in range(len(va))]
