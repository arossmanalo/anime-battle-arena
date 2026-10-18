# Sasuke FX: one prompt for ChatGPT

Attach Sasuke's sprite (an idle frame or the portrait) and paste the prompt below once. It asks for **one image with 7 rows** (no beams, so no second image). Send it to Claude and say it's for Sasuke.

## The prompt (paste this)

```
Attached is a pixel-art chibi fighter (Sasuke from Naruto). Create the visual effects for his moves as ONE high-quality PIXEL-ART GAME VFX sprite sheet in the same style as the attached sprite: crisp pixel edges, strong readable shapes, a white-hot core where there is energy, saturated colour, soft glow. The attached sprite is only for style, colour and scale: never draw a character, hands or body in any effect, only the effects.

RULES
- Pure solid black (#000000) background, no text, labels, borders or shadows. Thin dark separator lines between rows are fine.
- 7 rows, top to bottom. Every row is ONE horizontal strip of frames, left to right, equally spaced with clear black gaps between frames, each frame centred, same scale across the whole row. Use exactly the number of frames I give per row, in the order I list the groups.
- Things that travel (projectiles) are drawn travelling to the RIGHT, trail on the LEFT.
- Because the black background is removed by brightness, nothing may be pure black inside an effect that should be visible: dark effects (like black flames) must have a strong bright rim or glow so they show.
- Energy fades smoothly to black at its edges so it can be drawn with additive blending. No hard dark outlines around glows.

ROW 1: KUNAI SLASH HIT (his basic attack). 6 frames, a slash impact: (1) a thin bright white-silver diagonal slash line with a small spark burst at the middle, (2) the line is longer and brighter with a faint pale-blue edge, (3) a second thinner line crosses it, sparks fly, (4) the lines fade with sparks, (5) a few tiny sparks, (6) almost nothing. Silver-white with a hint of pale blue. Small.

ROW 2: FIREBALL JUTSU. 16 frames: frames 1-5 = a fire charge in front of a mouth/hands: a small orange flame that swells into a bright orange-yellow fire sphere with licking flames, getting bigger each frame (fire only). Frames 6-9 = the fireball in flight: a big round orange-yellow fireball with a white-hot core, flames trailing to the LEFT, flickering differently each frame, loops. Frames 10-16 = its impact: a fiery explosion: a bright flash, an expanding fireball with flames licking outward, embers flying, fading into a smoky orange glow.

ROW 3: CHIDORI. 13 frames: frames 1-6 = lightning gathering in the palm: a small blue-white electric orb that grows each frame, with many crackling jagged lightning arcs shooting off in all directions, a bright white core (orb and lightning only, no hand). Frames 7-13 = the strike: a blinding white-blue flash, a burst of many long jagged lightning bolts radiating out, a short ring, then the bolts fade into blue sparks.

ROW 4: AMATERASU (black flames of the Mangekyo Sharingan). 12 frames: frames 1-4 = a Sharingan-eye flare: a glowing red circle with three tomoe commas and a ring appears, brightens, then flashes out. Frames 5-12 = a looping patch of black flames burning on the ground, seen from above-side, a rough circle: wild black-violet flames with a bright crimson-red and magenta rim and glowing red-white edges so they show on a dark background, licking upward and flickering differently each frame, a few red embers.

ROW 5: SUSANOO GUARD. 12 frames: frames 1-4 = a flare: a violet-purple flash that expands into a rising column of spectral purple energy, then settles. Frames 5-12 = a looping protective shell: the translucent purple-violet ribs and armour of a spectral warrior forming a rounded vertical oval around where a character stands, glowing lilac edges, faint purple fill, hollow in the middle (dark centre so a character can be seen through it), 8 slightly different frames that loop smoothly with tiny flickers.

ROW 6: KIRIN (the ultimate, black lightning from the sky). 15 frames: frames 1-6 = a dark storm gathering: a tight ring of dark blue-violet cloud with bright blue-white lightning crackling inside it and arcs reaching out, growing and brighter each frame (viewed from the front). Frames 7-15 = the strike and impact: a huge bright white-blue lightning bolt comes down onto one point with many jagged branches, a blinding flash, a big expanding electric ring on the ground with lightning bolts radiating outward, fading into blue sparks and a faint smoke.

ROW 7: SHARINGAN DODGE. 5 frames: a red Sharingan-eye pulse: a bright red circle with three black tomoe commas flashes at the centre, with a white-red ring that expands outward and fades, plus a faint ghostly after-image outline of a person shape in red-violet that appears and dissolves. Bright red, magenta and white so it shows on black.
```

## Importing (Claude does this)

Skill ids: `sasuke.attack` (Kunai Slash), `sasuke.fireball`, `sasuke.chidori`, `sasuke.amaterasu`, `sasuke.susanoo`, `sasuke.kirin`, and `sasuke.sharingan` (the passive's dodge flash). His form (Rinnegan) has no moves of its own, so it needs no art.
