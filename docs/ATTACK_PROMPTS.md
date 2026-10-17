# Attack row prompts (ChatGPT)

Paste the **same chat** you used for that character's sprite sheet if you can, so the design stays identical. Attach the character's existing sheet (or idle frame) with the prompt.

Then import each result:

```
npm run import-sheet -- path/to/attack.webp <id> --attack --copy-to "C:/Users/<you>/Pictures/ABA Sprites/Characters/<Name>"
npm run import-sheet -- path/to/attack-form.webp <id> --attack --form      # for the transformed look
```

## Shared rules (already included in every prompt below)

- Transparent background, no text, labels or borders.
- Two rows only. **Row 1** is the idle stance (2 frames), used just to match the size of the existing sprite. **Row 2** is the attack (4 frames: wind-up, strike, follow-through, recover).
- Side / three-quarter view, **facing right**. Same pixel-art style, colours, proportions and scale as the attached sprite. Feet on the same baseline in every frame, character centred in each cell.
- Character only: no slash arcs, energy effects, speed lines, impact flashes or particles. Weapons and limbs must stay inside the frame.

## Naruto: Punch Combo

> Using the attached sprite as the exact reference (same design, colours, proportions and scale), create a pixel-art sprite sheet of Naruto with a transparent background, no text, labels or borders. Side / three-quarter view, **facing right**, all cells the same size, character centred in each cell, **feet on the same baseline** in every frame.
> - Row 1: idle fighting stance (2 frames).
> - Row 2: a quick basic **punch** (4 frames): 1) pulls the right fist back and leans in, 2) the fist strikes forward at full extension, 3) follow-through with the body lunging forward, 4) recovering back toward the stance.
> - No energy effects, swirls, speed lines, impact flashes or particles. Character only.

## Sasuke: Kunai Slash

> Using the attached sprite as the exact reference (same design, colours, proportions and scale), create a pixel-art sprite sheet of Sasuke with a transparent background, no text, labels or borders. Side / three-quarter view, **facing right**, all cells the same size, character centred in each cell, **feet on the same baseline** in every frame.
> - Row 1: idle fighting stance (2 frames).
> - Row 2: a quick basic **kunai slash** (4 frames): 1) kunai held in the right hand and drawn back, 2) the slash sweeping forward across the body, 3) follow-through with the arm fully extended, 4) recovering back toward the stance. The kunai is a small dark blade held in the hand.
> - No slash arcs, energy effects, speed lines, impact flashes or particles. Character only.

## Goku: Punch & Kick

> Using the attached sprite as the exact reference (same design, colours, proportions and scale), create a pixel-art sprite sheet of Goku with a transparent background, no text, labels or borders. Side / three-quarter view, **facing right**, all cells the same size, character centred in each cell, **feet on the same baseline** in every frame.
> - Row 1: idle fighting stance (2 frames).
> - Row 2: a quick basic **punch** (4 frames): 1) pulls the right fist back, 2) the fist strikes forward at full extension, 3) follow-through with the body lunging forward, 4) recovering back toward the stance.
> - No energy effects, speed lines, impact flashes or particles. Character only.

## Vegeta: Ki Bolt

> Using the attached sprite as the exact reference (same design, colours, proportions and scale), create a pixel-art sprite sheet of Vegeta with a transparent background, no text, labels or borders. Side / three-quarter view, **facing right**, all cells the same size, character centred in each cell, **feet on the same baseline** in every frame.
> - Row 1: idle fighting stance (2 frames).
> - Row 2: a quick basic **ki blast** (4 frames): 1) pulls the right hand back to the hip, 2) thrusts the open palm forward to fire, 3) the arm is fully extended with the palm open, 4) recovering back toward the stance.
> - **Do not draw the energy ball or beam itself**, just the pose. No swirls, speed lines, flashes or particles. Character only.

## Gojo: Cursed Bolt

> Using the attached sprite as the exact reference (same design, colours, proportions and scale), create a pixel-art sprite sheet of Gojo with a transparent background, no text, labels or borders. Side / three-quarter view, **facing right**, all cells the same size, character centred in each cell, **feet on the same baseline** in every frame.
> - Row 1: idle stance (2 frames).
> - Row 2: a quick basic **cursed energy shot** (4 frames): 1) raises the right hand with two fingers pointed up, 2) snaps the hand forward, fingers pointing at the enemy, 3) the arm fully extended, 4) recovering back toward the stance.
> - **Do not draw the energy itself**, just the pose. No swirls, speed lines, flashes or particles. Character only.

## Tanjiro: Sword Slash

> Using the attached sprite as the exact reference (same design, colours, proportions and scale), create a pixel-art sprite sheet of Tanjiro with a transparent background, no text, labels or borders. Side / three-quarter view, **facing right**, all cells the same size, character centred in each cell, **feet on the same baseline** in every frame.
> - Row 1: idle fighting stance with the sword held (2 frames).
> - Row 2: a quick basic **sword slash** (4 frames): 1) the sword raised back behind the shoulder, 2) the blade sweeping forward and down in a diagonal cut, 3) follow-through with the sword extended forward, 4) recovering back toward the stance.
> - No slash arcs, water effects, speed lines, impact flashes or particles. The sword must stay inside its cell. Character only.

## Transformed versions

For each form sheet (Nine-Tails Chakra Mode, Rinnegan, Super Saiyan, Domain Expansion look, ...), attach the **form** sprite instead and use the same prompt, changing the name to the form. Import with `--attack --form`.

Tanjiro has no form sheet yet, so only the base row is needed.

## If it doesn't import

- "expected 2 rows": the image has text, effects, or frames that overlap vertically. Ask ChatGPT to redo it with more space between the two rows.
- The character looks bigger or smaller than before: row 1 wasn't the same size as the existing sprite. Ask for row 1 to match the attached sprite exactly.
