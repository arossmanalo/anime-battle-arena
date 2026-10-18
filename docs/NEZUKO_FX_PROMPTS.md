# Nezuko FX: prompts for ChatGPT

**Attach her BASE form sprite (one idle frame or portrait) when you paste prompt A.** Prompt A makes **one image with 7 rows** for her base form. Then **attach TWO images in this order when you paste prompt B: first the base form sprite, then the awakened form sprite.** Prompt B makes **one image with 6 rows** for the Awakened Demon Form. Send both images back and say they're for Nezuko.

Her look is **pink and crimson demonic flames with bright glowing centres**. Base form is gentle (soft pink and gold, sparkles, healing glow); awakened form is aggressive (deep crimson-pink, sharp, heavier). Black is removed from these images, so nothing visible may be pure black.

**Camera views.** The game is watched from above, so every effect that covers an AREA on the ground (bursts, rings, auras, the ultimates) is drawn **TOP-DOWN**: seen from directly above, perfectly round, centred in a square frame, so the ring matches the real hit radius. Effects that hit or surround a fighter (kicks, slashes, her shield dome) stay **SIDE VIEW**. Each row below says which.

## A. Base form effects (paste this)

```
Attached is a pixel-art chibi fighter (Nezuko Kamado from Demon Slayer). Create the visual effects for her moves as ONE high-quality PIXEL-ART GAME VFX sprite sheet in the same style as the attached sprite: crisp pixel edges, strong readable shapes, saturated colour, soft glow. The attached sprite is only for style, colour and scale: never draw a character, hands or body in any effect, only the effects.

RULES
- Pure solid black (#000000) background, no text, labels, borders or shadows. Thin dark separator lines between rows are fine.
- 7 rows, top to bottom. Every row is ONE horizontal strip of frames, left to right, each frame in its own SQUARE cell of the same size, with a wide clear black gap between frames: NO effect may touch or overlap the next frame, so keep every effect well inside its square with a margin. Each frame centred, same scale across the whole row. Use exactly the number of frames I give per row, in the order I list the groups.
- Each row says TOP-DOWN or SIDE VIEW. TOP-DOWN means seen from DIRECTLY ABOVE like a map: perfectly round and symmetrical, centred in the square, no horizon, no ground plane seen at an angle, no tall flames rising upward in perspective (flames are drawn as petals and tongues radiating outward in a circle). SIDE VIEW means seen from the side.
- The background is removed by brightness, so nothing visible may be pure black. Effects fade smoothly to black at their edges. No hard dark outlines around glows.
- COLOUR: base-form effects are SOFT PINK and warm gold: pastel pink and white-hot centres, light rose-pink bodies, golden sparkles and a gentle magenta glow. Do NOT make them deep red or crimson; keep them lighter and prettier than a fire attack.

ROW 1 (SIDE VIEW): KICK COMBO HIT (her basic attack). 6 frames: (1) a small bright pink-white crescent kick arc with a spark, (2) a larger, brighter crescent with a pink flame edge, (3) a spinning ring of pink flame with sparks flying outward, (4) the ring fades into embers, (5) a few tiny pink embers, (6) almost nothing. Small.

ROW 2 (TOP-DOWN): EXPLODING BLOOD (a burst of pink flames around her). 12 frames: frames 1-4 = a small bright pink-white flame igniting and swelling at the centre. Frames 5-12 = a perfectly round burst of beautiful pink flame petals with a white-hot centre expanding outward in a circle, with a thin glowing ring at its edge, small sparks, then fading into drifting pink embers. The burst should be at most as wide as 70% of the frame at its biggest.

ROW 3 (TOP-DOWN): PURIFYING FLAMES (healing aura). 12 frames: frames 1-4 = the cast: soft pink sparkles gather at the centre and a gentle ring of light appears. Frames 5-12 = a looping aura: a calm round ring of gentle pink-white flame petals on the ground with a soft glow filling the circle, rising golden-pink sparkles, slightly different every frame so it loops smoothly. Gentle, healing, NOT aggressive.

ROW 4 (SIDE VIEW): DEMONIC PROTECTION (shield dome around a character). 10 frames: frames 1-3 = a pink flash and small flame sparks. Frames 4-10 = a looping protective bubble: a translucent rounded dome of pink-white light with delicate flame patterns on its surface, a bright rim and drifting sparkles, shimmering slightly every frame so it loops. Taller than wide, like an egg.

ROW 5 (SIDE VIEW): DEMON'S KICK (dash kick). 12 frames: frames 1-4 = the launch: a pink flame burst at the start of a dash with speed streaks pointing LEFT (she moves right). Frames 5-12 = the hit: a bright crescent kick impact with a pink-white flash, a ring shockwave, flame fragments and sparks, then fading.

ROW 6 (TOP-DOWN): BURNING BLOOD SANCTUARY, CAST. 12 frames: a round summoning circle on the ground: a ring of pink flame petals and sparks being drawn INWARD towards the centre, gathering into a bright pink-white glowing core with a thin glowing circle around it, brighter and tighter each frame, ending in a flash.

ROW 7 (TOP-DOWN): BURNING BLOOD SANCTUARY, BLAST. 14 frames: a huge perfectly circular wave of brilliant pink flames expanding outward from the centre as a ring, a white-hot flash at the start, a bright glowing rim at the edge of the ring, soft pink light filling the circle, flame petals and golden-pink sparkles drifting, growing until the ring almost fills the square frame, then the flames settle and dissipate into soft pink embers.
```

## B. Awakened form effects (paste this next, same chat)

Attach two images: **1) the base form sprite, then 2) the awakened form sprite.**

```
Attached are two pixel-art sprites of Nezuko: the FIRST image is her base form and the SECOND image is her awakened demon form (taller, with a horn and vine-like markings). Use them only for style, colour and scale: the flames should match the second (awakened) sprite's intensity, and the colours should stay consistent with the first. Create the effects for her AWAKENED DEMON FORM as ONE pixel-art game VFX sprite sheet in the same style as the effects you just made, but MORE INTENSE: deep crimson-red and hot pink flames with white-hot cores, sharper shapes, heavier impacts. Never draw a character, only effects.

RULES: same as before: pure solid black (#000000) background, no text/labels/borders, 6 rows, each row ONE horizontal strip of frames, each frame in its own SQUARE cell with a wide clear black gap so nothing touches or overlaps the next frame, same scale across the row, exact frame counts, nothing visible may be pure black (flames must have bright pink or white cores and rims). Each row says TOP-DOWN (seen from DIRECTLY ABOVE like a map: perfectly round and symmetrical, centred in the square, flames drawn as petals and tongues radiating outward in a circle, no horizon and no perspective) or SIDE VIEW.

ROW 1 (SIDE VIEW): DEMON FURY HIT (her heavy basic attack). 6 frames: sharp crimson-pink claw slash lines with sparks, then a heavy fist impact burst with a pink flame ring, then fading embers.

ROW 2 (TOP-DOWN): EXPLODING BLOOD: INFERNO. 14 frames: frames 1-4 = a crimson flame core igniting and swelling at the centre. Frames 5-14 = a large violent round explosion of crimson and pink flame petals with a white-hot core, a hard shockwave ring at its edge, flame shards flying outward, growing to about 80% of the frame width, then fading into a smoky crimson glow.

ROW 3 (TOP-DOWN): DEMONIC PURIFICATION. 10 frames: a fast ring of pink-white flame sweeping outward from the centre as a perfect circle, cleansing sparkles, a brief bright shimmer filling the circle, then fading. Cleaner and sharper than the gentle base-form aura.

ROW 4 (TOP-DOWN): GUARDIAN'S INSTINCT. 12 frames: a looping defensive ring on the ground: a rotating circle of crimson-pink flame petals with glowing vine-like patterns inside it, a faint glow filling the circle, pulsing slightly each frame so it loops smoothly.

ROW 5 (SIDE VIEW): SAVAGE DEMON KICK. 12 frames: frames 1-4 = the rush: crimson speed streaks pointing LEFT and a flame burst (she moves right). Frames 5-12 = the hit: a huge flaming crescent kick impact with a pink-white flash, a crimson shockwave ring, fire fragments and sparks, fading.

ROW 6 (TOP-DOWN): CRIMSON GUARDIAN'S WRATH. 16 frames: frames 1-6 = a ground slam seen from above: crimson cracks radiate outward from the centre like a star with a rising glow. Frames 7-16 = a massive circular explosion: a white-hot flash, a huge ring of crimson and pink fire expanding outward until it almost fills the square frame, flame spikes radiating outward, then a burning sanctuary glow inside the circle that lingers and slowly fades.
```

## Importing

Skill ids and parts (Claude does the import when you send the images). Area effects are sized to the move's real diameter, so the ring on screen matches who gets hit:

| Image row | Skill id | Parts | Size (arena px) |
|---|---|---|---|
| A1 / B1 | `nezuko.attack` (both forms share it) | `impact` | ~90 |
| A2 | `nezuko.explodingblood` | `cast` (frames 1-4), `impact` (5-12) | ~190 (radius 95) |
| A3 | `nezuko.purifyingflames` | `start` (1-4), `body` (5-12, loops) | ~300 |
| A4 | `nezuko.demonicprotection` | `start` (1-3), `body` (4-10, loops) | ~130 |
| A5 | `nezuko.demonkick` | `start` (1-4), `impact` (5-12) | ~110 |
| A6 + A7 | `nezuko.sanctuary` | `cast`, `impact` | ~400 (radius 200) |
| B2 | `nezuko.explodingblood.awakened` | `cast`, `impact` | ~280 (radius 140) |
| B3 | `nezuko.purification` | `impact` | ~300 |
| B4 | `nezuko.guardiansinstinct` | `body` (loops) | ~460 (radius 230) |
| B5 | `nezuko.savagekick` | `start`, `impact` | ~120 |
| B6 | `nezuko.crimsonwrath` | `cast`, `impact` | ~440 (radius 220) |

The passive meter and the Awakened Demon Form transformation have no FX rows: the transformation reuses the game's standard form pulse. A transformation flash can be added later if you want one.
