# Art & Audio Spec

Every asset is optional. The game runs on placeholder discs and synthesized sound, and swaps in real files as they appear. After adding or changing files, restart `npm run dev` (or run `npm run assets`) so the asset manifest picks them up.

```
public/assets/
  fighters/<id>/sheet.png      sprite sheet (required for a sprite)
  fighters/<id>/sheet.json     optional sheet settings
  fighters/<id>/portrait.png   optional square portrait
  fighters/<id>/form/sheet.png optional sheet used while transformed (+ sheet.json)
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
| 6 | `attack` | 4 | no | the default attack (punch, kick or sword slash), shown for about 2.5x its wind-up |

Frame counts are recommendations. A row can have any number of frames up to the sheet width. An empty row falls back to `idle`; a missing `attack` row falls back to the `cast` pose, so older 5-row sheets keep working. If there's no `ko` row, the placeholder spin-out is used instead.

**Frame rules**

- **64×64 px** per frame (or any square size set in `sheet.json`; `import-sheet` uses 128×128), on a **transparent background**. Larger frames are drawn at the same on-screen size.
- **Top-down 3/4 view, facing right.** The game mirrors the sprite when the fighter faces left.
- Character about **48 px tall**, centred horizontally, **feet at y ≈ 56** (8 px above the bottom edge). The game lines the feet up with the shadow.
- Leave a few pixels of margin. Nothing should touch the frame edges, or it will bleed between frames.
- Keep the same palette and line weight across all characters so the roster reads as one game.

A complete sheet with the recommended counts is 6 frames wide × 6 rows, so **384×384 px**.

The `attack` row should read as one quick swing: **wind-up, strike, follow-through, recover** (frame 2 is the moment the hit lands). Melee fighters throw a punch/kick or a sword slash; ranged ones (Vegeta, Gojo) push a hand forward to fire a bolt. Keep the same size and baseline as the other rows; long blades may extend toward the frame edge but must stay inside the cell.

**sheet.json** (all fields optional):

```json
{
  "frameWidth": 64,
  "frameHeight": 64,
  "frames": { "idle": 4, "run": 6, "cast": 4, "hit": 2, "ko": 4, "attack": 4 }
}
```

Without `frames`, every row is assumed to be filled to the sheet's full width.

## Portrait

`portrait.png`: a square image, any size (128×128 recommended), head-and-shoulders, facing the viewer or slightly right. It's shown in the HUD, on Character Select and on the Results screen.

## Arena floor

`arena/floor.png`: a seamless tile (64×64 to 256×256), top-down, mid-dark so the effects stay readable. The game tiles it across the 900×372 arena.

## Making sprites with ChatGPT (recommended)

Gojo's current sprite was made this way. ChatGPT keeps a character's design consistent across frames well; its layout is never pixel-exact, so `import-sheet` cleans that up.

1. Get a design you like, then ask for the sheet with this prompt. **Always keep the PIXEL-ART STYLE paragraph: without it ChatGPT tends to return a smooth illustration (Nezuko's first sheets did), and the importer cannot turn that into pixel art. Attach an existing pixel sprite (for example Tanjiro's idle frame) as a style reference too.**

   > **Reproduce the character in the attached reference image exactly: same hair, face, outfit, accessories, colours and proportions. Do not add, remove or change any detail. If these instructions ever differ from the image, the image wins. Never describe the look in words in this prompt; the image is the only reference.**
   >
   > Create a pixel-art sprite sheet of this character.
   > - **PIXEL-ART STYLE (important): this must be TRUE low-resolution pixel art like a 16-bit fighting game, NOT a smooth illustration. Draw each character about 64 pixels tall on a visible pixel grid, with chunky square pixels, hard 1-pixel dark outlines, a limited palette (about 24 colours), flat colour shading in 2-3 tones, and NO anti-aliasing, NO soft gradients, NO blur, NO painterly or vector smoothing. Keep it crisp enough that individual pixels are visible when zoomed in. If you are about to draw a smooth high-resolution illustration, stop and draw it as pixel art instead. Attach one of my existing pixel sprites as a style reference when you can.**
   > - Transparent background. No text, no labels, no borders.
   > - Every frame shows the character from a side / three-quarter view **facing right**.
   > - Arrange it as a grid: **6 rows**, up to 6 frames per row, all cells the same size, character centred in each cell, **feet on the same baseline** in every frame, same scale in every frame.
   > - Row 1: idle fighting stance (4 frames). Row 2: running (6 frames). Row 3: casting an attack with one hand forward (4 frames). Row 4: recoiling from a hit (2 frames). Row 5: falling down knocked out (4 frames). Row 6: a quick basic attack (4 frames: wind-up, strike, follow-through, recover), e.g. a punch or a sword slash.
   > - No energy effects, swirls, speed lines or particles. Character only.

2. Save the image (PNG or WebP) and import it:
   ```
   npm run import-sheet -- path/to/image.webp gojo --copy-to "C:/Users/<you>/Pictures/ABA Sprites/Characters/Gojo"
   ```
   It removes the background (transparent, or a flat colour flood-filled from the edges), finds each sprite, groups them into the rows (idle, run, cast, hit, ko, attack), scales every frame by one shared factor into 128×128 cells with the feet on a common baseline, and writes `sheet.png`, `sheet.json` and a head-crop `portrait.png`. `--copy-to` also saves those plus the source image elsewhere.
   For a transformation (Nine-Tails Chakra Mode, Super Saiyan, ...), make a second sheet with the same layout and add `--form`; the game swaps to it when the fighter transforms:
   ```
   npm run import-sheet -- path/to/form.webp naruto --form
   ```
3. Sheets with 4 rows (hit and ko merged) or 5 rows (no attack) are accepted too: the first 2 ko frames double as the hit animation, and without an attack row the `cast` pose plays during attacks. the first 2 ko frames double as the hit animation. If it reports the wrong number of rows, the image probably has text, effects or frames that overlap vertically; regenerate or tidy it up and run again.
4. **Adding the attack row to a sheet you already imported** (so you don't have to regenerate everything): ask ChatGPT for a small two-row image of the same character, with the same prompt rules as above:

   > Row 1: the idle fighting stance (2 frames, same size and design as the existing sprite). Row 2: a quick basic attack, facing right (4 frames: wind-up, strike, follow-through, recover).

   Row 1 is only used to match the scale of the existing sheet and is then discarded. Import it with `--attack` (add `--form` for the transformed sheet):
   ```
   npm run import-sheet -- path/to/attack.webp gojo --attack
   npm run import-sheet -- path/to/attack-form.webp naruto --attack --form
   ```
   Everything else in the existing sheet is kept.
5. Restart `npm run dev`.

## Making sprites with the LPC generator (no drawing needed)

The [Universal LPC Spritesheet Character Generator](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) builds a fully animated top-down character from dropdowns. Gojo's first sprite was made this way (see git history).

1. Build the character in the generator, then click **Spritesheet (PNG)**.
2. Run the importer with the downloaded file and the fighter id:
   ```
   npm run import-lpc -- path/to/download.png sasuke
   ```
   It writes `sheet.png`, `sheet.json` and a cropped `portrait.png` into `public/assets/fighters/<id>/`, taking the right-facing combat-idle, run and spellcast rows plus the hurt row.
3. Copy the generator's credits into `public/assets/CREDITS.md` (list each layer's authors and licences) and save the generator URL there, so the character can be rebuilt.
4. Restart `npm run dev`.

LPC art is CC-BY-SA / OGA-BY / GPL. Always credit the authors.

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
