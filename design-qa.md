# Design QA — Cleaner manifesto sources

## Scope

- URL: `http://localhost:5173/#about`
- Replace the earlier title/body handwriting with three cleaner alpha PNGs.
- Match body part 2 to body part 1’s word scale and line rhythm.
- Insert an authored `where` so the copy reads “and where AI begins.”
- Preserve CSS-controlled color, whole-word responsive wrapping, and accessible
  copy.

## Source naming

- `manifesto-title-source.png`
- `manifesto-body-part-1-source.png`
- `manifesto-body-part-2-source.png`
- Derived join: `manifesto-body-normalized.png`

The previous source and derived masks are preserved in `masks/archive/` with
explicit `manifesto-*-v1-*` names.

## Normalization measurements

| Measurement | Value |
| --- | ---: |
| Body part 1 median x-height | 41.74px |
| Body part 2 original median x-height | 48.78px |
| Body part 2 applied scale | 85.582% |
| Body part 2 normalized x-height | 41.74px |
| Shared source-line step | 112.85px |

Visual source/normalization comparison:
`/private/tmp/pranavi-manifesto-normalization-comparison.jpg`

## Authored word reuse

- Inserted copy: “and **where** AI begins.”
- Reused source: `where` from source line 16, “learn where and when.”
- The inserted and original records share identical source-mask `x` and `y`
  coordinates.
- No letter was traced, redrawn, or generated.

## Browser verification

### 390 × 844

- Screenshot: `/private/tmp/pranavi-new-manifesto-mobile-2.png`
- 139 body-word masks.
- 28 responsive rows.
- 29–30px row advance.
- 0px horizontal overflow.
- Accessible copy contains “ends and where AI begins.”

### 1280 × 720

- Screenshot: `/private/tmp/pranavi-new-manifesto-desktop.png`
- 139 body-word masks.
- 16 responsive rows.
- 44–45px row advance.
- 0px horizontal overflow.

## Checks

- Cleaner source fidelity: passed.
- Part-to-part scale consistency: passed.
- Part-to-part line rhythm: passed.
- Inserted `where` reuse: passed.
- Punctuation and lowercase-i dots: passed.
- Responsive wrapping and overflow: passed.
- Accessible copy: passed.

## Final result

passed
