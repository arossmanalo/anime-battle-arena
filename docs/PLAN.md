# Anime Battle Arena: Build Plan

## Context
You want a web-based anime battle arena simulator modeled on the TikTok fan game by @mizzyboizy. That game is a Pokémon arena viewed from above. Two fighters move around the arena on their own, with portrait, HP and energy bars along the top and a match timer. They fire named moves with big callouts ("BLAST BURN!", "SURF") and visual effects (craters, splashes). They can Mega-Evolve mid-fight, and a trainer on the side says subtitled lines ("Time to go beyond, Blastoise!").

Your version keeps that format with these choices:
- **Play style:** The AI controls movement and dodging. You fire your fighter's skills live (keys 1–4, U for the ultimate, T to transform). Any skill you don't trigger, the AI uses.
- **Roster:** Naruto, Dragon Ball, Jujutsu Kaisen and Demon Slayer characters. This is a non-commercial fan project.
- **Stack:** Phaser 3, TypeScript and Vite.
- **Art:** Free pixel-art packs plus AI-generated sprites.
- **Format:** 1v1 for now, with the code ready to add tag teams later.

The project folder `D:\AI Workspace\Development Projects\Anime Battle Arena` is empty and is not a git repository yet.

## Architecture
The key design decision is to **separate the simulation from the renderer**.

- `sim/` is pure TypeScript with no Phaser imports. It runs on a fixed timestep (60 Hz) with a seeded random number generator, so the same seed and inputs always produce the same fight. It accepts commands (`castSkill`, `transform`, `toggleAuto`) and emits events (`skillCast`, `hit`, `ko`, `transform`, `voiceLine`).
- `game/` contains the Phaser scenes. They read the sim state each frame and turn its events into visuals and sound: sprites, particles, screen shake, hit-stop, callout text and subtitles.
- **Why:** The same engine runs in tests and in headless batch matches for balancing. It also makes replays and the planned 2v2 mode cheap to add, because targeting goes through a team-aware query instead of a hard-coded "opponent".

### Folder layout
```
src/
  sim/
    Simulation.ts      # world, fixed-step loop, command queue, event bus
    Fighter.ts         # runtime state: pos, vel, hp, energy, cooldowns, statuses, form
    skills/            # Projectile, Beam, Dash, AoE, Zone (domain), Buff, Ultimate executors
    effects.ts         # damage, knockback, stun, burn, slow, shield
    ai/UtilityAI.ts    # movement (approach/kite/strafe/dodge) + skill scoring
    rng.ts             # seeded PRNG (mulberry32)
    physics.ts         # circle collisions, arena bounds, projectile sweep
  data/
    fighters/*.ts      # one file per character: stats, skills, forms, voice lines, sprite keys
    arenas/*.ts
  game/
    scenes/  Boot, Preload, MainMenu, CharacterSelect, Battle, Results
    view/    FighterView, ProjectileView, VFX (particles, craters, beams), CameraFX
    hud/     HealthBar, EnergyPips, SkillBar (cooldown overlays + hotkeys), Timer, Callout, Subtitle
    input/   PlayerController (hotkeys → sim commands, Auto toggle)
  main.ts
tests/          # vitest: sim determinism, damage, cooldowns, AI sanity
tools/balance.ts  # headless N-match runner → win-rate table per matchup
public/assets/  # atlases, audio, CREDITS.md
```

### Core systems
- **Fighter data (data-driven):** Each fighter defines `hp`, `speed`, `radius`, `energyRegen` and `aiProfile` (rushdown, zoner or balanced). It also has 4 skills, 1 ultimate, an optional `form` (transformation), `voiceLines` keyed by event, and `sprites`. Adding a character should only mean adding a data file and an atlas.
- **Skills:** Each skill is `{ id, name, kind, energyCost, cooldown, castTime, range, effects[], vfx, callout }`. The kinds are projectile, beam, dash-strike, AoE burst, zone/domain (an arena overlay that changes the rules, e.g. Gojo's Infinite Void stuns, Sukuna's Malevolent Shrine deals damage over time) and buff.
- **Energy:** Energy fills over time and when you land or take hits, shown as pips like in the video. Ultimates need a full bar.
- **Transformations:** Super Saiyan, Sage Mode / Nine-Tails, Demon Slayer Mark and Domain Expansion. A form unlocks at an HP threshold or when the meter is full. It swaps stats, skills and sprite, and plays a cinematic: slow-motion, a zoom on the fighter and a subtitle line.
- **AI:** Utility scoring.
  - **Movement:** The AI picks a mode from distance, HP and incoming projectiles: approach, kite, strafe or dodge.
  - **Skills:** It scores each ready skill by expected damage, range fit and whether the target is stunned. On your side it only fires skills when Auto is on or after you've been idle for N seconds. You choose whether that fallback is on.
  - **Difficulty:** Easy, Normal and Hard change the reaction delay and the scoring noise.
- **Game feel:** Hit-stop (2–5 frames), camera shake scaled to damage, damage numbers, knockback, impact craters (decals that fade) and big skill-name callouts.

## Roster (v1 → v2)
- **MVP (2):** Naruto and Goku. Together they cover a rushdown fighter (clones, Rasengan dash), a zoner (Ki blasts, Kamehameha beam) and two transformations.
- **v1 (6):** Adds Sasuke, Vegeta, Gojo and Tanjiro.
- **v2:** Sukuna, Itachi, Rengoku and others. The data format makes these mostly content work.

## Assets plan
- **Free packs:** Arena tiles, VFX sprite sheets and Kenney SFX/UI. Record each pack's license in `public/assets/CREDITS.md`.
- **AI-generated character sprites:**
  - **Spec:** One fixed style for every character: top-down 3/4 view, 64×64 frames, transparent background. Each character gets the same 5 animations: idle, run, cast, hit and KO, at 4–6 frames each. Sprites face one direction and are flipped with `flipX`.
  - **Pipeline:** Pack the frames into atlases with free-tex-packer.
- **Placeholder fallback:** When a sprite key is missing, `FighterView` draws a colored circle with the character's initials. Gameplay never waits on art.
- **IP hygiene:** Don't rip official sprites or voice audio. Voice lines stay as text subtitles, and a "fan-made, non-commercial" disclaimer goes on the title screen.

## Milestones
1. **Scaffold:** Run `git init`, then set up Vite, TypeScript (strict), Phaser 3, Vitest, ESLint and Prettier. Add an empty Battle scene that renders the arena.
2. **Sim core:** Fixed-step loop, fighters as circles, movement AI, one projectile skill, HP and KO. Add tests for determinism (same seed gives the same winner and tick count) and for damage.
3. **Skill system and energy:** All skill kinds, cooldowns, statuses, the energy pip system and ultimates.
4. **Player control:** Skill bar HUD with cooldown sweeps, hotkeys 1–4, U and T, the Auto toggle, and click-to-cast.
5. **Transformations and domains:** Form swaps, cinematic camera and domain arena overlays.
6. **Game feel and HUD:** Top bar matching the video (portraits, names, HP, energy, timer), callouts, subtitles, particles, shake, hit-stop and craters.
7. **Content (MVP):** Naruto vs Goku with real sprites and SFX. Character Select and Results screens (winner, damage dealt, skills used).
8. **Balance tool:** `npm run balance`, which runs 1,000 headless matches per pairing and prints win rates.
9. **Roster to 6**, then a **2v2 tag mode** using the team-aware targeting.
10. **Optional:** Replay and share (seed plus input log), a "record clip" button using the MediaRecorder API on the canvas (made for TikTok-style clips), and deployment to GitHub Pages or Netlify.

## Verification
- `npm test`: Vitest covers sim determinism, damage and status math, cooldown and energy gating, transformation triggers, and that the AI never gets stuck (every match ends before the timer cap).
- `npm run balance`: No MVP matchup should be outside a 35–65% win rate.
- `npm run dev`: Open in the browser pane. Check that a full match plays out, that hotkeys fire the right skills, that Auto takes over, that the transformation cinematic plays and that the Results screen appears. Also check the console for errors.
- `npm run build`: Must produce a static bundle that loads from `vite preview`.
