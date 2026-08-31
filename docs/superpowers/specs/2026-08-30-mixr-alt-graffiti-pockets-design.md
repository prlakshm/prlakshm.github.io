# Mixr Alternate Poster Graffiti Pockets

## Goal

Fill four visible gaps in `poster-mixr-alt.html` with additional purple “Mixr” graffiti: close above the subject’s head, above and below her left arm, and above her right arm.

## Composition

Keep the alternate poster’s existing wider graffiti aura unchanged, including its ring spacing, ring count, palette, typeface, figure, wave bands, and “iOS DJ App” tag. Add only the requested gap-filling tags.

Use the focus poster’s treatment as the reference: each new word follows the nearby silhouette contour, uses the existing `roughWord` rendering, and draws before the figure so overlapping portions tuck naturally behind the subject.

## Implementation

Add a small, explicit set of placements after the existing orbit and featured-tag selection is complete. Each placement will:

- use the existing `Mixr` word, size, purple, opacity, and seeded texture;
- derive its rotation from the local silhouette-distance gradient;
- retain the alternate poster’s existing typography offset;
- remain separate from the automatic ring-generation constants.

Do not copy the focus poster’s left-hip addition, stray-tag removal, tighter ring spacing, reduced ring count, or uniform ring opacity.

## Verification

Reload the local alternate poster and confirm visually that all four pockets are filled without covering the face, hands, headline, or featured white tag. Confirm the canvas renders without console errors and that the focus poster remains unchanged.
