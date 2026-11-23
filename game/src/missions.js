// LUMEN BAY: Neon Heat — missions and story.
// Twelve missions in three acts. Each stage has an objective, a NEXT step,
// a target on the map and (sometimes) a timer. The engine drives the HUD,
// the mission beacon, payouts, respect and the dialogue lines.

export const MISSIONS = [
  {
    id: 1, act: 1, title: 'WELCOME TO LUMEN BAY', reward: 250, respect: 120,
    briefing: {
      name: 'MIRA KESANG', role: 'LA GRIETA · MECHANIC',
      text: 'Lux! You made it. The garage is yours — take the Comet out front and get to the safehouse on Ocean Drive. Don\'t scratch it. Much.',
    },
    stages: [
      { objective: 'Get in the Comet outside the garage', next: 'Drive to the safehouse', type: 'enter', target: { x: 0, z: 96 }, radius: 5 },
      { objective: 'Drive to the safehouse on Ocean Drive', next: 'Park in the yellow marker', type: 'goto', target: { x: 64, z: 192 }, radius: 7 },
    ],
  },
  {
    id: 2, act: 1, title: 'FIRST WHEELS', reward: 400, respect: 150,
    briefing: {
      name: 'MIRA KESANG', role: 'LA GRIETA · MECHANIC',
      text: 'Client wants a Nebula, any colour. "Borrow" one off the avenue and bring it to the lockup. Cops notice — be quick.',
    },
    stages: [
      { objective: 'Steal a car off the avenue (E to enter)', next: 'Lose the heat if it comes', type: 'steal', target: { x: 0, z: 0 }, radius: 60 },
      { objective: 'Deliver the car to the lockup', next: 'Park in the yellow marker', type: 'goto', target: { x: -128, z: 128 }, radius: 7 },
    ],
  },
  {
    id: 3, act: 1, title: 'NEON PALMS', reward: 500, respect: 180,
    briefing: {
      name: 'TÍA ROSA', role: 'DINER OWNER · FAMILY',
      text: 'My nephew is stuck at the pier with the catering van. Fetch him, then get the food to the beach party before it goes cold. Two minutes!',
    },
    stages: [
      { objective: 'Pick up Rosa\'s nephew at the pier', next: 'He is waiting by the ferris wheel', type: 'goto', target: { x: 64, z: 320 }, radius: 8 },
      { objective: 'Deliver the catering to the beach party', next: 'Two minutes on the clock — floor it', type: 'deliver', target: { x: -128, z: 300 }, radius: 8, time: 120 },
    ],
  },
  {
    id: 4, act: 1, title: 'THE DINER JOB', reward: 650, respect: 220,
    briefing: {
      name: 'KIT "EYES"', role: 'LOOKOUT · CREW',
      text: 'Rosa\'s diner got shaken down. Take the envelope to the boys at the arcade, then shake the tail. Two stars if you make noise.',
    },
    stages: [
      { objective: 'Take the envelope to the arcade', next: 'Walk it in, keep it casual', type: 'goto', target: { x: -64, z: -64 }, radius: 7 },
      { objective: 'Lose the 2-star tail', next: 'Break line of sight until the heat cools', type: 'escape', target: null, radius: 0, wanted: 2 },
    ],
  },
  {
    id: 5, act: 2, title: 'SWAP PLATES', reward: 550, respect: 200,
    briefing: {
      name: 'MIRA KESANG', role: 'LA GRIETA · MECHANIC',
      text: 'New trick, courtesy of yours truly: press 1 and the plates swap — one star gone. Try it with a tail on you, then bring me the Comet.',
    },
    stages: [
      { objective: 'Get a tail, then press 1 to swap plates', next: 'Drop one star with SWAP PLATES', type: 'ability', target: null, radius: 0 },
      { objective: 'Bring the Comet back to the garage', next: 'Park in the yellow marker', type: 'goto', target: { x: 0, z: 96 }, radius: 7 },
    ],
  },
  {
    id: 6, act: 2, title: 'ROADBLOCK RUN', reward: 800, respect: 280,
    briefing: {
      name: 'KIT "EYES"', role: 'LOOKOUT · CREW',
      text: 'They set a roadblock on Ocean Drive. Punch straight through the middle — don\'t stop for anything. Eyes out, Lux.',
    },
    stages: [
      { objective: 'Reach the roadblock on Ocean Drive', next: 'Full speed, straight through', type: 'goto', target: { x: 0, z: 192 }, radius: 9 },
      { objective: 'Smash through and lose the tail on the causeway', next: 'Keep it above 100 until the heat cools', type: 'escape', target: null, radius: 0, wanted: 2 },
    ],
  },
  {
    id: 7, act: 2, title: 'THE COURIER', reward: 900, respect: 300,
    briefing: {
      name: 'ABUELA ROSA', role: 'ROADSIDE REPAIR · CREW',
      text: 'Three drops, one van, ninety seconds. The family is counting on you, mija. Abuela\'s wrench is ready if the van takes a beating — press 2.',
    },
    stages: [
      { objective: 'Drop 1 of 3: the hotel on the strand', next: 'Two more drops after this', type: 'goto', target: { x: 128, z: 256 }, radius: 7, time: 90 },
      { objective: 'Drop 2 of 3: the plaza statue', next: 'One more drop', type: 'goto', target: { x: -64, z: -128 }, radius: 7 },
      { objective: 'Drop 3 of 3: the north garage', next: 'Last one — don\'t be late', type: 'goto', target: { x: 192, z: -192 }, radius: 7 },
    ],
  },
  {
    id: 8, act: 2, title: 'HELICOPTER HUNT', reward: 1100, respect: 350,
    briefing: {
      name: 'KIT "EYES"', role: 'LOOKOUT · CREW',
      text: 'Three stars and the bird is up — spotlight and all. Stay under the overpasses, break the cone, and vanish. I\'ll call the gaps.',
    },
    stages: [
      { objective: 'Survive the helicopter hunt', next: 'Stay out of the spotlight cone', type: 'escape', target: null, radius: 0, wanted: 3 },
      { objective: 'Reach the safehouse garage', next: 'Park in the yellow marker', type: 'goto', target: { x: 0, z: 96 }, radius: 7 },
    ],
  },
  {
    id: 9, act: 3, title: 'TERRITORY', reward: 1000, respect: 400,
    briefing: {
      name: 'TÍA ROSA', role: 'DINER OWNER · FAMILY',
      text: 'The Strand, the Barrio and the Marina — three corners, one crew. Tag each corner on foot and the whole city knows whose it is.',
    },
    stages: [
      { objective: 'Tag the corner by the pier', next: 'On foot — the crew watches', type: 'goto', target: { x: 64, z: 300 }, radius: 6 },
      { objective: 'Tag the Barrio corner', next: 'Two corners down, one to go', type: 'goto', target: { x: -192, z: 64 }, radius: 6 },
      { objective: 'Tag the Marina corner', next: 'Last corner — make it loud', type: 'goto', target: { x: 192, z: -64 }, radius: 6 },
    ],
  },
  {
    id: 10, act: 3, title: 'THE GETAWAY', reward: 1500, respect: 500,
    briefing: {
      name: 'MIRA KESANG', role: 'LA GRIETA · MECHANIC',
      text: 'The bank job is done — four stars, a bird overhead, and the whole city in your mirror. Get to the pier tunnel. Don\'t. Stop.',
    },
    stages: [
      { objective: 'Outrun the 4-star response', next: 'The bird is up — break the cone', type: 'escape', target: null, radius: 0, wanted: 4 },
      { objective: 'Reach the pier tunnel', next: 'Forty-seven seconds of hell', type: 'deliver', target: { x: 64, z: 330 }, radius: 8, time: 47 },
    ],
  },
  {
    id: 11, act: 3, title: 'FAMILY BUSINESS', reward: 1300, respect: 450,
    briefing: {
      name: 'ABUELA ROSA', role: 'ROADSIDE REPAIR · CREW',
      text: 'The convoy carries the family\'s savings. Ride shotgun — keep the vans rolling, keep the cops off them, and bring them home.',
    },
    stages: [
      { objective: 'Escort the convoy to the marina', next: 'Stay close — the vans follow you', type: 'goto', target: { x: 192, z: 192 }, radius: 9 },
      { objective: 'Hold the marina while the vans unload', next: 'Thirty seconds — don\'t let them scatter', type: 'hold', target: { x: 192, z: 192 }, radius: 12, time: 30 },
    ],
  },
  {
    id: 12, act: 3, title: 'NEON HEAT', reward: 2500, respect: 800,
    briefing: {
      name: 'LUX VEGA', role: 'CREW BOSS · LUMEN BAY',
      text: 'This is it. Five stars, the whole department, one last run down Ocean Drive to the pier. Lumen Bay is ours tonight — drive like it.',
    },
    stages: [
      { objective: 'Run Ocean Drive at full heat', next: 'Five stars — own the avenue', type: 'escape', target: null, radius: 0, wanted: 5 },
      { objective: 'Finish at the ferris wheel', next: 'The city is watching', type: 'goto', target: { x: 64, z: 320 }, radius: 9 },
    ],
  },
];

export class MissionEngine {
  constructor(game) {
    this.game = game; // {player, hud, audio, save}
    this.index = 0;
    this.stage = 0;
    this.timer = 0;
    this.active = false;
    this.done = false;
    this.holdT = 0;
    this.abilityUsed = false;
  }

  get mission() {
    return MISSIONS[this.index];
  }

  get stageDef() {
    return this.mission ? this.mission.stages[this.stage] : null;
  }

  start(i = 0) {
    this.index = i;
    this.stage = 0;
    this.active = true;
    this.done = false;
    this.holdT = 0;
    this.abilityUsed = false;
    const m = this.mission;
    this.timer = m.stages[0].time || 0;
    this.game.hud.setDialogue(m.briefing.name, m.briefing.role, m.briefing.text);
    this.game.hud.toast('MISSION ' + m.id + ' / 12 — ' + m.title);
    if (this.game.audio) this.game.audio.missionStart();
  }

  completeStage() {
    const m = this.mission;
    this.game.audio.blip(880);
    this.stage++;
    if (this.stage >= m.stages.length) {
      this.completeMission();
      return;
    }
    const s = this.stageDef;
    this.timer = s.time || 0;
    this.holdT = 0;
    this.game.hud.toast('STAGE ' + (this.stage + 1) + ' / ' + m.stages.length + ' — ' + s.objective);
  }

  completeMission() {
    const m = this.mission;
    const g = this.game;
    g.money += m.reward;
    g.respect += m.respect;
    g.hud.toast('MISSION COMPLETE — +' + m.reward + ' · +' + m.respect + ' RESPECT');
    g.hud.setDialogue('MIRA KESANG', 'LA GRIETA · MECHANIC', missionCompleteLine(m.id));
    if (g.audio) g.audio.cash();
    g.save();
    this.active = false;
    this.done = true;
    // next mission starts after a beat
    this.nextTimer = 2.5;
  }

  failMission(reason) {
    const g = this.game;
    g.hud.toast('MISSION FAILED — ' + reason);
    g.hud.setDialogue('KIT "EYES"', 'LOOKOUT · CREW', 'Dust yourself off. Same job, cleaner run. Go again when you\'re ready.');
    this.active = false;
    this.retryTimer = 3;
  }

  update(dt) {
    const g = this.game;
    if (this.done && this.nextTimer > 0) {
      this.nextTimer -= dt;
      if (this.nextTimer <= 0) {
        this.done = false;
        if (this.index + 1 < MISSIONS.length) this.start(this.index + 1);
        else {
          g.hud.setDialogue('LUX VEGA', 'CREW BOSS · LUMEN BAY', 'Twelve jobs. One city. Lumen Bay is ours — and this is only the beginning.');
          g.hud.toast('STORY COMPLETE — FREE ROAM');
        }
      }
      return;
    }
    if (!this.active && this.retryTimer > 0) {
      this.retryTimer -= dt;
      if (this.retryTimer <= 0) this.start(this.index);
      return;
    }
    if (!this.active) return;
    const s = this.stageDef;
    const p = g.player;
    if (!s) return;

    if (s.time && this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.failMission('out of time');
        return;
      }
    }

    switch (s.type) {
      case 'goto':
      case 'deliver': {
        const d = Math.hypot(p.x - s.target.x, p.z - s.target.z);
        if (d < s.radius) this.completeStage();
        break;
      }
      case 'enter': {
        if (p.mode === 'car') this.completeStage();
        break;
      }
      case 'steal': {
        if (p.mode === 'car') this.completeStage();
        break;
      }
      case 'ability': {
        if (this.abilityUsed) this.completeStage();
        break;
      }
      case 'escape': {
        if (s.wanted && p.wanted < s.wanted) {
          // stage needs heat first, then losing it
          if (this.heatSeen) this.completeStage();
        }
        if (s.wanted && p.wanted >= s.wanted) this.heatSeen = true;
        if (!s.wanted && p.wanted === 0) this.completeStage();
        break;
      }
      case 'hold': {
        const d = Math.hypot(p.x - s.target.x, p.z - s.target.z);
        if (d < s.radius) {
          this.holdT += dt;
          if (this.holdT >= (s.time || 30)) this.completeStage();
        } else {
          this.holdT = Math.max(0, this.holdT - dt * 2);
        }
        break;
      }
      default:
        break;
    }
  }

  // HUD-facing state
  hudState() {
    if (!this.mission) return null;
    const s = this.stageDef;
    return {
      missionNum: this.mission.id,
      missionTotal: MISSIONS.length,
      title: this.mission.title,
      stageNum: this.active ? this.stage + 1 : this.stage,
      stageTotal: this.mission.stages.length,
      objective: this.active && s ? s.objective : this.done ? 'Mission complete' : 'Free roam',
      next: this.active && s ? s.next : 'Pick a job from the map',
      timer: this.timer,
      holdT: this.holdT,
      holdTotal: s && s.type === 'hold' ? s.time || 30 : 0,
    };
  }
}

function missionCompleteLine(id) {
  const lines = {
    1: 'Clean. The safehouse is yours — sleep there, save there, start again there.',
    2: 'That Nebula is already sold. You\'re a natural, Lux.',
    3: 'Food\'s still hot. Rosa says you\'re family now — and family eats first.',
    4: 'Envelope delivered, tail lost. The arcade boys send their regards.',
    5: 'Plates swapped, heat gone. Mira\'s magic, at your service.',
    6: 'Straight through the middle. They\'ll talk about that run for a month.',
    7: 'Three drops, on the clock. The family runs on time because of you.',
    8: 'The bird lost you. Even the sky can\'t hold Lumen Bay\'s best driver.',
    9: 'Three corners tagged. The whole city knows whose streets these are.',
    10: 'Four stars and you still made the tunnel. Untouchable.',
    11: 'Convoy home safe. Abuela\'s already cooking the celebration.',
    12: 'Twelve jobs. One city. Lumen Bay is ours tonight, Lux.',
  };
  return lines[id] || 'Job done. Clean work.';
}
