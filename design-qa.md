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

---

# Design QA — Naming prototype type guides

## Source truth

- Existing-box reference: `/var/folders/sl/q2rnvs0j6g1bb1pg7zjj5jyh0000gn/T/codex-clipboard-c4fd8262-9c40-4580-8c05-911acf64764a.png`
- Existing-box reference pixels: 1814 × 458.
- Type-anatomy reference: `/var/folders/sl/q2rnvs0j6g1bb1pg7zjj5jyh0000gn/T/codex-clipboard-106e56cc-af79-4270-b954-4465710b7a35.png`
- Type-anatomy reference pixels: 1920 × 1080.
- Focused comparison: cap-height and baseline placement, full-width horizontal
  rules, the single right-side vertical rule, gray color, and text clearance.

## Implementation evidence

- Desktop focused screenshot: `/private/tmp/cs-final-prototypes-final.jpg`.
- Desktop viewport: 1280 × 720 CSS pixels.
- Mobile screenshot: `/private/tmp/cs-final-surprise-mobile.jpg`.
- Mobile viewport: 390 × 844 CSS pixels.
- State: section 05 in view after reveal animation settled.

## Comparison and iterations

- Compared both supplied references and the mobile implementation together in
  one visual inspection input.
- First pass placed the first cap-height rule too far above the letterforms.
- Final pass moved the cap-height and baseline rules onto the visible type
  anatomy, then shortened each vertical rule to end at the final baseline.
- The two-line lockup uses one guide pair per explicit line; the one-line lockup
  uses a single guide pair.

## Findings

- Blind Date has four full-width horizontal rules: passed.
- Surprise has two full-width horizontal rules: passed.
- All guide rules use the secondary gray text color `#7a7a88`: passed.
- Each box has one right-side vertical rule from first cap height to final
  baseline: passed.
- Rules paint beneath the title copy: passed.
- Grid boxes remain `overflow: visible`; both cards have zero component-level
  horizontal overflow at 390px: passed.
- Browser console warnings and errors: none.

## Final result

passed

---

# Design QA — Namecard glyph clipping regression

## Source truth

- Reported regression: `/var/folders/sl/q2rnvs0j6g1bb1pg7zjj5jyh0000gn/T/codex-clipboard-368c9c16-1b55-4e4c-b1d1-287f802ed9d5.png`.
- Source pixels: 2426 × 1124.
- Focused visual target: preserve the negative-leading typography and guide
  geometry while restoring the complete iridescent letterforms.

## Implementation evidence

- Desktop screenshot: `/private/tmp/cs-final-clipping-after.jpg`.
- Desktop pixels and viewport: 1280 × 720 at browser-rendered density.
- Mobile screenshot: `/private/tmp/cs-final-clipping-after-mobile.jpg`.
- Mobile pixels and viewport: 390 × 844 at 1× density.
- State: section 05, both naming cards visible after fonts and grid rules loaded.

## Comparison history

- Before: the 55px glyph box extended roughly 15px above the 24px
  negative-leading line box, but the gradient was painted on the shorter parent.
  Transparent glyph pixels outside that parent rendered as black.
- Fix: moved the iridescent background clipping from `.rail-title` to each
  glyph-sized `.line-copy`; retained white fill for the secondary copy.
- After: compared the reported screenshot and the revised browser capture in one
  visual input. Full tops of `Blind Date` and `Surprise` render without changing
  line spacing or guide positions.

## Fidelity surfaces

- Fonts and typography: original family, weight, size, tracking, negative
  leading, and wrapping preserved; glyph truncation removed.
- Spacing and layout rhythm: card size and guide geometry unchanged.
- Colors and tokens: the existing iridescent banner and white secondary fill
  preserved.
- Image quality: no raster assets introduced; browser-rendered type remains
  sharp.
- Copy and content: unchanged.
- Responsive behavior: both 390px cards have equal component client/scroll
  widths, so the fix introduces no card-level horizontal overflow.
- Browser console warnings and errors: none.

## Final result

passed
