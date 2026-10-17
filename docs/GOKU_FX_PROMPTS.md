# Goku FX: one prompt for ChatGPT

Attach Goku's sprite (one idle frame, or the portrait) and paste the prompt below **once**. It asks for 9 images, one per skill, each a single row of frames on pure black. If ChatGPT only makes one image per reply, answer **next** after each.

Then send the images to Claude (in the order ChatGPT makes them, or say which is which) and the commands in the last section import them.

## The prompt (paste this)

```
Attached is a pixel-art chibi fighter (Goku from Dragon Ball). Create the visual effects for his moves as high-quality PIXEL-ART GAME VFX sprite sheets in the same style as the attached sprite: crisp pixel edges, a white-hot core, saturated colour, soft glow. The attached sprite is only for style, colour and scale: never draw a character, hands or body in any effect, only the energy.

Make 9 separate images, one after another, in this order. Do not ask me questions. After each image, reply only "Image N done" and continue with the next. If you can only make one image per reply, make Image 1 and wait until I say "next".

RULES FOR EVERY IMAGE
- Pure solid black (#000000) background, no text, labels, borders, grids, shadows or floor.
- Exactly the number of frames I give, in ONE single horizontal row, left to right, equally spaced with clear black gaps between frames, every frame centred in its own cell, same scale across all frames of the image.
- The frames in a row are in the order I list them: first group, then the next group, and so on.
- Effects that move to the right (projectiles, beams) are drawn travelling to the RIGHT, with the tail/trail on the LEFT.
- Energy fades smoothly to black at its edges so it can be drawn with additive blending. No hard dark outlines around glows.

IMAGE 1: PUNCH AND KICK HIT. 5 frames, a hit impact: (1) a sharp white-yellow flash with spiky rays, (2) the flash expands with a thin shockwave ring, (3) ring larger, 6 orange sparks flying out, (4) sparks and a fading ring, (5) a few tiny dim sparks. Orange-yellow. Small, about the size of a fist. Total 5 frames.

IMAGE 2: KI BLAST VOLLEY. 13 frames: frames 1-4 = a small yellow-white ki charge glowing and pulsing on an open palm (just the glow, no hand). Frames 5-8 = a small fast ki bolt: white-hot core, yellow glow, a short tapering tail on the LEFT, slightly flickering. Frames 9-13 = its impact: a small yellow burst with a few sparks that fades out.

IMAGE 3: INSTANT TRANSMISSION. 10 frames: frames 1-5 = a vanish effect: a tall thin vertical white-blue shimmer that appears around where a person stood, brightens, narrows into a bright vertical line, and disappears in a few sparkles. Frames 6-10 = an arrival effect: a white-blue flash at one point that bursts into a starburst of thin rays with a ring, then fades into sparkles.

IMAGE 4: KAMEHAMEHA ENDS. 14 frames, all in blue-white energy: frames 1-6 = a charging energy sphere between cupped hands, growing and crackling (sphere only, no hands), brighter each frame. Frames 7-10 = the glowing ORIGIN of a beam where it leaves the hands: a bright blue-white orb with energy streaming out to the right, pulsing (loops). Frames 11-14 = the HEAD of the beam: a bright round blue-white blob with small rays, pulsing (loops).

IMAGE 5: KAMEHAMEHA BEAM BODY. 4 WIDE HORIZONTAL STRIPS stacked vertically, one above the other with black gaps between them, each strip about 4 times wider than tall and filling the whole width edge to edge, centred vertically. Each strip is the middle of a beam: a straight bright blue energy beam with a pure white core, an outer cyan glow and subtle energy ripples running along it. The pattern must look the same at the left and right edges so it can be stretched to any length. The 4 strips differ only slightly (ripples shifted) so they animate when played in order.

IMAGE 6: KAIO-KEN. 11 frames: frames 1-5 = a flare: a red-crimson flash that expands into a tall burst of flame-like energy, then settles. Frames 6-11 = an aura loop: red-crimson flame-like energy flickering upward in a vertical oval, hollow in the middle (dark centre so a character can be seen through it), 6 slightly different frames that loop smoothly.

IMAGE 7: SPIRIT BOMB. 20 frames: frames 1-7 = a huge blue-white energy ball gathering above, growing and swirling, with small sparks drifting into it, getting brighter and larger each frame. Frames 8-13 = the Spirit Bomb in flight: a big round sphere with a white core, a pale blue body, swirling energy and a rim of light, a short trail on the LEFT, pulsing (loops). Frames 14-20 = its impact: a massive blue-white explosion: a flash, a huge expanding sphere, a shockwave ring, debris-like sparks, fading into a pale blue haze.

IMAGE 8: SUPER KAMEHAMEHA ENDS. Same as Image 4 (14 frames, same structure and order) but in GOLDEN YELLOW with a white core, wider and more powerful-looking.

IMAGE 9: SUPER KAMEHAMEHA BEAM BODY. Same as Image 5 (4 wide stacked strips, stretchable) but GOLDEN YELLOW with a white core, and thicker (the beam fills more of the strip's height).
```

## Importing (Claude does this, or run them yourself)

Replace the file names with the images you saved. `--frames N` is the number of frames in that image.

```
# 1 Punch & Kick (default attack)
npm run import-fx -- img1.png goku.attack impact --frames 5 --size 80

# 2 Ki Blast Volley
npm run import-fx -- img2.png goku.kiblast cast   --frames 13 --pick 1-4  --size 70
npm run import-fx -- img2.png goku.kiblast body   --frames 13 --pick 5-8  --size 40
npm run import-fx -- img2.png goku.kiblast impact --frames 13 --pick 9-13 --size 70

# 3 Instant Transmission
npm run import-fx -- img3.png goku.instant start  --frames 10 --pick 1-5  --size 140
npm run import-fx -- img3.png goku.instant impact --frames 10 --pick 6-10 --size 130

# 4 + 5 Kamehameha
npm run import-fx -- img4.png goku.kamehameha cast   --frames 14 --pick 1-6   --once --fps 10 --size 100
npm run import-fx -- img4.png goku.kamehameha muzzle --frames 14 --pick 7-10  --size 90
npm run import-fx -- img4.png goku.kamehameha tip    --frames 14 --pick 11-14 --size 80
npm run import-fx -- img5.png goku.kamehameha body --grid 1x4 --trim 6 --fill --cell 512x128 --fps 12 --size 60

# 6 Kaio-ken
npm run import-fx -- img6.png goku.kaioken start --frames 11 --pick 1-5  --size 130
npm run import-fx -- img6.png goku.kaioken body  --frames 11 --pick 6-11 --size 120

# 7 Spirit Bomb
npm run import-fx -- img7.png goku.spiritbomb cast   --frames 20 --pick 1-7   --once --fps 7 --size 190
npm run import-fx -- img7.png goku.spiritbomb body   --frames 20 --pick 8-13  --size 130
npm run import-fx -- img7.png goku.spiritbomb impact --frames 20 --pick 14-20 --size 300

# 8 + 9 Super Kamehameha (Super Saiyan form)
npm run import-fx -- img8.png goku.superkamehameha cast   --frames 14 --pick 1-6   --once --fps 10 --size 110
npm run import-fx -- img8.png goku.superkamehameha muzzle --frames 14 --pick 7-10  --size 110
npm run import-fx -- img8.png goku.superkamehameha tip    --frames 14 --pick 11-14 --size 100
npm run import-fx -- img9.png goku.superkamehameha body --grid 1x4 --trim 6 --fill --cell 512x128 --fps 12 --size 90
```

Notes:
- 1, 3 and 6 use a few of the parts a skill can have; the rest fall back to the generic effect.
- Frame counts: if ChatGPT gives a different number, tell Claude the real counts and it will adjust `--frames`.
- Sizes are arena pixels (a fighter is about 90 wide) and can be changed in `public/assets/fx/<id>/<part>.json` afterwards.
