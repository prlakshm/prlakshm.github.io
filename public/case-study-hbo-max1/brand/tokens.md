# Surprise Rail — REGISTER · Design Tokens

Every value here is either inherited from the existing case-study environment
(`src/pages/surprise-rail/surprise-rail.css`) or an extension that was chosen not to fight it.
Inherited tokens are marked **[inherited]** and must not be changed here.

---

## 1. Colour

### 1.1 Ground

| Token | Hex | RGB | Role |
| --- | --- | --- | --- |
| `--sr-ink` **[inherited]** | `#08080a` | 8, 8, 10 | The ground. Every asset starts here. ~70% of surface. |
| `--sr-ink-2` **[inherited]** | `#0d0d10` | 13, 13, 16 | Raised ground. Plates, gate interiors in the occluded state, chart fields. |
| `--sr-ink-3` | `#131318` | 19, 19, 24 | Extension. The deepest visible step above ink-2 — used only where two dark planes must separate without a rule. |

Near-black, not black. `#08080a` carries a two-point blue lean so pearl reads warm against it,
which is what makes the spectral ramp legible at low saturation.

### 1.2 Frame

| Token | Hex | RGB | Role |
| --- | --- | --- | --- |
| `--sr-pearl` **[inherited]** | `#f2f0ec` | 242, 240, 236 | Perforations, frosted window fill, display type on ink. ~20% of surface. |
| `--sr-frost` | `#e9e6e1` | 233, 230, 225 | Extension. The frosted window when it must sit *behind* pearl elements. One step down from pearl, no transparency required. |
| `--sr-smoke` **[inherited]** | `#8c8c95` | 140, 140, 149 | Secondary metadata, mono annotation, inactive rail labels. |
| `--sr-graphite` **[inherited]** | `#5a5a63` | 90, 90, 99 | Tertiary. Construction lines, dimension marks, hairline rules on ink. |
| `--sr-hair` **[inherited]** | `rgb(242 240 236 / 0.12)` | — | The only rule weight on ink. 1px. |

**Clue text sits on frost, not on ink.** Clue type is `--sr-ink` on `--sr-pearl`. This inversion
is load-bearing: every other tile in a streaming rail is light type on dark art, so a dark-on-light
window is legible as *different* from three metres away on a television.

### 1.3 The gate light — spectral ramp

The one gradient in the system, and it is justified: it is a projector beam dispersed by a
frosted frame. It always has a source and a direction. It is never ambient, never radial-glow,
never applied to fill empty space.

| Token | Hex | RGB | Stop |
| --- | --- | --- | --- |
| `--sr-spectral-1` | `#e8dbe2` | 232, 219, 226 | 0% — warm pearl, faintly rose |
| `--sr-spectral-2` | `#cfc6dd` | 207, 198, 221 | 45% — lavender |
| `--sr-spectral-3` | `#b5bcd4` | 181, 188, 212 | 78% — cool blue-lilac |
| `--sr-spectral-4` | `#9aa6bd` | 154, 166, 189 | 100% — the beam falling off |

Sampled from Pranavi's own naming study (`name-options.png`), where "Blind Date with an Indie
Film" runs warm-rose through lavender into cool grey-blue on near-black. That study is the only
pre-existing brand equity in the project and this ramp carries it forward.

```
linear-gradient(104deg, #e8dbe2 0%, #cfc6dd 45%, #b5bcd4 78%, #9aa6bd 100%)
```

**Rules.** Fixed 104° angle system-wide, so the light always falls the same way. Maximum two
spectral elements per composition. Never on body copy. Never on mono. Display type only, at
64px and above, where the ramp has room to actually traverse the letterforms.

### 1.4 Accent

| Token | Hex | RGB | Role |
| --- | --- | --- | --- |
| `--sr-brass` **[inherited]** | `#9a7b45` | 154, 123, 69 | **The register mark, and nothing else.** |

Brass means one thing in this system: *this frame is in register.* It appears as a short 2px rule,
a 6px square, or a single mono character. Never as a fill, never as type colour above 12px, never
decoratively. Budget: **under 2% of any surface**, typically one or two marks per asset. This is
the single warm note carried from the rest of the portfolio and it is the connective tissue back
to it — spending it on decoration spends the connection.

### 1.5 Contrast

| Pair | Ratio | Verdict |
| --- | --- | --- |
| pearl `#f2f0ec` on ink `#08080a` | 17.6:1 | AAA, all sizes |
| smoke `#8c8c95` on ink `#08080a` | 6.6:1 | AA all sizes, AAA at 18px+ |
| graphite `#5a5a63` on ink `#08080a` | 3.1:1 | **Non-text only.** Construction lines, hairlines. |
| ink `#08080a` on pearl `#f2f0ec` | 17.6:1 | AAA — the clue-in-window pairing |
| ink `#08080a` on frost `#e9e6e1` | 16.4:1 | AAA |
| brass `#9a7b45` on ink `#08080a` | 5.4:1 | AA. Fine for 11–12px mono marks. |
| spectral-4 `#9aa6bd` on ink `#08080a` | 8.1:1 | AA all sizes — the ramp's weakest stop still clears |

The spectral ramp's darkest stop was chosen so that even the tail of a gradient headline stays
above 7:1. Nothing in the ramp needs a contrast exception.

**Colour is never the only signal.** Register is marked by brass *and* by position (the frame
sits inside the gate boundary). The focus ladder is marked by spectral value *and* by how much
of the frame is occluded.

---

## 2. Geometry — the sprocket system

This is the part that makes the system look machined rather than styled. All spacing derives
from it.

| Token | Value | Note |
| --- | --- | --- |
| `--perf-w` | `16` | Perforation width, base unit |
| `--perf-h` | `11` | Perforation height. Ratio 1.45:1, from 35mm stock |
| `--perf-r` | `2.5` | Corner radius, 22% of height |
| `--pitch` | `32` | Centre-to-centre. Exactly `2 × --perf-w` |
| `--band` | `26` | Perforation band height — the strip above and below the gate |
| `--gate-inset` | `8` | Gap between band and gate window |

**Spacing scale** `4 · 8 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 192 · 256`
Powers of the pitch. 32 is the major rhythm; anything not on this scale is a mistake unless it is
an optical correction, and optical corrections must be noted in the file.

**Scaling.** The whole system scales by a single factor `k`. Poster assets use `k = 3`
(perf 48 × 33, pitch 96). Card and storyboard assets use `k = 1`. Never scale perforations
independently of pitch — uneven perforation rhythm is the fastest way to make this look like
decoration instead of mechanism.

**Frame ratios**
- Landscape gate `16:9` — matches the CTV rail tile. The default.
- Portrait gate `2:3` — matches the mobile poster tile.
- Poster gate `1:1.5` at `1080 × 1620`.

---

## 3. Typography

Two families. No third family is introduced — the geometric face in the naming study was an
exploration, and its equity is carried forward as *colour*, not as a typeface.

| Role | Family | Stack |
| --- | --- | --- |
| Display | Forma DJR Display **[inherited]** | `forma-djr-display, "Forma DJR Display", "Helvetica Neue", Arial, sans-serif` |
| Metadata, all of it | Berkeley Mono **[inherited]** | `"Berkeley Mono", "Berkeley Mono Trial", ui-monospace, "SF Mono", Menlo, monospace` |

### 3.1 Scale

| Step | Size | Line | Tracking | Case | Use |
| --- | --- | --- | --- | --- | --- |
| `d-hero` | 180–320px fluid | 0.86 | −0.035em | Sentence | Poster headline, one line, sometimes cropped |
| `d-1` | 96–140px | 0.90 | −0.03em | Sentence | Clue set as hero, chapter thesis |
| `d-2` | 56–72px | 0.96 | −0.025em | Sentence | Section head |
| `d-3` | 32–40px | 1.06 | −0.015em | Sentence | Standfirst |
| `clue` | 28–44px | 1.0 | **+0.01em** | **UPPERCASE** | Clue inside a gate window. Only uppercase in the system. |
| `body` | 17–19px | 1.55 | 0 | Sentence | Reading copy |
| `m-1` | 12px | 1.3 | +0.14em | UPPERCASE | Mono labels, chapter marks, rail chrome |
| `m-2` | 11px | 1.4 | +0.12em | UPPERCASE | Annotation, dimensions, timing |
| `m-3` | 10px | 1.4 | +0.10em | UPPERCASE | Legal, credit, status line |

### 3.2 Rules

- **Display type is sentence case.** Uppercase display is generic tech-poster grammar and it is
  not used here. The single exception is the clue inside a gate window, which is uppercase and
  positively tracked because it is functioning as a label on an object, not as a headline.
- **Every clue is uppercase, ink-on-pearl, centred in its window.** This is the one centred
  element in the system, and it is centred because the physical frame is symmetrical. Everything
  around it is not.
- **All metadata is mono.** Project number, year, dimensions, timing, chapter labels, asset
  names, status lines, credits.
- **Mono is ASCII-only in this build.** Berkeley Mono Trial has no extended glyph set and its
  `/` is drawn as a backslash. **Never use `/` in mono.** Use `·` as the separator. No em-dashes,
  no en-dashes, no arrows, no quotes beyond `"` and `'` in mono strings.
- **No widows in display type.** Break lines manually. Every poster line break in this system is
  authored, not reflowed.
- Optical margin alignment on display type set flush left. Hang the punctuation.
- Display tracking tightens as size increases. Never track display type positively.

---

## 4. Layout

**Grid** 12 columns, gutter 24, page margin 96 at `k = 1` and 128–192 at poster scale.
**Max reading measure** 62 characters.

**Composition rules**

1. **Frames run off the edge.** At least one gate in any multi-gate composition is cropped by
   the canvas edge. Film is continuous; a fully contained strip reads as a diagram, not a system.
2. **The dominant gate sits off-axis** — typically 8–14% right or left of centre, never centred
   unless the asset is explicitly a construction sheet.
3. **Perforation bands always bleed** when they run parallel to an edge. A perforation strip that
   stops short and floats is the single most damaging error available in this system.
4. **One dominant element per asset.** Scale relationship between the dominant and the next
   element is at least 3:1.
5. **Type never overlaps a clue window.** It may overlap perforations, ground, and spectral
   light. The clue is the message; nothing crosses it.
6. Metadata blocks anchor to the corners, mono, 12px, tracked, one block per corner maximum.

---

## 5. Motion

**Principle — film advances, it does not ease.** Motion in this system reproduces the physical
behaviour of a frame being pulled into a gate: a stepped advance, then a settle. Nothing floats,
nothing fades in place, nothing scales for emphasis.

| Token | Value |
| --- | --- |
| `--ease` **[inherited]** | `cubic-bezier(0.22, 0.61, 0.36, 1)` |
| `--ease-advance` | `steps(2, end)` — the perforation stutter only |
| `--dur-strike` | `90ms` — brass register mark |
| `--dur-advance` | `140ms` — the stepped pull |
| `--dur-resolve` | `320ms` — frost lifting, art resolving |
| `--dur-settle` | `240ms` — metadata arriving |
| `--dur-total` | `900ms` — hidden to fully settled |
| `--stagger` | `40ms` — between adjacent frames in a strip |

**Sequence, always in this order**

1. **Advance** `140ms` `steps(2, end)` — perforations step by exactly one pitch. Two discrete
   frames, no interpolation. This is the only mechanical-feeling moment and the system depends
   on it.
2. **Strike** `90ms` `--ease` — brass register mark appears. Marks the lock.
3. **Resolve** `320ms` `--ease` — the frosted window lifts from the centre outward as a
   wipe, not a blur-out. Clue type translates up 12px and drops to 0 opacity over the first
   140ms so it clears before the art arrives.
4. **Settle** `240ms` `--ease` — title and metadata arrive from 12px below. Perforations recede
   from pearl to `--sr-hair`.

**Reveal is a wipe, never a blur transition.** Blur was rejected in product testing; reproducing
it in motion reintroduces the failure the design solved.

**Loop behaviour.** The signature loop is a strip advancing horizontally past a fixed gate, one
frame per 900ms, resolving on register. The loop has no beginning and no visible join — film has
already been running when you arrive.

**Reduced motion.** `prefers-reduced-motion: reduce` removes the advance and the wipe entirely.
Hidden and revealed states cross-dissolve over 160ms. The brass mark still appears, because it
carries meaning. No parallax, no autoplay loop — the loop becomes a static frame in register.

---

## 6. Imagery

- **Screenshots are placed inside gates, never in device mockups floating in gradient space.**
- **No invented cover art, ever.** Revealed states in campaign and storyboard assets use a
  neutral placeholder plate, visibly labelled in mono. Fabricating a movie poster for a
  speculative streaming feature is the fastest way to make a case study look dishonest.
- No photography in the system as specified. If photography is added later: single hard source,
  high contrast, no coloured gels, subject partially out of frame.
- No grain, no scanlines, no dust, no light leaks, no lens flare. The reference is a digital
  frame in register, not a projected 16mm print.

---

## 7. Accessibility

- Minimum type size 10px, mono only, and only for non-essential credit lines.
- Clue text renders at a minimum of 28px so it clears the CTV ten-foot legibility floor.
- Perforations are decorative and carry `aria-hidden`. They must never be the only indication of
  a state change.
- The revealed state is announced in text, not implied by animation alone.
- Every asset must survive being viewed at 12% scale in greyscale — hierarchy comes from scale
  and value, not from the spectral ramp.
