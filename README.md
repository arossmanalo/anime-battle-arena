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
| `Esc` | Pause |

If you don't cast anything for 4 seconds, the AI casts for you until you press a skill again.

Roster: Naruto, Sasuke, Goku, Vegeta, Gojo, Tanjiro.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server at http://localhost:5173 |
| `npm test` | Run the simulation tests |
| `npm run balance` | Run headless AI-vs-AI matches and print win rates |
| `npm run build` | Type-check and build a static bundle into `dist/` |

See [docs/PLAN.md](docs/PLAN.md) for the full build plan.

All characters belong to their respective owners. This project is not affiliated with or endorsed by them.
