# 004 — Shared motion tokens for entrances

- **Status**: DONE (2026-10-08)
- **Commit**: 540fe469
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file

## Problem

Entrance curves are hand-typed in several places: `src/motion/entrance.ts` (`[0.25,0.1,0.25,1]`, `[0.16,1,0.3,1]`, `[0.33,0,0.2,1]`) and every case-study page (`cubic-bezier(.22,.61,.36,1)`).

## Target

In `src/styles/tokens.css` `:root`:
```css
--ease-enter: cubic-bezier(0.22, 0.61, 0.36, 1); /* the case studies' entrance curve */
--enter-dur: 0.72s;
--enter-rise: 16px;
--enter-step: 0.09s;
```
Used by plan 001's `.enter` rule. (The static case-study pages keep their own inline copies; they don't load tokens.css.)

## Verification

- Build succeeds; `.enter` resolves the variables in DevTools.
