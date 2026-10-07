# Star Light Loading Guard

## Goal

Prevent the compact star card's WebGL light canvas from exposing its opaque black backing during initialization on slower mobile devices, without changing the card's fully loaded appearance.

## Design

The existing DOM-rendered card remains the visible loading and fallback state. Empty slots keep their dotted outlines, collected slots keep their gold stamp artwork, and the existing baked highlight remains enabled.

The WebGL canvas starts hidden. After its sprite texture has loaded and it has successfully drawn its first frame, it waits for one additional browser paint. At that paint boundary, the card enables the existing WebGL-ready state and reveals the canvas together. There is no opacity animation or cross-fade, so there is no blended intermediate frame.

If WebGL initialization fails or its context is lost, the canvas stays hidden and the existing DOM artwork continues to render. Destroying the light also returns it to the hidden fallback state.

## Scope

- Preserve the existing shader output, colors, blend mode, timing, and completed visual appearance.
- Preserve the current card dimensions and responsive layout.
- Do not duplicate the card CSS.
- Do not change badge progress, navigation, or storage behavior.

## Verification

- Add a regression test proving the WebGL canvas is hidden before readiness.
- Prove the ready state is applied only after a successful first draw and a subsequent browser paint.
- Prove context loss returns to the fallback state.
- Run the full automated test suite and production build.
- Repeat cold loads at a phone-sized viewport and confirm there is no black, blank, or intermediate star-row frame.
