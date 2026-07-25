# Surprise Rail — REGISTER

The brand identity for Surprise Rail, a speculative streaming discovery concept by **Pranavi
Ram**, developed during a product design internship at HBO Max.

**Not shipped. Not an official HBO Max campaign. Not endorsed by or affiliated with HBO Max.**
Every asset in this folder carries that line in its own credit block. HBO Max is the context the
concept was designed inside; Pranavi is the author. The official HBO Max logo is never used,
altered, or locked up with anything here.

---

## The idea in one paragraph

The product hides cover art and gives you a two-word clue instead. Pranavi's testing found that
blurring the art reads as a broken image, so the hidden state became a **film-strip frame** —
sprocket perforations top and bottom, a frosted near-white window, the clue in dark type inside
it. The identity is named **REGISTER** after film registration, the mechanical process of
seating a frame precisely in the gate so the image resolves. **Hidden is a frame out of register.
Revealed is a frame in register.** Concealment becomes a mechanism rather than an effect, which
is the whole argument of the case study restated as a visual system.

Read `STRATEGY.md` for the three territories, the chosen direction, positioning, personality,
design and verbal principles, and the taglines. Read `tokens.md` for the colour, geometry,
typography, layout and motion values every asset here is built from.

**Primary tagline — Look before you know.**

---

## Files

| File | What it is |
| --- | --- |
| `STRATEGY.md` | Territories, chosen direction, positioning, promise, tension, personality, principles, taglines |
| `tokens.md` | Colour system with hex, sprocket geometry, type scale, layout rules, motion spec, accessibility |
| `wordmark.svg` | 1440 × 1360. The wordmark in both states, plus small-size, monochrome, clear space, construction, misuse |
| `poster-a.svg` | 1080 × 1620. Hero campaign — **The Gate** |
| `poster-b.svg` | 1080 × 1620. System campaign — **The Advance** |
| `poster-c.svg` | 1080 × 1620. Culture campaign — **The Clue Wall** |
| `clue-cards.svg` | 1620 × 1250. The teaser-clue card system, tile anatomy, portrait variant, clue-language rules |
| `storyboard.svg` | 1620 × 1260. Six-frame reveal storyboard with real timings and a reduced-motion spec |

All SVGs are hand-authored, self-contained, and contain no raster data and no external asset
references. Text is live `<text>`, so every word remains editable and selectable. Colours are the
palette defined in `tokens.md`. Fonts are referenced by stack — Forma DJR Display and Berkeley
Mono, matching `src/pages/surprise-rail/surprise-rail.css` — and fall back to Helvetica and SF
Mono where those faces are not loaded.

**Nothing outside this folder was modified.**

---

## Asset by asset

### `wordmark.svg`

**Communicates** that the identity's central idea is registration, not decoration.
**Where it goes** the Identity chapter (chapter 05) of the case study, and any brand-board or
process spread.

Seven blocks. The two that matter:

- **01 Primary, in register.** "Surprise" in heavy weight carrying the spectral ramp; "Rail" in
  light weight in pearl. The weight and colour contrast is inherited directly from Pranavi's own
  naming study (`../name-options.png`), where "Surprise **Indie**" ran bold pearl-lavender against
  a light second word. That study is the only pre-existing brand equity in the project and this
  is the decision that carries it forward. A brass registration pin sits at the left edge.
- **02 Hidden state, out of register.** The same wordmark, slipped in the gate. You read the
  bottom of one instance and the top of the next, split by the interframe bar. It is *almost*
  legible — which is the product mechanic performed by the logo itself. The pin is drawn in
  graphite, not brass: not seated.

Also documents the small-size "SR" mark, the monochrome cut-off (no spectral ramp below 64px),
clear space of one sprocket pitch, the construction grid with dimensions, and seven misuse rules
including the prohibition on touching the HBO Max logo.

### `poster-a.svg` — The Gate

**Communicates** the emotional proposition in one image: something is being withheld from you,
and it was done on purpose.
**Where it goes** the case-study hero, and the OOH / key-art slot in a campaign spread.
**Hierarchy** headline → clue window → cropped next frame → metadata.

One enormous gate bleeding off both side edges, so the frame is bigger than the page. The frosted
window holds a single real clue, "SUBURBAN SECRETS", set at 86px in ink on pearl — the inversion
that makes a hidden tile legible from three metres away on a television. A single perforation in
the bottom band is filled brass: the registration pin, seated. Below, the next frame is cropped
by the canvas edge with only the tops of "NYC PUNK DREAM" showing — it has not advanced yet.

The window is deliberately more than half empty. The withholding is the product.

### `poster-b.svg` — The Advance

**Communicates** how the mechanic actually works, in five states.
**Where it goes** the Hidden State and The Reveal chapters, and the "system" spread of a
portfolio case study. This is the asset that proves there is a system and not just a hero image.
**Hierarchy** headline → strip → state labels → closing line.

A horizontal rail — matching the real product surface — bleeding off both edges, carrying the
focus ladder: **01 Occluded, 02 Clue, 03 Advance, 04 Gate Light, 05 In Register.** The third
frame is genuinely drawn out of register, split by the interframe bar. The fourth shows the pane
parting full width with spectral light at the opening edges. The fifth carries the brass pin and
a labelled placeholder plate. Each state is labelled beneath its own frame on a hairline rule.

### `poster-c.svg` — The Clue Wall

**Communicates** the verbal identity, and that the clue is the product.
**Where it goes** social, editorial, the Identity chapter, and any place the case study needs a
type-only beat between image-heavy sections.
**Hierarchy** clue stack → tagline → looping ghost line → metadata.

No gate. Two perforation bands cropped at the top and bottom edges are the only film cue. Five
real clues set at 92px, ranged left, descending through the spectral ramp from pearl into cool
blue — partial information, made literal in value. The sixth line repeats the first at 30%
opacity: the reel has looped and you still do not know what it is. One brass mark, beside
"Suburban Secrets", indicating the only frame currently in register.

Note that clues are set **sentence case** here and **uppercase** inside a gate window. Inside a
gate the clue is a label on an object; outside one it is being spoken. That distinction is a
rule in `tokens.md`, not an inconsistency.

### `clue-cards.svg`

**Communicates** that the clue language is a designed, tested system with rules — Pranavi's most
under-sold contribution.
**Where it goes** the Identity chapter and the research section.

Five tiles carrying the five real clues at CTV rail proportion, each annotated with word count
and descriptor category. Then a large annotated anatomy tile naming every part: perforation band,
gate inset, frosted window, clue treatment, and the brass perforation marking the seated pin. A
portrait variant for the mobile rail. Six clue-writing rules. And the four descriptor categories
from Pranavi's research — Atmospheric, Thematic, Tactical, Behavioural — listed as the research
vocabulary the clue set draws on.

### `storyboard.svg`

**Communicates** the reveal, which is the payoff and therefore the whole product.
**Where it goes** the Reveal chapter, and as the specification handed to whoever builds the
motion.

Six frames against a real timeline: **at rest (0ms) → advance (140ms) → strike (230ms) → resolve
(550ms) → settle (790ms) → settled (900ms).** Frame one shows the hidden tile inline with
ordinary cover art in a rail, which is the whole point — it has to sit inline without pretending
to be cover art. Frames two through six follow one tile through the sequence.

Two motion decisions are load-bearing and are stated on the sheet:

- **The advance is `steps(2, end)`.** Two discrete frames, no interpolation. It is the only
  mechanical moment in the system and everything else depends on it landing.
- **The reveal is a wipe, never a blur transition.** Blur was rejected in product testing;
  reproducing it in motion would reintroduce the failure the design solved.

A reduced-motion specification sits at the foot of the sheet.

---

## Product-accurate vs. speculative

Being precise about this matters, because a portfolio case study loses credibility faster from
one overstated claim than from a missing asset.

**Product-accurate — verified against Pranavi's own artefacts**

- The film-strip hidden state: perforations top and bottom, frosted window, clue in dark type.
- The five teaser clues. These are the real ones she wrote and tested.
- The tile sitting inline with ordinary cover art in a CTV rail.
- The four descriptor categories from her research.
- The pearl-to-lavender spectral ramp, sampled from her naming study.
- The rejection of blur as a hidden-state treatment, and the reason for it.
- The case-study environment palette, typefaces and easing, inherited from
  `src/pages/surprise-rail/surprise-rail.css`.

**Speculative — authored here as brand extension, and should be presented that way**

- The name **REGISTER** for the identity system, and the registration metaphor.
- The wordmark, in both states, and the "SR" small-size mark.
- The sprocket geometry as a spacing system (perf 16 × 11, pitch 32, band 26, inset 8).
- Brass as the register mark. The pin device.
- All three posters. These are campaign concepts, not product surfaces.
- The tagline **Look before you know.** and all alternates.
- The five named states of the focus ladder.
- The specific motion timings. They are a proposal, not measured from a build.

**Deliberately not produced, and why**

- **No cover art, real or invented.** Every revealed state uses a plate labelled
  `COVER ART · PLACEHOLDER`. Fabricating a movie poster for a speculative streaming feature is
  the fastest way to make a case study look dishonest, and it would also misrepresent HBO Max
  content.
- **No metrics, adoption figures, or outcome claims.** The concept did not ship; there is
  nothing to measure.
- **No HBO Max logo, wordmark, or brand colour**, in any lockup, anywhere.
- **No redraw of the product screenshots.** The film-strip tile in `../film-reel-tiles.png` is
  the product and it is already correct. This system extends its geometry outward to poster and
  motion scale and stops at the edge of the interface.

---

## Regenerating

The SVGs were authored programmatically so the sprocket grid stays exact across six assets and
four scale factors — perforations that drift off pitch are the single fastest way to make this
system look like decoration instead of mechanism. To change a value, change it in `tokens.md`
first, then in the generator, then re-render and look at the result at full size before
accepting it. Two critique passes were run on every asset here; the collisions they caught were
all in annotation layers, which is where they always are.

## Known limitations

- Type is set in live `<text>` with a font stack, so the posters depend on Forma DJR Display
  being loaded to look correct. In a fallback face they read as Helvetica and lose some of the
  display face's character. If these are ever printed or handed off, outline the type first.
- The wordmark is set in the display face rather than drawn as custom letterforms. Custom
  lettering for "Surprise Rail" is the obvious next investment and would make the mark
  genuinely proprietary rather than well-specified.
- The spectral ramp was sampled by eye from `name-options.png` rather than pulled from a source
  file. If the original gradient values exist somewhere, use those instead.
- No motion has been built. `storyboard.svg` is a specification with timings and easings; it is
  not a prototype, and should not be presented as one.
