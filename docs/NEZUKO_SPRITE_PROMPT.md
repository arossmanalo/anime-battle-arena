# Nezuko sprite prompts (ChatGPT)

Two sheets: the base **Nezuko** (bamboo muzzle) and the **Awakened Demon Form** used after she transforms. **Attach a reference image of Nezuko Kamado (base design) when you paste prompt 1**, and for prompt 2 attach two images in this order: **first the finished base sprite, then a reference image of her awakened demon form** (horn, vine-like markings). If you have no awakened reference, attach only the base sprite. Ask for both sheets in the same chat so the design stays consistent. Import commands are at the bottom.

## 1. Base sheet

```
Attached is a reference image of Nezuko Kamado from Demon Slayer. Using it as the design reference, create a pixel-art sprite sheet of her as a cute chibi fighting-game character in the same style as my other fighters (big head, small body, crisp pixel outlines, saturated colours). Keep the design from the reference exactly the same in every frame.

Design details to keep (if the reference differs slightly, follow the reference): long black hair fading into fiery orange at the ends, large pink eyes, a small bamboo muzzle tied around her mouth, a pink geometric-patterned kimono with a dark brown haori, an orange obi, white leg wraps and sandals. Small and youthful, gentle expression. She fights with BARE HANDS and kicks only: no weapon of any kind.

- Transparent background. No text, no labels, no borders.
- Every frame shows the character from a side / three-quarter view FACING RIGHT.
- Arrange it as a grid: 6 rows, up to 6 frames per row, all cells the same size, the character centred in each cell, FEET ON THE SAME BASELINE in every frame, the same scale in every frame.
- Row 1: idle fighting stance, light and bouncy, hands low and ready (4 frames).
- Row 2: running, quick and agile (6 frames).
- Row 3: casting, both hands held forward and open as if offering protection (4 frames).
- Row 4: recoiling from a hit (2 frames).
- Row 5: falling down knocked out (4 frames).
- Row 6: a quick basic attack: a kick, a short claw swipe, then a spinning kick (4 frames: wind-up, strike, follow-through, recover).
- No flames, energy effects, swirls, speed lines or particles. Character only.
```

## 2. Awakened Demon Form sheet

Attach: **1) the finished base sprite, then 2) the awakened form reference image** (optional).

```
Attached are two images: the FIRST is the pixel-art Nezuko sprite from the first sheet (her base form), and the SECOND (if present) is a reference image of her awakened demon form. Use the first as the exact style, scale and colour reference and the second for the awakened design details. Create a pixel-art sprite sheet of her AWAKENED DEMON FORM from Demon Slayer, in the same chibi style, as a taller, more imposing and more ferocious version of the same character: noticeably taller than the base sprite (about 25% bigger), a single horn on her forehead, vine-like dark markings across her arms, legs and face, sharper claws, wild flowing hair (black fading to orange), intense glowing pink demonic eyes, NO bamboo muzzle (her mouth is open with small fangs), the same pink kimono but torn and flowing. She fights with claws and kicks only: no weapon.

- Transparent background. No text, no labels, no borders.
- Every frame shows the character from a side / three-quarter view FACING RIGHT.
- Arrange it as a grid: 6 rows, up to 6 frames per row, all cells the same size, the character centred in each cell, feet on the same baseline in every frame.
- Row 1: aggressive idle stance, hunched, claws out (4 frames). Row 2: running like a predator (6 frames). Row 3: casting, a roar with both fists pulled back (4 frames). Row 4: recoiling from a hit, barely flinching (2 frames). Row 5: falling down knocked out (4 frames). Row 6: a heavy basic attack: a punch, a claw strike, a kick and a powerful finishing blow (4 frames: wind-up, strike, follow-through, recover).
- No flames, energy effects, swirls, speed lines or particles. Character only.
```

## Importing

```
npm run import-sheet -- path/to/base.webp nezuko --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Nezuko"
npm run import-sheet -- path/to/awakened.webp nezuko --form --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Nezuko/Awakened"
```

If a sheet has no attack row yet, add it later with `--attack` (and `--attack --form` for the awakened form). Restart `npm run dev` afterwards. Until the sprites exist, Nezuko shows as a pink disc with "NZ".
