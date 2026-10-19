# Gojo: Maximum Blue explosion (impact part)

Attach when you paste this: **(1)** the existing Maximum Blue effect image (the blue singularity), as the look reference, and **(2)** any existing pixel-art effect sheet of another fighter, for pixel style only.

## Prompt

Attached are two reference images. The FIRST is the existing "Maximum: Blue" singularity effect from my pixel-art fighting game. The SECOND is an existing pixel-art game effect sheet from the same game, used only for pixel style, scale and how the frames are laid out.

Draw the EXPLOSION that ends the first effect: the blue singularity collapses and detonates. Reproduce the colours, shapes and glow of the singularity in the first image exactly. Do not invent a new palette or new motifs. If these instructions ever differ from the first image, the image wins.

PIXEL-ART STYLE (important): true low-resolution pixel art, as if drawn on a small canvas and scaled up with nearest-neighbour. Hard 1px edges, a limited palette, no anti-aliasing, no smooth gradients, no soft airbrushed glow. Build glow from stepped bands of colour.

Layout:
- ONE image, ONE horizontal strip of 8 frames, on a pure black background (#000000). Each frame sits in its own square cell with wide black gaps between cells, so no frame touches another.
- TOP-DOWN view (from directly above), perfectly round and centred in each cell, because it covers the ground around Gojo.
- Animation, left to right:
  1. the singularity shrinks to a tight bright point
  2. a white-hot core flash
  3. the first shockwave ring bursts outward
  4. the ring is at its widest, bright rim, debris flying outward
  5. a second ring, fainter, and the core fading
  6. thin trailing arcs of energy
  7. a few last sparks
  8. almost empty, only faint dust
- Edge of the blast in the widest frame (4) should nearly fill its cell, so the explosion reads as large.
- Dark parts need a bright rim, because black is keyed out as transparent.
- No text, no characters, no ground, no shadow, no frame borders.

## Import

Find each frame's band by looking at the image, then:

```bash
npm run import-fx -- <image> gojo.maxblue impact --crop L,T,R,B --frames 8 --size 420 --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Gojo/FX"
```

`--size 420` matches the zone radius of 200 (about 2x radius). Maximum Blue currently has no `impact` part, so until this is imported the game shows its generic blue burst.
