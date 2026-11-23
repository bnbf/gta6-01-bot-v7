# LUMEN BAY: Neon Heat

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/bnbf/gta6-01-bot-v7/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/bnbf/gta6-01-bot-v7/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A complete low-poly 3D open-world crime game for [make.fun's gta6-01 bounty](https://make.fun/bounty/gta6-01) — built from scratch with three.js, playable in a desktop browser from static files with no network request.

## The game

Lux Vega is back in Lumen Bay — a sun-soaked coastal city of neon avenues, palm-lined boulevards, a beach, a pier and a ferris wheel, all at dusk. Run **12 missions across 3 acts** for the crew: steal the cars, make the drops, lose the helicopters, and take the city back one corner at a time.

- **A city on foot and by car** — walk the sidewalks, steal any traffic car (E), drive with arcade physics, drift, crash, dent.
- **Traffic and pedestrians** — cars follow the road grid, brake for you, and pedestrians flee a speeding car.
- **A wanted level and police** — 0–5 stars. LBPD units chase, ram and roadblock; at 3 stars the helicopter comes up with its spotlight cone. Break line of sight to cool the heat; get busted and you pay the fine.
- **Missions and a story** — 12 jobs with stages, objectives, NEXT steps and timers, briefed in dialogue by Mira, Tía Rosa, Abuela and Kit. Payouts in cash, respect ranks from ROOKIE to CREW BOSS, district standing.
- **Combat** — punch on foot, 5 weapon slots in the car.
- **A dense HUD** — mission panel, named dispatch board (KITE-1, HALCON-1, GAVIOTA-01… with PURSUIT / RAMMING / FLANKING / ROADBLOCK tactics), crew ability cards (SWAP PLATES, QUICK FIX, EYES OUT), respect and district standing, dialogue boxes, big speedometer, car name + condition, radio, and a circular minimap.
- **A start and a save** — start screen, continue from a save (localStorage), pause.
- **Sound and music** — synthesized engine hum, two-tone siren and a synthwave radio jingle, all made with the Web Audio API. No audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Drive / walk |
| E | Enter / exit car |
| Space | Punch (on foot) |
| Shift | Run (on foot) |
| 1 / 2 / 3 | Crew abilities: Swap Plates · Quick Fix · Eyes Out |
| Q | Cycle radio station |
| Mouse drag | Orbit camera · Wheel: zoom / cycle weapon |
| P / Esc | Pause · M mute |

## Play it

```sh
node serve.ts
# open http://localhost:8080/game/index.html
```

`game/` is plain static files: `index.html` + ES modules under `game/src/`, with three.js r160 vendored as a minified build under `game/vendor/`. No network request at runtime.

## Screenshots

The four shots under `screenshots/` are real renders of the game's own code, staged deterministically with `?shot=chase|title|foot|escape&seed=1` (see `shots.json`):

1. **chase** — Mission 6, roadblock run, 2 stars, dispatch live.
2. **title** — the start screen over Ocean Drive at dusk.
3. **foot** — Mission 9, on foot by the pier.
4. **escape** — Mission 10, 4 stars with the helicopter spotlight.

## Structure

- `main.ts` — entry program: hands `game/` + `screenshots/` to the grader and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, copied unchanged.
- `game/src/main.js` — bootstrap, game loop, input, saves.
- `game/src/city.js` — procedural dusk city (buildings, palms, beach, pier, ferris wheel).
- `game/src/vehicles.js` — cars, traffic AI, police AI, helicopter, pedestrians.
- `game/src/player.js` — on-foot + driving + chase camera.
- `game/src/missions.js` — the 12-mission story and mission engine.
- `game/src/hud.js` — the dense HUD and circular minimap.
- `game/src/audio.js` — synthesized sound.
- `game/src/shots.js` — deterministic screenshot staging.
- `game/src/rng.js` — seeded random helpers.

An original city, original characters, original vehicles, original story, art, sound and music — nothing from Rockstar Games.
