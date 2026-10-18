# Erwin sprite prompts (ChatGPT)

Two sheets: the base **Erwin Smith** and the **Unyielding Commander** form used after he awakens. These prompts deliberately do **not** describe how Erwin looks: the attached reference image is the only source for his design, so ChatGPT cannot drift towards a written description.

**Prompt 1: attach these images, in this order:**
1. **A reference image of Erwin Smith** (the exact design you want kept).
2. **One of your existing pixel sprites** (for example Tanjiro's or Sakura's idle frame), for pixel style, scale and density only.

**Prompt 2: attach these images, in this order:**
1. **The finished Erwin base sprite** (idle frame from prompt 1's result).
2. **A reference image of the awakened look** (optional: Erwin with the battle-worn cloak, golden glow and intense expression). If you have none, attach only the base sprite.

Ask for both sheets in the same chat so the design stays consistent. Import commands are at the bottom.

## 1. Base sheet

```
Attached are images. The FIRST image is the reference for the character: reproduce the character in the first image exactly: same hair, face, outfit, accessories, equipment, colours and proportions. Do not add, remove or change any detail. If these instructions ever differ from the first image, the first image wins. The SECOND image is one of my existing pixel-art fighters and is ONLY for pixel style, scale and pixel density: do not copy its design, outfit or colours.

Create a pixel-art sprite sheet of the character from the first image as a chibi fighting-game character in the same style as my other fighters (big head, small body). He fights with the sword(s) shown in the reference: keep them as in the image and add no other weapon.

- PIXEL-ART STYLE (important): this must be TRUE low-resolution pixel art like a 16-bit fighting game, NOT a smooth illustration. Draw the character about 64 pixels tall on a visible pixel grid, with chunky square pixels, hard 1-pixel dark outlines, a limited palette (about 24 colours), flat colour shading in 2-3 tones, and NO anti-aliasing, NO soft gradients, NO blur, NO painterly or vector smoothing. Keep it crisp enough that individual pixels are visible when zoomed in.
- Transparent background. No text, no labels, no borders.
- Every frame shows the character from a side / three-quarter view FACING RIGHT.
- Arrange it as a grid: 6 rows, up to 6 frames per row, all cells the same size, the character centred in each cell, FEET ON THE SAME BASELINE in every frame, the same scale in every frame. LEAVE A CLEAR GAP BETWEEN ROWS so that no frame touches the row above or below.
- Row 1: idle fighting stance, upright and disciplined, sword held ready (4 frames).
- Row 2: running (6 frames).
- Row 3: casting a command: one arm raised and pointing forward, as if giving an order (4 frames).
- Row 4: recoiling from a hit, barely shaken (2 frames).
- Row 5: falling down knocked out (4 frames).
- Row 6: a quick sword attack: two quick slashes then a heavier finishing strike (4 frames: wind-up, strike, follow-through, recover).
- No glowing energy, swirls, speed lines or particles. Character only.
```

## 2. Unyielding Commander sheet

```
Attached are images. The FIRST image is the pixel-art sprite of the character from my first sheet (his base form). The SECOND image (if present) is a reference for his awakened look. Reproduce the character exactly as in the first image: same design, same proportions, same size, same pixel style and palette. Where the second image shows a difference (a more battle-worn cloak, a golden glow, a more intense expression), apply ONLY that difference. Do not add, remove or change any other detail. If these instructions ever differ from the images, the images win.

Create a pixel-art sprite sheet of this awakened version as a chibi fighting-game character in the same style as the first image. Same weapons as the first image: no other weapon.

- PIXEL-ART STYLE (important): this must be TRUE low-resolution pixel art like a 16-bit fighting game, NOT a smooth illustration. Draw the character about 64 pixels tall on a visible pixel grid, with chunky square pixels, hard 1-pixel dark outlines, a limited palette (about 24 colours), flat colour shading in 2-3 tones, and NO anti-aliasing, NO soft gradients, NO blur, NO painterly or vector smoothing.
- Transparent background. No text, no labels, no borders.
- Every frame shows the character from a side / three-quarter view FACING RIGHT.
- Arrange it as a grid: 6 rows, up to 6 frames per row, all cells the same size, the character centred in each cell, feet on the same baseline in every frame. LEAVE A CLEAR GAP BETWEEN ROWS so that no frame touches the row above or below.
- Row 1: idle stance, more intense, cloak stirring (4 frames). Row 2: running with the cloak streaming behind him (6 frames). Row 3: casting a command: sword raised high and pointing forward (4 frames). Row 4: recoiling from a hit, barely shaken (2 frames). Row 5: falling down knocked out (4 frames). Row 6: a quick sword attack, faster and more precise: two quick slashes then a finishing strike (4 frames: wind-up, strike, follow-through, recover).
- No separate energy effects, swirls, speed lines or particles. Character only.
```

## Importing

```
npm run import-sheet -- path/to/base.webp erwin --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Erwin"
npm run import-sheet -- path/to/commander.webp erwin --form --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Erwin/Commander"
npm run assets
```

If a row count is wrong (rows that touch get merged), tell Claude: it can split the image by hand and re-import. Restart `npm run dev` afterwards. Until the sprites exist, Erwin shows as a green disc with "ES".
