# Team mode plan (2v2, 3v3, 4v4)

Everything in a team match is controlled by the AI. The player builds the team (draft or free pick), sets the formation, and watches. 1v1, training and the current single-fighter modes stay as they are.

## Roles

Roles are scores, not boxes. A fighter has `roles: { tank, damage, support }` (0-1 each, default `damage: 1`). The AI, the draft screen and the balance tools read these. A hybrid has two high scores.

| Role | What the AI does |
| --- | --- |
| tank | stands in front, taunts when allies are being hit, soaks with guard |
| damage | picks the weakest or most valuable enemy in reach |
| support | buffs and shields allies, stays behind the front line |
| support | heals, shields or buffs allies (heals the lowest ally under 75% HP, cleanses stuns/burns), stays behind |

## Engine additions

- **Skill support block** (`SkillDef.support`): `{ to: 'lowestAlly' | 'allAllies' | 'nearestAlly', range?, effects[] }`, applied to teammates when the skill fires.
- **New effects:** `taunt` (enemies must attack the taunter), `guard` (take a fraction of damage), `cleanse` (remove stun, burn, slow).
- **Team kits** (`FighterDef.teamKit`): skills that replace a slot only in team matches, so 1v1 balance is untouched.
- **Target selection:** `Fighter.focus`, chosen by the AI from role value, HP and distance; taunt overrides it.
- **Anti-stalemate decay** (team matches only): from 25 s, healing weakens linearly to 30% and damage taken rises to +60% by 85 s. Both numbers live in `Simulation.ts` (`DECAY_*`).
- **Formation:** each fighter has a `row` (front / back); back-row fighters spawn further from the enemy.
- **Determinism:** nothing in the simulation uses `Math.random` or wall-clock time; a test replays a team match twice.

## Tools

- `npm run team-balance -- <size> <matches>`: random team vs random team, win rate per fighter and per role mix, average length, timeouts, and a list of degenerate compositions.

## Screens

Main menu -> **Team battle** -> choose size (2v2, 3v3, 4v4) and mode (free pick / draft) -> pick your team and set the formation -> the CPU team is chosen by the smart picker (fills missing roles, avoids duplicates) -> fight (no controls, a pause key and a speed toggle).

## Order of work

1. Engine + tests (this plan, sections above).
2. Team simulator.
3. Role AI.
4. 2v2: team select, draft, formation, team HUD.
5. 3v3 / 4v4: bigger arena, camera, readability (team rings, effect budget, smaller domains).
6. Real tank and support characters (via `/new-character`, updated for roles).

## Status

Done: engine (support skills, taunt, guard, cleanse, decay), roles and team kits for the 7 current fighters, role AI and focus targeting, team simulator, team select (free pick and draft), team HUD, 2v2/3v3/4v4 scaled arenas, team results.

Open: dedicated tank and support characters (the current roles are hybrids built from existing kits), team-aware domains, more roster (a 4v4 draft needs 8 fighters), real balance passes, PvP.
