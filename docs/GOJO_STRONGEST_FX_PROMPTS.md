# Gojo "I Am the Strongest" FX: prompts for ChatGPT

The reworked Gojo (second life) has four new skills that have no art yet and use default effects until you make some. Infinite Void keeps its existing art (`gojo.void`). **Attach Gojo's sprite (the new "I Am the Strongest" one if you have it) when you paste this**, and paste it once. Send the image back and say it is for Gojo's new form.

Look: Gojo's palette: **Blue = electric blue, Red = hot red, Purple = violet-white; Black Flash = black with crimson lightning.** Black is removed from these images, so nothing visible may be pure black (give the Black Flash a bright crimson-white rim). Area effects (Maximum Blue, Maximum Purple) are **TOP-DOWN** (from directly above, perfectly round, square cell); the rest is **SIDE VIEW**.

## Prompt

```
Attached is a pixel-art chibi fighter (Gojo Satoru from Jujutsu Kaisen). Create the visual effects for his new moves as ONE high-quality PIXEL-ART GAME VFX sprite sheet in the same style as the attached sprite: crisp pixel edges, strong readable shapes, saturated colour, soft glow. The attached sprite is only for style, colour and scale: never draw a character, only effects.

RULES
- Pure solid black (#000000) background, no text, labels, borders or shadows. Thin dark separator lines between rows are fine.
- 6 rows, top to bottom. Every row is ONE horizontal strip of frames, left to right, each frame in its own SQUARE cell of the same size with a wide clear black gap between frames: NO effect may touch the next frame. Each frame centred, same scale across the row. Use exactly the number of frames I give.
- Each row says TOP-DOWN (seen from DIRECTLY ABOVE like a map: perfectly round, symmetrical, no perspective) or SIDE VIEW.
- Nothing visible may be pure black. Effects fade smoothly to black at their edges.

ROW 1 (SIDE VIEW): MAXIMUM RED, FLIGHT. 6 frames: a hot red sphere of repulsion with a white-hot core and a thick crackling red-orange ring around it, trail of red sparks on the LEFT (it flies right), pulsing slightly each frame so it loops.

ROW 2 (SIDE VIEW): MAXIMUM RED, IMPACT. 8 frames: a violent red-white explosion that bursts outward with a hard shockwave ring and flying red sparks, then fading.

ROW 3 (TOP-DOWN): MAXIMUM BLUE, CAST. 8 frames: a point of bright blue light at the centre that grows into a small blue sphere with thin spiral arms starting to turn, brighter each frame.

ROW 4 (TOP-DOWN): MAXIMUM BLUE, SINGULARITY (looping). 10 frames: a huge round vortex of electric blue light seen from above: spiral arms rotating around a dark-blue core with a white-hot centre, particles being sucked inward, the circle fills about 90% of the frame, rotating a little each frame so it loops.

ROW 5 (SIDE VIEW): BLACK FLASH. 10 frames: frames 1-3 = a dark-crimson energy distortion building, with black-and-red lightning crawling; frames 4-10 = the impact: a bright white-crimson flash with jagged black lightning bolts radiating out, red sparks, a sharp shockwave ring, then fading.

ROW 6 (TOP-DOWN): MAXIMUM PURPLE. 16 frames: seen from above: frames 1-6 = a blue sphere and a red sphere spiralling together at the centre, then merging into a violet-white core; frames 7-16 = a gigantic violet-white detonation that expands from the centre in a huge ring with a blinding flash, violet lightning and a blue and red fringe, growing until it fills the whole frame, then slowly fading.
```

## Importing

Skill ids and parts (Claude does the import when you send the image):

| Row | Skill id | Parts | Size (arena px) |
|---|---|---|---|
| 1 + 2 | `gojo.maxred` | `body` (loops), `impact` | ~80 / ~130 |
| 3 + 4 | `gojo.maxblue` | `cast`, `body` (zone loop, drawn at the zone's size) | cast ~150 |
| 5 | `gojo.blackflash` | `start` (1-3), `impact` (4-10) | ~120 |
| 6 | `gojo.maxpurple` | `cast` (1-6), `impact` (7-16) | cast ~200, impact ~1100 (map-wide) |

Infinite Void keeps its current art (`gojo.void`). The two orbs that circle Gojo at 30% HP are drawn by the game, not by an image.
