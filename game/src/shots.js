// LUMEN BAY: Neon Heat — deterministic screenshot staging.
// ?shot=chase|title|foot|escape&seed=1 sets up an exact scene: player and
// camera placement, mission state, dispatch board, dialogue, wanted level,
// traffic and helicopter — then the game renders a few warm-up frames and
// freezes so the screenshot is identical on every run.

export const SHOTS = ['chase', 'title', 'foot', 'escape'];

export function stageShot(game, name) {
  const { player, traffic, police, heli, missions, hud } = game;
  hud.root.classList.add('shot-mode');

  if (name === 'title') {
    // start screen over a high dusk panorama of Ocean Drive
    player.mode = 'foot';
    player.mesh.visible = false;
    player.x = 0;
    player.z = 150;
    player.angle = 0;
    player.setCamera(26, 26, 96, 0, 8, 220, 55);
    game.showStart(true);
    hud.root.classList.add('hidden');
    return;
  }

  game.showStart(false);
  hud.root.classList.remove('hidden');

  if (name === 'chase') {
    // Mission 6, stage 2: roadblock run, 2 stars, dispatch live, Mira talking.
    // Enter the car first (it adds 1 star), then set the staged wanted level.
    const car = traffic.cars[0];
    traffic.cars.splice(0, 1);
    player.enterCar(car);
    player.wanted = 2;
    police.setWanted(2, player.pos);
    police.units[0].tactic = 'PURSUIT';
    police.units[0].x = -5;
    police.units[0].z = 178;
    police.units[0].angle = Math.PI;
    police.units[1].tactic = 'ROADBLOCK';
    police.units[1].x = 7;
    police.units[1].z = 196;
    police.units[1].angle = Math.PI;
    player.x = 0;
    player.z = 150;
    player.angle = 0;
    player.speed = 26;
    player.carName = 'RUKAN PELO GT';
    player.carCondition = 62;
    player.setCamera(-6, 4.6, 134, 0, 2, 190, 66);
    missions.index = 5;
    missions.stage = 1;
    missions.active = true;
    missions.timer = 72;
    missions.heatSeen = true;
    hud.setDialogue('MIRA KESANG', 'LA GRIETA · MECHANIC', 'Punch it through the middle — don\'t stop for anything.');
    hud.dialogueTimer = 999;
    game.money = 4820;
    game.respect = 2450;
    game.radioStation = 'RADIO LUMEN 98.5 — NEON PALMS';
  }

  if (name === 'foot') {
    // Mission 9, stage 1: on foot by the pier at dusk, Tía Rosa talking
    missions.index = 8;
    missions.stage = 0;
    missions.active = true;
    missions.timer = 0;
    player.wanted = 0;
    police.setWanted(0, player.pos);
    player.mode = 'foot';
    player.mesh.visible = true;
    player.x = 56;
    player.z = 296;
    player.angle = Math.PI * 0.9;
    player.speed = 0;
    player.carName = 'ON FOOT';
    player.setCamera(48, 3.6, 284, 56, 2, 300, 58);
    hud.setDialogue('TÍA ROSA', 'DINER OWNER · FAMILY', 'Three corners, one crew. Tag the pier first — the whole city is watching, mija.');
    hud.dialogueTimer = 999;
    game.money = 3120;
    game.respect = 1890;
    game.radioStation = 'RADIO LUMEN 98.5 — NEON PALMS';
  }

  if (name === 'escape') {
    // Mission 10, stage 2: 4 stars, helicopter spotlight, police boxing in
    const car = traffic.cars[1];
    traffic.cars.splice(1, 1);
    player.enterCar(car);
    player.wanted = 4;
    police.setWanted(4, player.pos);
    const tactics = ['PURSUIT', 'FLANKING', 'ROADBLOCK', 'BOX IN'];
    police.units.forEach((u, i) => {
      u.tactic = tactics[i % tactics.length];
      const a = (i / 4) * Math.PI * 2 + 0.4;
      u.x = 64 + Math.cos(a) * 26;
      u.z = 290 + Math.sin(a) * 26;
      u.angle = Math.atan2(64 - u.x, 290 - u.z);
      u.speed = 18;
    });
    heli.angle = 0.8;
    player.x = 64;
    player.z = 290;
    player.angle = Math.PI;
    player.speed = 30;
    player.carName = 'VULCAR NEBULA';
    player.carCondition = 41;
    player.setCamera(52, 7.5, 258, 64, 2, 300, 68);
    missions.index = 9;
    missions.stage = 1;
    missions.active = true;
    missions.timer = 47;
    missions.heatSeen = true;
    hud.setDialogue('KIT "EYES"', 'LOOKOUT · CREW', 'EYES OUT — two units boxing you in from the north. Break the cone and run!');
    hud.dialogueTimer = 999;
    game.money = 7310;
    game.respect = 3120;
    game.radioStation = 'RADIO LUMEN 98.5 — NEON PALMS';
  }

  // force one HUD refresh with the staged state, and hide the toast
  // (entering a car fires the "STOLEN" toast; it has no place in a still)
  game.refreshHUD(0);
  hud.toastTimer = 0;
  hud.el.toast.classList.remove('show');
}
