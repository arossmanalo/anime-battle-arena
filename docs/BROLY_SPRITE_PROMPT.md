# Broly sprite prompts (ChatGPT)

Two sheets: the base **Broly** (black and green armor) and the **Full Power Super Saiyan** form used after he awakens. **Attach a reference image of Broly from Dragon Ball Super (his base look) when you paste prompt 1**, and **also attach one of your existing pixel sprites (for example Goku's or Tanjiro's idle frame) as a style reference**. For prompt 2 attach two images in this order: **first the finished base sprite, then a reference image of Full Power Super Saiyan Broly** (green hair, bare torso). Ask for both sheets in the same chat so the design stays consistent. Import commands are at the bottom.

Broly is the biggest fighter in the game: draw him noticeably larger than the others (about 25-30% taller and much broader), a heavy, slow-looking juggernaut.

## 1. Base sheet

```
Attached are two images: the FIRST is a reference image of Broly from Dragon Ball Super (his normal black-haired form) and the SECOND is one of my existing pixel-art fighters, for style, scale and pixel density only. Using the first as the design reference, create a pixel-art sprite sheet of Broly as a chibi fighting-game character in the same style as my other fighters (big head, small body, crisp pixel outlines, saturated colours), but a HUGE, broad, heavily muscular version: enormous shoulders and arms, about 25-30% taller than the attached fighter. Keep the design exactly the same in every frame.

Design details to keep (if the reference differs slightly, follow the reference): wild spiky black hair, dark eyes, a scar on his left cheek, black and green Saiyan battle armor, purple pants, dark boots, a green fur pelt tied around his waist. He fights with BARE HANDS only: no weapon of any kind. Slow, heavy and powerful.

- PIXEL-ART STYLE (important): this must be TRUE low-resolution pixel art like a 16-bit fighting game, NOT a smooth illustration. Draw each character about 64 pixels tall on a visible pixel grid, with chunky square pixels, hard 1-pixel dark outlines, a limited palette (about 24 colours), flat colour shading in 2-3 tones, and NO anti-aliasing, NO soft gradients, NO blur, NO painterly or vector smoothing. Keep it crisp enough that individual pixels are visible when zoomed in. If you are about to draw a smooth high-resolution illustration, stop and draw it as pixel art instead.
- Transparent background. No text, no labels, no borders.
- Every frame shows the character from a side / three-quarter view FACING RIGHT.
- Arrange it as a grid: 6 rows, up to 6 frames per row, all cells the same size, the character centred in each cell, FEET ON THE SAME BASELINE in every frame, the same scale in every frame.
- Row 1: idle fighting stance, hunched and heavy, fists low, slow breathing (4 frames).
- Row 2: running, heavy stomping strides (6 frames).
- Row 3: casting, a roar with the chest out and both arms spread (4 frames).
- Row 4: recoiling from a hit, barely flinching (2 frames).
- Row 5: falling down knocked out (4 frames).
- Row 6: a slow, heavy basic attack: a massive punch, a body blow, an elbow and a powerful final kick (4 frames: wind-up, strike, follow-through, recover).
- No energy effects, swirls, speed lines or particles. Character only.
```

## 2. Full Power Super Saiyan sheet

Attach: **1) the finished base sprite, then 2) a reference image of Full Power Super Saiyan Broly** (optional).

```
Attached are two images: the FIRST is the pixel-art Broly sprite from the first sheet (his base form), and the SECOND (if present) is a reference image of his Full Power Super Saiyan form. Use the first as the exact style, scale and colour reference and the second for the design details. Create a pixel-art sprite sheet of his FULL POWER SUPER SAIYAN form from Dragon Ball Super, in the same chibi style, as an even bigger, more imposing and more muscular version of the same character: bright GREEN spiky hair standing straight up, pale glowing eyes, the upper armor destroyed so his huge muscular torso is bare, the purple pants and the green fur pelt kept, bigger shoulders and arms. A faint emerald glow outline around the body is fine but no separate energy effects. Bare hands only: no weapon.

- PIXEL-ART STYLE (important): this must be TRUE low-resolution pixel art like a 16-bit fighting game, NOT a smooth illustration. Draw each character about 64 pixels tall on a visible pixel grid, with chunky square pixels, hard 1-pixel dark outlines, a limited palette (about 24 colours), flat colour shading in 2-3 tones, and NO anti-aliasing, NO soft gradients, NO blur, NO painterly or vector smoothing. Keep it crisp enough that individual pixels are visible when zoomed in.
- Transparent background. No text, no labels, no borders.
- Every frame shows the character from a side / three-quarter view FACING RIGHT, about 10% bigger than the base sprite.
- Arrange it as a grid: 6 rows, up to 6 frames per row, all cells the same size, the character centred in each cell, feet on the same baseline in every frame.
- Row 1: aggressive idle stance, fists clenched, shoulders heaving (4 frames). Row 2: running with heavy stomps (6 frames). Row 3: casting, a ferocious roar with the head thrown back and arms spread (4 frames). Row 4: recoiling from a hit, barely flinching (2 frames). Row 5: falling down knocked out (4 frames). Row 6: a savage heavy basic attack: an overhead smash, a body blow, a stomp and a crushing final punch (4 frames: wind-up, strike, follow-through, recover).
- No energy effects, swirls, speed lines or particles. Character only.
```

## Importing

```
npm run import-sheet -- path/to/base.webp broly --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Broly"
npm run import-sheet -- path/to/fullpower.webp broly --form --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Broly/Full Power"
npm run assets
```

Restart `npm run dev` afterwards. Until the sprites exist, Broly shows as a green disc with "BR".
