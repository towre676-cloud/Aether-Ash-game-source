/**
 * Authored masonry for the Remembering Cistern.
 * The collision model remains authoritative. Raised ruins are outside its
 * lanes; walkable paving, metal inlays and drain covers stay at floor height.
 * Material 7 is rough, uncut rock; all other material IDs match the renderer.
 */
export function buildCisternArchitecture(Geometry, C, CISTERN) {
  const m = new Geometry(), PI = Math.PI, TAU = PI * 2;
  const tint = (c, s) => c.map(v => Math.min(1, v * s));
  const blend = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
  const stone = blend(C.stone, [0.29, 0.30, 0.29], .52);
  const pale = blend(stone, [.49, .48, .41], .34);
  const dark = blend(C.dark, [.10, .12, .12], .55);
  const rock = [.105, .125, .127], mortar = [.075, .091, .091];
  const iron = [.16, .19, .19], rust = [.30, .18, .105];
  const brass = blend(C.brass, [.32, .24, .13], .48);
  const moss = blend(C.moss, [.10, .18, .12], .45);
  let seed = 167543;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

  // An excavated rock mass surrounds the architecture. No exposed clean slab
  // edge or empty background outlines the whole dungeon as a floating model.
  m.box(0, -3.0, -6, 66, 4.1, 88, rock, 7);
  for (const side of [-1, 1]) {
    for (let j = 0; j < 12; j++) {
      // Allow for the rock's complete footprint at the room-width changes.
      const z = 21 - j * 4.8, roomX = z > 9.5 ? 3.7 : z < -19.5 ? 8.8 : 11.8;
      const x = side * (roomX + 6.5 + random() * 2.2);
      m.sphere(x, -1.0 + random() * .3, z, 3.2 + random() * 1.1,
        tint(rock, .75 + random() * .4), 7, 0, 7, 4, [1.3, .43 + random() * .20, 1.2]);
      m.box(x + side * 3.1, -1.05, z, 5.2, 1.2, 6.3, tint(rock, .85), 7, 0, random());
    }
  }
  m.box(0, -.60, -34.7, 33, .85, 9.4, dark, 7);
  m.box(0, -.68, 20.8, 21, .90, 9.6, dark, 7);

  // Individual six-sided flagstones have broken corners and dark mortar.
  // Tops are essentially coplanar: no raised visual obstacles in a clear lane.
  function paving(x0, x1, z0, z1, color = stone, step = 1.02) {
    m.box((x0 + x1) / 2, -.17, (z0 + z1) / 2, x1 - x0, .30, z1 - z0, mortar);
    let row = 0;
    for (let z = z0; z < z1 - .03; z += step, row++) {
      const depth = Math.min(step - .028, z1 - z - .025);
      for (let x = x0; x < x1 - .03; x += step) {
        const width = Math.min(step - .025, x1 - x - .025);
        if (width < .04 || depth < .04) continue;
        const a = .035 + random() * .10, b = .035 + random() * .09;
        const xx = x + .012, zz = z + .013, y = .015 + random() * .006;
        const pts = [[xx + a, y, zz], [xx + width, y, zz], [xx + width, y, zz + depth - b],
          [xx + width - b, y, zz + depth], [xx, y, zz + depth], [xx, y, zz + a]];
        const center = [xx + width / 2, y, zz + depth / 2];
        const col = tint(color, .82 + random() * .30);
        for (let i = 0; i < pts.length; i++) m.tri(center, pts[i], pts[(i + 1) % pts.length], col, 0, 0, 1, [0, 1, 0]);
        // Subtle old fissures occupy only a minority of slabs.
        if (random() < .075 && width > .5) {
          const dz = depth * (.18 + random() * .5), length = width * (.28 + random() * .36);
          m.box(xx + width * .49, y + .001, zz + dz, length, .0015, .012, tint(mortar, .9), 0, 0, -.4 + random() * .8);
        }
      }
    }
  }
  paving(-3, 3, 4, 16, tint(stone, .92), .95);
  paving(-11, -6, -14, 4); paving(6, 11, -14, 4);
  paving(-6, 6, 0, 4); paving(-6, 6, -14, -10);
  paving(-1.6, 1.6, -10, 0, pale, .91);
  paving(-6, -1.6, -6.6, -3.4, pale, .91);
  paving(1.6, 6, -6.6, -3.4, pale, .91);
  paving(-8, 8, -30, -14, tint(stone, .92), 1.08);

  // The water is recessed. Its crossing remains the exact width of the model.
  const w = CISTERN.water;
  // Four real compartments stop the software depth painter from sorting a
  // broad water triangle over the crossing. Wave UVs remain world-continuous.
  for (const [x0, x1] of [[w.x0, -1.6], [1.6, w.x1]]) {
    for (const [z0, z1] of [[w.z0, -6.6], [-3.4, w.z1]]) {
      const x = (x0 + x1) / 2, z = (z0 + z1) / 2;
      m.box(x, -.3275, z, x1 - x0, .055, z1 - z0, C.water, 3);
      m.box(x, -1.10, z, x1 - x0, .14, z1 - z0, tint(dark, .6), 7);
    }
  }
  for (const x of [-6, 6]) for (const z of [-8.35, -1.65]) {
    m.box(x, -.045, z, .24, .24, 3.3, pale);
    for (let j = 0; j < 5; j++) m.box(x, .092, z - 1.32 + j * .66, .30, .05, .59, tint(stone, .93 + random() * .12));
  }
  for (const z of [-10, 0]) for (const x of [-3.83, 3.83]) {
    m.box(x, -.04, z, 4.34, .26, .24, pale);
    for (let j = 0; j < 7; j++) m.box(x - 1.86 + j * .62, .092, z, .56, .05, .30, tint(stone, .9 + random() * .12));
  }
  // Restrained iron guard rails mark water, rather than fence the player in.
  function rail(a, b) {
    m.tube([a[0], .76, a[1]], [b[0], .76, b[1]], .026, .026, iron, 1, 6);
    for (let i = 0; i <= 3; i++) {
      const t = i / 3, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      m.cylinder(x, .39, z, .035, .76, iron, 1, 6);
      m.cylinder(x, .08, z, .082, .09, brass, 1, 8);
    }
  }
  for (const x of [-1.67, 1.67]) { rail([x, -9.8], [x, -6.8]); rail([x, -3.2], [x, -.2]); }
  for (const z of [-6.67, -3.33]) { rail([-5.8, z], [-1.85, z]); rail([1.85, z], [5.8, z]); }
  for (const x of [-1.44, 1.44]) m.box(x, .027, -5, .045, .011, 9.6, brass, 1);
  for (const z of [-6.42, -3.58]) for (const x of [-3.8, 3.8]) m.box(x, .029, z, 4.1, .012, .042, brass, 1);

  // Thick staggered masonry, with individual lengths and recessed joints.
  // Front/right walls are deliberately cut below the player's upper body.
  function wall(axis, fixed, from, to, height, thickness = .85) {
    const length = to - from;
    if (length <= 0) return;
    const center = (from + to) / 2;
    const box = (u, y, len, h, depth, col) => axis === 'x'
      ? m.box(fixed, y, u, depth, h, len, col)
      : m.box(u, y, fixed, len, h, depth, col);
    box(center, height / 2 - .08, length + .06, height, thickness, dark);
    let y = .08, row = 0;
    while (y < height - .06) {
      const h = Math.min(.43 + random() * .15, height - y);
      let u = from - (row % 2 ? .5 : 0);
      while (u < to - .04) {
        const len = .78 + random() * .65, left = Math.max(from, u), right = Math.min(to, u + len - .035);
        if (right > left + .04) box((left + right) / 2, y + h / 2, right - left, h - .025,
          thickness + .05 + random() * .07, tint(stone, .76 + random() * .30));
        u += len;
      }
      y += h; row++;
    }
    box(center, .18, length + .15, .19, thickness + .20, tint(pale, .78));
    if (height > 2) box(center, height - .12, length + .10, .14, thickness + .22, tint(pale, .76));
  }
  wall('x', -3.65, 4.1, 16.6, 4.1, 1.03); wall('x', 3.60, 4.1, 16.6, .67, .87);
  wall('x', -11.72, -14.3, 4.1, 4.65, 1.12); wall('x', 11.72, -14.3, 4.1, .85, 1.05);
  wall('z', 4.65, -11.9, -3.2, .65, .93); wall('z', 4.65, 3.2, 11.9, .58, .93);
  wall('z', -14, -11.8, -2.28, 4.95, .25); wall('z', -14, 2.28, 11.8, 4.95, .25);
  wall('x', -8.72, -30.6, -14.7, 5.6, 1.1); wall('x', 8.72, -30.6, -14.7, 1.12, 1.06);
  wall('z', -30.83, -9.1, 9.1, 6.15, 1.4);

  // Slender fluted piers sit entirely within the existing circular blockers.
  for (const p of CISTERN.pillars) {
    const r = p.radius, x = p.x, z = p.z, height = z > 4 ? 4.15 : z < -14 ? 4.9 : 4.6;
    m.cylinder(x, .095, z, r, .19, tint(pale, .74), 0, 10);
    m.cylinder(x, .25, z, r * .91, .14, pale, 0, 10);
    m.cylinder(x, .43, z, r * .72, .23, tint(pale, .88), 0, 10, r * .64);
    m.cylinder(x, (height + .5) / 2, z, r * .62, height - .5, stone, 0, 12, r * .54);
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8, dx = Math.cos(a) * r * .59, dz = Math.sin(a) * r * .59;
      m.tube([x + dx, .56, z + dz], [x + dx * .87, height - .35, z + dz * .87], .024, .018, tint(pale, .8), 0, 5);
    }
    for (const y of [.57, height - .32]) m.cylinder(x, y, z, r * .75, .10, tint(pale, .9), 0, 12);
    m.cylinder(x, height - .12, z, r * .72, .24, pale, 0, 10, r * 1.02);
    m.box(x, height + .06, z, r * 2.02, .16, r * 2.02, tint(pale, .91));
    for (const side of [-1, 1]) m.tube([x + side * r * .45, height - .11, z], [x + side * r * .95, height + .22, z], .07, .035, tint(pale, .8), 0, 6);
    m.cylinder(x, height + .18, z, r * .85, .07, brass, 1, 10);
  }

  // The camera-facing arch crowns have collapsed. Their two thick haunches
  // retain architectural weight while the whole central sightline stays open.
  function brokenArch(x, z, radius, spring, thickness, depth, color) {
    const point = (r, a, dz) => [x + Math.cos(a) * r, spring + Math.sin(a) * r, z + dz];
    for (const [start, end] of [[0, PI * .235], [PI * .765, PI]]) {
      for (let i = 0; i < 6; i++) {
        const a = start + (end - start) * i / 6, b = start + (end - start) * (i + .94) / 6;
        const f = [point(radius, a, -depth / 2), point(radius + thickness, a, -depth / 2),
          point(radius + thickness, b, -depth / 2), point(radius, b, -depth / 2)];
        const back = f.map(p => [p[0], p[1], p[2] + depth]);
        m.quad(...f, color, 0); m.quad(back[3], back[2], back[1], back[0], color, 0);
        m.quad(f[0], f[3], back[3], back[0], dark, 0);
        m.quad(f[1], back[1], back[2], f[2], color, 0);
        m.quad(f[0], back[0], back[1], f[1], color, 0);
        m.quad(f[3], f[2], back[2], back[3], tint(color, .87), 0);
      }
    }
  }
  brokenArch(0, 3.65, 3.15, 3.05, .38, .85, tint(stone, .84));
  brokenArch(0, 16.35, 3.15, 2.25, .44, 1.05, tint(pale, .84));
  for (const x of [-3.37, 3.37]) {
    m.box(x, 1.12, 16.35, .46, 2.24, 1.10, tint(stone, .86));
    m.box(x, .20, 16.35, .65, .4, 1.20, tint(pale, .8));
  }
  brokenArch(0, -14, 2.03, 2.65, .53, .42, tint(pale, .83));
  for (const x of [-2.28, 2.28]) {
    m.box(x, 1.30, -14, .51, 2.6, .41, stone);
    m.box(x, .24, -14, .54, .48, .45, tint(pale, .86));
    for (let y = .70; y < 2.5; y += .38) m.box(x, y, -13.79, .32, .13, .035, brass, 1);
  }
  // No complete low roof spans the arena. Broken ribs rise from its rear wall.
  for (const side of [-1, 1]) {
    m.tube([side * 7.9, 4.5, -27.2], [side * 5.6, 6.5, -27.2], .20, .15, tint(stone, .82), 0, 8);
    m.tube([side * 5.6, 6.5, -27.2], [side * 3.7, 7.1, -27.2], .15, .11, tint(stone, .88), 0, 7);
    m.box(side * 7.55, 4.44, -27.2, .8, .26, 1.15, tint(pale, .78));
  }

  // Buttresses, recessed drain windows and narrow carved shrine faces.
  for (const z of [2.0, -3.5, -8.5, -12.0]) {
    const x = -12.1;
    m.box(x, 2.0, z, 1.0, 4.0, 1.05, tint(stone, .86));
    m.box(x - .10, .39, z, 1.4, .78, 1.45, dark);
    m.box(x, 3.94, z, 1.25, .25, 1.30, tint(pale, .8));
    m.tube([x + .18, 3.8, z], [x + .80, 4.8, z], .19, .13, tint(stone, .82), 0, 7);
  }
  function grate(x, y, z, width, height, sideWall = false) {
    if (sideWall) {
      m.box(x, y, z, .045, height, width, tint(dark, .4));
      for (let i = 0; i < 7; i++) m.box(x + .045, y, z - width * .44 + i * width * .146, .052, height, .032, iron, 1);
      for (const yy of [y - height * .46, y + height * .46]) m.box(x + .06, yy, z, .08, .075, width + .08, rust, 1);
    } else {
      m.box(x, .027, z, width, .015, height, tint(dark, .4));
      for (let i = 0; i < 9; i++) m.box(x - width * .44 + i * width * .11, .041, z, .026, .014, height, iron, 1);
      for (const zz of [z - height * .43, z + height * .43]) m.box(x, .045, zz, width, .014, .035, rust, 1);
    }
  }
  for (const z of [5.3, 8.0, 12.4]) grate(-3.10, 1.15, z, 1.15, 1.55, true);
  for (const z of [1.0, -10.6]) for (const x of [-10.15, 10.15]) grate(x, 0, z, .62, 1.2);

  // Waterworks: pipes follow wall bases and only cross lanes as flush inlays.
  for (const side of [-1, 1]) {
    const x = side * 11.27;
    m.tube([x, .46, 3.2], [x, .46, -12.8], .14, .14, tint(brass, .83), 1, 10);
    for (const z of [2.1, -1.5, -5.0, -8.5, -12.1]) {
      m.box(x, .46, z, .41, .51, .105, iron, 1);
      for (const dz of [-.10, .10]) m.tube([x, .46, z + dz - .032], [x, .46, z + dz + .032], .185, .185, rust, 1, 10);
    }
    m.tube([side * 6.18, -.20, -12.4], [side * 6.18, -.20, -10.10], .22, .22, iron, 1, 12);
    for (const z of [-12.1, -10.5]) m.cylinder(side * 6.18, -.20, z, .27, .1, brass, 1, 10);
  }

  // The tuning spheres hover over flush medallions; side-wall shrines carry
  // their mechanisms, keeping the interaction tile itself freely walkable.
  for (const r of CISTERN.resonators) {
    const side = Math.sign(r.x), x = side * 11.35;
    m.ring(r.x, .031, r.z, .84, .99, tint(brass, .85), 1, 0, 1, 40);
    m.ring(r.x, .032, r.z, .57, .61, tint(pale, .85), 0, 0, 1, 32);
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8;
      m.box(r.x + Math.cos(a) * .73, .034, r.z + Math.sin(a) * .73, .09, .012, .19, brass, 1, 0, -a);
    }
    m.box((r.x + x) / 2, .030, r.z, Math.abs(x - r.x), .012, .054, brass, 1);
    m.box(x, 1.65, r.z, .16, 3.2, 1.58, tint(dark, .63));
    for (const dz of [-.65, .65]) {
      m.cylinder(x - side * .20, 1.25, r.z + dz, .095, 2.45, brass, 1, 10);
      m.sphere(x - side * .20, 2.54, r.z + dz, .14, tint(pale, .85), 1, 0, 8, 5);
    }
    for (const y of [.36, 1.18, 2.31]) m.box(x - side * .18, y, r.z, .18, .11, 1.54, brass, 1);
    for (let i = 0; i < 6; i++) m.tube([x - side * .25, .54 + i * .28, r.z - .4], [x - side * .25, .70 + i * .28, r.z + .4], .025, .025, iron, 1, 6);
  }

  // The back shrine has a suspended drowned bell and two monumental figures.
  // Their masses sit beyond the collision boundary, so silhouettes imply a
  // larger ruin without obstructing the boss arena or the camera-facing side.
  function statue(x, z, facing = 1) {
    m.box(x, .37, z, 1.75, .74, 1.50, tint(stone, .77));
    m.box(x, .82, z, 1.43, .18, 1.24, tint(pale, .85));
    m.cylinder(x, 1.56, z, .61, 1.38, dark, 0, 7, .48);
    m.cylinder(x, 2.65, z, .48, 1.06, tint(stone, .87), 0, 8, .72);
    m.sphere(x, 3.48, z, .44, tint(pale, .80), 0, 0, 9, 6, [.79, 1.3, .88]);
    m.sphere(x, 3.75, z - .04, .48, tint(dark, .95), 0, 0, 9, 5, [1.03, 1.0, 1.0]);
    m.box(x, 3.39, z + facing * .25, .44, .26, .13, tint(dark, .58));
    for (const side of [-1, 1]) {
      m.tube([x + side * .62, 2.95, z], [x + side * .88, 2.30, z + facing * .37], .21, .16, tint(stone, .82), 0, 7);
      m.tube([x + side * .88, 2.30, z + facing * .37], [x + side * .39, 2.05, z + facing * .66], .16, .13, tint(pale, .8), 0, 7);
      m.cylinder(x + side * .22, 1.20, z + .13, .19, .8, tint(stone, .77), 0, 7);
    }
    m.cylinder(x, 1.96, z + facing * .65, .56, .25, brass, 1, 12, .68);
    m.cylinder(x, 2.09, z + facing * .65, .54, .04, tint(dark, .5), 1, 12);
  }
  statue(-8.9, -28.4); statue(8.9, -28.4);
  m.arch(0, -30.05, 2.48, 2.12, .33, .38, tint(pale, .73));
  for (let i = 0; i < 28; i++) {
    const a = i * TAU / 28, b = (i + .87) * TAU / 28;
    m.tube([Math.cos(a) * 2.83, 3.17 + Math.sin(a) * 2.83, -29.72],
      [Math.cos(b) * 2.83, 3.17 + Math.sin(b) * 2.83, -29.72], .065, .065, brass, 1, 6);
  }
  m.cylinder(0, 3.13, -29.42, .76, 1.46, tint(brass, .9), 1, 18, .38);
  m.cylinder(0, 2.35, -29.42, .92, .15, tint(brass, 1.04), 1, 20);
  m.cylinder(0, 3.90, -29.42, .40, .12, iron, 1, 12);
  m.tube([0, 5.80, -29.42], [0, 3.95, -29.42], .055, .055, iron, 1, 8);
  m.tube([0, 2.36, -29.42], [0, 2.09, -29.42], .055, .085, iron, 1, 8);
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    m.box(Math.cos(a) * .73, 2.46, -29.42 + Math.sin(a) * .73, .10, .17, .08, rust, 1, 0, -a);
  }
  // Low inlaid concentric masonry gives the boss space a focal center.
  for (const radius of [2.85, 4.25]) m.ring(0, .030, -24, radius, radius + .045, tint(brass, .72), 1, 0, 1, 64);
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    m.box(Math.cos(a) * 3.55, .032, -24 + Math.sin(a) * 3.55, .045, .012, .28, tint(pale, .76), 0, 0, -a);
  }

  // Hanging chains are concentrated at the edges and far wall.
  function chain(x, top, z, length) {
    for (let j = 0; j < length / .19; j++) {
      const y = top - j * .19, a = j % 2 ? .07 : .025, b = j % 2 ? .025 : .07;
      m.tube([x - a, y, z - b], [x - a, y - .15, z - b], .014, .014, iron, 1, 5);
      m.tube([x + a, y, z + b], [x + a, y - .15, z + b], .014, .014, iron, 1, 5);
      m.tube([x - a, y, z - b], [x + a, y, z + b], .014, .014, rust, 1, 5);
    }
  }
  chain(-10.9, 5.6, -7.9, 3.15); chain(-7.65, 6.5, -29.2, 2.35); chain(7.65, 6.5, -29.2, 2.8);
  chain(-3.15, 4.8, 7.7, 2.1);

  // Hardware supports the renderer's local amber flames at exact positions.
  const torches = [[-3.15, 1.9, 6], [3.15, 1.9, 10], [-3.15, 1.9, 14], [-11.25, 2, 1.5], [11.25, 2, 1.5],
    [-11.25, 2, -11.5], [11.25, 2, -11.5], [-8.25, 2.2, -19], [8.25, 2.2, -19], [-8.25, 2.2, -27.5], [8.25, 2.2, -27.5]];
  for (const [x, y, z] of torches) {
    m.box(x, y - .45, z, .15, .62, .18, iron, 1);
    m.cylinder(x, y - .12, z, .13, .20, tint(brass, .8), 1, 9, .23);
    for (let j = 0; j < 6; j++) {
      const a = j * TAU / 6;
      m.tube([x + Math.cos(a) * .14, y - .2, z + Math.sin(a) * .14],
        [x + Math.cos(a) * .24, y + .05, z + Math.sin(a) * .24], .018, .016, iron, 1, 5);
    }
  }

  // Broken masonry and moss gather beyond the walk boundaries; nothing is
  // scattered arbitrarily into the bridge, combat floor or interaction tiles.
  for (const side of [-1, 1]) for (let i = 0; i < 38; i++) {
    const z = 16.7 - i * 1.29, bound = z > 4 ? 3.5 : z < -14 ? 8.7 : 11.7;
    const x = side * (bound + .35 + random() * 1.35), radius = .16 + random() * .40;
    m.sphere(x, .04 + radius * .12, z + (random() - .5) * .6, radius,
      tint(stone, .6 + random() * .35), 7, 0, 5 + i % 3, 3, [1.4, .55 + random() * .5, 1]);
    if (i % 3 === 0) m.sphere(x - side * .13, .03, z + .34, radius * 1.2,
      tint(moss, .70 + random() * .40), 7, 0, 6, 3, [1.4, .12, 1.0]);
  }
  // Broken chunks at the rear are deliberate collapsed architecture.
  for (let i = 0; i < 16; i++) {
    const x = -8.1 + i * 1.08, z = -31.2 - random() * 1.5;
    m.box(x, .15 + random() * .25, z, .7 + random() * .5, .36 + random() * .65,
      .65 + random() * .6, tint(stone, .65 + random() * .3), 0, 0, random() * 1.8);
  }

  // A restrained threshold seal identifies the return point clearly.
  m.ring(CISTERN.exit.x, .035, CISTERN.exit.z, .69, .75, tint(brass, 1.05), 1, 0, 1, 40);
  for (const x of [-.97, .97]) m.box(x, .034, 14.0, .05, .012, 1.65, brass, 1);
  m.box(0, .032, 14.88, 2.0, .014, .08, pale);
  appendCisternCeramicCraft(m, CISTERN);
  return m;
}

// Broad glazed craft gives the three chambers distinct silhouettes and colour.
// These are attached architectural faces, not another scatter of loose props.
const CRAFT={teal:[.12,.37,.36],deep:[.055,.19,.23],ivory:[.64,.71,.64],copper:[.56,.35,.18],gold:[.70,.55,.30],signal:[.23,.84,.70],warm:[.92,.62,.27]};
const TAU541=Math.PI*2;
const craftTint=(c,t)=>c.map(v=>Math.max(0,Math.min(1,v*t)));

function sideFace(m,side,x,y,z,w,h,color,material=6,emission=0){
 const a=[x,y-h/2,z-w/2],b=[x,y+h/2,z-w/2],c=[x,y+h/2,z+w/2],d=[x,y-h/2,z+w/2];
 if(side<0)m.quad(a,b,c,d,color,material,emission,1,[1,0,0]);
 else m.quad(d,c,b,a,color,material,emission,1,[-1,0,0]);
}
function sideRing(m,side,x,y,z,inner,outer,colors,segments=16,angle=0,material=6,emission=0,slant=0){
 const tangent=Math.sqrt(1-slant*slant),p=(r,a)=>[x+side*slant*Math.cos(a)*r,y+Math.sin(a)*r,z+tangent*Math.cos(a)*r];
 for(let i=0;i<segments;i++){
  const a=angle+i*TAU541/segments,b=angle+(i+1)*TAU541/segments,col=colors[i%colors.length];
  const q=[p(inner,a),p(inner,b),p(outer,b),p(outer,a)];
  if(side<0)m.quad(...q,col,material,emission);else m.quad(q[3],q[2],q[1],q[0],col,material,emission);
 }
}
function sideDisc(m,side,x,y,z,r,color,material=6,emission=0,segments=8,angle=0,slant=0){
 const tangent=Math.sqrt(1-slant*slant),center=[x,y,z],p=a=>[x+side*slant*Math.cos(a)*r,y+Math.sin(a)*r,z+tangent*Math.cos(a)*r];
 for(let i=0;i<segments;i++){
  const a=p(angle+i*TAU541/segments),b=p(angle+(i+1)*TAU541/segments);
  if(side<0)m.tri(center,b,a,color,material,emission,1,[tangent,0,slant]);
  else m.tri(center,a,b,color,material,emission,1,[-tangent,0,slant]);
 }
}
const craftStation=(side,orbZ=-5)=>({side,x:side*10.35,y:3.75,z:orbZ+(side<0?-3.5:1.5),slant:.62});
function appendCisternCeramicCraft(m,CISTERN){
 const start=m.v.length,ranges={};
 let mark=m.v.length;
 // Glazed surrounds belong to the gallery's three existing drain windows.
 // Their opening stays dark and open; all new faces remain behind x=-3.
 for(const z of[5.3,8.0,12.4]){
  const x=-3.073;
  for(const dz of[-.76,.76])sideFace(m,-1,x,1.24,z+dz,.25,1.86,CRAFT.teal);
  sideFace(m,-1,x,.34,z,1.77,.18,CRAFT.ivory);
  sideFace(m,-1,x,2.22,z,1.77,.18,CRAFT.ivory);
  sideFace(m,-1,x+.006,2.22,z,1.28,.07,CRAFT.gold);
  for(const dz of[-.76,.76])sideFace(m,-1,x+.006,1.24,z+dz,.062,1.78,CRAFT.gold);
 }
 ranges.gallery=[mark,m.v.length];mark=m.v.length;

 // The high-water frieze is level across both walls. Interrupted ivory lozenges
 // describe an old flood mark above the live pipework and current water level.
 for(const side of[-1,1]){
  const x=side*11.075;
  for(const[a,b]of[[-13.35,-6.25],[-3.75,3.35]]){
   sideFace(m,side,x,1.38,(a+b)/2,b-a,.34,CRAFT.deep);
   sideFace(m,side,x-side*.003,1.47,(a+b)/2,b-a,.055,CRAFT.gold);
   for(let z=a+.38;z<b-.25;z+=1.50){
    const q=[[x-side*.006,1.38,z-.25],[x-side*.006,1.52,z],[x-side*.006,1.38,z+.25],[x-side*.006,1.24,z]];
    if(side<0)m.quad(...q,CRAFT.ivory,6);else m.quad(q[3],q[2],q[1],q[0],CRAFT.ivory,6);
   }
  }
 }
 // Two large listening fans make the existing resonator shrines recognisable.
 // Both shells hang above head height; the east support stands outside x=11.
 // Exact interaction medallions stay on native floor at x=±8, unobstructed.
 for(const r of CISTERN.resonators){
  const side=Math.sign(r.x),station=craftStation(side,r.z),{x,y:cy,z,slant}=station,tangent=Math.sqrt(1-slant*slant);
  const at=d=>[x-side*tangent*d,cy,z+slant*d];
  sideRing(m,side,...at(0),.17,1.05,[CRAFT.teal,CRAFT.ivory,craftTint(CRAFT.teal,1.22),CRAFT.ivory],12,0,6,0,slant);
  sideRing(m,-side,...at(-.028),.17,1.05,[CRAFT.copper,CRAFT.teal,CRAFT.copper,CRAFT.ivory],12,0,6,0,-slant);
  sideRing(m,side,...at(.008),1.045,1.115,[CRAFT.copper],24,0,1,0,slant);
  sideRing(m,side,...at(.012),.18,.30,[CRAFT.gold],12,0,6,0,slant);
  for(let i=0;i<6;i++){
   const a=i*TAU541/6,point=r=>[x-side*tangent*.018+side*slant*Math.cos(a)*r,cy+Math.sin(a)*r,z+slant*.018+tangent*Math.cos(a)*r];
   m.tube(point(.33),point(1.03),.026,.032,CRAFT.gold,6,4);
  }
  if(side>0){
   // The cutaway side has a real closed-ground pier for its cantilever.
   m.box(11.35,2.275,z,.30,4.55,.80,CRAFT.deep,6);
   m.box(11.35,4.50,z,.60,.14,1.20,CRAFT.copper,1);
  }
  // Both complete shells stay above head height. Their arms visibly meet the
  // tall west masonry or the east closed-ground pier, never an invisible post.
  for(const dz of[-.58,.58]){
   m.box(side*11.15,3.28,z+dz,.13,.62,.24,CRAFT.copper,1);
   m.tube([side*11.14,3.08,z+dz],[x,3.45,z+dz*.6],.072,.055,CRAFT.copper,1,6);
  }
 }
 ranges.cistern=[mark,m.v.length];mark=m.v.length;

 // The established stone shrine and bronze rim stay unobscured.
 // The drowned bell's floor seal is a real eight-point mosaic, not a pedestal.
 for(let i=0;i<8;i++){
  const a=i*TAU541/8,b=a+TAU541/16,point=(r,t)=>[Math.cos(t)*r,.043,-24+Math.sin(t)*r];
  m.tri(point(.52,a),point(.91,b),point(2.62,a),i%2?CRAFT.teal:CRAFT.ivory,6,0,1,[0,1,0]);
  m.tri(point(.52,a),point(2.62,a),point(.91,a-TAU541/16),i%2?CRAFT.ivory:CRAFT.teal,6,0,1,[0,1,0]);
 }
 m.ring(0,.044,-24,.40,.51,CRAFT.gold,6,0,1,24);
 ranges.sanctum=[mark,m.v.length];
 m.cisternArt541={release:'5.41',addedTriangles:(m.v.length-start)/36,ranges};
}

/** Native resonator flags drive the crafted fans, floor feeds and gate badges.
 * Reading this visual state cannot tune a resonator, open a gate or move an actor. */
export function appendCisternCraftDynamics(mesh,glow,state={},time=0){
 if(!mesh?.v||!glow?.v)return null;
 const start=mesh.v.length,glowStart=glow.v.length,flags=[!!state.resonators?.[0],!!state.resonators?.[1]],clock=Number.isFinite(time)?time:0;
 for(let i=0;i<2;i++){
  const side=i?1:-1,orbZ=-5,station=craftStation(side,orbZ),{x,y:cy,z,slant}=station,tangent=Math.sqrt(1-slant*slant),active=flags[i],color=active?CRAFT.signal:CRAFT.warm;
  const at=d=>[x-side*tangent*d,cy,z+slant*d];
  sideDisc(mesh,side,...at(.03),.19,color,4,active?.75:.12,8,0,slant);
  sideDisc(mesh,-side,...at(-.06),.19,color,4,active?.75:.12,8,0,-slant);
  // Broad shutters retain enough projected area for the phone software raster.
  const angle=active?clock*.12:0;
  sideRing(mesh,side,...at(.034),.34,.55,[color,CRAFT.deep,CRAFT.deep,CRAFT.deep],8,angle,6,active?.14:0,slant);
  sideRing(mesh,-side,...at(-.064),.34,.55,[color,CRAFT.deep,CRAFT.deep,CRAFT.deep],8,angle,6,active?.14:0,-slant);
  if(active){
   const minX=Math.min(side*8,side*11.03),maxX=Math.max(side*8,side*11.03);
   mesh.quad([minX,.044,z-.06],[minX,.044,z+.06],[maxX,.044,z+.06],[maxX,.044,z-.06],CRAFT.signal,4,.16,1,[0,1,0]);
   const minZ=Math.min(orbZ,z),maxZ=Math.max(orbZ,z),orbX=side*8;
   mesh.quad([orbX-.06,.044,minZ],[orbX-.06,.044,maxZ],[orbX+.06,.044,maxZ],[orbX+.06,.044,minZ],CRAFT.signal,4,.16,1,[0,1,0]);
   sideRing(glow,side,...at(.038),.23,.29,[CRAFT.signal],8,0,9,.7,slant);
   for(let j=glowStart+11;j<glow.v.length;j+=12)glow.v[j]=.18;
  }
  // The badges sit on the existing gate jambs, beyond its native clear opening.
  mesh.box(side*2.28,2.11,-13.755,.25,.38,.025,color,4,active?.28:.025);
 }
 return {triangles:(mesh.v.length-start+glow.v.length-glowStart)/36,resonators:flags,gateReady:flags.every(Boolean),stations:[craftStation(-1),craftStation(1)]};
}
