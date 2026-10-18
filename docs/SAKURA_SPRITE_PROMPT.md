# Sakura sprite prompts (ChatGPT)

Two sheets: the base **Sakura Haruno** and the **Strength of a Hundred Seal** form used after she awakens. **Attach a reference image of Sakura from Naruto Shippuden (her red-tunic look) when you paste prompt 1**, and **also attach one of your existing pixel sprites (for example Naruto's or Tanjiro's idle frame) as a style reference**. For prompt 2 attach two images in this order: **first the finished base sprite, then a reference image of Sakura with the purple Strength of a Hundred markings** (optional). Ask for both sheets in the same chat so the design stays consistent. Import commands are at the bottom.

## 1. Base sheet

```
Attached are two images: the FIRST is a reference image of Sakura Haruno from Naruto Shippuden and the SECOND is one of my existing pixel-art fighters, for style, scale and pixel density only. Using the first as the design reference, create a pixel-art sprite sheet of Sakura as a chibi fighting-game character in the same style as my other fighters (big head, small body, crisp pixel outlines, saturated colours). Keep the design exactly the same in every frame.

Design details to keep (if the reference differs slightly, follow the reference): short pink hair, bright green eyes, a violet diamond-shaped seal on the forehead, a red sleeveless combat tunic with white trim, dark shorts, black gloves, shinobi sandals. She fights with BARE HANDS (powerful punches): no weapon of any kind.

- PIXEL-ART STYLE (important): this must be TRUE low-resolution pixel art like a 16-bit fighting game, NOT a smooth illustration. Draw each character about 64 pixels tall on a visible pixel grid, with chunky square pixels, hard 1-pixel dark outlines, a limited palette (about 24 colours), flat colour shading in 2-3 tones, and NO anti-aliasing, NO soft gradients, NO blur, NO painterly or vector smoothing. Keep it crisp enough that individual pixels are visible when zoomed in.
- Transparent background. No text, no labels, no borders.
- Every frame shows the character from a side / three-quarter view FACING RIGHT.
- Arrange it as a grid: 6 rows, up to 6 frames per row, all cells the same size, the character centred in each cell, FEET ON THE SAME BASELINE in every frame, the same scale in every frame. LEAVE A CLEAR GAP BETWEEN ROWS so that no frame touches the row above or below.
- Row 1: idle fighting stance, light and ready, fists up (4 frames).
- Row 2: running (6 frames).
- Row 3: casting a healing technique, both hands held forward with open palms (4 frames).
- Row 4: recoiling from a hit (2 frames).
- Row 5: falling down knocked out (4 frames).
- Row 6: a quick basic attack: two fast punches then a stronger finishing punch (4 frames: wind-up, strike, follow-through, recover).
- No glowing energy, swirls, speed lines or particles. Character only.
```

## 2. Strength of a Hundred Seal sheet

Attach: **1) the finished base sprite, then 2) a reference image of Sakura with the Strength of a Hundred markings** (optional).

```
Attached are two images: the FIRST is the pixel-art Sakura sprite from the first sheet (her base form), and the SECOND (if present) is a reference image of her Strength of a Hundred Seal form. Use the first as the exact style, scale and colour reference and the second for the design details. Create a pixel-art sprite sheet of her STRENGTH OF A HUNDRED SEAL form from Naruto Shippuden, in the same chibi style, as the same character with: intricate PURPLE markings spreading from the forehead diamond across her face, arms and legs, a more focused and determined expression, hands slightly glowing pale green. Same size, same outfit, same pink hair. Bare hands only: no weapon.

- PIXEL-ART STYLE (important): this must be TRUE low-resolution pixel art like a 16-bit fighting game, NOT a smooth illustration. Draw each character about 64 pixels tall on a visible pixel grid, with chunky square pixels, hard 1-pixel dark outlines, a limited palette (about 24 colours), flat colour shading in 2-3 tones, and NO anti-aliasing, NO soft gradients, NO blur, NO painterly or vector smoothing.
- Transparent background. No text, no labels, no borders.
- Every frame shows the character from a side / three-quarter view FACING RIGHT.
- Arrange it as a grid: 6 rows, up to 6 frames per row, all cells the same size, the character centred in each cell, feet on the same baseline in every frame. LEAVE A CLEAR GAP BETWEEN ROWS so that no frame touches the row above or below.
- Row 1: idle stance, hands glowing slightly (4 frames). Row 2: running (6 frames). Row 3: casting, both hands forward glowing green (4 frames). Row 4: recoiling from a hit (2 frames). Row 5: falling down knocked out (4 frames). Row 6: a powerful basic attack: two punches then a heavy finishing punch (4 frames: wind-up, strike, follow-through, recover).
- No separate energy effects, swirls, speed lines or particles. Character only.
```

## Importing

```
npm run import-sheet -- path/to/base.webp sakura --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Sakura"
npm run import-sheet -- path/to/seal.webp sakura --form --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Sakura/Seal"
npm run assets
```

If a row count is wrong (rows that touch get merged), tell Claude: it can split the image by hand and re-import. Restart `npm run dev` afterwards. Until the sprites exist, Sakura shows as a pink disc with "SK".
