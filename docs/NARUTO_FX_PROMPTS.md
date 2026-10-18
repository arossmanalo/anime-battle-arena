# Naruto FX: one prompt for ChatGPT

Attach Naruto's sprite (an idle frame or the portrait) and paste the prompt below once. It asks for **one image** with 6 rows. Send it to Claude and say it's for Naruto. Naruto has no beams, so there is no second image.

## The prompt (paste this)

```
Attached is a pixel-art chibi fighter (Naruto from Naruto). Create the visual effects for his moves as ONE high-quality PIXEL-ART GAME VFX sprite sheet in the same style as the attached sprite: crisp pixel edges, strong readable shapes, a white-hot core where there is energy, saturated colour, soft glow. The attached sprite is only for style, colour and scale: never draw a character, hands or body in any effect, only the effects.

RULES
- Pure solid black (#000000) background, no text, labels, borders or shadows. Thin dark separator lines between rows are fine.
- 6 rows, top to bottom. Every row is ONE horizontal strip of frames, left to right, equally spaced with clear black gaps between frames, each frame centred, same scale across the whole row. Use exactly the number of frames I give per row, in the order I list the groups.
- Things that travel (projectiles) are drawn travelling to the RIGHT, trail on the LEFT.
- Energy and smoke fade smoothly to black at their edges so they can be drawn with additive blending. No hard dark outlines around glows.

ROW 1: PUNCH COMBO HIT (his basic attack). 6 frames, a hit impact: (1) a sharp white-orange flash with spiky rays, (2) the flash grows with a thin shockwave ring, (3) ring larger with 6 orange sparks flying out, (4) sparks and a fading ring, (5) a few tiny sparks, (6) almost nothing left. Orange and white. Small, about the size of a fist.

ROW 2: SHADOW CLONE SHURIKEN. 14 frames: frames 1-5 = a puff of white-grey cartoon smoke (a shadow-clone "poof"): it appears, balloons into a cloud with a bright core and fades. Frames 6-9 = a spinning four-pointed steel shuriken, a different rotation each frame so it spins when played, silver-blue metal with a small white glint, a short motion trail on the LEFT. Frames 10-14 = its impact: a small burst of steel-white sparks and one tiny dust puff, fading.

ROW 3: RASENGAN. 13 frames: frames 1-6 = a swirling blue chakra sphere forming in the palm: a small ball that grows each frame, bright white-blue core, spiral arms of cyan and blue chakra rotating, ending as a dense spinning sphere (sphere only, no hand). Frames 7-13 = the Rasengan hitting: a white-blue flash, a spiralling vortex that bursts outward, a shockwave ring, blue sparks, fading into a blue haze.

ROW 4: UZUMAKI BARRAGE. 12 frames: frames 1-4 = a shadow-clone "poof" cloud of white-grey smoke that appears and fades (as in row 2 but smaller and quicker). Frames 5-12 = a flurry of rapid punches landing on one spot: many small orange-white impact flashes and star bursts appearing at different points inside a circle about the size of a character, a bright ring pulsing at the edge, each frame different, ending with a bigger orange burst and fading sparks.

ROW 5: SAGE FOCUS (orange chakra). 12 frames: frames 1-4 = a flare: an orange-gold flash that bursts upward into a column of orange-gold chakra. Frames 5-12 = an aura loop: orange-gold chakra flames rising in a vertical oval with small drifting sparks and faint red-orange markings, hollow in the middle (dark centre so a character can be seen through it), 8 slightly different frames that loop smoothly.

ROW 6: RASENSHURIKEN (the ultimate). 20 frames: frames 1-7 = the wind-chakra sphere forming: a Rasengan-like sphere growing larger each frame with four white wind blades growing out of it and starting to spin, white-blue and cyan, bright core. Frames 8-12 = in flight: a big spinning wind shuriken: a glowing blue-white sphere with four large curved white wind blades around it, a different rotation each frame, a short trail on the LEFT, loops. Frames 13-20 = its impact: a huge white-blue explosion of cutting wind: a flash, an expanding sphere with many thin blade-shaped slashes flying outward, a shockwave ring, fading into a pale blue haze.
```

## Importing (Claude does this)

Skill ids: `naruto.attack` (Punch Combo), `naruto.shuriken`, `naruto.rasengan`, `naruto.barrage` (Uzumaki Barrage), `naruto.sage`, `naruto.rasenshuriken`. His form (Nine-Tails Chakra Mode) has no moves of its own, and his passive (Kurama's Vitality) has no visual trigger, so neither needs art.
