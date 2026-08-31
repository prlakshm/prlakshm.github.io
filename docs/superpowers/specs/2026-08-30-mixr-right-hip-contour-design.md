# MIXR Right-Hip Contour Design

## Goal

Make the right-hip `Mixr` lettering form the figure's curve in the same manner as the left-side lettering, and extend the current right-side reach exactly 10 canvas pixels farther right.

## Current behavior

The general graffiti aura is generated from the figure's silhouette distance field. At the right hip, however, three manually positioned words are set almost horizontally and pushed underneath the figure. The figure occludes those words, so the body appears to cut through the lettering instead of the intact word shapes defining the contour.

## Design

- Remove the three manually positioned right-hip word overrides.
- Generate a dedicated right-hip contour run from the existing silhouette distance field.
- Sample positions along the visible right hip and rotate each word to the local contour tangent, matching the mechanism already responsible for the left-side curve.
- Keep each `Mixr` word intact. Reject or reposition candidates that overlap the figure enough to look clipped or that leave an obvious gap in the contour.
- Offset the completed right-hip run 10 canvas pixels farther right than its current outer reach. No other side of the aura moves.
- Preserve the existing word style, size, color, spray texture, layer order, cut curve, wave bands, figure placement, and current uncommitted spacing refinements.

## Implementation boundaries

The change is confined to `poster-lab/pinnables/mixr-side.html`. It will reuse the existing `dist`, contour-gradient, and word-rendering logic rather than introduce a second geometry system.

## Verification

- Reload `http://localhost:4517/mixr-side.html` after the edit.
- Compare the rendered poster with the supplied reference at the right hip.
- Confirm that intact `Mixr` silhouettes create a continuous hip curve, with no mechanical clipping and no conspicuous gaps.
- Confirm that the rightmost contour reaches 10 canvas pixels farther right than the current baseline.
- Confirm that the left contour, upper aura, wave bands, figure, and existing spacing refinements remain visually unchanged.
