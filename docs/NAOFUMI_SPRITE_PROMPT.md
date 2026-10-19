# Naofumi sprite prompt (ChatGPT): base and Shield of Wrath in ONE prompt

One prompt makes both sprite sheets. It deliberately does **not** describe how Naofumi looks: the attached reference images are the only source for his design, so ChatGPT cannot drift towards a written description.

**Attach the images in one of these two ways, in this order, when you paste the prompt:**
- **Two reference images (three attachments):** 1) Naofumi's BASE form, 2) Naofumi's TRANSFORMED form (Shield of Wrath), 3) one of your existing pixel sprites (for example Broly's or Erwin's idle frame) for style only.
- **One reference image (two attachments):** 1) a single image that shows BOTH the base form and the transformed form of Naofumi (for example side by side), 2) one of your existing pixel sprites for style only.

The prompt handles both cases by itself: ChatGPT counts the attachments.

ChatGPT should answer with **two images**: sheet 1 (base) then sheet 2 (transformed). Import commands are at the bottom.

## Prompt

```
Count the attached images and read them like this:
- IF THERE ARE THREE IMAGES: IMAGE 1 is the reference for the BASE form of the character, IMAGE 2 is the reference for the TRANSFORMED form of the same character, and IMAGE 3 is one of my existing pixel-art fighters.
- IF THERE ARE TWO IMAGES: IMAGE 1 is ONE reference that shows BOTH the BASE form and the TRANSFORMED form of the same character (for example side by side or as two poses): work out which version is the base form and which is the transformed form from the image itself (the transformed one is the powered-up, changed or awakened version). IMAGE 2 is one of my existing pixel-art fighters.
My existing pixel-art fighter (the last image) is ONLY for pixel style, scale and pixel density: do not copy its design, outfit or colours.

Reproduce each form exactly as it appears in its reference: same hair, face, outfit, accessories, equipment, colours and proportions. Do not add, remove or change any detail, and do not mix details between the base and the transformed form. If these instructions ever differ from the images, the images win.

Create TWO pixel-art sprite sheets, as two separate images, in the same style as my other fighters (chibi fighting-game character: big head, small body):
- SHEET 1: the BASE form.
- SHEET 2: the TRANSFORMED form, at the same size and with the same poses as sheet 1.
He fights only with the shield attached to his right arm, exactly as shown in the references: it stays on that arm in every frame. Draw no sword, spear, bow or any other weapon.

Rules for BOTH sheets:
- PIXEL-ART STYLE (important): this must be TRUE low-resolution pixel art like a 16-bit fighting game, NOT a smooth illustration. Draw the character about 64 pixels tall on a visible pixel grid, with chunky square pixels, hard 1-pixel dark outlines, a limited palette (about 24 colours), flat colour shading in 2-3 tones, and NO anti-aliasing, NO soft gradients, NO blur, NO painterly or vector smoothing. Keep it crisp enough that individual pixels are visible when zoomed in.
- Transparent background. No text, no labels, no borders.
- Every frame shows the character from a side / three-quarter view FACING RIGHT.
- Arrange each sheet as a grid: 6 rows, up to 6 frames per row, all cells the same size, the character centred in each cell, FEET ON THE SAME BASELINE in every frame, the same scale in every frame. LEAVE A CLEAR GAP BETWEEN ROWS so that no frame touches the row above or below.
- Row 1: idle defensive stance, shield arm held forward and braced, feet planted (4 frames).
- Row 2: running with the shield arm tucked in front (6 frames).
- Row 3: casting a barrier: the shield arm thrust forward with the shield facing out, as if raising a wall (4 frames).
- Row 4: recoiling from a hit, braced behind the shield and sliding back a little (2 frames).
- Row 5: falling down knocked out (4 frames).
- Row 6: a shield-bash combo: a quick bash, a heavy forward shove, then a powerful finishing slam with the shield (4 frames: wind-up, strike, follow-through, recover).
- No glowing energy, swirls, speed lines or particles. Character only. (In the transformed sheet the cursed look of the shield and the character is part of the design from the reference image; do not add extra flames or effects beyond what the reference image shows.)
```

## Importing

```
npm run import-sheet -- path/to/sheet1-base.webp naofumi --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Naofumi"
npm run import-sheet -- path/to/sheet2-wrath.webp naofumi --form --copy-to "C:/Users/Aryl Ross A. Manalo/Pictures/ABA Sprites/Characters/Naofumi/Wrath"
npm run assets
```

If a row count is wrong (rows that touch get merged), tell Claude: it can split the image by hand and re-import. Restart `npm run dev` afterwards. Until the sprites exist, Naofumi shows as a green disc with "NI".
