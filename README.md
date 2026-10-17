# Anime Battle Arena

A fan-made, non-commercial anime auto-battle arena built with Phaser 3, TypeScript and Vite.
Two fighters battle on their own in a top-down arena while you fire your fighter's skills live.

## How to play

Pick your fighter and a CPU opponent. Both fighters move and dodge on their own. You decide when your fighter's skills go off.

| Key | Action |
| --- | --- |
| `1`-`4` | Cast a skill (costs energy, then goes on cooldown) |
| `U` | Ultimate (needs a full ULT meter, which fills as you deal and take damage) |
| `T` | Transform (unlocks at low HP with enough energy) |
| `A` | Toggle Auto, so the AI casts for you |
| `M` | Mute / unmute |
| `Esc` | Pause |

**Training mode** (`T` on the title screen, or the Training button): pick a fighter and test it on a bullseye dummy that never fights back or dies. You get infinite energy and a full ultimate meter, can use your form any time (`T` again turns it off), and a panel shows total damage, last hit, best hit and DPS. Keys: `R` reset the field and stats, `C` toggle skills having no cooldown, `D` dummy still / pacing / strafing.

Skills can have their own effect sprites (`public/assets/fx/<skill id>/`), imported with `npm run import-fx`; see [docs/FX_SPEC.md](docs/FX_SPEC.md). Anything without art uses the generic effect.

Fighters also use a **default attack** automatically whenever an enemy is in reach (a punch/slash combo for melee fighters, a weak energy bolt for Vegeta and Gojo). It costs no energy and skills can interrupt it. Tune it in the `attack` block of each fighter file.

Every fighter also has a **passive** that works on its own, with no key to press: Gojo's Limitless blocks his next 2 attacks (then recharges), Sasuke's Sharingan evades 15% of attacks, Goku's Zenkai raises his damage as his HP drops, Naruto heals while low on HP, Vegeta charges his ultimate faster, and Tanjiro survives one lethal hit. Passives are defined in each fighter's data file (see `PassiveEffect` in `src/sim/types.ts`).

If you don't cast anything for 4 seconds, the AI casts for you until you press a skill again.

Roster: Naruto, Sasuke, Goku, Vegeta, Gojo, Tanjiro.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server at http://localhost:5173 |
| `npm test` | Run the simulation tests |
| `npm run balance` | Run headless AI-vs-AI matches and print win rates |
| `npm run build` | Type-check and build a static bundle into `dist/` |
| `npm run import-sheet -- <image> <id>` | Clean up an AI-generated sprite sheet (e.g. from ChatGPT) and install it as a fighter sprite |
| `npm run import-lpc -- <file.png> <id>` | Convert a sheet from the LPC character generator into a fighter sprite (see the art spec) |
| `npm run assets` | Rebuild the asset manifest after adding art or sound (runs automatically before `dev`/`build`) |

See [docs/PLAN.md](docs/PLAN.md) for the full build plan.

## Art and sound

The game runs without any art files: fighters are placeholder discs and every sound is synthesized. Drop sprite sheets, portraits, a floor tile or sound files into `public/assets/` and they're picked up automatically. [docs/ART_SPEC.md](docs/ART_SPEC.md) has the exact format, plus a workflow and prompt template for AI-generated sprites.

All characters belong to their respective owners. This project is not affiliated with or endorsed by them.
