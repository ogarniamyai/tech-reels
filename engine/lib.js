// Reusable 3D building blocks. Every function returns plain THREE objects (or {group, ...controls}).
// Keep everything generic: no real brand logos, product shapes or characters.
export function makeLib(E) {
  const { THREE, add, box, rbox, cyl, sphere, M, mat, canvasTex, clamp, ease, PAL } = E;

  // radial glow sprite (use opacity 0..1 to switch on)
  const glowTexCache = {};
  function glowTex(hex) {
    if (glowTexCache[hex]) return glowTexCache[hex];
    const c = new THREE.Color(hex); const r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255);
    return glowTexCache[hex] = canvasTex(256, 256, (x) => {
      const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(255, b + 60)},1)`);
      gr.addColorStop(.2, `rgba(${r},${g},${b},.7)`); gr.addColorStop(.5, `rgba(${r},${g},${b},.18)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    });
  }
  function glow(color = PAL.red, size = 3, additive = false) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(color), transparent: true, depthWrite: false, opacity: 0, toneMapped: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    s.scale.set(size, size, 1); return s;
  }

  // flat text plane lying on XZ (or standing if upright)
  function textPlane(text, { w = 2, h = .5, color = '#1B2433', bg = null, font = '700 120px "Grot"', upright = false, align = 'center' } = {}) {
    const px = 256, cw = Math.round(w * px), ch = Math.round(h * px);
    const tex = canvasTex(cw, ch, (g) => {
      if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); }
      g.fillStyle = color; g.font = font; g.textAlign = align; g.textBaseline = 'middle';
      g.fillText(text, align === 'center' ? cw / 2 : 10, ch / 2 + 4, cw - 20);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: !bg, roughness: .7 }));
    if (!upright) m.rotation.x = -Math.PI / 2; return m;
  }

  // canvas-textured screen/panel (draw(g,w,h) called once)
  function panel(w, h, draw, { px = 200, emissive = .0 } = {}) {
    const tex = canvasTex(Math.round(w * px), Math.round(h * px), draw);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: .6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: emissive }));
    return m;
  }

  // circuit board slab with random traces; returns group, top surface at y=thickness
  function pcb({ w = 6, d = 4, t = .16, color = '#1b3a6e', trace = 'rgba(86,140,214,.5)', seed = 3, text = '' } = {}) {
    const r = E.rng(seed), S = 180;
    const tex = canvasTex(Math.round(w * S), Math.round(d * S), (g, cw, ch) => {
      g.fillStyle = color; g.fillRect(0, 0, cw, ch); g.lineCap = 'round'; g.lineJoin = 'round';
      for (let i = 0; i < 40 * (w * d) / 24; i++) {
        g.strokeStyle = trace; g.lineWidth = 3 + r() * 4; let x = r() * cw, y = r() * ch; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { const L = 60 + r() * 260; if (r() > .5) x += (r() > .5 ? 1 : -1) * L; else y += (r() > .5 ? 1 : -1) * L; g.lineTo(x, y); }
        g.stroke(); g.fillStyle = '#c9a65a'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
      }
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 4; g.strokeRect(12, 12, cw - 24, ch - 24);
      if (text) { g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '700 70px "Mono"'; g.fillText(text, 40, ch - 50); }
    });
    const grp = new THREE.Group(); const side = M(0x16305c, .6);
    add(grp, box(w, t, d), [side, side, M(0xffffff, .5, .05, { map: tex }), side, side, side], 0, t / 2, 0);
    grp.userData.top = t; return grp;
  }

  // IC package (black body + pins). Sits on y=0.
  function chip({ w = 1.6, d = 1.6, h = .22, pinsPerSide = 8, text = 'CPU', sides = 4 } = {}) {
    const g = new THREE.Group();
    const tex = canvasTex(Math.round(w * 200), Math.round(d * 200), (x, cw, ch) => {
      x.fillStyle = '#1a1b1f'; x.fillRect(0, 0, cw, ch); x.fillStyle = '#2b2d33'; x.beginPath(); x.arc(30, 30, 12, 0, 7); x.fill();
      x.fillStyle = 'rgba(225,225,225,.8)'; x.font = `700 ${Math.round(ch * .2)}px "Mono"`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, cw / 2, ch / 2);
    });
    const side = M(0x1a1b1f, .5);
    add(g, rbox(w, h, d, .03, 2), [side, side, M(0xffffff, .5, 0, { map: tex }), side, side, side], 0, h / 2 + .03, 0);
    const step = (Math.min(w, d) * .8) / pinsPerSide;
    for (let s = 0; s < sides; s++) for (let i = 0; i < pinsPerSide; i++) {
      const o = -Math.min(w, d) * .4 + step * (i + .5);
      const horiz = s < 2, sign = s % 2 ? 1 : -1;
      add(g, box(horiz ? .05 : .16, .03, horiz ? .16 : .05), mat.silver, horiz ? o : sign * (w / 2 + .06), .02, horiz ? sign * (d / 2 + .06) : o, false);
    }
    return g;
  }

  // through-hole LED. returns {group, set(on 0..1)}
  function led(color = PAL.red, { legs = 2, legH = .55 } = {}) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhysicalMaterial({ color, roughness: .12, transparent: true, opacity: .9, clearcoat: 1, emissive: color, emissiveIntensity: 0 });
    const xs = legs === 2 ? [-.12, .12] : [-.27, -.09, .09, .27];
    xs.forEach((x, i) => add(g, cyl(.02, legH + (i === 1 ? .08 : 0), 8), mat.steel, x, legH / 2, 0));
    add(g, cyl(.29, .07, 32), m, 0, legH + .035, 0);
    add(g, cyl(.25, .38, 32), m, 0, legH + .26, 0);
    add(g, new THREE.SphereGeometry(.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, legH + .45, 0);
    const gl = glow(color, 3.4); gl.position.y = legH + .4; g.add(gl);
    const gl2 = glow(color, 1.2, true); gl2.position.y = legH + .4; g.add(gl2);
    const light = new THREE.PointLight(color, 0, 5, 1.6); light.position.y = legH + .5; g.add(light);
    return { group: g, material: m, set(on) { m.emissiveIntensity = on * 1.5; gl.material.opacity = on * .95; gl2.material.opacity = on * .9; light.intensity = on * 9; } };
  }

  // tube along points; set(p) grows it from start (0..1)
  function wire(points, color = PAL.red, radius = .065, { segments = 200, closed = false, tension = 'centripetal' } = {}) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => p.isVector3 ? p : new THREE.Vector3(...p)), closed, tension);
    const geo = new THREE.TubeGeometry(curve, segments, radius, 12, closed);
    const mesh = new THREE.Mesh(geo, M(color, .38)); mesh.castShadow = true;
    const total = geo.index.count;
    return { mesh, curve, set(p) { geo.setDrawRange(0, Math.floor(total * clamp(p) / 6) * 6); mesh.visible = p > .002; } };
  }

  // particles flowing along a curve (current, data, fluid). update(t, intensity)
  function flow(curve, { count = 24, color = PAL.amber, size = .09, speed = .25, emissive = 1.2 } = {}) {
    const geo = sphere(size, 12);
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: .3 });
    const inst = new THREE.InstancedMesh(geo, m, count); inst.castShadow = false;
    const d = new THREE.Object3D();
    return { mesh: inst, update(t, k = 1) {
      for (let i = 0; i < count; i++) {
        const u = ((i / count) + t * speed) % 1; curve.getPointAt(u, d.position);
        const s = k * (0.6 + .4 * Math.sin(i * 1.7 + t * 4) ** 2); d.scale.setScalar(Math.max(1e-4, s)); d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
      }
      inst.instanceMatrix.needsUpdate = true; inst.visible = k > .001;
    } };
  }

  // arrow from a to b
  function arrow(a, b, color = PAL.teal, r = .06) {
    const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), dir = Bv.clone().sub(A), len = dir.length();
    const g = new THREE.Group(); const mm = M(color, .4);
    add(g, cyl(r, len - r * 5, 16), mm, 0, (len - r * 5) / 2, 0); add(g, new THREE.ConeGeometry(r * 2.6, r * 5, 20), mm, 0, len - r * 2.5, 0);
    g.position.copy(A); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); return g;
  }

  // display pedestal with teal ring; returns {group, holder}
  function pedestal(r = 1.25) {
    const g = new THREE.Group();
    add(g, cyl(r, .28, 64), M(0xF8F2E4, .7), 0, .14, 0);
    const ring = add(g, new THREE.TorusGeometry(r, .045, 12, 96), mat.teal, 0, .28, 0, false); ring.rotation.x = Math.PI / 2;
    const holder = new THREE.Group(); holder.position.y = .3; g.add(holder); return { group: g, holder };
  }

  // spur gear lying flat (axis = Y)
  function gear({ teeth = 16, r = 1, depth = .25, color = PAL.amber, hole = .25 } = {}) {
    const s = new THREE.Shape(), tw = Math.PI / teeth, ro = r, ri = r * .84;
    for (let i = 0; i < teeth; i++) {
      const a = i * 2 * tw;
      const pts = [[ri, a], [ro, a + tw * .25], [ro, a + tw * .95], [ri, a + tw * 1.2]];
      pts.forEach(([rr, aa], k) => { const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr; (i === 0 && k === 0) ? s.moveTo(x, y) : s.lineTo(x, y); });
      s.lineTo(Math.cos(a + 2 * tw) * ri, Math.sin(a + 2 * tw) * ri);
    }
    const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h);
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geo, M(color, .35, .6)); m.castShadow = m.receiveShadow = true; return m;
  }

  // cylindrical cell (battery-like, generic) standing on y=0
  function cell({ r = .45, h = 1.8, color = PAL.teal, band = PAL.ink } = {}) {
    const g = new THREE.Group();
    add(g, cyl(r, h, 48), M(color, .35, .2), 0, h / 2, 0);
    add(g, cyl(r * 1.005, h * .12, 48), M(band, .4), 0, h * .85, 0);
    add(g, cyl(r * .35, .08, 24), mat.silver, 0, h + .04, 0);
    add(g, cyl(r * .98, .03, 48), mat.silver, 0, .015, 0);
    return g;
  }

  // small data cube / packet
  function packet(color = PAL.teal, s = .32) { const m = new THREE.Mesh(rbox(s, s, s, .05, 2), M(color, .35, 0, { emissive: color, emissiveIntensity: .25 })); m.castShadow = true; return m; }

  // generic rounded device body (phone/tablet/sensor) lying flat; screen drawn by draw(g,w,h)
  function device({ w = 2.2, d = 4.4, h = .22, color = 0x22252b, draw = null } = {}) {
    const g = new THREE.Group();
    add(g, rbox(w, h, d, .18, 4), M(color, .35, .3), 0, h / 2, 0);
    if (draw) { const p = panel(w * .9, d * .92, draw, { emissive: .35 }); p.rotation.x = -Math.PI / 2; p.position.y = h + .003; g.add(p); }
    return g;
  }

  return { glow, textPlane, panel, pcb, chip, led, wire, flow, arrow, pedestal, gear, cell, packet, device };
}
