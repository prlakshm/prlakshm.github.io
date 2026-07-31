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

---

# Design QA — Notebook project annotations

## Source truth

- Arrow and label reference: `/var/folders/sl/q2rnvs0j6g1bb1pg7zjj5jyh0000gn/T/codex-clipboard-d5c82990-c118-4b4b-b389-7c76c2feb81c.png`
- Reference pixels: 942 × 1672.
- The reference is a style source rather than a same-page layout: the focused
  comparison covers arrow scale, stroke weight, dash rhythm, label typography,
  and arrow-to-notebook proximity.

## Implementation evidence

- Desktop screenshot: `/private/tmp/notebook-annotations-final.png`
- Desktop viewport and screenshot: 1280 × 720 CSS/device pixels at 1× density.
- Mobile screenshot: `/private/tmp/notebook-annotations-mobile.png`
- Mobile viewport and screenshot: 375 × 812 CSS/device pixels at 1× density.
- State: homepage notebook shelf revealed; covers closed; no hover tooltip.

## Comparison and iterations

- Compared the supplied reference and the desktop implementation together in
  one visual inspection input.
- First pass: 64px arrows floated above the notebook covers.
- Second pass: 74px arrows connected, but read too large beside the books.
- Final pass: 48px Lucide corner arrows with a 0.8px absolute stroke and a
  tighter `0.7 3.4` dotted rhythm. Labels were moved closer to the covers so
  the smaller arrows still originate visually at each notebook.
- Mobile pass added dedicated label headroom so copy and arrows remain above,
  rather than underneath, the stacked notebooks.

## Findings

- Thin solid arrow matches the reference's restrained stroke weight: passed.
- Dotted arrows use smaller marks and a quieter rhythm: passed.
- Arrowheads point from notebook toward label: passed.
- Labels use the site's mono body font and secondary color: passed.
- No desktop or 375px horizontal overflow: passed.
- Notebook hover/open interaction and tooltip-only behavior remain intact:
  passed.

## Final result

passed
