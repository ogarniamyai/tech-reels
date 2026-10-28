// Episode: Why solid-state batteries crack (Polish on-screen text)
export function build(E) {
  const { THREE, add, box, rbox, cyl, M, mat, PAL, canvasTex, lib, ease, clamp, lerp, B, rng } = E;
  const r = rng(11);

  // ---------- platform ----------
  const base = new THREE.Group(); E.scene.add(base);
  add(base, rbox(8.6, .26, 5.4, .1, 3), M(0xF8F2E4, .7), 0, .13, 0);
  add(base, box(8.62, .05, 5.42), mat.teal, 0, .06, 0, false);

  // ---------- cell (layers along X) ----------
  const cell = new THREE.Group(); base.add(cell); cell.position.set(.35, .26, 0);
  const H = 1.6, D = 3.6, Y = H / 2 + .02;
  const X = { cu0: -3.3, an0: -3.1, el0: -2.1, el1: .9, ca1: 2.4, al1: 2.6 };
  const cx = (a, b) => (a + b) / 2, w = (a, b) => b - a;

  add(cell, box(w(X.cu0, X.an0), H, D), mat.copper, cx(X.cu0, X.an0), Y, 0);
  add(cell, box(w(X.ca1, X.al1), H, D), M(0xd5d8dc, .3, 1), cx(X.ca1, X.al1), Y, 0);
  // tabs
  add(cell, box(.2, .7, .9), mat.copper, cx(X.cu0, X.an0), H + .35, -.9);
  add(cell, box(.2, .7, .9), M(0xd5d8dc, .3, 1), cx(X.ca1, X.al1), H + .35, -.9);
  const tabA = new THREE.Object3D(); tabA.position.set(cx(X.cu0, X.an0), H + .75, -.9); cell.add(tabA);
  const tabC = new THREE.Object3D(); tabC.position.set(cx(X.ca1, X.al1), H + .75, -.9); cell.add(tabC);

  // anode: graphite -> lithium metal (wipe from the collector side)
  const graphTex = canvasTex(256, 256, (g) => { g.fillStyle = '#3a3d42'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${90 + r() * 40},${90 + r() * 40},${100 + r() * 40},.6)`; g.fillRect(0, i * 6.4, 256, 2 + r() * 2); } });
  const graphite = add(cell, box(1, H, D), M(0xffffff, .85, .1, { map: graphTex }), cx(X.an0, X.el0), Y, 0);
  const lithium = new THREE.Group(); lithium.position.set(X.an0, Y, 0); cell.add(lithium);
  add(lithium, box(1, H, D), M(0xf4f6f9, .28, .85, { envMapIntensity: 1.6 }), .5, 0, 0);

  // liquid electrolyte with wobbling surface + porous separator
  const liqMat = new THREE.MeshPhysicalMaterial({ color: 0x7fb7e6, roughness: .08, transparent: true, opacity: .55, clearcoat: 1, depthWrite: false });
  const liquid = new THREE.Group(); liquid.position.set(cx(X.el0, X.el1), .02, 0); cell.add(liquid);
  const liqBody = add(liquid, box(w(X.el0, X.el1), H - .12, D - .02), liqMat, 0, (H - .12) / 2, 0, false);
  const surfGeo = new THREE.PlaneGeometry(w(X.el0, X.el1), D - .02, 30, 30); surfGeo.rotateX(-Math.PI / 2);
  const surf = add(liquid, surfGeo, new THREE.MeshPhysicalMaterial({ color: 0x9cc8ee, roughness: .05, transparent: true, opacity: .7, clearcoat: 1 }), 0, H - .12, 0, false);
  const surfBase = surfGeo.attributes.position.array.slice();
  const sepTex = canvasTex(256, 256, (g) => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(120,110,95,.35)';
    for (let i = 0; i < 260; i++) { g.beginPath(); g.arc(r() * 256, r() * 256, 1.5 + r() * 2.5, 0, 7); g.fill(); } });
  const separator = add(cell, box(.06, H - .05, D - .05), M(0xffffff, .8, 0, { map: sepTex, transparent: true, opacity: .9 }), -.6, Y, 0);

  // ceramic electrolyte (translucent so dendrites are visible inside)
  const cerTex = canvasTex(512, 512, (g) => { g.fillStyle = '#f3ede0'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) { const v = 205 + r() * 45; g.fillStyle = `rgba(${v},${v - 6},${v - 18},.55)`; g.beginPath(); g.arc(r() * 512, r() * 512, 3 + r() * 9, 0, 7); g.fill(); } });
  const cerMat = new THREE.MeshPhysicalMaterial({ color: 0xfff6e6, map: cerTex, roughness: .5, transparent: true, opacity: .8, clearcoat: .4, depthWrite: false });
  const ceramic = new THREE.Group(); ceramic.position.set(cx(X.el0, X.el1), .02, 0); cell.add(ceramic);
  add(ceramic, box(w(X.el0, X.el1), H - .04, D - .02), cerMat, 0, (H - .04) / 2, 0, false);
  { const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w(X.el0, X.el1), H - .04, D - .02)), new THREE.LineBasicMaterial({ color: 0xb9a985 })); e.position.y = (H - .04) / 2; ceramic.add(e); }

  // cathode
  const catTex = canvasTex(512, 512, (g) => { g.fillStyle = '#244451'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 700; i++) { const v = 50 + r() * 60; g.fillStyle = `rgba(${v},${v + 50},${v + 55},.9)`; g.beginPath(); g.arc(r() * 512, r() * 512, 4 + r() * 8, 0, 7); g.fill(); } });
  add(cell, box(w(X.el1, X.ca1), H, D), M(0xffffff, .6, .2, { map: catTex }), cx(X.el1, X.ca1), Y, 0);

  // outline
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(X.al1 - X.cu0 + .04, H + .04, D + .04)),
    new THREE.LineBasicMaterial({ color: PAL.ink, transparent: true, opacity: .55 }));
  edges.position.set(cx(X.cu0, X.al1), Y, 0); cell.add(edges);

  // ---------- ions ----------
  const ions = [];
  for (const yy of [.45, .95, 1.4]) for (const zz of [-1.15, 0, 1.15]) {
    const pts = []; for (let k = 0; k <= 8; k++) { const x = lerp(X.ca1 - .4, X.an0 + .5, k / 8); pts.push(new THREE.Vector3(x, yy + (r() - .5) * .25, zz + (r() - .5) * .3)); }
    const c = new THREE.CatmullRomCurve3(pts); const f = lib.flow(c, { count: 8, color: 0xFFB238, size: .1, speed: .16 + r() * .06, emissive: 2 });
    f.mesh.material.transparent = true; f.mesh.renderOrder = 10; cell.add(f.mesh); ions.push(f);
  }

  // ---------- dendrites ----------
  function treePath(root, len, steps, jit) {
    const pts = [root.clone()]; let p = root.clone();
    for (let i = 1; i <= steps; i++) { p = p.clone().add(new THREE.Vector3(len / steps, (r() - .5) * jit, (r() - .5) * jit)); pts.push(p); }
    return pts;
  }
  const dendrites = [];
  const roots = [[.9, -.7, 3.0], [.55, .65, 1.1], [1.3, 1.1, .9], [.4, -1.3, .7]];
  roots.forEach(([yy, zz, len], i) => {
    const trunkPts = treePath(new THREE.Vector3(X.el0 + .01, yy, zz), len, i === 0 ? 12 : 5, .22);
    if (i === 0) trunkPts[trunkPts.length - 1].x = X.el1 + .02;
    const trunk = lib.wire(trunkPts, PAL.red, i === 0 ? .05 : .04, { segments: 160 });
    trunk.mesh.material = M(0xC42D24, .35, .3, { emissive: 0x5a0d08, emissiveIntensity: .5, transparent: true }); trunk.mesh.renderOrder = 10; cell.add(trunk.mesh);
    const branches = [];
    for (let b = 1; b < trunkPts.length - 1; b += (i === 0 ? 2 : 1)) {
      const from = trunkPts[b]; const dir = new THREE.Vector3(.18, (r() - .5) * .5, (r() - .5) * .5);
      const bp = [from.clone(), from.clone().add(dir), from.clone().add(dir.clone().multiplyScalar(2)).add(new THREE.Vector3(.05, (r() - .5) * .2, (r() - .5) * .2))];
      const br = lib.wire(bp, PAL.red, .025, { segments: 30 }); br.mesh.material = trunk.mesh.material; br.mesh.renderOrder = 10; cell.add(br.mesh);
      branches.push({ w: br, at: b / (trunkPts.length - 1) });
    }
    dendrites.push({ trunk, branches, pts: trunkPts, main: i === 0 });
  });
  const main = dendrites[0];
  const tipObj = new THREE.Object3D(); cell.add(tipObj);
  function setTree(d, p) {
    d.trunk.set(p);
    d.branches.forEach(b => b.w.set(clamp((p - b.at) / .25)));
  }

  // ---------- cracks (grow ahead of the main dendrite in beat 4) ----------
  const cracks = [];
  const cm = M(0x2a2622, .8, 0, { transparent: true });
  [.45, .6, .72, .84, .93].forEach((u, i) => {
    const o = main.trunk.curve.getPointAt(Math.min(u, .98)); const pts = [o.clone()];
    let p = o.clone(); const dy = (i % 2 ? 1 : -1), dz = (r() - .5);
    for (let k = 0; k < 6; k++) { p = p.clone().add(new THREE.Vector3((r() - .3) * .12, dy * (.1 + r() * .08), dz * .3 + (r() - .5) * .15)); p.y = clamp(p.y, .08, H - .08); p.z = clamp(p.z, -1.7, 1.7); pts.push(p); }
    const c = lib.wire(pts, 0x2a2622, .018, { segments: 40 }); c.mesh.material = cm; c.mesh.renderOrder = 11; cell.add(c.mesh);
    cracks.push({ w: c, u });
  });
  // surface cracks on the ceramic top
  for (let i = 0; i < 4; i++) {
    const x0 = lerp(-1.3, .6, i / 3) + (r() - .5) * .2; const pts = [new THREE.Vector3(x0, H + .0, -1.6)];
    for (let k = 0; k < 7; k++) { const q = pts[k].clone(); q.x += (r() - .5) * .3; q.z += .38 + r() * .1; pts.push(q); }
    pts.forEach(p => p.y = H - .005);
    const c = lib.wire(pts, 0x2a2622, .015, { segments: 50 }); c.mesh.material = cm; c.mesh.castShadow = false; cell.add(c.mesh);
    cracks.push({ w: c, u: .55 + i * .1, surface: true });
  }

  // ---------- short-circuit spark ----------
  const spark = new THREE.Group(); spark.position.copy(main.pts.at(-1)); cell.add(spark);
  const sg1 = lib.glow(0xffc04a, 4.2), sg2 = lib.glow(0xffffff, 1.6, true); spark.add(sg1, sg2);
  const sparkLight = new THREE.PointLight(0xffa040, 0, 7, 1.5); spark.add(sparkLight);
  const sparkBits = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false }), 26);
  spark.add(sparkBits); const dirs = [...Array(26)].map(() => new THREE.Vector3(r() - .5, r() * .9, r() - .5).normalize().multiplyScalar(1.2 + r() * 1.6));
  const dmy = new THREE.Object3D();

  // ---------- labels & callouts (Polish) ----------
  E.label({ text: 'ANODA  −', anchor: tabA, beat: 1, at: .9, dy: -70 });
  E.label({ text: 'KATODA  +', anchor: tabC, beat: 1, at: 1.1, dy: -70 });
  const liqTop = new THREE.Object3D(); liqTop.position.set(-1.2, H - .1, .9); cell.add(liqTop);
  E.callout({ t: 'CIEKŁY ELEKTROLIT', s: 'łatwopalny', red: true, anchor: liqTop, card: [50, 600], beat: 1, at: 1.6 });
  const ionPt = new THREE.Object3D(); ionPt.position.set(.3, .95, 1.15); cell.add(ionPt);
  E.callout({ t: 'JONY LITU', s: 'niosą ładunek', anchor: ionPt, card: [600, 600], beat: 1, at: 2.4 });
  const liTop = new THREE.Object3D(); liTop.position.set(cx(X.an0, X.el0), H + .02, .6); cell.add(liTop);
  E.callout({ t: 'CZYSTY LIT', s: 'więcej energii', anchor: liTop, card: [40, 600], beat: 2, at: 2.4 });
  const cerTop = new THREE.Object3D(); cerTop.position.set(-.3, H + .02, .6); cell.add(cerTop);
  E.callout({ t: 'CERAMIKA', s: 'nic nie wycieka', anchor: cerTop, card: [600, 600], beat: 2, at: 1.6 });
  E.callout({ t: 'DENDRYT', s: 'włókno z litu', anchor: tipObj, card: [600, 610], beat: 3, at: 1.6 });
  const crackPt = new THREE.Object3D(); cell.add(crackPt);
  E.callout({ t: 'PĘKNIĘCIE', s: 'ciśnienie rozsadza ceramikę', anchor: crackPt, card: [40, 600], beat: 4, at: B.d(4) * .35 });
  const shortAt = B.d(4) * .74;
  E.callout({ t: 'ZWARCIE', s: 'ogniwo pada', red: true, anchor: spark, card: [600, 690], beat: 4, at: shortAt + .15 });
  E.sfx(B.s(4) + shortAt, 'thud'); E.sfx(B.s(4) + shortAt, 'power'); E.sfx(B.s(4) + shortAt - .05, 'rise');
  E.sfx(B.s(2) + .9, 'pop');

  // ---------- update ----------
  const tmp = new THREE.Vector3();
  function update(t) {
    // intro: drop + spin
    const intro = ease.out(B.p(0, 0, 1.4));
    base.rotation.y = (1 - intro) * -1.1 + (B.on(5) ? ease.io(B.p(5, .2, B.d(5))) * .6 : 0);
    base.position.y = (1 - ease.out(B.p(0, 0, 1.0))) * 1.4;

    // solid vs liquid state
    let solid;
    if (B.on(0)) solid = 1;
    else if (B.on(1)) solid = 1 - ease.io(B.p(1, 0, .7));
    else if (B.on(2)) solid = ease.io(B.p(2, .5, 1.4));
    else solid = 1;
    ceramic.scale.y = Math.max(1e-3, solid); ceramic.visible = solid > .002;
    liquid.scale.y = Math.max(1e-3, 1 - solid); liquid.visible = solid < .998;
    separator.visible = solid < .5; separator.scale.y = Math.max(1e-3, 1 - solid);
    const li = B.on(0) ? 1 : B.on(1) ? 1 - ease.io(B.p(1, 0, .7)) : B.on(2) ? ease.io(B.p(2, .9, 1.4)) : 1;
    lithium.scale.x = Math.max(1e-3, li); lithium.visible = li > .002;
    graphite.scale.x = Math.max(1e-3, 1 - li); graphite.position.x = X.el0 - (1 - li) * .5; graphite.visible = li < .998;

    // liquid surface wobble
    const pa = surfGeo.attributes.position.array;
    for (let i = 0; i < pa.length; i += 3) pa[i + 1] = surfBase[i + 1] + Math.sin(surfBase[i] * 3 + t * 2.2) * .03 + Math.cos(surfBase[i + 2] * 2.5 + t * 1.7) * .03;
    surfGeo.attributes.position.needsUpdate = true; surfGeo.computeVertexNormals();

    // ions
    let k = 0;
    if (B.on(1)) k = ease.out(B.p(1, .6, .8));
    else if (B.on(2)) k = .7; else if (B.on(3)) k = .55;
    else if (B.on(4)) k = .5 * (1 - ease.io(B.p(4, shortAt - .2, .4)));
    else if (B.on(5)) k = ease.out(B.p(5, .6, 1));
    ions.forEach(f => f.update(t, k));

    // dendrites
    let dp = 0, others = 0;
    if (B.on(0)) { dp = .3 * ease.io(B.p(0, .15, 2.2)) * (1 - ease.in(B.out(0, .45))); others = dp * 1.4; }
    else if (B.on(3)) { dp = .42 * ease.io(B.p(3, .3, B.d(3) - .4)); others = dp * 1.9; }
    else if (B.on(4)) { dp = lerp(.42, 1, ease.io(B.p(4, .4, shortAt - .4))); others = .8; }
    else if (B.on(5)) { const f = 1 - ease.io(B.p(5, 0, .8)); dp = f; others = .8 * f; }
    setTree(main, dp); dendrites.slice(1).forEach(d => setTree(d, Math.min(1, others)));
    main.trunk.curve.getPointAt(Math.max(.001, Math.min(1, dp)), tmp); tipObj.position.copy(tmp);

    // cracks
    cracks.forEach(c => {
      let p = 0;
      if (B.on(4)) p = clamp((dp - c.u + .12) / .18);
      if (B.on(5)) p = 1 - ease.io(B.p(5, 0, .8));
      c.w.set(p);
    });
    crackPt.position.copy(cracks[1].w.curve.getPointAt(.6));

    // spark
    const sAge = t - (B.s(4) + shortAt);
    const sp = sAge > 0 && B.on(4) ? Math.exp(-sAge * 2.2) : 0;
    const flick = sAge > 0 && sAge < 1.4 ? .75 + .25 * Math.sin(sAge * 60) : 1;
    sg1.material.opacity = sp * flick; sg2.material.opacity = sp * flick; sparkLight.intensity = sp * 25;
    sg1.scale.setScalar(3 + sp * 3);
    sparkBits.visible = sAge > 0 && sAge < 1.4 && B.on(4);
    dirs.forEach((d, i) => { const a = Math.max(0, sAge); dmy.position.set(d.x * a, d.y * a - 2.5 * a * a, d.z * a); dmy.scale.setScalar(Math.max(1e-3, 1 - a / 1.4)); dmy.updateMatrix(); sparkBits.setMatrixAt(i, dmy.matrix); });
    sparkBits.instanceMatrix.needsUpdate = true;
  }

  return {
    update,
    camera: [
      { beat: 0, at: 0, pos: [3.2, 5.2, 9.6], target: [-.6, .9, 0] },
      { beat: 0, at: -.3, pos: [4.4, 8.0, 12.6], target: [0, .8, 0] },
      { beat: 1, at: .5, pos: [0, 8.6, 13.2], target: [0, .8, 0] },
      { beat: 1, at: -.2, pos: [.6, 8.3, 12.8], target: [0, .8, 0] },
      { beat: 2, at: .5, pos: [-2.2, 8.6, 12.6], target: [-.3, .8, 0] },
      { beat: 2, at: -.2, pos: [-1.4, 8.8, 12.8], target: [-.3, .8, 0] },
      { beat: 3, at: .4, pos: [-3.6, 4.6, 7.4], target: [-1.3, 1.0, .2] },
      { beat: 3, at: -.2, pos: [-3.0, 4.8, 7.8], target: [-1.2, 1.0, .2] },
      { beat: 4, at: .5, pos: [-.8, 5.4, 8.6], target: [-.4, 1.0, 0] },
      { beat: 4, at: -1.2, pos: [1.0, 5.2, 8.2], target: [.5, 1.0, 0] },
      { beat: 5, at: .7, pos: [5.2, 9.0, 13.5], target: [0, .8, 0] },
      { beat: 5, at: -.01, pos: [-4.0, 9.6, 14.0], target: [0, .8, 0] },
    ],
  };
}
