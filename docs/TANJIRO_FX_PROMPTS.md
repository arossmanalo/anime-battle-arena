# Tanjiro FX: one prompt for ChatGPT

Attach Tanjiro's sprite (an idle frame or the portrait) and paste the prompt below once. It asks for **one image with 7 rows** (no beams, so no second image). Send it to Claude and say it's for Tanjiro.

## The prompt (paste this)

```
Attached is a pixel-art chibi fighter (Tanjiro from Demon Slayer). Create the visual effects for his moves as ONE high-quality PIXEL-ART GAME VFX sprite sheet in the same style as the attached sprite: crisp pixel edges, strong readable shapes, a white-hot or white-foam core where there is energy, saturated colour, soft glow. The attached sprite is only for style, colour and scale: never draw a character, hands, sword or body in any effect, only the effects.

RULES
- Pure solid black (#000000) background, no text, labels, borders or shadows. Thin dark separator lines between rows are fine.
- 7 rows, top to bottom. Every row is ONE horizontal strip of frames, left to right, equally spaced with clear black gaps between frames, each frame centred, same scale across the whole row. Use exactly the number of frames I give per row, in the order I list the groups.
- Because the black background is removed by brightness, nothing may be pure black inside an effect that should be visible. Water must be drawn as bright cyan-blue with white foam highlights and a glowing rim, fire as bright orange-red-yellow.
- Effects fade smoothly to black at their edges so they can be drawn with additive blending. No hard dark outlines around glows.

ROW 1: SWORD SLASH HIT (his basic attack). 6 frames, a slash impact: (1) a thin bright white-cyan diagonal slash line with a few water-droplet sparks, (2) the line is longer, brighter, with a pale-blue edge and tiny droplets flying, (3) a second shorter line crosses it, droplets and sparks scatter, (4) lines fade, droplets falling, (5) a few droplets, (6) almost nothing. Pale blue and white. Small.

ROW 2: WATER WHEEL (a spinning dash slash in water breathing style). 11 frames: frames 1-5 = a swirling wheel of water: a ring of cyan-blue water with white foam crests that spins and expands each frame, with droplets, like a vertical water wheel seen from the front, getting wider. Frames 6-11 = its hit: a splash: a bright cyan-white burst with a curved wave crest and many droplets flying outward, then falling and fading.

ROW 3: WHIRLPOOL (area attack around him). 12 frames: frames 1-4 = water gathering: swirling cyan streaks and droplets pulled inward into a ring, getting tighter. Frames 5-12 = a whirlpool burst: a wide flat swirling vortex of cyan-blue water with white foam spirals rotating, expanding to a big circle, with a wave ring at its edge, then spreading out into droplets and mist and fading. The vortex is seen from above at a slight angle (a wide oval).

ROW 4: FLOWING DANCE (a speed and shield buff). 12 frames: frames 1-4 = a flare: a cyan-white flash that bursts into flowing ribbons of water curling upward. Frames 5-12 = a looping aura: graceful ribbons and wave-like streams of cyan-blue water with white foam and a few droplets, flowing in a gentle vertical oval around where a character stands, with a faint translucent blue bubble rim, hollow in the middle (dark centre so a character can be seen through it), 8 slightly different frames that loop smoothly.

ROW 5: DANCE OF THE FIRE GOD (a fire dash slash). 16 frames: frames 1-5 = flames gathering: an orange-red fire swirling and condensing into a bright burning band, white-yellow core, getting brighter each frame. Frames 6-9 = the dash start: a crescent arc of fire flaring outward with embers, then fading. Frames 10-16 = the hit: a fiery slash impact: a big curved crescent of orange-yellow flame, a white flash, a ring of fire expanding, flames and embers flying, fading into a smoky red glow.

ROW 6: SUN HALO DRAGON (the ultimate, a fire dragon of the Sun Breathing). 16 frames: frames 1-6 = a sun halo gathering: a thin bright golden ring that appears and grows, with a glowing sun disc behind it and small flames curling around it, brighter each frame. Frames 7-16 = the burst: a blazing fire dragon, a long serpentine body of orange-red flame with a golden-white head, coils in a spiral around the centre while an expanding golden sun ring and shockwave burst outward, flames and embers flying, fading into a hot orange haze.

ROW 7: UNBREAKABLE RESOLVE (a once-per-match survival flash). 6 frames: a determination burst: a bright red-orange and gold flame-like flash that bursts out from the centre in a circular pattern, with a burning forehead-mark glow (a simple flame-shaped mark) in the middle, then a ring that expands, fades and leaves a few embers. Red, orange and gold, strong and heroic.
```

## Importing (Claude does this)

Skill ids: `tanjiro.attack` (Sword Slash), `tanjiro.waterwheel`, `tanjiro.whirlpool`, `tanjiro.flowingdance`, `tanjiro.dragon` (Dance of the Fire God), `tanjiro.sunhalo` (the ultimate) and `tanjiro.resolve` (the passive's survival flash). His form (Demon Slayer Mark) has no moves of its own, so it needs no art.
