# Nezuko FX: prompts for ChatGPT

**Attach her BASE form sprite (one idle frame or portrait) when you paste prompt A.** Prompt A makes **one image with 7 rows** for her base form. Then **attach TWO images in this order when you paste prompt B: first the base form sprite, then the awakened form sprite.** Prompt B makes **one image with 6 rows** for the Awakened Demon Form. Send both images back and say they're for Nezuko.

Her look is **pink and crimson demonic flames with bright glowing centres**. Base form is gentle (soft pink, sparkles, healing glow); awakened form is aggressive (deep crimson-pink, sharp, heavier). Black is removed from these images, so nothing visible may be pure black.

## A. Base form effects (paste this)

```
Attached is a pixel-art chibi fighter (Nezuko Kamado from Demon Slayer). Create the visual effects for her moves as ONE high-quality PIXEL-ART GAME VFX sprite sheet in the same style as the attached sprite: crisp pixel edges, strong readable shapes, saturated colour, soft glow. The attached sprite is only for style, colour and scale: never draw a character, hands or body in any effect, only the effects.

RULES
- Pure solid black (#000000) background, no text, labels, borders or shadows. Thin dark separator lines between rows are fine.
- 7 rows, top to bottom. Every row is ONE horizontal strip of frames, left to right, equally spaced with clear black gaps between frames, each frame centred, same scale across the whole row. Use exactly the number of frames I give per row, in the order I list the groups.
- The background is removed by brightness, so nothing visible may be pure black: flames are bright pink and white at the core, with a hot pink-crimson body and a soft magenta glow. Effects fade smoothly to black at their edges. No hard dark outlines around glows.

ROW 1: KICK COMBO HIT (her basic attack). 6 frames: (1) a small bright pink-white crescent kick arc with a spark, (2) a larger, brighter crescent with a pink flame edge, (3) a spinning ring of pink flame with sparks flying outward, (4) the ring fades into embers, (5) a few tiny pink embers, (6) almost nothing. Small.

ROW 2: EXPLODING BLOOD (a burst of pink flames around her). 12 frames: frames 1-4 = a small bright pink-white flame igniting and swelling. Frames 5-12 = a rounded burst of beautiful pink and crimson flames with white-hot centres expanding outward in all directions, small flame petals and sparks, then fading into drifting pink embers. Viewed from the front, centred.

ROW 3: PURIFYING FLAMES (healing aura). 12 frames: frames 1-4 = the cast: soft pink flame sparkles gather and a gentle ring of light appears at the centre. Frames 5-12 = a looping aura: a calm column of gentle pink-white flames with rising golden-pink sparkles and a soft glowing ring around the base, slightly different every frame so it loops smoothly. Gentle, healing, NOT aggressive.

ROW 4: DEMONIC PROTECTION (shield). 10 frames: frames 1-3 = a pink flash and small flame sparks. Frames 4-10 = a looping protective bubble: a translucent rounded dome of pink-white light with delicate flame patterns on its surface, a bright rim and drifting sparkles, shimmering slightly every frame so it loops.

ROW 5: DEMON'S KICK (dash kick). 12 frames: frames 1-4 = the launch: a pink flame burst at the start of a dash with speed streaks. Frames 5-12 = the hit: a bright crescent kick impact with a pink-white flash, a ring shockwave, crimson flame fragments and sparks, then fading.

ROW 6: BURNING BLOOD SANCTUARY, CAST. 12 frames: a huge amount of pink flame being drawn inward and gathering into a bright pink-white sphere at the centre, with flame tendrils spiralling in, brighter and larger each frame, ending in a flash.

ROW 7: BURNING BLOOD SANCTUARY, BLAST. 14 frames: a huge circular wave of brilliant pink and crimson flames expanding outward from the centre in a perfect ring, a white-hot flash at the start, a bright glowing rim, soft pink light filling the circle, flame petals and golden-pink sparkles drifting, then the flames settle and dissipate into soft pink embers.
```

## B. Awakened form effects (paste this next, same chat)

Attach two images: **1) the base form sprite, then 2) the awakened form sprite.**

```
Attached are two pixel-art sprites of Nezuko: the FIRST image is her base form and the SECOND image is her awakened demon form (taller, with a horn and vine-like markings). Use them only for style, colour and scale: the flames should match the second (awakened) sprite's intensity, and the colours should stay consistent with the first. Create the effects for her AWAKENED DEMON FORM as ONE pixel-art game VFX sprite sheet in the same style as the effects you just made, but MORE INTENSE: deep crimson-red and hot pink flames with white-hot cores, sharper shapes, heavier impacts. Never draw a character, only effects.

RULES: same as before: pure solid black (#000000) background, no text/labels/borders, 6 rows, each row ONE horizontal strip of equally spaced frames with clear black gaps, same scale across the row, exact frame counts, nothing visible may be pure black (flames must have bright pink or white cores and rims).

ROW 1: DEMON FURY HIT (her heavy basic attack). 6 frames: sharp crimson-pink claw slash lines with sparks, then a heavy fist impact burst with a pink flame ring, then fading embers.

ROW 2: EXPLODING BLOOD: INFERNO. 14 frames: frames 1-4 = a crimson flame core igniting and swelling. Frames 5-14 = a large violent explosion of crimson and pink flames with a white-hot core, a hard shockwave ring, flame shards flying outward, then fading into a smoky crimson glow.

ROW 3: DEMONIC PURIFICATION. 10 frames: a fast ring of pink-white flame sweeping outward from the centre, cleansing sparkles, a brief bright shimmer, then fading. Cleaner and sharper than the gentle base-form aura.

ROW 4: GUARDIAN'S INSTINCT. 12 frames: a looping defensive aura: a rotating ring of crimson-pink flames on the ground, a taller hazy flame shell around the centre with glowing vine-like patterns, pulsing slightly each frame.

ROW 5: SAVAGE DEMON KICK. 12 frames: frames 1-4 = the rush: crimson speed streaks and a flame burst. Frames 5-12 = the hit: a huge flaming crescent kick impact with a pink-white flash, a crimson shockwave ring, fire fragments and sparks, fading.

ROW 6: CRIMSON GUARDIAN'S WRATH. 16 frames: frames 1-6 = a ground slam: crimson flames and cracks shoot out from the centre with a rising glow. Frames 7-16 = a massive circular explosion of crimson and pink flames, a white-hot flash, a huge ring of fire expanding to the full frame, towering flame spikes, a burning sanctuary glow that lingers and slowly fades.
```

## Importing

Skill ids and parts (Claude does the import when you send the images):

| Image row | Skill id | Parts |
|---|---|---|
| A1 / B1 | `nezuko.attack` (both forms share it) | `impact` |
| A2 | `nezuko.explodingblood` | `cast` (frames 1-4), `impact` (5-12) |
| A3 | `nezuko.purifyingflames` | `start` (1-4), `body` (5-12, loops) |
| A4 | `nezuko.demonicprotection` | `start` (1-3), `body` (4-10, loops) |
| A5 | `nezuko.demonkick` | `start` (1-4), `impact` (5-12) |
| A6 + A7 | `nezuko.sanctuary` | `cast`, `impact` |
| B2 | `nezuko.explodingblood.awakened` | `cast`, `impact` |
| B3 | `nezuko.purification` | `impact` |
| B4 | `nezuko.guardiansinstinct` | `body` (loops) |
| B5 | `nezuko.savagekick` | `start`, `impact` |
| B6 | `nezuko.crimsonwrath` | `cast`, `impact` |

The passive meter and the Awakened Demon Form transformation have no FX rows: the transformation reuses the game's standard form pulse. A transformation flash can be added later if you want one.
