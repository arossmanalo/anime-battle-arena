# Custom skill effects (FX sprites)

Every skill, default attack and passive can have its own effect art instead of the generic glowing ball / ring / beam. Drop sprites in `public/assets/fx/<id>/`; anything missing falls back to the generic effect, so you can do it one skill at a time.

`<id>` is the skill's `id` from its fighter file (`gojo.red`, `gojo.purple`, ...). The default attack is `<fighter>.attack` (`gojo.attack`) and a passive uses its own id (`gojo.limitless`).

## Parts

Each part is a **single row of frames** (`<part>.png`) plus an optional `<part>.json`.

| Part | When it plays | Notes |
| --- | --- | --- |
| `cast` | on the caster while the skill winds up | loops until the skill fires (or plays once and holds its last frame with `--once`). Centred on the fighter |
| `body` | **projectile**: flies with it | faces the direction it travels (draw it facing **right**) |
| | **zone** (Lapse: Blue): fills the area, centred on it | a domain stretches over the whole arena |
| | **buff** (Infinity): around the caster while the buff lasts | fades out at the end |
| `start` | once, where the skill fires | muzzle flash, blink-out puff |
| `impact` | once, where it hits | for a passive, where it triggers (e.g. Limitless blocking an attack) |

Which parts a skill can use: projectile = `cast`, `start`, `body`, `impact` · zone = `cast`, `start`, `body` · dash = `cast`, `start`, `impact` · buff = `cast`, `start`, `body` · aoe = `cast`, `start`, `impact` · beam (body is still the generic beam for now) = `cast`, `start` · passive = `impact`.

## Making the art

1. Ask ChatGPT for the frames in one horizontal row on a **pure black background** (glow effects) or on a flat colour. Prompts for Gojo are in [GOJO_FX_PROMPTS.md](GOJO_FX_PROMPTS.md).
2. Import it:
   ```
   npm run import-fx -- path/to/image.png gojo.red body --frames 4 --size 80
   ```
3. Restart `npm run dev` (the manifest is rebuilt on start).

`import-fx` options:

| Option | Meaning |
| --- | --- |
| `--bg auto\|black\|transparent\|flat\|none` | how the background goes. `black` turns brightness into opacity, so glows fade smoothly (best for energy). `auto` picks transparent, black or a flat colour. `none` keeps it opaque |
| `--frames N` | how many frames are in the (single-row) image. The tool cuts the row at the N-1 emptiest places, which also works when frames touch or are joined by glow. Use it whenever you know the count |
| `--crop L,T,R,B` | use only part of the image (pixels, or fractions like `0,0,0.3,1`). Lets one image hold several effects (cast, flight and impact of one skill in a single row) |
| `--pick A-B` | use only frames A to B of what was found (1-based) |
| `--grid CxR` | cut into equal cells instead of detecting frames |
| `--size PX` | width on screen in arena pixels. The arena is 900 wide and a fighter is about 90 |
| `--fps N`, `--loop`, `--once` | frame rate, and whether it loops |
| `--blend add\|normal` | `add` makes it glow (default for black backgrounds) |
| `--no-rotate` | a projectile body that should not turn to face its heading |
| `--cell N` or `WxH`, `--fill` | frame size; `--fill` stretches each frame to the cell (used for the domain background) |
| `--copy-to FOLDER` | also keep the source and result somewhere, e.g. `Pictures\ABA Sprites\Characters\Gojo\FX` |

All frames share one scale, so an explosion that grows keeps growing. Frames are read left to right, top to bottom.

## sheet.json fields

`frameWidth`, `frameHeight`, `frames`, `frameRate`, `loop`, `size`, `blend` (`add` or `normal`), `rotate`. The importer writes them for you; edit the JSON by hand to tweak `size` or `frameRate` without re-importing.

## Default sizes

When `size` isn't set: projectile body is 4.5x the hit radius (at least 24 px), impact is 2.4x the radius (at least 60), a zone is 2.3x its radius, a domain fills the arena, a cast sprite is 90 px (150 for ultimates), a buff body is 130 px, a start sprite is 100 px.
