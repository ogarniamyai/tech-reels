// Reel engine: deterministic, beat-driven 3D explainer renderer.
// URL: /engine/index.html?ep=episodes/<folder>
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeLib } from './lib.js';

const W = 1080, H = 1920;
const EP = new URLSearchParams(location.search).get('ep');
await Promise.all(['500 30px Mono', '700 30px Mono', 'italic 100px Serif', '700 90px Grot', '500 30px Grot']
  .map(f => document.fonts.load(f, 'Aa0')));
const episode = await (await fetch(`/${EP}/episode.json`)).json();
const timeline = await (await fetch(`/${EP}/timeline.json`)).json();

// ---------- math helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = {
  io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  out: x => 1 - Math.pow(1 - x, 3),
  in: x => x * x * x,
  back: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  bounce: x => { const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x; if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + .75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + .9375; return n1 * (x -= 2.625 / d1) * x + .984375; },
};
function rng(seed = 7) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ---------- renderer & world ----------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0, 0);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.fog = new THREE.Fog(0xEFE7D6, 28, 60);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 300);

const hemi = new THREE.HemisphereLight(0xfff4e2, 0xcbb894, 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.position.set(7, 16, 9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; scene.add(sun);
const fill = new THREE.DirectionalLight(0xdfe9ff, 0.5); fill.position.set(-8, 6, -4); scene.add(fill);

function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  Object.assign(t, opts); return t;
}
const gridTex = canvasTex(256, 256, (g, w, h) => {
  g.strokeStyle = 'rgba(176,156,118,0.55)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  g.strokeStyle = 'rgba(176,156,118,0.22)'; g.lineWidth = 2;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
}, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
gridTex.repeat.set(50, 50);
const ground = new THREE.Group(); scene.add(ground);
const grid = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, depthWrite: false, toneMapped: false }));
grid.rotation.x = -Math.PI / 2; grid.position.y = -0.002; ground.add(grid);
const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ color: 0x5a4527, opacity: 0.22 }));
shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.receiveShadow = true; ground.add(shadowPlane);

// ---------- palette & materials ----------
const PAL = { bg: 0xEFE7D6, paper: 0xF8F3E8, ink: 0x1B2433, teal: 0x138C80, red: 0xE0433A, amber: 0xF2A33A,
  blue: 0x2E5FB5, navy: 0x1c3d73, cream: 0xF7F1E3, muted: 0x6E6656, green: 0x47B36B };
const M = (color, roughness = .5, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const mat = {
  black: M(0x16181c, .45), plastic: M(0x22252b, .55), silver: M(0xd5d8dc, .22, 1), steel: M(0xaeb3b9, .32, 1),
  gold: M(0xd8b25a, .28, 1), copper: M(0xc98a4b, .35, 1), cream: M(PAL.cream, .7), paper: M(PAL.paper, .75),
  red: M(PAL.red, .45), teal: M(PAL.teal, .45), blue: M(PAL.blue, .5), navy: M(PAL.navy, .6), ink: M(PAL.ink, .5),
  amber: M(PAL.amber, .45), white: M(0xf3f1ec, .5), dark: M(0x0d0e10, .8),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transmission: 0, transparent: true, opacity: .25, clearcoat: 1 }),
};
function add(parent, geo, material, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const rbox = (w, h, d, r = .05, s = 3) => new RoundedBoxGeometry(w, h, d, s, r);
const cyl = (r, h, s = 24, r2) => new THREE.CylinderGeometry(r, r2 ?? r, h, s);
const sphere = (r, s = 32) => new THREE.SphereGeometry(r, s, Math.max(8, s / 2));

// ---------- beat helper ----------
const beats = timeline.beats;
let NOW = 0;
const B = {
  n: beats.length, dur: timeline.duration,
  s: i => beats[i].start, e: i => beats[i].end, d: i => beats[i].end - beats[i].start,
  // progress 0..1 over [start+from, start+from+len] (len defaults to rest of beat)
  p: (i, from = 0, len) => seg(NOW, beats[i].start + from, beats[i].start + from + (len ?? Math.max(.01, beats[i].end - beats[i].start - from))),
  // progress over the last `len` seconds of a beat (useful for exits)
  out: (i, len = .5) => seg(NOW, beats[i].end - len, beats[i].end),
  on: i => NOW >= beats[i].start && NOW < beats[i].end,
  get t() { return NOW; },
};

// ---------- DOM: captions, subtitles, callouts, labels ----------
const ui = document.getElementById('ui'), svg = document.getElementById('svg'), subsEl = document.getElementById('subs');
const NS = 'http://www.w3.org/2000/svg';
const caps = episode.beats.map((b, i) => {
  const el = document.createElement('div'); el.className = 'cap';
  el.innerHTML = `<div class="tag"><b>${String(i + 1).padStart(2, '0')}</b>${b.tag || ''}</div><div class="h">${(b.headline || []).map(l => `<span class="ln">${l}</span>`).join('')}</div>`;
  ui.appendChild(el); return { el, tag: el.querySelector('.tag'), lns: [...el.querySelectorAll('.ln')] };
});
const stepBars = beats.map(() => { const d = document.createElement('div'); d.innerHTML = '<span></span>'; document.getElementById('steps').appendChild(d); return d.firstChild; });

// subtitle chunks from word timings
const chunks = [];
{
  let cur = null;
  timeline.words.forEach((w, i) => {
    const prev = timeline.words[i - 1];
    const len = cur ? cur.words.reduce((a, x) => a + x.w.length + 1, 0) : 0;
    const brk = !cur || cur.words.length >= 3 || len + w.w.length > 18 || (prev && /[.,!?;:]$/.test(prev.w)) || (prev && prev.beat !== w.beat) || (prev && w.s - prev.e > .35);
    if (brk) { cur = { words: [], beat: w.beat }; chunks.push(cur); }
    cur.words.push(w);
  });
  chunks.forEach((c, i) => { c.s = c.words[0].s - .05; c.e = chunks[i + 1] ? Math.min(chunks[i + 1].words[0].s - .05, c.words.at(-1).e + .6) : c.words.at(-1).e + .8; });
  chunks.forEach(c => {
    c.el = document.createElement('div'); c.el.className = 'chunk';
    c.el.innerHTML = c.words.map(w => `<span class="w">${w.w.replace(/[.,;:]+$/, '').replace(/</g, '&lt;')}</span>`).join('');
    c.spans = [...c.el.children]; c.el.style.display = 'none'; subsEl.appendChild(c.el);
  });
}

const callouts = [], labels = [], SFX = [];
const v3 = new THREE.Vector3();
function toScreen(v) { v3.copy(v).project(camera); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H]; }
function worldOf(a) { return typeof a === 'function' ? a() : (a.isObject3D ? a.getWorldPosition(new THREE.Vector3()) : a); }
// callout: {t, s, red, anchor (Vector3|Object3D|fn), card:[x,y], beat, at=0.3, end?}
function callout(o) {
  const card = document.createElement('div'); card.className = 'co' + (o.red ? ' red' : '');
  card.innerHTML = `<div class="t">${o.t}</div>${o.s ? `<div class="s">${o.s}</div>` : ''}`; ui.appendChild(card);
  const dot = document.createElement('div'); dot.className = 'dot' + (o.red ? ' red' : ''); ui.appendChild(dot);
  const line = document.createElementNS(NS, 'path'); line.setAttribute('fill', 'none'); line.setAttribute('stroke', '#1B2433');
  line.setAttribute('stroke-width', '3'); line.setAttribute('stroke-dasharray', '9 7'); svg.appendChild(line);
  const c = { ...o, at: o.at ?? .3, cardEl: card, dot, line }; callouts.push(c);
  SFX.push({ t: beats[o.beat].start + c.at + .05, type: 'blip' });
  return c;
}
// label: small tag that follows a 3D point. {text, anchor, beat, at, end?, dy}
function label(o) { const el = document.createElement('div'); el.className = 'lbl'; el.textContent = o.text; ui.appendChild(el); const l = { ...o, el, at: o.at ?? .2 }; labels.push(l); return l; }
const sfx = (t, type = 'blip') => SFX.push({ t, type });

function drawCallout(c) {
  const t0 = beats[c.beat].start + c.at, t1 = c.end ?? beats[c.beat].end;
  const on = NOW >= t0 && NOW < t1;
  for (const e of [c.cardEl, c.dot]) e.style.display = on ? 'block' : 'none';
  c.line.style.display = on ? 'inline' : 'none'; if (!on) return;
  const p = seg(NOW, t0, t0 + .55), out = seg(NOW, t1 - .3, t1);
  const op = clamp(p * 3) * (1 - out), sc = .72 + .28 * ease.back(p);
  const [ax, ay] = toScreen(worldOf(c.anchor)); const [cx, cy] = c.card;
  const el = c.cardEl; el.style.left = cx + 'px'; el.style.top = cy + 'px'; el.style.opacity = op; el.style.transform = `scale(${sc})`;
  const w = el.offsetWidth, h = el.offsetHeight;
  c.dot.style.left = ax + 'px'; c.dot.style.top = ay + 'px'; c.dot.style.opacity = op; c.dot.style.transform = `scale(${ease.back(clamp(p * 1.3))})`;
  let ex, ey; if (ax < cx) { ex = cx; ey = cy + h / 2; } else if (ax > cx + w) { ex = cx + w; ey = cy + h / 2; } else { ex = ax; ey = ay < cy ? cy : cy + h; }
  const lp = ease.out(clamp(p * 1.5));
  c.line.setAttribute('d', `M${ax},${ay} L${lerp(ax, ex, lp)},${lerp(ay, ey, lp)}`); c.line.style.opacity = op;
}
function drawLabel(l) {
  const t0 = beats[l.beat].start + l.at, t1 = l.end ?? beats[l.beat].end;
  const on = NOW >= t0 && NOW < t1; l.el.style.display = on ? 'block' : 'none'; if (!on) return;
  const p = ease.back(seg(NOW, t0, t0 + .5)) * (1 - seg(NOW, t1 - .3, t1));
  const [x, y] = toScreen(worldOf(l.anchor));
  l.el.style.left = x + 'px'; l.el.style.top = (y + (l.dy ?? 18)) + 'px'; l.el.style.opacity = clamp(p);
  l.el.style.transform = `translate(-50%,0) scale(${.6 + .4 * p})`;
}

// CTA pill in the last beat
if (episode.cta) {
  const el = document.createElement('div'); el.id = 'cta'; el.innerHTML = `<div class="plus">+</div><div>${episode.cta}</div>`; ui.appendChild(el);
}
const ctaEl = document.getElementById('cta');

// grain
const grainC = document.getElementById('grain'), gctx = grainC.getContext('2d'); const gr = rng(99);
const grainImgs = [...Array(6)].map(() => { const id = gctx.createImageData(540, 960); for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (gr() - .5) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } return id; });

// ---------- build episode scene ----------
const E = { THREE, scene, camera, renderer, ground, PAL, M, mat, add, box, rbox, cyl, sphere, canvasTex, clamp, seg, lerp, ease, rng,
  B, callout, label, sfx, toScreen, episode, sun };
E.lib = makeLib(E);
const mod = await import(`/${EP}/scene.js`);
const S = await mod.build(E);
if (S.viewOffsetY !== undefined) camera.setViewOffset(W, H, 0, S.viewOffsetY, W, H); else camera.setViewOffset(W, H, 0, -150, W, H);
for (let i = 1; i < beats.length; i++) SFX.push({ t: beats[i].start, type: 'whoosh' });

// camera keys: {beat, at (sec from beat start; negative = from beat end), pos:[x,y,z], target:[x,y,z]}
const K = (S.camera || []).map(k => ({ t: k.at >= 0 ? beats[k.beat].start + k.at : beats[k.beat].end + k.at, pos: k.pos, target: k.target }))
  .sort((a, b) => a.t - b.t);
const tp = new THREE.Vector3(), tt = new THREE.Vector3();
function camAt(t) {
  if (S.cameraAt) { const c = S.cameraAt(t, B); if (c) { camera.position.set(...c.pos); camera.lookAt(...c.target); return; } }
  if (!K.length) { camera.position.set(0, 12, 14); camera.lookAt(0, 0, 0); return; }
  let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
  const k = b.t > a.t ? ease.io(seg(t, a.t, b.t)) : 1;
  tp.set(lerp(a.pos[0], b.pos[0], k), lerp(a.pos[1], b.pos[1], k), lerp(a.pos[2], b.pos[2], k));
  tt.set(lerp(a.target[0], b.target[0], k), lerp(a.target[1], b.target[1], k), lerp(a.target[2], b.target[2], k));
  tp.x += Math.sin(t * .7) * .12; tp.y += Math.sin(t * .9 + 1) * .08;
  camera.position.copy(tp); camera.lookAt(tt);
}

// ---------- frame ----------
function renderAt(t) {
  NOW = t;
  S.update?.(t, B);
  camAt(t); camera.updateMatrixWorld();

  caps.forEach((c, i) => {
    const a = beats[i].start, b = i === beats.length - 1 ? 1e9 : beats[i].end;
    const vis = t >= a && t < b; c.el.style.display = vis ? 'block' : 'none'; if (!vis) return;
    const first = i === 0, pout = ease.io(seg(t, b - .28, b));
    const tpn = first ? 1 : ease.out(seg(t, a + .05, a + .5));
    c.tag.style.opacity = tpn * (1 - pout); c.tag.style.transform = `translateY(${(1 - tpn) * 24 - pout * 20}px)`;
    c.lns.forEach((l, k) => { const q = first ? 1 : ease.out(seg(t, a + .12 + k * .1, a + .62 + k * .1));
      l.style.opacity = q * (1 - pout); l.style.transform = `translateY(${(1 - q) * 60 - pout * 34}px)`; });
  });
  stepBars.forEach((s, i) => s.style.width = (seg(t, beats[i].start, beats[i].end) * 100) + '%');

  chunks.forEach(c => {
    const on = t >= c.s && t < c.e; c.el.style.display = on ? 'inline-block' : 'none'; if (!on) return;
    const pin = ease.out(seg(t, c.s, c.s + .12));
    c.el.style.transform = `translateY(${(1 - pin) * 14}px) scale(${.96 + .04 * pin})`; c.el.style.opacity = pin;
    c.spans.forEach((sp, k) => { const w = c.words[k]; sp.className = 'w' + (t >= w.s ? (t < w.e + .05 ? ' on now' : ' on') : ''); });
  });
  callouts.forEach(drawCallout); labels.forEach(drawLabel);
  if (ctaEl) {
    const L = beats.length - 1, p = ease.out(seg(t, beats[L].start + .5, beats[L].start + 1.0));
    ctaEl.style.display = p > 0 ? 'flex' : 'none'; ctaEl.style.opacity = p; ctaEl.style.transform = `translateY(${(1 - p) * 40}px)`;
  }
  gctx.putImageData(grainImgs[Math.floor(t * 30) % grainImgs.length], 0, 0);
  renderer.render(scene, camera);
}
window.renderAt = renderAt;
window.DUR = timeline.duration;
window.SFX = SFX.sort((a, b) => a.t - b.t);
renderAt(0);
window.__ready = true;
