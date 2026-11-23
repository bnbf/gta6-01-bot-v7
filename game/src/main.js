// LUMEN BAY: Neon Heat — entry point and game loop.
// Builds the dusk city, wires player / traffic / police / helicopter /
// missions / HUD / audio together, runs the loop, handles the start screen,
// saves, busted/wasted, and the deterministic ?shot= staging mode.

import * as THREE from 'three';
import { mulberry32, clamp } from './rng.js';
import { CITY, buildCity } from './city.js';
import { Traffic, Police, Helicopter, Pedestrians, makeCarMesh } from './vehicles.js';
import { Player } from './player.js';
import { MISSIONS, MissionEngine } from './missions.js';
import { HUD, rankForRespect } from './hud.js';
import { AudioEngine } from './audio.js';
import { stageShot, SHOTS } from './shots.js';

const SAVE_KEY = 'lumen-bay-save-v1';
const RADIO_STATIONS = [
  'RADIO LUMEN 98.5 — NEON PALMS',
  'WAVE 103.2 — SUNSET FM',
  'K-BAY 88.1 — TALK RADIO',
  'NEON 99.9 — SYNTH DRIVE',
];

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const SHOT_MODE = shotName && SHOTS.includes(shotName);

// ---------- renderer / scene ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x3a2340, 150, 780);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 5, 86); // behind the player at spawn, looking down the avenue

// dusk sky dome: purple zenith, orange horizon
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(950, 24, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP;
      void main(){
        float h = normalize(vP).y;
        vec3 top = vec3(0.13, 0.08, 0.28);
        vec3 mid = vec3(0.55, 0.22, 0.38);
        vec3 hor = vec3(1.0, 0.48, 0.22);
        vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.8, h)) : mix(hor, mid, smoothstep(-0.05, 0.25, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  }),
);
scene.add(sky);

// low sun disc + glow on the western horizon
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false });
const sun = new THREE.Mesh(new THREE.CircleGeometry(34, 32), sunMat);
sun.position.set(-620, 105, -260);
sun.lookAt(0, 40, 0);
scene.add(sun);
const glowMat = new THREE.MeshBasicMaterial({
  color: 0xff8a4a, transparent: true, opacity: 0.28, fog: false,
});
const glow = new THREE.Mesh(new THREE.CircleGeometry(90, 32), glowMat);
glow.position.copy(sun.position).multiplyScalar(1.001);
glow.lookAt(0, 40, 0);
scene.add(glow);

// drifting dusk clouds
const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffb59a, transparent: true, opacity: 0.75 });
const clouds = [];
for (let i = 0; i < 9; i++) {
  const c = new THREE.Mesh(new THREE.BoxGeometry(60 + Math.random() * 60, 6, 22), cloudMat);
  c.position.set((Math.random() - 0.5) * 900, 130 + Math.random() * 60, (Math.random() - 0.5) * 900);
  scene.add(c);
  clouds.push(c);
}

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xff9a7a, 0x1a1430, 1.05);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xffb36b, 2.2);
sunLight.position.set(-120, 90, -80);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -140;
sunLight.shadow.camera.right = 140;
sunLight.shadow.camera.top = 140;
sunLight.shadow.camera.bottom = -140;
sunLight.shadow.camera.far = 500;
sunLight.shadow.bias = -0.0006;
scene.add(sunLight);
scene.add(sunLight.target);

// ---------- world ----------
const rng = mulberry32(CITY.seed);
const city = buildCity(scene, rng);
const traffic = new Traffic(scene, city, rng, 14);
// the Comet: Lux's own car, parked outside the garage at the spawn
const cometMesh = makeCarMesh({ color: 0xff2d78, name: 'RUKAN PELO GT' });
cometMesh.position.set(3, 0, 99);
cometMesh.rotation.y = 0;
scene.add(cometMesh);
traffic.cars.push({
  mesh: cometMesh, axis: 'z', line: 3, along: 99, dir: 1, speed: 0,
  targetSpeed: 0, name: 'RUKAN PELO GT', taxi: false, wait: 0, parked: true,
});
const police = new Police(scene, city, rng);
const heli = new Helicopter(scene);
const peds = new Pedestrians(scene, city, rng, 18);
const player = new Player(scene, city, camera);
const hud = new HUD(document.getElementById('hud'));
const audio = new AudioEngine();

// mission beacon: light beam + spinning diamond over the current target
const beaconMat = new THREE.MeshBasicMaterial({
  color: 0xffd166, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false,
});
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 60, 12, 1, true), beaconMat);
beacon.visible = false;
scene.add(beacon);
const diamond = new THREE.Mesh(
  new THREE.OctahedronGeometry(1.6),
  new THREE.MeshBasicMaterial({ color: 0xffd166 }),
);
diamond.visible = false;
scene.add(diamond);

// ---------- game state ----------
const game = {
  scene,
  city,
  traffic,
  police,
  heli,
  peds,
  player,
  hud,
  audio,
  money: 0,
  respect: 0,
  radioStation: RADIO_STATIONS[0],
  radioIndex: 0,
  started: false,
  paused: false,
  shotDone: false,
  showStart,
  refreshHUD,
  save,
};
const missions = new MissionEngine(game);
game.missions = missions;

player.onCrime = (wanted, reason) => {
  police.setWanted(wanted, player.pos);
  audio.setSiren(wanted > 0);
  if (reason === 'car stolen') hud.toast('STOLEN — the heat is on');
};
player.onBusted = () => {
  game.money = Math.max(0, game.money - 200);
  hud.toast('BUSTED — $200 fine, car impounded');
  player.respawnAtSafehouse();
  police.setWanted(0, player.pos);
  audio.setSiren(false);
  missions.failMission('busted by the LBPD');
};
player.onWasted = (cause) => {
  game.money = Math.max(0, game.money - 200);
  hud.toast('WASTED — $200 hospital bill');
  player.respawnAtSafehouse();
  police.setWanted(0, player.pos);
  audio.setSiren(false);
  missions.failMission('wasted (' + cause + ')');
};

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: game.money,
      respect: game.respect,
      mission: missions.index,
      savedAt: Date.now(),
    }));
  } catch (e) { /* private mode: no save, no crash */ }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ---------- input ----------
const input = {
  forward: false, back: false, left: false, right: false,
  run: false, action: false, punch: false,
};
let mouseDown = false;
let lastMouseX = 0;

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  switch (e.code) {
    case 'KeyW': case 'ArrowUp': input.forward = true; break;
    case 'KeyS': case 'ArrowDown': input.back = true; break;
    case 'KeyA': case 'ArrowLeft': input.left = true; break;
    case 'KeyD': case 'ArrowRight': input.right = true; break;
    case 'ShiftLeft': case 'ShiftRight': input.run = true; break;
    case 'KeyE': input.action = true; break;
    case 'Space': input.punch = true; e.preventDefault(); break;
    case 'Digit1': hud.useCrew(0, player, police); break;
    case 'Digit2': hud.useCrew(1, player, police); break;
    case 'Digit3': hud.useCrew(2, player, police); break;
    case 'KeyQ': cycleRadio(); break;
    case 'KeyM': audio.toggleMute(); hud.toast(audio.muted ? 'SOUND OFF' : 'SOUND ON'); break;
    case 'KeyP': case 'Escape': togglePause(); break;
  }
});
window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp': input.forward = false; break;
    case 'KeyS': case 'ArrowDown': input.back = false; break;
    case 'KeyA': case 'ArrowLeft': input.left = false; break;
    case 'KeyD': case 'ArrowRight': input.right = false; break;
    case 'ShiftLeft': case 'ShiftRight': input.run = false; break;
    case 'Space': input.punch = false; break;
  }
});
canvas.addEventListener('mousedown', (e) => { mouseDown = true; lastMouseX = e.clientX; });
window.addEventListener('mouseup', () => { mouseDown = false; });
window.addEventListener('mousemove', (e) => {
  if (!mouseDown) return;
  player.camYaw += (e.clientX - lastMouseX) * 0.004;
  player.camYaw = clamp(player.camYaw, -1.2, 1.2);
  lastMouseX = e.clientX;
});
canvas.addEventListener('wheel', (e) => {
  player.camDist = clamp(player.camDist + Math.sign(e.deltaY) * 1.5, 6, 16);
  hud.weaponIndex = (hud.weaponIndex + (e.deltaY > 0 ? 1 : -1) + 5) % 5;
  e.preventDefault();
}, { passive: false });

function cycleRadio() {
  game.radioIndex = (game.radioIndex + 1) % RADIO_STATIONS.length;
  game.radioStation = RADIO_STATIONS[game.radioIndex];
  audio.setRadio(true);
  hud.toast(game.radioStation);
}

function togglePause() {
  if (!game.started || SHOT_MODE) return;
  game.paused = !game.paused;
  document.getElementById('pause').classList.toggle('show', game.paused);
}

// ---------- start screen ----------
const saved = load();
const startEl = document.getElementById('start');
if (saved && saved.money > 0) {
  document.getElementById('continue-btn').style.display = 'inline-block';
  document.getElementById('continue-btn').textContent = 'CONTINUE — $' + saved.money + ' · MISSION ' + (saved.mission + 1);
}
function showStart(show) {
  startEl.classList.toggle('show', show);
  if (!show) startEl.style.display = 'none';
  else startEl.style.display = 'flex';
}
function begin(fresh) {
  audio.init();
  audio.resume();
  audio.setRadio(true);
  if (!fresh && saved) {
    game.money = saved.money || 0;
    game.respect = saved.respect || 0;
  }
  game.started = true;
  showStart(false);
  missions.start(fresh ? 0 : (saved ? saved.mission || 0 : 0));
  hud.toast('LUMEN BAY — good luck out there, Lux');
}
document.getElementById('start-btn').addEventListener('click', () => begin(true));
document.getElementById('continue-btn').addEventListener('click', () => begin(false));
document.getElementById('resume-btn').addEventListener('click', togglePause);

// ---------- HUD ----------
function districtAt(x, z) {
  if (z > 230) return 'LUMEN STRAND';
  if (x < -128) return 'BARRIO';
  if (x > 128) return 'MARINA';
  if (z < -128) return 'NORTH HILLS';
  return 'DOWNTOWN';
}

function refreshHUD(dt) {
  const m = missions.hudState();
  const r = rankForRespect(game.respect);
  const dist = districtAt(player.x, player.z);
  hud.update(dt, {
    mission: m,
    wanted: player.wanted,
    money: game.money,
    respect: game.respect,
    rank: r.rank,
    rankName: r.name,
    district: dist,
    districtVal: clamp(20 + Math.floor(game.respect / 25), 0, 99),
    barrio: Math.min(1300, game.respect),
    carName: player.carName,
    carCond: player.carCondition,
    speedKmh: Math.abs(player.speed) * 3.6,
    radio: game.radioStation,
    dispatch: police.board(player.pos),
    hp: player.hp,
  });
  const target = m && missions.active && missions.stageDef && missions.stageDef.target
    ? missions.stageDef.target : null;
  hud.drawMinimap(city, player, target, police, traffic, player.wanted > 0 || hud.eyesOutT > 0);
  // mission beacon
  const showBeacon = target && missions.active
    && ['goto', 'deliver', 'hold'].includes(missions.stageDef.type)
    && Math.hypot(player.x - target.x, player.z - target.z) > 12;
  if (showBeacon) {
    beacon.visible = true;
    diamond.visible = true;
    beacon.position.set(target.x, 30, target.z);
    diamond.position.set(target.x, 14 + Math.sin(performance.now() / 400) * 0.8, target.z);
    diamond.rotation.y += 0.02;
  } else {
    beacon.visible = false;
    diamond.visible = false;
  }
}

// ---------- loop ----------
let last = performance.now();
let saveTimer = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  if (!game.started || game.paused) {
    renderer.render(scene, camera);
    return;
  }
  const t = now / 1000;
  city.update(dt, t);
  for (const c of clouds) {
    c.position.x += dt * 1.2;
    if (c.position.x > 520) c.position.x = -520;
  }
  traffic.update(dt, player.pos, player.speed);
  police.update(dt, player.pos, player.vel);
  heli.update(dt, player.pos, player.wanted);
  peds.update(dt, player.pos, player.speed);
  player.update(dt, input, traffic, police, peds);
  missions.update(dt);
  // shadow frustum follows the player
  sunLight.position.set(player.x - 120, 90, player.z - 80);
  sunLight.target.position.set(player.x, 0, player.z);
  sunLight.target.updateMatrixWorld();
  // audio follows the drive
  audio.setEngine(clamp(Math.abs(player.speed) / 34, 0, 1), player.mode === 'car');
  audio.setSiren(player.wanted > 0);
  refreshHUD(dt);
  saveTimer += dt;
  if (saveTimer > 30) {
    saveTimer = 0;
    save();
  }
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- boot ----------
if (SHOT_MODE) {
  // staged screenshot: place everything once, render, freeze.
  stageShot(game, shotName);
  // the loop never runs in shot mode, so sync the player + driven car meshes
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.angle;
  if (player.mode === 'car' && player.car) {
    player.car.mesh.position.set(player.x, 0, player.z);
    player.car.mesh.rotation.y = player.angle;
  }
  city.update(0, 0);
  traffic.update(0, player.pos, 0);
  police.update(0, player.pos, player.vel);
  heli.update(0, player.pos, player.wanted);
  peds.update(0, player.pos, 0);
  sunLight.position.set(player.x - 120, 90, player.z - 80);
  sunLight.target.position.set(player.x, 0, player.z);
  sunLight.target.updateMatrixWorld();
  renderer.render(scene, camera);
  renderer.render(scene, camera);
  renderer.render(scene, camera);
  game.shotDone = true;
  document.title = 'shot-ready';
} else {
  showStart(true);
  requestAnimationFrame(frame);
}

window.__game = {
  game, missions, player, traffic, police, heli, city, hud,
  ready: true,
  shotDone: game.shotDone,
  shot: shotName || null,
};
