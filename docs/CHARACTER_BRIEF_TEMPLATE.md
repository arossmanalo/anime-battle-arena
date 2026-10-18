# Character brief template

Copy this into Claude (or type `/new-character` followed by it). Fill what you care about and leave the rest blank: Claude picks sensible defaults and tells you what it chose. Natural language is fine, the headings are just a checklist.

```
/new-character

Name:
Series:
Who they are (one or two lines, personality and fighting style):

Look (colours, outfit, hair, weapon; Claude uses this for the sprite prompt):

Fighting style: [brawler / swordsman | all-rounder | ranged / caster]

Signature moves (as many as you like, one line each, say what each does):
-
-
-
-
Ultimate (their strongest move):

Basic attack (punch combo, sword slash, ki bolt, ...):

Passive (a trait that is always on: blocks hits, dodges, heals when low, hits harder when hurt, charges the ultimate faster, survives one lethal hit):

Transformation / second form (name and look, or "none"):

Feel (fast and fragile / tanky / glass cannon / balanced / tricky):

Team role (optional, for team battles: tank / support (heals, shields, buffs allies) / damage, or a mix such as "tank with some damage", and what they do for allies: taunt and guard, heal, shield or buff teammates; blank = pure damage dealer):

Anything else (voice lines, a rival, moves that must NOT be included):
```

## Example

```
/new-character
Name: Zoro
Series: One Piece
Who they are: three-sword swordsman, stoic, relentless.
Look: green hair, green haramaki, white shirt, black sash, three katanas, one in his mouth.
Fighting style: swordsman
Signature moves: Oni Giri (fast triple-slash dash); Tiger Hunt (a flying slash projectile); Lion Song (a quick area slash around him); Haki Focus (damage buff).
Ultimate: Asura (three-headed demon slash, huge damage).
Basic attack: sword slash combo
Passive: hits harder the more hurt he is
Transformation: Enma, a darker aura, faster and stronger
Feel: tanky bruiser
```

## Example: Tanjiro (this is the brief that describes the fighter already in the game)

```
/new-character
Name: Tanjiro
Series: Demon Slayer
Who they are: a kind, determined demon slayer who never gives up and fights to protect people. Fast, relentless, gets stronger when pushed to the edge.
Look: dark red hair with a scar on the forehead, green and black checkered haori over a black uniform, white leg wraps, hanafuda earrings, a black nichirin sword.
Fighting style: swordsman (fast rushdown)
Signature moves:
- Water Wheel: a spinning forward dash slash through the enemy.
- Whirlpool: a short-range water burst around him that knocks enemies back.
- Flowing Dance: a quick speed boost with a small shield.
- Dance of the Fire God: a longer fire dash slash that leaves the enemy burning.
Ultimate: Sun Halo Dragon, a huge fire dragon that bursts around him, heavy damage, burning and knockback.
Basic attack: sword slash combo
Passive: Unbreakable Resolve, once per match he survives a lethal hit on 1 HP and is untouchable for 2 seconds.
Transformation: Demon Slayer Mark, unlocks when he is badly hurt: faster and stronger, regains some health.
Feel: fast, aggressive, resilient
Team role: damage, with a small shield he can throw on a teammate (Flowing Dance in team battles).
Anything else: kind, earnest voice lines ("I'll protect everyone, no matter what!"); keep it a pure close-range fighter.
```

## What you get back

1. `src/data/fighters/<id>.ts`, added to the roster, balanced by running the AI against everyone.
2. A balance table.
3. `docs/<NAME>_SPRITE_PROMPT.md` and `docs/<NAME>_FX_PROMPTS.md`: one prompt to paste into ChatGPT for the character sheet (and form sheets) and one for the effects.
4. Then you send the generated images and Claude imports and checks them (sprites in `public/assets/fighters/<id>/`, effects in `public/assets/fx/<skill id>/`).
