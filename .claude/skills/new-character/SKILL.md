---
name: new-character
description: Turn a natural-language character description into a playable fighter for Anime Battle Arena (data file, roster entry, balance check, sprite and FX prompts). Use when the user says /new-character or asks to add, design or create a character, fighter or roster member.
---

# New character

Input: a plain-language description of a character (name, series, what they can do, personality, look). It may be loose. Output: a working, balanced fighter in the game plus everything needed to make its art.

## 0. Read the brief

Fill the blanks from the description using the defaults below. Only ask the user when something changes the design a lot (for example "which two of these five moves?"). Never ask more than 3 questions, and prefer picking a sensible default and saying so.

The user can use the template in `docs/CHARACTER_BRIEF_TEMPLATE.md`, but any wording works.

## 1. Design the kit

A fighter (`FighterDef`, see `src/sim/types.ts`) has: stats, **4 skills**, **1 ultimate**, **1 default attack**, **1 passive** and an optional **form**. Look at two existing files in `src/data/fighters/` for style before writing one.

**Archetype -> AI profile and stats**

| Archetype | `aiProfile` | `hp` | `speed` | Notes |
|---|---|---|---|---|
| Brawler / swordsman | `rushdown` | 500-545 | 175-190 | melee default attack, short-range dashes, burst damage |
| All-rounder | `balanced` | 500-540 | 170-180 | mix of projectile, dash and a beam or area |
| Ranged / caster | `zoner` | 500-550 | 160-175 | ranged default attack (weak bolt), zones, beams, longer cooldowns |

`radius` 18, `energyRegen` 7 (7.5 for slow casters). Colours: `color` is the main body colour, `accent` the secondary (hex numbers like `0xff8a1f`).

**Skills** (`kind`: projectile, beam, dash, aoe, zone, buff). Map the character's famous moves onto these:
- Use each of the 4 slots for a different job: a cheap spammy poke (energy 8-12, cooldown 2-3, 4-6 total damage per volley), a mobility or gap-closer dash (energy 15-22, cooldown 5-6, damage 17-24), a signature heavy hit (beam, big projectile or area; energy 25-30, cooldown 7-9, total 20-30), and a utility or buff (energy 20-25, cooldown 12-16: shield 22-58, damage/speed buff 1.2-1.4 for 4-6 s, heal).
- **Ultimate**: `ultimate: true`, `energyCost: 0`, `cooldown: 4`, cast time 0.7-1.2 s, damage 48-56 (beams: damage per tick 3.5-7 over 1-1.4 s). Include knockback or a stun/burn rider.
- Effects: `damage`, `knockback`, `stun` (keep <= 1 s), `burn`, `slow`, `shield`, `heal`, `speedBuff`, `damageBuff`. Self effects go in `selfEffects`.
- Every `id` is unique and starts with the character id (`<id>.<skill>`).
- `color` per skill = the dominant colour of its effect.

**Default attack** (`attack`): melee punch/slash combo (`style: 'melee'`, range 48-56, damage 3.5-8, `combo: 3`, `cooldown` 0.45-0.55, `windup` 0.12-0.14, `knockback` 160-180) or a ranged bolt (`style: 'ranged'`, range 300-320, damage 5-9, `combo: 1`, `cooldown` 0.9, `speed` 500-520). Ranged attackers (zoners) get the bolt.

**Passive** (`passive`, one of the kinds in `PassiveEffect`): pick the one that fits the character's identity, with these tuned values as the guide.
- `barrier` (blocks hits, e.g. an untouchable defence): `hits: 2`, `cooldown: 24`
- `dodge` (evasion, precognition): `chance: 0.15`
- `regen` (regeneration): `hpPerSec: 4`, `belowHp: 0.6`
- `rage` (stronger when hurt): `maxBonus: 0.3`
- `ultCharge` (ultimate fills faster): `mult: 1.5`
- `lastStand` (refuses to die): `invuln: 2`

**Form** (optional, `form`): a transformation unlocked at low HP. `hpThreshold` 0.45-0.5, `energyCost` 40 (50 for a domain-style one), `speedMult` 1.1-1.25, `damageMult` 1.15-1.25, `energyRegenMult` 1.3-1.5, `heal` 0.05-0.1. It may replace a skill (`skillOverrides`) or the ultimate. Give it a `color`.

**Advanced forms.** A `form` can also set `maxHpMult`, `damageTaken` (0.9 = 10% less), `knockbackTaken`, `passiveOverride`, `attackOverride` and `roles` (a support that awakens into a tank; the AI switches behaviour). The `awakening` passive adds a 0-100 meter (`perDamage`, `perTaken`, `perSupport`, `regenDelay`, `hpPerSec`) whose full bar unlocks the form like low HP does (see `src/data/fighters/nezuko.ts`). Forms are always permanent for the match; use `energyCost: 0` for a free awakening. Skills with a `support` block also work in 1v1: allies include the caster, so they buff, heal or shield herself when alone. Override ids (`<skill>.awakened`) need their own FX folder or reuse the base art.

**Tank effects.** `steady { factor, duration }` (knockback taken x factor, stuns shortened; at 0.3 or less stuns are ignored and casts cannot be interrupted) and `counter { duration, damage }` (braced: no default attacks, the first close-range hit is answered with damage, stun and knockback). The `awakening` passive also takes `knockbackResist` and `damageReduction` that scale with the meter (damage blocked by a guard feeds it too); see `src/data/fighters/broly.ts`. A form can reuse that passive pinned at full via `passiveOverride`. A transformed fighter's attack can have its own hit art via `attackOverride.fxId`.

**Healer effects.** `regen { hps, duration }` (heal over time, refreshes, never stacks), `ward { duration }` (ignores new burn, slow and stun), `heal { selfFactor }` (self-heal reduction), `FormDef.healMult`. A `zone` skill with a `support` block heals/regens teammates standing in it every tick while slowing enemies (Katsuyu). `outer: { from, effects }` gives an area skill a second ring (stun inside, slow outside), and `boostable` plus the awakening passive's `radiusBonus` enlarges the next such skill after healing an ally under 35% HP. See `src/data/fighters/sakura.ts`.

**Second life and finishers.** `FormDef.onDeath` (+ `reviveHp`) makes the form trigger when the fighter would die instead of at low HP (they rise at that share of max HP, with the ultimate reset). `requiresHpBelow` gates a skill (a map-wide finisher at 30% HP) and `ultOrbs` draws two orbs beside the fighter while armed. Projectiles can `bounces` off walls and enemies, zones can `pull` enemies in, and the effects `purge` (strip buffs and shields) and `expose` (nothing can block or evade hits on the target) support a domain that guarantees hits. See `src/data/fighters/gojo.ts`. Warning: a second life is worth far more than it looks (the enemy is usually nearly dead when it triggers), so revive at a low HP and run the balance tool.

**Roles and team kit (team battles).** Every fighter gets `roles: { tank, damage, support }` (scores 0-1, a hybrid has two high ones) and, if the brief suggests it, a `teamKit` of 0-2 skills that replace a slot only in team matches. Team-only building blocks (see `docs/TEAM_MODE_PLAN.md`):
- A skill's `support: { to: 'lowestAlly' | 'allAllies' | 'nearestAlly', range?, effects[] }` applies effects to teammates (kind `buff`, `effects: []`, caster effects in `selfEffects`).
- Effects: `heal` (amount 40-50 for a dedicated support, 20-30 for a hybrid), `shield` (24-40), `guard { factor 0.5-0.7, duration 4 }`, `taunt { duration 3-3.5 }` (an `aoe` with `range: 0`, `radius` about 230, taunt in `effects`), `cleanse`, plus the existing buffs.
- Tank: `aiProfile: 'rushdown'` or `balanced`, roles `{ tank: 0.7+ }`, a taunt + guard skill in its team kit. Support (healer, shielder or buffer): roles `{ support: 0.7+, damage: 0.3-0.5 }`, a heal + cleanse, shield or buff for allies in its team kit, `aiProfile: 'zoner'`. Damage fighters can omit the kit.
- **Team-kit skills reuse the solo skill's `id`** (for example the team `sasuke.susanoo` replaces the solo `sasuke.susanoo` in slot 3). Effect art is keyed by skill id, so a new id means the default effect is drawn instead of the custom art. Keep the same `kind` family too: self-only team skills (taunt, guard, shield on the caster) may be `buff` or an `aoe` with `selfEffects`, and either one shows the solo `body` aura. Do not give a team-kit skill an id that has no FX folder.
- **Domains** (`domain: true`) are automatically shrunk to a circle of at most 300 radius in team battles (`TEAM_DOMAIN_RADIUS`), and the view draws them clipped to that circle, so no extra work is needed. Check the domain art still reads at that size.
- **Orders**: the player can order focus, protect, stance and hold ultimates in team battles. The AI honours them through roles, so a correct `roles` score is what makes a fighter behave right under orders: tanks guard the protected ally, supports favour them, damage dealers hunt whoever attacks them. Ultimates are cast with `slot: 4` by the U button, so the ultimate must be a normal `ultimate: true` skill.
- Run `npm run team-balance -- 2 300` and `-- 4 120`: no fighter or role mix should be far outside about 40-60%, and all-damage teams should lose to a balanced one.

**Voice lines**: 2 each for `intro`, `ultimate`, `transform`, `hurt`, `win`, short and in character (paraphrase, do not quote copyrighted dialogue).

`initials`: 2 letters for the placeholder disc. `series`: the show or game.

## 2. Write the code

1. Create `src/data/fighters/<id>.ts` exporting `export const <id>: FighterDef`, matching the style of the others (single quotes, 2-space indent, `import type { FighterDef } from '../../sim/types';`).
2. Add it to `ROSTER` in `src/data/fighters/index.ts` (import and list it).
3. Character Select lays out 3 columns; with more than 6 fighters check `CharacterSelectScene.ts` still fits and adjust the grid if not.

## 3. Verify and balance

- `npx tsc --noEmit` and `npx vitest run` (the "well-formed" test checks ids and costs).
- Check each team-kit skill id also exists as a solo skill id (so the art follows it), and in headless Chrome start a 2v2 with the new fighter, cast the team-kit skill and confirm its FX sprite is attached (`window.__sc.vfx.attached`).
- `npm run team-balance -- 2 300` (and `-- 4 120`) as described under roles.
- `npm run balance -- 100`: aim for each fighter's overall win rate within about 40-60% and no matchup outside 25-75%. If the new character is off, tune **their** numbers (damage, cooldown, hp) in small steps and re-run; only touch other characters if the new one is fine and the roster shifted. Report the final table.

## 4. Art prompts (docs)

Create two files and give the user the prompt text in chat too.

**Keep the game pixelated.** Every sprite-sheet prompt (base and form) must include the "PIXEL-ART STYLE (important)" paragraph from `docs/ART_SPEC.md` (true low-resolution pixel art, about 64px tall, hard 1px outlines, limited palette, no anti-aliasing or smooth gradients) and tell the user to also attach an existing pixel sprite of another fighter as a style reference. Without it ChatGPT returns smooth illustrations. FX prompts must say "pixel-art game VFX" as the existing ones do.

**REFERENCE RULE (important): the attached reference image is the ONLY source for what the character looks like.** Sprite prompts must NOT describe the character's face, hair, outfit, colours or accessories in words: ChatGPT follows the words and drifts from the image. Say instead: "Reproduce the character in the reference image exactly: same hair, face, outfit, accessories, colours and proportions. Do not add, remove or change any detail. If these instructions ever differ from the image, the image wins." Only describe things the image cannot show: the pixel style, the pose of each row, the layout, and "no weapon" or "bare hands" when that is a game rule.

**Every prompt must tell ChatGPT that the user is attaching a reference image**, in its first sentence, and say what it is for: for the base sprite sheet, "Attached is a reference image of <character>; keep the exact same design"; for a form sheet and for all FX prompts, "Attached is the pixel-art sprite of <character>" used only for style, colour and scale. Also add one line above each prompt block in the doc: "Attach <what> when you paste this." Never write a prompt that assumes ChatGPT already knows the character.

- `docs/<NAME>_SPRITE_PROMPT.md`: the ChatGPT sprite-sheet prompt from `docs/ART_SPEC.md` ("Making sprites with ChatGPT", including its PIXEL-ART STYLE paragraph) **without describing the character's look** (see the REFERENCE RULE below), **6 rows** (idle 4, run 6, cast 4, hit 2, ko 4, attack 4), and a second prompt for each form sheet. Import commands: `npm run import-sheet -- <image> <id> --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/<Name>"`, `--form` for the transformed sheet, `--attack` to add the attack row to an existing sheet.
- `docs/<NAME>_FX_PROMPTS.md`: the effect prompt, built like `docs/GOKU_FX_PROMPTS.md`, `docs/NARUTO_FX_PROMPTS.md` or `docs/SASUKE_FX_PROMPTS.md`: one image of rows (one row per skill, basic attack and ultimate, plus a passive trigger row if the passive has a visible trigger), each row a horizontal strip on pure black, the frame counts per part, which parts (`cast`, `body`, `start`, `impact`, plus `muzzle`/`tip` and a stretchable beam-body image for beams). Dark effects need a bright rim because black is keyed out. **Camera view per row:** effects that cover ground area (aoe, zone, domain, ultimate blasts, auras) are drawn TOP-DOWN (from directly above, perfectly round, in a square cell, so the ring matches the skill's `radius`; import them at `--size` about 2x radius), while projectiles, dashes, slashes and shields around a body stay SIDE VIEW. Give each frame its own square cell with wide black gaps so wide effects never touch, which the importer needs to split frames. Part rules are in `docs/FX_SPEC.md`.

## 5. Importing the art (when the user sends images)

- Sprites: `docs/ART_SPEC.md`, `npm run import-sheet`. Also save a copy to `C:\Users\Aryl Ross A. Manalo\Pictures\ABA Sprites\Characters\<Name>\`.
- FX: `npm run import-fx -- <image> <skill-id> <part> --crop L,T,R,B --frames N --pick A-B --size PX --copy-to ...Characters\<Name>\FX`. Find each row's band by looking at the image (or the brightness profile), count frames by eye, and check one frame sheet visually before committing. Sizes are in arena pixels (a fighter is about 90 wide).
- Test in headless Chrome rather than the preview pane (the pane is throttled): drive `window.game` and take screenshots.

## 6. Finish

Commit and push to `origin` after each milestone with a plain message and **no co-author line**. Summarise: the kit (4 skills, ultimate, attack, passive, form), the balance table, and exactly what the user needs to generate next.
