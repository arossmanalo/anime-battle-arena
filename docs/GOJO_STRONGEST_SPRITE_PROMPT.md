# Gojo "I Am the Strongest" sprite prompt (ChatGPT)

The awakened form sheet. This prompt deliberately does **not** describe how Gojo looks: the attached reference image is the only source for his design, so ChatGPT cannot drift towards a written description.

**Attach these images, in this order, when you paste the prompt:**
1. **The reference image of the new Gojo design** (the character you want, with every detail you want kept).
2. **Gojo's current base pixel sprite** (one idle frame): for pixel style, scale and pixel density only.
3. **Optional: another fighter's pixel sprite** (for example Naruto's idle frame) as a second style example.

## Prompt

```
Attached are images. The FIRST image is the reference for the character: reproduce the character in the first image exactly: same hair, face, eyes, outfit, accessories, colours and proportions. Do not add, remove or change any detail. If these instructions ever differ from the first image, the first image wins. The SECOND image (and the third, if there is one) are existing pixel-art fighters from my game and are ONLY for pixel style, scale and pixel density: do not copy their design, outfit or colours.

Create a pixel-art sprite sheet of the character from the first image as a chibi fighting-game character in the same style as my other fighters (big head, small body). He fights with BARE HANDS: no weapon.

- PIXEL-ART STYLE (important): this must be TRUE low-resolution pixel art like a 16-bit fighting game, NOT a smooth illustration. Draw the character about 64 pixels tall on a visible pixel grid, with chunky square pixels, hard 1-pixel dark outlines, a limited palette (about 24 colours), flat colour shading in 2-3 tones, and NO anti-aliasing, NO soft gradients, NO blur, NO painterly or vector smoothing. Keep it crisp enough that individual pixels are visible when zoomed in.
- Transparent background. No text, no labels, no borders.
- Every frame shows the character from a side / three-quarter view FACING RIGHT, at the same size as the second image's character.
- Arrange it as a grid: 6 rows, up to 6 frames per row, all cells the same size, the character centred in each cell, FEET ON THE SAME BASELINE in every frame, the same scale in every frame. LEAVE A CLEAR GAP BETWEEN ROWS so that no frame touches the row above or below.
- Row 1: idle fighting stance, relaxed and supremely confident, one hand low (4 frames).
- Row 2: running (6 frames).
- Row 3: casting, one hand held forward with two fingers raised, as if firing a technique (4 frames).
- Row 4: recoiling from a hit, barely fazed (2 frames).
- Row 5: falling down knocked out (4 frames).
- Row 6: a quick basic attack: a punch followed by a kick (4 frames: wind-up, strike, follow-through, recover).
- No glowing energy, swirls, speed lines or particles. Character only.
```

## Importing

```
npm run import-sheet -- path/to/strongest.webp gojo --form --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Gojo/IAmTheStrongest"
npm run assets
```

If a row count is wrong (rows that touch get merged), tell Claude: it can split the image by hand and re-import. Restart `npm run dev` afterwards.
