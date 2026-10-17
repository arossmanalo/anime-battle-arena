# Art & Audio Spec

Every asset is optional. The game runs on placeholder discs and synthesized sound, and swaps in real files as they appear. After adding or changing files, restart `npm run dev` (or run `npm run assets`) so the asset manifest picks them up.

```
public/assets/
  fighters/<id>/sheet.png      sprite sheet (required for a sprite)
  fighters/<id>/sheet.json     optional sheet settings
  fighters/<id>/portrait.png   optional square portrait
  arena/floor.png              optional tileable floor
  sfx/<name>.ogg|mp3|wav       optional sound overrides
  CREDITS.md                   where every third-party file came from
```

`<id>` is the fighter id from `src/data/fighters/` (`naruto`, `sasuke`, `goku`, `vegeta`, `gojo`, `tanjiro`).

## Fighter sprite sheet

A grid of equal-sized frames, with **one row per animation in this exact order**:

| Row | Animation | Frames | Loops | Used when |
| --- | --- | --- | --- | --- |
| 1 | `idle` | 4 | yes | standing still |
| 2 | `run` | 6 | yes | moving |
| 3 | `cast` | 4 | yes | winding up, channelling a beam, dashing |
| 4 | `hit` | 2 | no | just took damage |
| 5 | `ko` | 4 | no | knocked out (holds the last frame) |

Frame counts are recommendations. A row can have any number of frames up to the sheet width. An empty row falls back to `idle`. If there's no `ko` row, the placeholder spin-out is used instead.

**Frame rules**

- **64×64 px** per frame (change it in `sheet.json` if needed), on a **transparent background**.
- **Top-down 3/4 view, facing right.** The game mirrors the sprite when the fighter faces left.
- Character about **48 px tall**, centred horizontally, **feet at y ≈ 56** (8 px above the bottom edge). The game lines the feet up with the shadow.
- Leave a few pixels of margin. Nothing should touch the frame edges, or it will bleed between frames.
- Keep the same palette and line weight across all characters so the roster reads as one game.

A complete sheet with the recommended counts is 6 frames wide × 5 rows, so **384×320 px**.

**sheet.json** (all fields optional):

```json
{
  "frameWidth": 64,
  "frameHeight": 64,
  "frames": { "idle": 4, "run": 6, "cast": 4, "hit": 2, "ko": 4 }
}
```

Without `frames`, every row is assumed to be filled to the sheet's full width.

## Portrait

`portrait.png`: a square image, any size (128×128 recommended), head-and-shoulders, facing the viewer or slightly right. It's shown in the HUD, on Character Select and on the Results screen.

## Arena floor

`arena/floor.png`: a seamless tile (64×64 to 256×256), top-down, mid-dark so the effects stay readable. The game tiles it across the 900×372 arena.

## Making sprites with AI image tools

AI tools are good at single images and bad at keeping a character consistent across frames. This workflow keeps the drift down:

1. **Make one reference image per character first**: a front-facing character sheet in the target style. Every later prompt refers back to it (image-to-image or "character reference", depending on the tool).
2. **Generate the full grid in one image when possible**, using the prompt below. One image keeps frames more consistent than generating each frame separately.
3. **Clean up**: remove the background, scale to the exact grid size with *nearest-neighbour* (never smooth) scaling, and fix stray pixels. Free tools: [Aseprite](https://www.aseprite.org/) (paid, or build it from source), [LibreSprite](https://libresprite.github.io/) or [Piskel](https://www.piskelapp.com/). In any of them you can line frames up on a 64×64 grid and export a sheet.
4. **Check feet alignment**: flip through the frames. If the character bobs or slides, nudge the frames so the feet stay on the same line.

**Prompt template** (adjust the bracketed parts):

> Pixel art sprite sheet, 16-bit SNES style, top-down three-quarter view, [CHARACTER DESCRIPTION — outfit, hair, colours, no logos], facing right. Grid of 6 columns and 5 rows on a transparent background, each cell 64×64 pixels. Row 1: idle breathing (4 frames). Row 2: running (6 frames). Row 3: casting an energy attack with hands forward (4 frames). Row 4: recoiling from a hit (2 frames). Row 5: falling down knocked out (4 frames). Consistent character, consistent proportions, clean dark outlines, limited palette, no text, no background.

**Character descriptions to start from**: describe the look rather than naming the character. That gets better results and avoids reproducing official art.

| id | Description |
| --- | --- |
| naruto | spiky blond hair, orange-and-black tracksuit, blue forehead band, energetic stance |
| sasuke | black spiky hair, dark blue high-collar shirt, grey sash, sword at back, calm stance |
| goku | tall spiky black hair, orange gi with blue undershirt and belt, muscular, fighting stance |
| vegeta | flame-shaped black hair with widow's peak, blue bodysuit, white gloves and boots |
| gojo | white spiky hair, black blindfold, tall, black high-collar uniform, hands in pockets idle |
| tanjiro | dark red hair, scar on forehead, green-and-black checkered haori, katana, earrings |

Transformations currently recolour the aura rather than swap sprites. A transformed sheet (`sheet_form.png`) can be added later the same way.

## Sound effects

Every sound is synthesized in code (`src/game/audio/Sfx.ts`), so nothing is required. To replace one, drop a file named after it into `public/assets/sfx/`:

| Name | Plays on |
| --- | --- |
| `hit` / `hitHeavy` | damage under / over 15 |
| `shoot` | projectile fired |
| `beam` | beam fired (sustained) |
| `dash` | dash skill |
| `explosion` | large impacts (radius 60+) |
| `buff` | buffs and small zones |
| `charge` | ultimate wind-up |
| `transform` | transformation |
| `domain` | Domain Expansion |
| `ko` | knockout |
| `fail` | the player's cast is rejected |
| `click` | menu buttons |
| `fight` | "FIGHT!" at match start |

Good free (CC0) sources: [Kenney audio packs](https://kenney.nl/assets?q=audio) such as *Impact Sounds* and *Sci-Fi Sounds*, and [OpenGameArt](https://opengameart.org/) (check each file's licence). Keep sounds short (under 1 s, except beam/domain), trimmed, and normalised to about -3 dB. Prefer `.ogg`.

## Licensing

- Record every third-party file in `public/assets/CREDITS.md`: file, author, source URL, licence.
- Use only CC0 / CC-BY / similarly permissive assets. CC-BY needs the author credited.
- Don't use sprites, voice clips or music ripped from the official games or anime.
- AI-generated sprites: describe the look in your own words, as in the table above. Don't feed official artwork in as the reference image.
