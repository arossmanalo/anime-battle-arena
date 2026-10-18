# Vegeta FX: one prompt for ChatGPT

Attach Vegeta's sprite (an idle frame or the portrait) and paste the prompt below once. It asks for **2 images**: image 1 has every effect in rows, image 2 has the two beam bodies. Then send both images to Claude and say they're for Vegeta.

## The prompt (paste this)

```
Attached is a pixel-art chibi fighter (Vegeta from Dragon Ball). Create the visual effects for his moves as high-quality PIXEL-ART GAME VFX sprite sheets in the same style as the attached sprite: crisp pixel edges, a white-hot core, saturated colour, soft glow. The attached sprite is only for style, colour and scale: never draw a character, hands or body in any effect, only the energy.

Make 2 images, one after the other. Do not ask me questions. After image 1 reply only "Image 1 done" and then make image 2.

RULES FOR BOTH IMAGES
- Pure solid black (#000000) background, no text, labels, borders or shadows. Thin dark separator lines between rows are fine.
- Every row is ONE horizontal strip of frames, left to right, equally spaced with clear black gaps between frames, each frame centred, same scale across the whole row. Use exactly the number of frames I give per row, in the order I list the groups.
- Things that travel (projectiles, beams) are drawn travelling to the RIGHT, tail or trail on the LEFT.
- Energy fades smoothly to black at its edges so it can be drawn with additive blending. No hard dark outlines around glows.

IMAGE 1: 6 rows, top to bottom, all the same width (about 16 frames wide at most):

ROW 1: KI BOLT (his basic attack, small and quick, pale blue-white). 9 frames: frames 1-4 = a small round bolt with a white-hot core, pale blue glow and a short tapering tail on the LEFT, flickering. Frames 5-9 = its hit: a small blue-white burst with thin rays and a few sparks that fades out.

ROW 2: GALICK BARRAGE (violet-purple energy). 13 frames: frames 1-4 = a small purple ki charge glowing and pulsing (glow only, no hand). Frames 5-8 = a small fast violet bolt with a white core and a short tail on the LEFT. Frames 9-13 = its impact: a small violet burst with sparks that fades out.

ROW 3: GALICK GUN BEAM ENDS (violet-purple). 12 frames: frames 1-5 = a charging purple energy sphere crackling with violet lightning, growing brighter each frame (sphere only, no hands). Frames 6-9 = the glowing ORIGIN of a beam where it leaves the hands: a bright violet-white orb with energy streaming out to the right, pulsing. Frames 10-12 = the HEAD of the beam: a bright round violet-white blob with small rays, pulsing.

ROW 4: BIG BANG ATTACK (cyan-white). 16 frames: frames 1-5 = a bright cyan energy ball charging, a white core with a crackling cyan shell, bigger each frame. Frames 6-9 = the ball in flight: a round white-hot sphere with a cyan glow and a short trail on the LEFT, pulsing. Frames 10-16 = its impact: a large cyan-white explosion: a flash, an expanding sphere, a shockwave ring, sparks, fading into a cyan haze.

ROW 5: SAIYAN PRIDE (golden aura). 12 frames: frames 1-4 = a flare: a golden-white flash that bursts upward into spiky flames of golden energy. Frames 5-12 = an aura loop: golden-yellow flame-like energy flickering upward in a vertical oval, hollow in the middle (dark centre so a character can be seen through it), 8 slightly different frames that loop smoothly.

ROW 6: FINAL FLASH BEAM ENDS (blinding yellow-white). 13 frames: frames 1-6 = a charging sphere of yellow-white energy between cupped hands, growing and crackling with golden sparks, getting bigger and brighter (sphere only, no hands). Frames 7-10 = the glowing ORIGIN of a huge beam: a large yellow-white orb with energy streaming out to the right, pulsing. Frames 11-13 = the HEAD of the beam: a big round yellow-white blob with long rays, pulsing.

IMAGE 2: BEAM BODIES. 8 WIDE HORIZONTAL STRIPS stacked vertically with black gaps between them, each strip about 4 times wider than tall and filling the whole width edge to edge, centred vertically. Each strip is the middle of a beam: a straight energy beam that looks the same at the left and right edges so it can be stretched to any length. Strips 1-4 = GALICK GUN: violet-purple beam, white core, outer magenta glow, subtle energy ripples along it; the 4 strips differ only slightly (ripples shifted) so they animate in order. Strips 5-8 = FINAL FLASH: a much thicker, brighter yellow-white beam, white-hot core filling most of the strip height with a golden outer glow and lightning ripples; again 4 slightly different strips.
```

## Importing (Claude does this)

Tell Claude which two images are which. The rows are cut by position, so the order above matters. Claude will use commands like:

```
npm run import-fx -- img1.png vegeta.attack body   --crop <row1> --frames 9  --pick 1-4 --size 50
npm run import-fx -- img1.png vegeta.attack impact --crop <row1> --frames 9  --pick 5-9 --size 90
npm run import-fx -- img1.png vegeta.barrage cast   --crop <row2> --frames 13 --pick 1-4 --once --fps 12 --size 80
...
```

The skill ids are: `vegeta.attack` (Ki Bolt), `vegeta.barrage` (Galick Barrage), `vegeta.galickgun`, `vegeta.bigbang`, `vegeta.pride` (Saiyan Pride), `vegeta.finalflash`. The ids match the ones in `src/data/fighters/vegeta.ts`; if any differs Claude will use the real one.

Vegeta's passive (Saiyan Elite) has no visual trigger, so it needs no art.
