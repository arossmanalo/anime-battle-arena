# Gojo FX: what to generate

15 sprites cover everything Gojo does. They are all **single horizontal rows of frames on a pure black background** except the domain. See [FX_SPEC.md](FX_SPEC.md) for how the game uses them. Generate them in the same chat as his character sheet if you can, and attach his sprite so the colours and style match.

## Shared prompt (paste first, then add the line for the effect)

> Create a high-quality **pixel-art game VFX sprite sheet** for a chibi pixel-art fighting game, matching the style of the attached character sprite (crisp pixel edges, strong outlines on solid parts, soft bright glow on energy). **One single horizontal row of N frames**, equal spacing with clear black gaps between frames, each frame centred, same scale in every frame, on a **pure solid black (#000000) background**. No text, labels, borders, characters, hands, floor, shadows or UI. The effect only. Energy should fade smoothly to black at its edges.

Then import with the command under each effect. Add `--copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Gojo/FX"` to any command to keep a copy.

---

## 1. Default attack: Cursed Bolt (`gojo.attack`)

**Body** (loops, travels to the right): *"4 frames, a small fast comet of cursed energy: a white-hot core with a violet-and-pale-blue glow, a short tapering tail to the LEFT, front of the bolt pointing RIGHT. Subtle flicker between frames."*
```
npm run import-fx -- bolt-body.png gojo.attack body --frames 4 --size 48
```
**Impact** (once): *"5 frames, a small violet-white burst: a bright flash, 6-8 little sparks flying outward, fading out. Small, tight, about the size of a fist."*
```
npm run import-fx -- bolt-impact.png gojo.attack impact --frames 5 --size 70
```

## 2. Lapse: Blue (`gojo.blue`)

**Cast** (loops, at his raised hand): *"4 frames, a small blue energy orb forming and pulsing in front of a raised hand: bright blue-white core, thin rings pulling inward."*
```
npm run import-fx -- blue-cast.png gojo.blue cast --frames 4 --size 90
```
**Body** (loops, fills the pull area, seen from above): *"6 frames, a swirling blue vortex sphere that sucks things inward: a deep blue sphere with a bright white-blue core, spiral arms rotating a little each frame, thin concentric distortion rings. Roughly circular, centred."*
```
npm run import-fx -- blue-body.png gojo.blue body --frames 6 --size 160 --fps 12
```

## 3. Reversal: Red (`gojo.red`)

**Cast** (loops): *"4 frames, a red-crimson energy orb charging at an outstretched hand: dark red core with a white-hot centre, short sparks pushing outward."*
```
npm run import-fx -- red-cast.png gojo.red cast --frames 4 --size 90
```
**Body** (loops, travels right): *"4 frames, a blazing red cursed-energy sphere with a white-hot core, crimson glow and small flame-like spikes bursting outward, a short trail to the LEFT, flying to the RIGHT."*
```
npm run import-fx -- red-body.png gojo.red body --frames 4 --size 80
```
**Impact** (once): *"7 frames, a red explosion: a flash, an expanding shockwave ring, red sparks flying outward and a fading crimson cloud."*
```
npm run import-fx -- red-impact.png gojo.red impact --frames 7 --size 170
```

## 4. Blink Strike (`gojo.blink`)

**Start** (once, where he vanishes): *"5 frames, a blink-out effect: a pale blue-white flash and a vertical shimmering afterimage that collapses to a thin line of light and disappears, with a few small blue sparks."*
```
npm run import-fx -- blink-start.png gojo.blink start --frames 5 --size 120
```
**Impact** (once, where he lands): *"5 frames, a blink-in strike burst: a white-blue flash with a sharp starburst of thin rays, a quick ring, fading to sparks."*
```
npm run import-fx -- blink-impact.png gojo.blink impact --frames 5 --size 130
```

## 5. Infinity (`gojo.infinity`) and the passive Limitless (`gojo.limitless`)

**Body** (loops, around him while the shield lasts): *"6 frames, a spherical barrier seen from the front: a nearly transparent pale-blue sphere with faint hexagonal-grid highlights and slowly moving ripple lines on its surface, a brighter rim. It must be mostly dark in the middle so the character shows through."*
```
npm run import-fx -- infinity-body.png gojo.infinity body --frames 6 --size 150 --fps 10
```
**Passive block** (once, when Limitless stops an attack): *"5 frames, a ripple on an invisible barrier as an attack hits it: a bright white-blue flash at the centre, expanding hexagon-patterned rings, and light fading out."*
```
npm run import-fx -- limitless-block.png gojo.limitless impact --frames 5 --size 120
```

## 6. Hollow Purple (`gojo.purple`, the ultimate)

**Cast** (loops during the 1-second wind-up): *"6 frames, a blue energy orb on the left and a red energy orb on the right orbiting a shared centre and pulled slowly together, crackling violet lightning between them, sparks. Wide: the pair is about 2.5x as wide as tall."*
```
npm run import-fx -- purple-cast.png gojo.purple cast --frames 6 --size 180 --fps 12
```
**Body** (loops, travels right): *"6 frames, a huge violet-purple sphere with a bright white rim and a dark purple-black core, swirling violet energy around it, small purple sparks shedding off, slight pulsing. Round and heavy."*
```
npm run import-fx -- purple-body.png gojo.purple body --frames 6 --size 150
```
**Impact** (once): *"8 frames, a massive violet annihilation blast: a white flash, a huge expanding purple sphere that swallows the area, a shockwave ring, debris-like sparks, then it fades into a dark purple haze."*
```
npm run import-fx -- purple-impact.png gojo.purple impact --frames 8 --size 320
```

## 7. Domain Expansion: Infinite Void (`gojo.void`)

A background that fills the whole arena for 3 seconds. This one is **not** on black and it is **opaque**: generate **4 frames in a 2x2 grid** of a wide cosmic void, each frame with a **2.4 : 1** wide aspect (like 900x372): *"an endless dark space of deep indigo and black, countless white and pale-blue stars and tiny glowing points, faint swirling nebula bands in purple, a bright pale-blue vortex of light streaks converging toward the centre. Frame to frame the stars drift slightly and the streaks rotate a little, so it loops smoothly. No characters, no text."*
```
npm run import-fx -- void.png gojo.void body --grid 2x2 --trim 14 --fill --bg none --cell 900x372 --blend normal --fps 6
```

---

## Tips

- If the importer reports the wrong number of frames, pass `--frames N` (it merges the closest pieces), or ask ChatGPT for bigger gaps between frames.
- If a frame is cut off or the effect looks too big or small in game, edit `size` in `public/assets/fx/<id>/<part>.json` instead of regenerating.
- Glow sprites use additive blending, so they look best against the dark floor and can wash out on bright sprites; if one looks too faint, ask ChatGPT for a brighter, more saturated version.
- Check one at a time: run `npm run dev`, pick Gojo, and use the skill.
