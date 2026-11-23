// LUMEN BAY: Neon Heat — vehicles.
// Low-poly box-built cars, traffic that follows the road grid, police units
// that chase, ram and roadblock, and the police helicopter with its spotlight.

import * as THREE from 'three';
import { rand, randi, pick, clamp, angleLerp } from './rng.js';

const CAR_COLORS = [
  0xff5e3a, 0x22d3ee, 0xffd166, 0x9dff57, 0xc084fc, 0xff7ab8,
  0x4dd8ff, 0xe8e8e8, 0x2a2d36, 0xb56b7a, 0x7ef0c1, 0xffb020,
];

const CAR_NAMES = [
  'RUKAN PELO GT', 'VULCAR NEBULA', 'BENSON STRAY', 'KARIN SUNSET',
  'DUNDREARY COUPE', 'OBEY TAILGATER', 'VAPID DOMINATOR', 'PFISTER COMET',
  'GROTTI FURIOSO', 'DEWBAUCHEE RAPID', 'ALBANY BUCCANEER', 'BRAVADO GAUNTLET',
];

export function makeCarMesh(opts = {}) {
  const {
    color = 0xff5e3a, police = false, taxi = false, name = 'CAR',
  } = opts;
  const g = new THREE.Group();
  g.name = name;

  const bodyMat = new THREE.MeshLambertMaterial({ color: police ? 0xf2f2f2 : color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x14161c });
  const glassMat = new THREE.MeshPhongMaterial({ color: 0x0e1a24, shininess: 160, specular: 0x88bbdd });
  const chromeMat = new THREE.MeshLambertMaterial({ color: 0xc8ccd4 });

  // body
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  // hood / trunk shaping
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 1.1), bodyMat);
  hood.position.set(0, 0.78, 1.55);
  hood.castShadow = true;
  g.add(hood);
  // cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.62, 2.1), glassMat);
  cabin.position.set(0, 1.12, -0.25);
  cabin.castShadow = true;
  g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.1, 2.0), bodyMat);
  roof.position.set(0, 1.46, -0.25);
  g.add(roof);

  if (police) {
    // black doors band
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.4, 1.6), darkMat);
    band.position.set(0, 0.55, -0.2);
    g.add(band);
    const star = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    star.position.set(1.02, 0.6, -0.2);
    g.add(star);
    const star2 = star.clone();
    star2.position.x = -1.02;
    g.add(star2);
  }
  if (taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    sign.position.set(0, 1.6, -0.25);
    g.add(sign);
  }

  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0c0d10 });
  const hubMat = new THREE.MeshLambertMaterial({ color: 0x9aa0aa });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    w.castShadow = true;
    g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 8), hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(wx, 0.36, wz);
    g.add(hub);
    wheels.push(w);
  }

  // headlights + taillights
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2d2d });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.08), headMat);
    h.position.set(s * 0.62, 0.62, 2.22);
    g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), tailMat);
    t.position.set(s * 0.62, 0.62, -2.22);
    g.add(t);
  }
  // bumpers
  const bump = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.22, 0.2), chromeMat);
  bump.position.set(0, 0.32, 2.22);
  g.add(bump);
  const bump2 = bump.clone();
  bump2.position.z = -2.22;
  g.add(bump2);

  // police light bar
  let lightBar = null;
  if (police) {
    lightBar = new THREE.Group();
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2d2d }));
    r.position.x = -0.3;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    b.position.x = 0.3;
    lightBar.add(r);
    lightBar.add(b);
    lightBar.position.set(0, 1.56, -0.25);
    lightBar.userData = { red: r, blue: b };
    g.add(lightBar);
  }

  g.userData = { wheels, lightBar, color, police, name };
  return g;
}

// ---------- traffic ----------

export class Traffic {
  constructor(scene, city, rng, count = 14) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.cars = [];
    const lines = city.roadLines;
    for (let i = 0; i < count; i++) {
      const taxi = rng() < 0.15;
      const mesh = makeCarMesh({
        color: pick(rng, CAR_COLORS),
        taxi,
        name: pick(rng, CAR_NAMES),
      });
      scene.add(mesh);
      const axis = rng() < 0.5 ? 'x' : 'z';
      const line = pick(rng, lines);
      const along = rand(rng, -city.half + 20, city.half - 20);
      const dir = rng() < 0.5 ? 1 : -1;
      this.cars.push({
        mesh,
        axis,
        line,
        along,
        dir,
        speed: rand(rng, 7, 12),
        targetSpeed: rand(rng, 7, 12),
        name: mesh.userData.name,
        taxi,
        wait: 0,
      });
    }
  }

  posOf(c) {
    return c.axis === 'x' ? { x: c.along, z: c.line } : { x: c.line, z: c.along };
  }

  update(dt, playerPos, playerSpeed) {
    const { half } = this.city;
    for (const c of this.cars) {
      if (c.parked) {
        // parked cars never move, but still need their mesh placed
        const pp = this.posOf(c);
        c.mesh.position.set(pp.x, 0, pp.z);
        c.mesh.rotation.y = 0;
        continue;
      }
      // slow for the player when close ahead
      const p = this.posOf(c);
      const d2 = (p.x - playerPos.x) ** 2 + (p.z - playerPos.z) ** 2;
      let want = c.targetSpeed;
      if (d2 < 26 * 26) want = Math.min(want, 4);
      if (d2 < 9 * 9 && playerSpeed > 8) want = 0; // peds of traffic brake for a speeding player
      c.speed += clamp(want - c.speed, -14 * dt, 8 * dt);
      c.along += c.dir * c.speed * dt;
      if (c.along > half - 8 || c.along < -half + 8) {
        // turn onto a perpendicular road at the edge
        c.dir *= -1;
        c.axis = c.axis === 'x' ? 'z' : 'x';
        c.line = pick(this.rng, this.city.roadLines);
        c.along = clamp(c.along, -half + 20, half - 20);
      }
      // random intersection turn
      const nearLine = this.city.roadLines.some(
        (l) => Math.abs(c.along - l) < c.speed * dt + 0.4,
      );
      if (nearLine && this.rng() < 0.012) {
        const oldAlong = c.along;
        c.axis = c.axis === 'x' ? 'z' : 'x';
        c.line = this.city.roadLines.reduce((a, b) => (Math.abs(b - oldAlong) < Math.abs(a - oldAlong) ? b : a));
        c.along = c.line;
        c.dir = this.rng() < 0.5 ? 1 : -1;
      }
      const np = this.posOf(c);
      c.mesh.position.set(np.x, 0, np.z);
      const heading = c.axis === 'x' ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : c.dir > 0 ? 0 : Math.PI;
      c.mesh.rotation.y = heading;
      for (const w of c.mesh.userData.wheels) w.rotation.x += c.speed * dt * 2.2;
    }
  }

  nearest(x, z, maxD) {
    let best = null;
    let bestD = maxD * maxD;
    for (const c of this.cars) {
      const p = this.posOf(c);
      const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d2 < bestD) {
        bestD = d2;
        best = c;
      }
    }
    return best;
  }
}

// ---------- police ----------

const UNIT_NAMES = ['KITE-1', 'HALCON-1', 'GAVIOTA-01', 'CONDOR-2', 'FALCON-3', 'ORCA-7', 'VIPER-4', 'HALCON-2'];
const TACTICS = ['PURSUIT', 'RAMMING', 'FLANKING', 'ROADBLOCK', 'SPOTLIGHT', 'BOX IN'];

export class Police {
  constructor(scene, city, rng) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.units = [];
    this.wanted = 0;
    this.flash = 0;
  }

  setWanted(n, playerPos) {
    const target = clamp(Math.round(n), 0, 5);
    while (this.units.length < target) {
      const mesh = makeCarMesh({ police: true, name: UNIT_NAMES[this.units.length % UNIT_NAMES.length] });
      this.scene.add(mesh);
      const a = this.rng() * Math.PI * 2;
      const d = rand(this.rng, 40, 70);
      this.units.push({
        mesh,
        name: mesh.userData.name,
        tactic: pick(this.rng, TACTICS),
        x: playerPos.x + Math.cos(a) * d,
        z: playerPos.z + Math.sin(a) * d,
        angle: a,
        speed: 0,
        stuck: 0,
      });
    }
    while (this.units.length > target) {
      const u = this.units.pop();
      this.scene.remove(u.mesh);
    }
    this.wanted = target;
  }

  update(dt, playerPos, playerVel) {
    this.flash += dt;
    const on = Math.floor(this.flash * 6) % 2 === 0;
    for (const u of this.units) {
      // steer toward a point slightly ahead of the player
      const tx = playerPos.x + playerVel.x * 0.6;
      const tz = playerPos.z + playerVel.z * 0.6;
      const want = Math.atan2(tx - u.x, tz - u.z);
      u.angle = angleLerp(u.angle, want, clamp(dt * 1.6, 0, 1));
      const targetSpeed = this.wanted >= 4 ? 26 : this.wanted >= 2 ? 22 : 18;
      u.speed += clamp(targetSpeed - u.speed, -20 * dt, 10 * dt);
      const nx = u.x + Math.sin(u.angle) * u.speed * dt;
      const nz = u.z + Math.cos(u.angle) * u.speed * dt;
      // buildings block police too
      let blocked = false;
      for (const c of this.city.colliders) {
        if (Math.abs(nx - c.x) < c.hx + 1.4 && Math.abs(nz - c.z) < c.hz + 1.4) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        u.stuck += dt;
        u.angle += dt * 2.2;
        u.speed *= 0.6;
        if (u.stuck > 2.5) {
          // teleport-respawn behind the player, out of sight
          const a = this.rng() * Math.PI * 2;
          u.x = playerPos.x + Math.cos(a) * 55;
          u.z = playerPos.z + Math.sin(a) * 55;
          u.stuck = 0;
        }
      } else {
        u.stuck = 0;
        u.x = nx;
        u.z = nz;
      }
      u.x = clamp(u.x, -this.city.half - 20, this.city.half + 60);
      u.z = clamp(u.z, -this.city.half - 20, this.city.half + 60);
      u.mesh.position.set(u.x, 0, u.z);
      u.mesh.rotation.y = u.angle;
      for (const w of u.mesh.userData.wheels) w.rotation.x += u.speed * dt * 2.2;
      const bar = u.mesh.userData.lightBar;
      if (bar) {
        bar.userData.red.material.color.setHex(on ? 0xff2d2d : 0x550000);
        bar.userData.blue.material.color.setHex(on ? 0x002266 : 0x2266ff);
      }
    }
  }

  // for the HUD dispatch board
  board(playerPos) {
    return this.units.map((u) => {
      const d = Math.round(Math.hypot(u.x - playerPos.x, u.z - playerPos.z));
      return { name: u.name, dist: d, tactic: u.tactic };
    });
  }
}

// ---------- helicopter ----------

export class Helicopter {
  constructor(scene) {
    this.scene = scene;
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 6), bodyMat);
    body.castShadow = true;
    g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 5), bodyMat);
    tail.position.set(0, 0.3, -5);
    g.add(tail);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 1.6), new THREE.MeshPhongMaterial({ color: 0x0e1a24, shininess: 180 }));
    glass.position.set(0, 0.2, 2.4);
    g.add(glass);
    this.rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.8), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    this.rotor.position.y = 1.2;
    g.add(this.rotor);
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    tailRotor.position.set(0.5, 0.4, -7.2);
    g.add(tailRotor);
    // spotlight cone (visible beam)
    const coneGeo = new THREE.ConeGeometry(7, 42, 16, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false,
    });
    this.cone = new THREE.Mesh(coneGeo, coneMat);
    this.cone.position.y = -21;
    this.cone.rotation.x = Math.PI;
    g.add(this.cone);
    this.spot = new THREE.SpotLight(0xfff2b0, 0, 120, 0.35, 0.5, 1.2);
    this.spot.position.set(0, 0, 0);
    g.add(this.spot);
    this.spotTarget = new THREE.Object3D();
    scene.add(this.spotTarget);
    this.spot.target = this.spotTarget;
    g.visible = false;
    scene.add(g);
    this.mesh = g;
    this.angle = 0;
    this.active = false;
  }

  update(dt, playerPos, wanted) {
    const want = wanted >= 3;
    this.active = want;
    this.mesh.visible = want;
    if (!want) {
      this.spot.intensity = 0;
      return;
    }
    this.angle += dt * 0.35;
    const r = 34;
    const x = playerPos.x + Math.cos(this.angle) * r;
    const z = playerPos.z + Math.sin(this.angle) * r;
    this.mesh.position.set(x, 46, z);
    this.mesh.rotation.y = Math.atan2(playerPos.x - x, playerPos.z - z);
    this.rotor.rotation.y += dt * 22;
    this.spotTarget.position.set(playerPos.x, 0, playerPos.z);
    this.spot.intensity = 260;
    // beam follows the player with a little lag
    this.cone.lookAt(playerPos.x - x, -46, playerPos.z - z);
  }
}

// ---------- pedestrians ----------

export class Pedestrians {
  constructor(scene, city, rng, count = 18) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.peds = [];
    const shirtColors = [0xff5e3a, 0x22d3ee, 0xffd166, 0x9dff57, 0xc084fc, 0xe8e8e8, 0xff7ab8];
    const skinColors = [0xd8a077, 0xb07a4a, 0x8a5a30, 0xf0c8a0];
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, shirtColors) });
      const skin = new THREE.MeshLambertMaterial({ color: pick(rng, skinColors) });
      const pants = new THREE.MeshLambertMaterial({ color: pick(rng, [0x2a2d36, 0x4a3a2a, 0x2a4a6a]) });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.85, 8), shirt);
      body.position.y = 1.05;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
      head.position.y = 1.72;
      head.castShadow = true;
      g.add(head);
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), pants);
      legL.position.set(-0.14, 0.33, 0);
      g.add(legL);
      const legR = legL.clone();
      legR.position.x = 0.14;
      g.add(legR);
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), shirt);
      armL.position.set(-0.4, 1.1, 0);
      g.add(armL);
      const armR = armL.clone();
      armR.position.x = 0.4;
      g.add(armR);
      scene.add(g);
      const line = pick(rng, city.roadLines);
      const along = rand(rng, -city.half + 20, city.half - 20);
      this.peds.push({
        mesh: g, legL, legR, armL, armR,
        axis: rng() < 0.5 ? 'x' : 'z',
        line: line + (rng() < 0.5 ? 9 : -9),
        along,
        dir: rng() < 0.5 ? 1 : -1,
        speed: rand(rng, 1.1, 2.0),
        phase: rng() * Math.PI * 2,
        flee: 0,
      });
    }
  }

  update(dt, playerPos, playerSpeed) {
    for (const p of this.peds) {
      const px = p.axis === 'x' ? p.along : p.line;
      const pz = p.axis === 'x' ? p.line : p.along;
      const d2 = (px - playerPos.x) ** 2 + (pz - playerPos.z) ** 2;
      if (d2 < 14 * 14 && playerSpeed > 6) p.flee = 1.2; // run from a speeding car
      if (p.flee > 0) {
        p.flee -= dt;
        p.speed = 4.5;
      } else {
        p.speed = 1.5;
      }
      p.along += p.dir * p.speed * dt;
      if (p.along > this.city.half - 10 || p.along < -this.city.half + 10) p.dir *= -1;
      const nx = p.axis === 'x' ? p.along : p.line;
      const nz = p.axis === 'x' ? p.line : p.along;
      p.mesh.position.set(nx, 0, nz);
      p.mesh.rotation.y = p.axis === 'x' ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : p.dir > 0 ? 0 : Math.PI;
      p.phase += dt * p.speed * 4;
      const swing = Math.sin(p.phase) * 0.5;
      p.legL.rotation.x = swing;
      p.legR.rotation.x = -swing;
      p.armL.rotation.x = -swing * 0.8;
      p.armR.rotation.x = swing * 0.8;
    }
  }

  nearest(x, z, maxD) {
    let best = null;
    let bestD = maxD * maxD;
    for (const p of this.peds) {
      const px = p.axis === 'x' ? p.along : p.line;
      const pz = p.axis === 'x' ? p.line : p.along;
      const d2 = (px - x) ** 2 + (pz - z) ** 2;
      if (d2 < bestD) {
        bestD = d2;
        best = { x: px, z: pz };
      }
    }
    return best;
  }
}
