// LUMEN BAY: Neon Heat — the player.
// On foot (third-person walker who can punch, steal cars) and behind the wheel
// (arcade driving: throttle, brake, steering, drift, damage, collisions).
// The chase camera follows both modes and widens its field of view with speed.

import * as THREE from 'three';
import { clamp, damp, angleLerp } from './rng.js';
import { collideCircle } from './city.js';

export function makePlayerMesh() {
  const g = new THREE.Group();
  g.name = 'Lux Vega';
  const jacket = new THREE.MeshLambertMaterial({ color: 0xff2d78 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd8a077 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a2d36 });
  const hair = new THREE.MeshLambertMaterial({ color: 0x14100c });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.9, 8), jacket);
  body.position.y = 1.1;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), skin);
  head.position.y = 1.78;
  head.castShadow = true;
  g.add(head);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairM.position.y = 1.82;
  g.add(hairM);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.7, 0.19), pants);
  legL.position.set(-0.15, 0.35, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.15;
  g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.65, 0.15), jacket);
  armL.position.set(-0.42, 1.15, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.42;
  g.add(armR);
  g.userData = { legL, legR, armL, armR, body, head };
  return g;
}

export class Player {
  constructor(scene, city, camera) {
    this.scene = scene;
    this.city = city;
    this.camera = camera;
    this.mesh = makePlayerMesh();
    scene.add(this.mesh);

    this.x = city.spawn.x;
    this.z = city.spawn.z;
    this.angle = 0;
    this.speed = 0;
    this.mode = 'foot'; // 'foot' | 'car'
    this.hp = 100;
    this.car = null; // traffic car entry when driving
    this.carName = 'ON FOOT';
    this.carCondition = 100;
    this.wanted = 0;
    this.wantedTimer = 0;
    this.punchCooldown = 0;
    this.damageFlash = 0;
    this.camYaw = 0; // mouse orbit offset
    this.camDist = 9;
    this.camHeight = 4.2;
    this.phase = 0;
    this.onCrime = null; // fn(stars, reason)
    this.onBusted = null;
    this.onWasted = null;
  }

  get pos() {
    return { x: this.x, z: this.z };
  }

  get vel() {
    return { x: Math.sin(this.angle) * this.speed, z: Math.cos(this.angle) * this.speed };
  }

  addWanted(n, reason) {
    const before = this.wanted;
    this.wanted = clamp(this.wanted + n, 0, 5);
    this.wantedTimer = 0;
    if (this.wanted !== before && this.onCrime) this.onCrime(this.wanted, reason);
  }

  enterCar(carEntry) {
    this.car = carEntry;
    this.mode = 'car';
    this.carName = carEntry.name || carEntry.mesh.userData.name || 'STOLEN CAR';
    this.carCondition = 100;
    this.mesh.visible = false;
    this.speed = 0;
    this.angle = carEntry.mesh.rotation.y;
    this.x = carEntry.mesh.position.x;
    this.z = carEntry.mesh.position.z;
    this.addWanted(1, 'car stolen');
  }

  exitCar() {
    if (!this.car) return;
    this.mode = 'foot';
    this.mesh.visible = true;
    this.x += Math.sin(this.angle + Math.PI / 2) * 3;
    this.z += Math.cos(this.angle + Math.PI / 2) * 3;
    this.speed = 0;
    this.car = null;
    this.carName = 'ON FOOT';
  }

  damage(n, cause) {
    if (this.mode === 'car') {
      this.carCondition = clamp(this.carCondition - n, 0, 100);
      if (this.carCondition <= 0) {
        this.carCondition = 0;
        this.hp -= 20;
        if (this.onWasted && this.hp <= 0) this.onWasted(cause);
      }
    } else {
      this.hp = clamp(this.hp - n, 0, 100);
      this.damageFlash = 0.5;
      if (this.hp <= 0 && this.onWasted) this.onWasted(cause);
    }
  }

  respawnAtSafehouse() {
    this.x = this.city.spawn.x;
    this.z = this.city.spawn.z;
    this.angle = 0;
    this.speed = 0;
    this.hp = 100;
    this.wanted = 0;
    if (this.car) {
      this.scene.remove(this.car.mesh);
      this.car = null;
    }
    this.mode = 'foot';
    this.mesh.visible = true;
    this.carName = 'ON FOOT';
    this.carCondition = 100;
  }

  update(dt, input, traffic, police, peds) {
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);

    if (this.mode === 'foot') this.updateFoot(dt, input, traffic, peds, police);
    else this.updateCar(dt, input, traffic, police);

    // wanted decay: out of sight of every unit for a while
    if (this.wanted > 0) {
      let seen = false;
      for (const u of police.units) {
        if (Math.hypot(u.x - this.x, u.z - this.z) < 45) {
          seen = true;
          break;
        }
      }
      if (!seen) {
        this.wantedTimer += dt;
        if (this.wantedTimer > 14) {
          this.wanted -= 1;
          this.wantedTimer = 0;
          if (this.onCrime) this.onCrime(this.wanted, 'heat cooled off');
        }
      } else {
        this.wantedTimer = 0;
      }
    }

    this.updateCamera(dt);
    // animate the walker
    if (this.mode === 'foot') {
      this.phase += dt * Math.abs(this.speed) * 2.2;
      const swing = Math.sin(this.phase) * 0.55 * clamp(Math.abs(this.speed) / 6, 0, 1);
      const u = this.mesh.userData;
      u.legL.rotation.x = swing;
      u.legR.rotation.x = -swing;
      u.armL.rotation.x = -swing * 0.8;
      u.armR.rotation.x = swing * 0.8;
      u.body.position.y = 1.1 + Math.abs(Math.sin(this.phase)) * 0.05;
    }
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.angle;
  }

  updateFoot(dt, input, traffic, peds, police) {
    const run = input.run ? 9 : 5.5;
    let fx = 0;
    let fz = 0;
    if (input.forward) fz += 1;
    if (input.back) fz -= 1;
    if (input.left) fx -= 1;
    if (input.right) fx += 1;
    const len = Math.hypot(fx, fz);
    if (len > 0) {
      // movement is camera-relative: forward = away from camera
      const camA = Math.atan2(this.camera.position.x - this.x, this.camera.position.z - this.z);
      const moveA = camA + Math.PI + Math.atan2(fx, fz);
      this.angle = angleLerp(this.angle, moveA, clamp(dt * 10, 0, 1));
      this.speed = damp(this.speed, run, 8, dt);
      const nx = this.x + Math.sin(this.angle) * this.speed * dt;
      const nz = this.z + Math.cos(this.angle) * this.speed * dt;
      const push = collideCircle(this.city.colliders, nx, nz, 0.6);
      this.x = nx + (push ? push.x : 0);
      this.z = nz + (push ? push.z : 0);
    } else {
      this.speed = damp(this.speed, 0, 10, dt);
    }
    this.x = clamp(this.x, -this.city.half - 10, this.city.half + 120);
    this.z = clamp(this.z, -this.city.half - 10, this.city.half + 130);

    // punch (consumed here so the press survives a slow frame)
    if (input.punch && this.punchCooldown <= 0) {
      this.punchCooldown = 0.45;
      const u = this.mesh.userData;
      u.armR.rotation.x = -1.6;
      const px = this.x + Math.sin(this.angle) * 1.6;
      const pz = this.z + Math.cos(this.angle) * 1.6;
      const ped = peds.nearest(px, pz, 2.2);
      if (ped) {
        this.addWanted(1, 'pedestrian hit');
      }
      for (const unit of police.units) {
        if (Math.hypot(unit.x - px, unit.z - pz) < 2.4) {
          this.addWanted(2, 'officer hit');
          this.damage(15, 'police beatdown');
        }
      }
    }
    input.punch = false;

    // enter a car (consumed here so the press survives a slow frame)
    if (input.action) {
      const car = traffic.nearest(this.x, this.z, 5.5);
      if (car) {
        traffic.cars.splice(traffic.cars.indexOf(car), 1);
        this.enterCar(car);
      }
      input.action = false;
    }
  }

  updateCar(dt, input, traffic, police) {
    const car = this.car;
    input.punch = false; // punching only works on foot
    const maxSpeed = 34;
    const maxReverse = 10;
    if (input.forward) this.speed += 22 * dt;
    if (input.back) this.speed -= (this.speed > 0.5 ? 30 : 12) * dt;
    if (!input.forward && !input.back) this.speed = damp(this.speed, 0, 1.2, dt);
    this.speed = clamp(this.speed, -maxReverse, maxSpeed);
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const steerAmount = steer * clamp(Math.abs(this.speed) / 8, 0, 1) * 1.9;
    this.angle += steerAmount * dt * Math.sign(this.speed || 1);
    // slight drift feel at speed
    const nx = this.x + Math.sin(this.angle) * this.speed * dt;
    const nz = this.z + Math.cos(this.angle) * this.speed * dt;
    const push = collideCircle(this.city.colliders, nx, nz, 1.7);
    if (push) {
      this.x = nx + push.x;
      this.z = nz + push.z;
      if (Math.abs(this.speed) > 12) {
        this.damage(8, 'crash');
        this.speed *= 0.45;
      } else {
        this.speed *= 0.7;
      }
    } else {
      this.x = nx;
      this.z = nz;
    }
    // traffic collisions
    for (const c of traffic.cars) {
      const p = traffic.posOf(c);
      const d2 = (p.x - this.x) ** 2 + (p.z - this.z) ** 2;
      if (d2 < 3.4 * 3.4) {
        const d = Math.sqrt(d2) || 1;
        const pushX = ((this.x - p.x) / d) * (3.4 - d);
        const pushZ = ((this.z - p.z) / d) * (3.4 - d);
        this.x += pushX * 0.5;
        this.z += pushZ * 0.5;
        if (Math.abs(this.speed) > 10) {
          this.damage(5, 'traffic crash');
          this.speed *= 0.6;
        }
      }
    }
    // police rams
    for (const u of police.units) {
      const d2 = (u.x - this.x) ** 2 + (u.z - this.z) ** 2;
      if (d2 < 3.6 * 3.6) {
        this.damage(3, 'police ram');
        this.speed *= 0.82;
      }
    }
    // busted: police touches the player while slow
    if (this.wanted > 0 && Math.abs(this.speed) < 2) {
      for (const u of police.units) {
        if (Math.hypot(u.x - this.x, u.z - this.z) < 4 && this.onBusted) {
          this.onBusted();
          break;
        }
      }
    }
    this.x = clamp(this.x, -this.city.half - 10, this.city.half + 120);
    this.z = clamp(this.z, -this.city.half - 10, this.city.half + 130);

    // keep the driven car mesh glued to the player
    car.mesh.position.set(this.x, 0, this.z);
    car.mesh.rotation.y = this.angle;
    const steerVis = steer * 0.35;
    car.mesh.rotation.z = -steerVis * clamp(Math.abs(this.speed) / 20, 0, 1);
    for (const w of car.mesh.userData.wheels) {
      w.rotation.x += this.speed * dt * 2.2;
    }

    if (input.action) this.exitCar();
    input.action = false;
  }

  updateCamera(dt) {
    const cam = this.camera;
    const dist = this.mode === 'car' ? this.camDist + Math.abs(this.speed) * 0.12 : 8;
    const height = this.mode === 'car' ? this.camHeight + Math.abs(this.speed) * 0.03 : 3.6;
    const back = this.angle + Math.PI + this.camYaw;
    const tx = this.x + Math.sin(back) * dist;
    const tz = this.z + Math.cos(back) * dist;
    const ty = height;
    cam.position.x = damp(cam.position.x, tx, 5, dt);
    cam.position.y = damp(cam.position.y, ty, 5, dt);
    cam.position.z = damp(cam.position.z, tz, 5, dt);
    const lookX = this.x + Math.sin(this.angle) * 4;
    const lookZ = this.z + Math.cos(this.angle) * 4;
    cam.lookAt(lookX, this.mode === 'car' ? 1.6 : 1.4, lookZ);
    const targetFov = this.mode === 'car' ? 62 + clamp(Math.abs(this.speed) / 34, 0, 1) * 14 : 60;
    if (Math.abs(cam.fov - targetFov) > 0.1) {
      cam.fov = damp(cam.fov, targetFov, 4, dt);
      cam.updateProjectionMatrix();
    }
  }

  // used by screenshot staging: place the camera exactly
  setCamera(x, y, z, lookX, lookY, lookZ, fov = 60) {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(lookX, lookY, lookZ);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }
}
