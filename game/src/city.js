// LUMEN BAY: Neon Heat — the city itself.
// A low-poly dusk coastal city: a 9x9 road grid, procedural buildings with lit
// windows and neon signs, palm-lined avenues, a beach and sea on the south
// edge, a pier, parks, streetlights and traffic lights. Everything is built
// from boxes, cylinders and canvas textures — no external assets.

import * as THREE from 'three';
import { rand, randi, pick, clamp } from './rng.js';

export const CITY = {
  pitch: 64, // distance between road centre lines
  roadW: 13, // road width
  blocks: 9, // blocks per side
  seed: 20261123,
};

// World coordinates: roads run at x = (i - 4) * pitch, z = (j - 4) * pitch.
// The south edge (z > 230) is beach + sea; the north edge holds the hills.

const PALETTES = [
  { base: '#c98a5e', trim: '#8a5a3b', lit: 0.55 },
  { base: '#7d8aa5', trim: '#4a5568', lit: 0.5 },
  { base: '#b56b7a', trim: '#7a4450', lit: 0.6 },
  { base: '#5e8a7a', trim: '#3b5a4e', lit: 0.45 },
  { base: '#a58a5e', trim: '#6e5a3b', lit: 0.5 },
  { base: '#8a6ba5', trim: '#5a4470', lit: 0.55 },
  { base: '#d8b25e', trim: '#8a6e2e', lit: 0.65 },
  { base: '#6b7a8a', trim: '#44505e', lit: 0.4 },
];

const NEON_SIGNS = [
  { text: 'HOTEL', color: '#ff2d78' },
  { text: 'NEON', color: '#22d3ee' },
  { text: 'DINER', color: '#ffd166' },
  { text: 'CASINO', color: '#ff5e3a' },
  { text: 'PIER', color: '#7ef0c1' },
  { text: 'CLUB', color: '#c084fc' },
  { text: 'TACOS', color: '#ffb020' },
  { text: 'MOTEL', color: '#4dd8ff' },
  { text: 'BAR', color: '#ff7ab8' },
  { text: 'ARCADE', color: '#9dff57' },
];

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function facadeTexture(rng, pal) {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = pal.base;
    g.fillRect(0, 0, w, h);
    // subtle vertical grime
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(0,0,0,' + (rng() * 0.08).toFixed(3) + ')';
      g.fillRect(rng() * w, 0, 2 + rng() * 4, h);
    }
    // window grid
    const cols = 5;
    const rows = 10;
    const cw = w / cols;
    const ch = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = rng() < pal.lit;
        g.fillStyle = lit ? (rng() < 0.7 ? '#ffd27a' : '#9fe8ff') : '#20242e';
        g.fillRect(c * cw + 4, r * ch + 5, cw - 8, ch - 10);
        if (lit && rng() < 0.4) {
          g.fillStyle = 'rgba(0,0,0,0.35)';
          g.fillRect(c * cw + 4, r * ch + 5, cw - 8, (ch - 10) * 0.45);
        }
      }
    }
    // ground floor: shops
    g.fillStyle = pal.trim;
    g.fillRect(0, h - 26, w, 26);
    g.fillStyle = '#ffd27a';
    for (let i = 0; i < 4; i++) g.fillRect(6 + i * 30, h - 20, 22, 14);
  });
}

function neonTexture(sign) {
  return canvasTexture(256, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = 'bold 44px "Arial Narrow", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = sign.color;
    g.shadowBlur = 18;
    g.fillStyle = sign.color;
    g.fillText(sign.text, w / 2, h / 2 + 2);
    g.shadowBlur = 0;
    g.fillStyle = '#ffffff';
    g.font = 'bold 40px "Arial Narrow", Arial, sans-serif';
    g.fillText(sign.text, w / 2, h / 2 + 2);
  });
}

function roadTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#2e2f38';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#34353f';
    for (let i = 0; i < 60; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    g.fillStyle = '#d8c25a';
    g.fillRect(w / 2 - 2, 8, 4, 28);
    g.fillRect(w / 2 - 2, 68, 4, 28);
    g.fillStyle = '#e8e8e8';
    g.fillRect(4, 0, 3, h);
    g.fillRect(w - 7, 0, 3, h);
  });
}

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  const P = CITY.pitch;
  const half = (CITY.blocks * P) / 2; // 288
  const colliders = [];
  const roadLines = []; // x or z coords of road centrelines
  for (let i = 0; i < CITY.blocks; i++) roadLines.push((i - 4) * P);

  // ---- ground: grass/concrete base + roads + beach + sea
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 260, half * 2 + 260),
    new THREE.MeshLambertMaterial({ color: 0x3d5a3a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  ground.receiveShadow = true;
  group.add(ground);

  const roadTex = roadTexture();
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  for (const c of roadLines) {
    const len = half * 2 + 40;
    const rx = new THREE.Mesh(new THREE.PlaneGeometry(len, CITY.roadW), roadMat.clone());
    rx.material.map = roadTex.clone();
    rx.material.map.repeat.set(len / 16, 1);
    rx.material.map.needsUpdate = true;
    rx.rotation.x = -Math.PI / 2;
    rx.position.set(0, 0.02, c);
    rx.receiveShadow = true;
    group.add(rx);
    const rz = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadW, len), roadMat.clone());
    rz.material.map = roadTex.clone();
    rz.material.map.repeat.set(1, len / 16);
    rz.material.map.needsUpdate = true;
    rz.rotation.x = -Math.PI / 2;
    rz.position.set(c, 0.02, 0);
    rz.receiveShadow = true;
    group.add(rz);
  }

  // sidewalks: light strips along every road
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x8a8578 });
  for (const c of roadLines) {
    for (const off of [-CITY.roadW / 2 - 2.5, CITY.roadW / 2 + 2.5]) {
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 40, 0.3, 5), walkMat);
      s1.position.set(0, 0.12, c + off);
      s1.receiveShadow = true;
      group.add(s1);
      const s2 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, half * 2 + 40), walkMat);
      s2.position.set(c + off, 0.12, 0);
      s2.receiveShadow = true;
      group.add(s2);
    }
  }

  // beach + sea on the south edge (z > 250)
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 260, 90),
    new THREE.MeshLambertMaterial({ color: 0xd8b98a }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.0, half + 45);
  sand.receiveShadow = true;
  group.add(sand);

  const seaMat = new THREE.MeshPhongMaterial({
    color: 0x1a6a8a, shininess: 120, specular: 0xff9a5a, transparent: true, opacity: 0.94,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 900, 700), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.4, half + 90 + 350);
  group.add(sea);

  // pier reaching into the sea
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3b });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 120), pierMat);
  pier.position.set(64, 1.2, half + 90 + 40);
  pier.castShadow = true;
  pier.receiveShadow = true;
  group.add(pier);
  colliders.push({ x: 64, z: half + 90 + 40, hx: 7, hz: 60 });
  for (let i = 0; i < 6; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3, 6), pierMat);
    post.position.set(64 + (i % 2 === 0 ? -6 : 6), 0.5, half + 50 + i * 16);
    group.add(post);
  }
  // ferris wheel at the pier end — the skyline landmark
  const wheel = buildFerrisWheel(group, 64, half + 90 + 95);

  // ---- buildings: one to three per block, parks on some blocks
  const facadeTexs = PALETTES.map((p) => facadeTexture(rng, p));
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x2a2d36 });
  const neonMats = NEON_SIGNS.map(
    (s) => new THREE.MeshBasicMaterial({ map: neonTexture(s), transparent: true, side: THREE.DoubleSide }),
  );
  let buildingCount = 0;
  for (let bx = -4; bx <= 4; bx++) {
    for (let bz = -4; bz <= 4; bz++) {
      const cx = bx * P;
      const cz = bz * P;
      // south row is beachfront: hotels only, set back from the sand
      const beachfront = bz === 4;
      // a few blocks are parks / plazas
      const isPark = !beachfront && rng() < 0.14;
      const isPlaza = !beachfront && !isPark && rng() < 0.08;
      if (isPark) {
        buildPark(group, cx, cz, rng, colliders);
        continue;
      }
      if (isPlaza) {
        buildPlaza(group, cx, cz, rng);
        continue;
      }
      const n = beachfront ? 1 : randi(rng, 1, 3);
      for (let k = 0; k < n; k++) {
        const w = rand(rng, 16, 30);
        const d = rand(rng, 16, 30);
        const hgt = beachfront ? rand(rng, 26, 55) : rand(rng, 10, 58);
        const ox = n === 1 ? 0 : (k - (n - 1) / 2) * 16 + rand(rng, -3, 3);
        const oz = n === 1 ? 0 : (k % 2 === 0 ? -9 : 9) + rand(rng, -3, 3);
        const x = cx + ox;
        const z = cz + oz;
        if (Math.abs(x) > half - 12 || Math.abs(z) > half - 12) continue;
        const mat = new THREE.MeshLambertMaterial({ map: pick(rng, facadeTexs) });
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, hgt, d);
        b.position.set(x, hgt / 2, z);
        b.castShadow = true;
        b.receiveShadow = true;
        group.add(b);
        const roof = new THREE.Mesh(boxGeo, roofMat);
        roof.scale.set(w + 0.6, 1.2, d + 0.6);
        roof.position.set(x, hgt + 0.6, z);
        group.add(roof);
        // rooftop AC boxes
        for (let a = 0; a < randi(rng, 1, 3); a++) {
          const ac = new THREE.Mesh(boxGeo, roofMat);
          ac.scale.set(rand(rng, 2, 4), 1.6, rand(rng, 2, 4));
          ac.position.set(x + rand(rng, -w / 4, w / 4), hgt + 2, z + rand(rng, -d / 4, d / 4));
          group.add(ac);
        }
        colliders.push({ x, z, hx: w / 2, hz: d / 2 });
        buildingCount++;
        // neon sign on tall / beachfront buildings
        if ((beachfront || hgt > 34) && rng() < 0.75) {
          const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 3.5),
            pick(rng, neonMats),
          );
          sign.position.set(x, hgt * 0.82, z + d / 2 + 0.4);
          group.add(sign);
        }
      }
    }
  }

  // ---- palms along avenues and the beach
  const palmTrunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3b });
  const palmLeafMat = new THREE.MeshLambertMaterial({ color: 0x2e8a4a, side: THREE.DoubleSide });
  const palms = [];
  for (const c of roadLines) {
    for (let i = -4; i <= 4; i++) {
      if (rng() < 0.5) continue;
      const x = i * P + rand(rng, -6, 6);
      palms.push([x + 11, c + 11]);
    }
  }
  for (let i = 0; i < 20; i++) palms.push([rand(rng, -half, half), half + rand(rng, 8, 40)]);
  for (const [x, z] of palms) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, rand(rng, 6, 9), 6), palmTrunkMat);
    trunk.position.set(x, 3.5, z);
    trunk.rotation.z = rand(rng, -0.08, 0.08);
    trunk.castShadow = true;
    group.add(trunk);
    for (let f = 0; f < 6; f++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 4), palmLeafMat);
      const a = (f / 6) * Math.PI * 2;
      leaf.position.set(x + Math.cos(a) * 1.6, 7.6, z + Math.sin(a) * 1.6);
      leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      leaf.castShadow = true;
      group.add(leaf);
    }
  }

  // ---- streetlights along the main avenues
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f4a });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const lampGlow = [];
  for (const c of [-128, 0, 128]) {
    for (let i = -4; i <= 4; i++) {
      const x = i * P;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 6), poleMat);
      pole.position.set(x + 8, 3.5, c + 8);
      group.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(3, 0.18, 0.18), poleMat);
      arm.position.set(x + 6.6, 6.9, c + 8);
      group.add(arm);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
      lamp.position.set(x + 5.2, 6.8, c + 8);
      group.add(lamp);
      lampGlow.push(lamp);
    }
  }

  // ---- traffic lights at the four central intersections
  const tlMats = {
    red: new THREE.MeshBasicMaterial({ color: 0xff2d2d }),
    amber: new THREE.MeshBasicMaterial({ color: 0xffb020 }),
    green: new THREE.MeshBasicMaterial({ color: 0x39d353 }),
    off: new THREE.MeshBasicMaterial({ color: 0x222222 }),
  };
  const trafficLights = [];
  for (const cx of [-64, 64]) {
    for (const cz of [-64, 64]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 6, 6), poleMat);
      pole.position.set(cx + 9, 3, cz + 9);
      group.add(pole);
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.6, 1.1), poleMat);
      box.position.set(cx + 9, 6.4, cz + 9);
      group.add(box);
      const dots = [];
      for (let k = 0; k < 3; k++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), tlMats.off);
        dot.position.set(cx + 9, 7.3 - k * 0.85, cz + 9.6);
        group.add(dot);
        dots.push(dot);
      }
      trafficLights.push({ dots, phase: randi(rng, 0, 2), t: rand(rng, 0, 3) });
    }
  }

  // ---- northern hills silhouette
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x2e3a55 });
  for (let i = 0; i < 7; i++) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(rand(rng, 60, 110), rand(rng, 40, 90), 7), hillMat);
    hill.position.set(-half - 60 + i * 95 + rand(rng, -20, 20), 0, -half - 90);
    group.add(hill);
  }

  // skyline billboards on the two main avenues
  const billboards = [
    { x: -64, z: -140, text: 'LUMEN BAY', color: '#ff2d78' },
    { x: 128, z: 64, text: 'NEON HEAT', color: '#22d3ee' },
    { x: 0, z: 192, text: 'VICE CITY? NO. LUMEN BAY.', color: '#ffd166' },
  ];
  for (const b of billboards) {
    const tex = canvasTexture(512, 128, (g, w, h) => {
      g.fillStyle = '#14121f';
      g.fillRect(0, 0, w, h);
      g.font = 'bold 56px "Arial Narrow", Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = b.color;
      g.shadowBlur = 24;
      g.fillStyle = b.color;
      g.fillText(b.text, w / 2, h / 2);
    });
    // two planes back to back so the text reads correctly from either side
    const boardMat = new THREE.MeshBasicMaterial({ map: tex });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(26, 6.5), boardMat);
    board.position.set(b.x, 16, b.z);
    group.add(board);
    const boardBack = new THREE.Mesh(new THREE.PlaneGeometry(26, 6.5), boardMat);
    boardBack.position.set(b.x, 16, b.z - 0.15);
    boardBack.rotation.y = Math.PI;
    group.add(boardBack);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(1, 12, 1), poleMat);
    legs.position.set(b.x, 6, b.z);
    group.add(legs);
  }

  return {
    group,
    colliders,
    roadLines,
    half,
    sea,
    wheel,
    lampGlow,
    trafficLights,
    tlMats,
    buildingCount,
    spawn: { x: 0, z: 96 },
    update(dt, t) {
      // sea shimmer
      sea.position.y = -0.4 + Math.sin(t * 0.5) * 0.15;
      // ferris wheel turns slowly
      if (wheel) wheel.rotation.z += dt * 0.12;
      // traffic lights cycle
      for (const tl of trafficLights) {
        tl.t += dt;
        if (tl.t > 3.2) {
          tl.t = 0;
          tl.phase = (tl.phase + 1) % 3;
        }
        const order = [tlMats.red, tlMats.green, tlMats.amber];
        tl.dots.forEach((d, k) => {
          d.material = k === tl.phase ? order[tl.phase] : tlMats.off;
        });
      }
    },
  };
}

function buildPark(group, cx, cz, rng, colliders) {
  const grass = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.5, 46),
    new THREE.MeshLambertMaterial({ color: 0x4a7a3f }),
  );
  grass.position.set(cx, 0.22, cz);
  grass.receiveShadow = true;
  group.add(grass);
  const treeMat = new THREE.MeshLambertMaterial({ color: 0x2e6a35 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2b });
  for (let i = 0; i < 5; i++) {
    const x = cx + rand(rng, -16, 16);
    const z = cz + rand(rng, -16, 16);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3, 6), trunkMat);
    trunk.position.set(x, 1.5, z);
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(rand(rng, 2.5, 4), 8, 6), treeMat);
    crown.position.set(x, 5, z);
    crown.castShadow = true;
    group.add(crown);
    colliders.push({ x, z, hx: 0.8, hz: 0.8 });
  }
  // fountain
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5.5, 1.2, 12),
    new THREE.MeshLambertMaterial({ color: 0x9aa0aa }),
  );
  basin.position.set(cx, 0.8, cz);
  group.add(basin);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 4.4, 0.4, 12),
    new THREE.MeshPhongMaterial({ color: 0x2a9ac8, shininess: 140 }),
  );
  water.position.set(cx, 1.3, cz);
  group.add(water);
  colliders.push({ x: cx, z: cz, hx: 5, hz: 5 });
}

function buildPlaza(group, cx, cz, rng) {
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.5, 46),
    new THREE.MeshLambertMaterial({ color: 0x7a7568 }),
  );
  slab.position.set(cx, 0.22, cz);
  slab.receiveShadow = true;
  group.add(slab);
  // statue
  const ped = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), new THREE.MeshLambertMaterial({ color: 0x8a8578 }));
  ped.position.set(cx, 1.2, cz);
  group.add(ped);
  const fig = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.4, 6, 8),
    new THREE.MeshLambertMaterial({ color: 0xc8a24a }),
  );
  fig.position.set(cx, 5.2, cz);
  fig.castShadow = true;
  group.add(fig);
}

function buildFerrisWheel(group, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 26, z);
  const rimMat = new THREE.MeshBasicMaterial({ color: 0xff2d78 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(16, 0.5, 8, 24), rimMat);
  g.add(rim);
  const spokeMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.4, 32, 0.4), spokeMat);
    spoke.rotation.z = (i / 8) * Math.PI;
    g.add(spoke);
  }
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0x22d3ee });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), cabinMat);
    cab.position.set(Math.cos(a) * 16, Math.sin(a) * 16, 0);
    g.add(cab);
  }
  // support legs
  const legMat = new THREE.MeshLambertMaterial({ color: 0x3a3f4a });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1, 26, 1), legMat);
    leg.position.set(s * 8, -13, 0);
    leg.rotation.z = s * 0.3;
    g.add(leg);
  }
  group.add(g);
  return g;
}

export function collideCircle(colliders, x, z, r) {
  // returns push-out correction {x, z} or null
  for (const c of colliders) {
    const nx = clamp(x, c.x - c.hx, c.x + c.hx);
    const nz = clamp(z, c.z - c.hz, c.z + c.hz);
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        return { x: (dx / d) * (r - d), z: (dz / d) * (r - d) };
      }
      return { x: 0, z: r };
    }
  }
  return null;
}
