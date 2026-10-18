# Sukuna sprite prompts (ChatGPT)

Two sheets: the base **Ryomen Sukuna** and the **True Form (Heian Era)** used while transformed. Get a design you like first (attach a reference if you have one), then ask for each sheet in the same chat. Import commands are at the bottom.

## 1. Base sheet

```
Create a pixel-art sprite sheet of Ryomen Sukuna from Jujutsu Kaisen in his vessel form, as a cute chibi fighting-game character in the same style as my other fighters (big head, small body, crisp pixel outlines, saturated colours).

Design (keep identical in every frame): spiky pink hair, sharp red eyes, thin black curse markings on the forehead, cheeks and nose (a second pair of eyes is NOT needed), a dark navy jujutsu uniform with a red hood. He fights with BARE HANDS only: no sword and no weapon of any kind.

- Transparent background. No text, no labels, no borders.
- Every frame shows the character from a side / three-quarter view FACING RIGHT.
- Arrange it as a grid: 6 rows, up to 6 frames per row, all cells the same size, the character centred in each cell, FEET ON THE SAME BASELINE in every frame, the same scale in every frame.
- Row 1: idle fighting stance, arrogant and relaxed, one hand low (4 frames).
- Row 2: running (6 frames).
- Row 3: casting, one hand held forward with two fingers flicking as if cutting the air (4 frames).
- Row 4: recoiling from a hit, annoyed (2 frames).
- Row 5: falling down knocked out (4 frames).
- Row 6: a quick basic attack: a punch with a following kick, then a short flick of the fingers (4 frames: wind-up, strike, follow-through, recover).
- No energy effects, slash arcs, swirls, speed lines or particles. Character only.
```

## 2. True Form (Heian Era) sheet

```
Using the attached Sukuna sprite as the exact style reference, create a pixel-art sprite sheet of his TRUE FORM from Jujutsu Kaisen, in the same chibi style, as a more imposing, slightly larger and broader version of the same character: pink hair, FOUR eyes (two pairs, red), black curse markings across the face and body, a bare muscular upper body with FOUR arms (two on each side), the dark navy jujutsu trousers and sash, and a second mouth on his stomach. Fights with bare hands only: no weapon.

- Transparent background. No text, no labels, no borders.
- Every frame shows the character from a side / three-quarter view FACING RIGHT, same scale as the base sheet.
- Arrange it as a grid: 6 rows, up to 6 frames per row, all cells the same size, the character centred in each cell, feet on the same baseline in every frame.
- Row 1: idle fighting stance with the four arms spread (4 frames). Row 2: running (6 frames). Row 3: casting, the upper pair of arms thrust forward with fingers flicking (4 frames). Row 4: recoiling from a hit (2 frames). Row 5: falling down knocked out (4 frames). Row 6: a quick basic attack using several arms at once: fast punches then a kick (4 frames: wind-up, strike, follow-through, recover).
- No energy effects, slash arcs, swirls, speed lines or particles. Character only.
```

## Importing

```
npm run import-sheet -- path/to/base.webp sukuna --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Sukuna"
npm run import-sheet -- path/to/trueform.webp sukuna --form --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Sukuna/True Form"
```

If a sheet has no attack row yet, add it later with `--attack` (and `--attack --form` for the true form). Restart `npm run dev` afterwards. Until the sprites exist, Sukuna shows as a red disc with "SK".
