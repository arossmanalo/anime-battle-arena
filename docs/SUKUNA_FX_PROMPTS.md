# Sukuna FX: prompts for ChatGPT

Attach Sukuna's sprite and paste prompt A once. It asks for **one image with 6 rows** of effects. Then prompt B for the **domain background** (a separate 2x2 image, like Gojo's). Send both images back and say they're for Sukuna.

Sukuna's look is sharp **red-black cutting slashes**, so every dark effect has a bright crimson or white edge. Black is removed from these images, so nothing visible may be pure black.

## A. Effects image (paste this)

```
Attached is a pixel-art chibi fighter (Ryomen Sukuna from Jujutsu Kaisen). Create the visual effects for his moves as ONE high-quality PIXEL-ART GAME VFX sprite sheet in the same style as the attached sprite: crisp pixel edges, strong readable shapes, saturated colour, soft glow. The attached sprite is only for style, colour and scale: never draw a character, hands or body in any effect, only the effects.

RULES
- Pure solid black (#000000) background, no text, labels, borders or shadows. Thin dark separator lines between rows are fine.
- 6 rows, top to bottom. Every row is ONE horizontal strip of frames, left to right, equally spaced with clear black gaps between frames, each frame centred, same scale across the whole row. Use exactly the number of frames I give per row, in the order I list the groups.
- Things that travel (projectiles) are drawn travelling to the RIGHT, trail on the LEFT.
- The background is removed by brightness, so nothing visible may be pure black: slashes are bright red-white cutting lines with a deep crimson glow and darker red-black bodies that always have a bright crimson rim. Cuts must look SHARP and CRISP (thin, straight or slightly curved blades of light), not like soft energy beams.
- Effects fade smoothly to black at their edges. No hard dark outlines around glows.

ROW 1: HAND-TO-HAND COMBO HIT (his basic attack). 6 frames: (1) a thin bright red-white diagonal slash line with a small spark burst at its middle, (2) a longer, brighter slash with a crimson edge and a fist-shaped impact flash behind it, (3) a short curved red cutting arc sweeping through with sparks flying, (4) the arc fades with red sparks, (5) a few tiny embers, (6) almost nothing. Red and white. Small.

ROW 2: DISMANTLE (invisible flicked slash). 10 frames: frames 1-5 = the slash in flight: a very thin, fast, straight red-white blade of cutting light with a faint crimson trail on the LEFT, slightly different each frame, loops. Frames 6-10 = its hit: a clean thin diagonal cut line appears with a small crimson spark burst, the line fades into tiny red sparks.

ROW 3: CLEAVE (a heavy close-range cursed slash). 12 frames: frames 1-5 = a flare where the lunge begins: a bright crimson flash with sharp radiating cut lines that spreads and fades. Frames 6-12 = the hit: a large, heavy X-shaped pair of crossing red-white cuts with a bright core flash, thick crimson edges, a shockwave ring and flying red sparks, then fading.

ROW 4: SPIDERWEB (slashes spreading across the floor). 12 frames: frames 1-3 = a palm slam: a small bright crimson impact flash on the ground with short cracks. Frames 4-12 = a spreading web: a wide flat oval (seen from above at an angle) of intersecting thin red-white cut lines spreading outward from the centre like a spiderweb, growing to the full circle, bright crimson edges, then the lines flash, thin out and fade to red sparks.

ROW 5: DIVINE FLAME / FUGA (fire arrow). 20 frames: frames 1-7 = the fire arrow forming: a burning orange arrow of flame materialises between two hands (no hands drawn): flames gather into a straight arrow shape with a white-hot core, a bow-like ring of fire around it, getting bigger and brighter each frame. Frames 8-11 = the arrow in flight: a blazing orange-red arrow pointing RIGHT with a white-hot centre and a trail of flames on the LEFT, flickering, loops. Frames 12-20 = its impact: a huge orange-red fire explosion: a white-hot flash, an expanding fireball with tongues of fire, a shockwave ring, embers flying, fading into a smoky red-orange glow.

ROW 6: MALEVOLENT SHRINE (domain opening and finale). 14 frames: frames 1-5 = hands coming together: a crimson glow gathers at the centre and a shrine-shaped silhouette of red light and thin cut lines rises behind it (a simple stylised pagoda-like roof with a skull ornament), brighter each frame, ending in a flash. Frames 6-14 = the final blow: a massive cross-shaped slash: a huge bright red-white X made of two enormous crossing cut lines that expands across the frame, with a white-hot centre, a ring of crimson shockwave and flying sparks, then fading into drifting red embers.
```

## B. Domain background (paste this next)

```
Using the same style, create a pixel-art background for Sukuna's Domain Expansion: "Malevolent Shrine". Make ONE image containing 4 frames in a 2 x 2 grid (2 across, 2 down), each frame in a WIDE 2.4 : 1 aspect (like 900 x 372), with thin black lines between the frames. The frames are an animation that loops smoothly: they are nearly the same, with small differences.

Each frame: an endless dark crimson sky of deep blood red and near-black, an ominous giant stylised demonic shrine with a curved roof and a skull ornament silhouetted in the centre far background, and hundreds of thin overlapping bright red-white cut lines crossing the whole frame in many directions, a floor of scattered bones and a pale-red haze at the bottom. Across the 4 frames the slash lines shift and a few new ones flash, and the glow of the shrine pulses slightly. No characters, no text.
```

## Importing

Skill ids: `sukuna.attack`, `sukuna.dismantle`, `sukuna.cleave`, `sukuna.spiderweb`, `sukuna.fuga` (Divine Flame), `sukuna.shrine` (the domain: `body` for the background, `cast` for the opening, `impact` for the final slash), and `sukuna.dismantle2` (the True Form version of Dismantle, which can reuse Dismantle's art). The passive (King of Curses) has no visual trigger; Claude can add a small flash for the Curse Burst later if you want one.

For the domain background, Claude will use `--grid 2x2 --trim 12 --fill --bg none --cell 900x372 --blend normal --fps 6`, the same as Gojo's.
