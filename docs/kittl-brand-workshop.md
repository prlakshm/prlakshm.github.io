# Kittl brand workshop: Surprise Rail + Mixr

Research and working direction, July 22, 2026.

## The positioning opportunity

These projects already support a stronger positioning than “product designer who can make polished screens.” The common thread is:

> I build expressive brand systems from product behavior.

Surprise Rail turns concealment, curiosity, focus, and reveal into a visual language. Mixr turns sound, glass, light, and hands-on experimentation into a visual language. That is a credible bridge from product design into brand design because the brand is not decoration added after the interface; it grows from how each product behaves.

Portfolio language to reuse:

- Brand designer with product instincts
- Identity systems built from interaction
- Turning product behavior into a recognizable visual world
- Strategy, identity, motion, and product expression

## What is already known

### Surprise Rail

- HBO Max concept for undecided viewers who keep browsing without choosing.
- Inspired by “blind date with a book”: hide the identity, offer a clue, then reveal.
- Dedicated rail, rather than mysterious cards scattered across ordinary rows.
- Two- or three-word contextual clues that change with the collection.
- Frosted glass makes the title feel concealed rather than missing.
- Familiar remote navigation remains intact; focus triggers the reveal.
- Designed for connected TV, with a mobile expression.
- Concept-tested, not shipped; there is no claim that it improved playback or retention.

### Mixr

- Beginner-friendly iOS DJ/remix app, designed directly in SwiftUI.
- Visual system includes song chips, waveforms, glass effect cards, and a remix timeline.
- Effects have distinct light identities: Auto/prismatic pearl, Reverb/cyan, Echo/violet, Bass Boost/yellow, Pitch Up/pink.
- Glass is intentionally imperfect: varying highlights, bubbles, and reflected neighboring glow.
- “Auto” uses iridescence because it combines multiple effects.
- The project documents design decisions through the “Designing by Building” series.

## Surprise Rail: proposed identity

This should be treated as a project identity inside the HBO Max world, not as a redesign of HBO Max itself.

### Brand idea

**The reveal is the reward.**

Alternative lines:

- Follow your curiosity.
- Less to see. More to discover.
- A reason to stop scrolling.
- Hidden in plain sight.
- Clue first. Title second.

### Personality

- Mysterious, not ominous
- Premium, not precious
- Playful, not childish
- Calm, not passive
- Intelligent, not technical

### Visual grammar

1. **Abundance** — repeated rails, poster fields, controlled visual noise.
2. **Veil** — blur, frost, translucent cover, partial color.
3. **Clue** — short language with a strong cadence.
4. **Focus** — one precise border, spotlight, or interruption.
5. **Reveal** — color and detail return in a controlled burst.

Every asset should use at least two of these five moves. Motion pieces should usually progress through all five.

### Color roles

- Ether Black — `#050407` — primary field
- Aubergine — `#190719` — atmospheric depth
- Veil Plum — `#3D183F` — secondary surface
- Frost Pearl — `#EEE8F2` — clues and focus
- Reveal Lavender — `#B8A0FF` — active state
- Signal Apricot — `#FFB48A` — rare reveal accent

Keep the first five restrained. Signal Apricot should appear only at moments of reveal, ideally under 5% of a composition.

### Type direction

- Headline: a broad, confident grotesk or neo-grotesk with soft geometry.
- Clues: bold, compact sans; two or three words; centered; generous leading.
- Supporting copy: neutral grotesk with excellent small-size clarity.
- Device UI should remain faithful to the product typography. Campaign typography can be more expressive, but should not imply an official HBO Max rebrand.

### Graphic devices

- The Veil: a frosted rectangle derived from the content tile ratio.
- The Focus Frame: a one-pixel pearl/lavender border with subtle bloom.
- Reveal Slice: a narrow opening exposing saturated art beneath frost.
- Rail Orbit: rows bent into gentle arcs to imply scale and browsing momentum.
- Clue Stack: short phrases arranged like editorial headlines.
- Vanishing Rail: repeated cards compressing toward a single point.

## Surprise Rail: 30-artboard Kittl plan

### Foundation

1. Strategy board: audience, problem, promise, personality.
2. Moodboard: blind-date books, frosted glass, cinematic title sequences, black-space installations.
3. Logo/wordmark study: typographic only; avoid inventing a competing HBO Max logo.
4. Lockups: Surprise Rail, Surprise Indie, Surprise Comedy, Surprise Drama.
5. Color system and accessibility checks.
6. Type hierarchy and clue-length rules.
7. Material study: clear → tinted → black → frosted → reveal.
8. Graphic-device sheet: veil, focus, slice, orbit, stack.
9. Clue-writing matrix across titles and collections.
10. Photography/key-art treatment rules.

### Campaign and editorial

11. 16:9 hero: ambient rail universe.
12. 9:16 hero crop for Reel cover.
13. 1:1 campaign tile.
14. “Clue first. Title second.” poster.
15. “A reason to stop scrolling.” poster.
16. Three-poster sequence: Hide / Hint / Reveal.
17. Out-of-home screen in a dark transit environment.
18. Theater-lobby digital signage.
19. Editorial spread explaining the interaction.
20. Case-study chapter divider using a vanishing rail.

### Product and proof

21. CTV default state.
22. CTV focus state.
23. CTV reveal state.
24. CTV preview state.
25. Mobile adaptation.
26. Same-title/different-collection clue system.
27. Readability comparison at phone and TV distances.
28. Layer breakdown of the frost material.
29. Before/after: scattered cards vs dedicated rail.
30. Motion storyboard and final-film poster frame.

## Motion film: “From endless choice to one invitation”

Target: 20–24 seconds, 16:9 master, with a 9:16 cutdown.

### Storyboard

| Time | Picture | Motion | Sound |
|---|---|---|---|
| 0:00–0:03 | Near-black frame; tiny rows emerge at great depth | Slow dolly into a field of rails | Low air tone, distant granular clicks |
| 0:03–0:07 | Rows sweep above, below, and around camera | Parallax at different speeds; restrained motion blur | Browsing ticks accumulate into rhythm |
| 0:07–0:10 | The field becomes crowded and slightly disorienting | Camera accelerates; rows cross the focal plane | Tension rises; soft sub pulse |
| 0:10–0:13 | One pearl line appears; the other rows rotate toward it | Rows synchronize and settle onto one horizon | Clicks snap into one beat |
| 0:13–0:16 | A single frosted rail becomes sharp | Camera eases to a stop; peripheral rails dim | Noise drops out; glass shimmer |
| 0:16–0:19 | One tile receives focus | Border blooms once; clue holds long enough to read | One tactile remote click |
| 0:19–0:22 | Frost clears and color appears beneath | Controlled wipe/defrost, not an explosion | Bright tonal resolve |
| 0:22–0:24 | End card | Minimal lockup and line: “The reveal is the reward.” | Short resolve, then air |

### Kittl production approach

Kittl Video currently generates clips from a required start frame and optional end frame, with model-dependent durations from 4 to 12 seconds. It does not offer timeline editing, trimming, or manual keyframes. Build this film as four controlled clips, then assemble outside Kittl:

1. **Emerge** — start: near-black; end: wide rail universe; 4 seconds.
2. **Drift** — start: rail universe; end: converging rows; 6 seconds.
3. **Settle** — start: converging rows; end: centered frosted rail; 6 seconds.
4. **Reveal** — start: focused frosted tile; end: clear colorful tile; 4 seconds.

Do not ask one generation to invent the whole film. One dominant motion per clip produces more predictable continuity and uses fewer failed generations.

### Copy/paste Kittl video prompts

#### Clip 1 — Emerge

```text
Video Direction: Horizontal bands of tiny streaming-content tiles slowly emerge from ambient black space.
Camera: Very slow dolly forward, wide cinematic lens, deep perspective.
Action: The distant rows drift gently at different depths; no row dominates yet.
Effects: Deep aubergine haze, restrained pearl highlights, soft volumetric bloom, premium minimal title-sequence mood.
Audio: Low airy room tone with sparse granular clicks.
```

#### Clip 2 — Drift

```text
Video Direction: The camera travels through multiple curved rows of content tiles floating in a vast black environment.
Camera: Smooth forward glide with controlled parallax; no rotation or handheld movement.
Action: Rows pass above and below the camera at different speeds; one distant central row stays on axis.
Effects: Tasteful directional blur at the edges, deep black and plum color grade, subtle particulate haze.
Audio: Browsing clicks gradually form a quiet rhythm.
```

#### Clip 3 — Settle

```text
Video Direction: Many drifting content rows resolve into one calm horizontal Surprise Rail.
Camera: Forward movement decelerates to a complete stop, centered and level.
Action: Peripheral rows rotate into alignment, dim, and recede while the central row becomes sharp and evenly spaced.
Effects: A thin pearl-lavender horizon light, frosted glass surfaces, controlled bloom, no explosive particles.
Audio: Layered clicks synchronize into one soft beat, then fall away.
```

#### Clip 4 — Reveal

```text
Video Direction: A selected frosted tile reveals the colorful artwork hidden underneath.
Camera: Locked-off close view, no camera movement.
Action: The focus border blooms once, holds, then the frost clears smoothly from center outward; all neighboring tiles remain unchanged.
Effects: Restrained warm reveal glow reflected onto adjacent glass, crisp edges, subtle material shimmer.
Audio: One tactile remote click followed by a short luminous tonal resolve.
```

## Kittl prompting system

Kittl's current image guidance can be condensed into three lines:

```text
Technical: [asset type, aspect ratio, framing, resolution intent]
Subject: [one concrete subject, action, setting, important materials]
Style: [visual language, lighting, palette, mood, exclusions]
```

For ordinary generation, use **Subject + Style + Details** and keep it short. If you apply a saved Image Style, simplify the prompt further and describe mainly the new subject; piling on new style adjectives can fight the reference.

For video, use director language:

```text
Video Direction: [one-sentence result]
Camera: [one movement and angle]
Action: [one dominant motion]
Effects: [light, atmosphere, grade]
Audio: [optional]
```

### Prompt discipline

- Generate a base frame before generating motion.
- Change one variable per iteration: camera, action, lighting, or material.
- Use references for consistency, not increasingly long adjectives.
- Put exact copy in quotes, but add final typography manually whenever possible.
- Use Ideogram for text-heavy compositions; use a style-forward model or reference workflow for atmosphere and brand-world images.
- Save successful artwork as a custom Image Style. Pro supports unlimited saved styles.
- Use the same start frame, end frame, aspect ratio, palette, and motion prompt when testing video models.
- Separate assets that need exact geometry from assets that can tolerate invention. Build logos, typography, grids, UI, and icons manually; generate atmosphere, materials, scenes, and motion transitions.

## Pro subscription: use it deliberately

Current Pro benefits most relevant to this portfolio work:

- 2,000 AI tokens each month.
- Unlimited projects and custom artboard sizes.
- PNG/JPG exports up to 10,800 px at 300 dpi.
- SVG and PDF vector export, transparent backgrounds, custom font uploads.
- Full premium template, mockup, font, graphic, and photo libraries.
- 10 GB upload storage and commercial use under Kittl's current license terms.

### Monthly token budget

Video is the expensive part. An 8-second Veo 3.1 clip with audio can cost up to about 640 tokens, so three such experiments could consume nearly the entire Pro allowance.

Suggested monthly split:

- 300 tokens — low-cost mood and composition exploration.
- 350 tokens — final image assets and remixes.
- 150 tokens — vectorization, reframing, cleanup, and chat.
- 1,000 tokens — four carefully prepared video shots.
- 200 tokens — contingency.

Always check the displayed token cost before generating. Subscription tokens do not roll over; purchased token packs do not expire.

### Highest-value workflow

1. Create two separate Brands: Surprise Rail and Mixr.
2. Upload the exact fonts, palettes, logos/lockups, icons, and approved graphics.
3. Build one “master world” artboard for each project.
4. Save the selected master visual as a custom Image Style.
5. Use Flows to branch composition, camera, lighting, and material studies.
6. Build exact typography and UI manually on top of generated imagery.
7. Attach several premium mockups to the same source artboard so they all refresh when the design changes.
8. Create motion only after start and end frames are approved.
9. Export image masters, vector assets, and MP4 clips; assemble the final narrative in a timeline-based editor.

## Mixr: next identity expansion

Mixr should feel different from Surprise Rail. Surprise Rail is cinematic restraint and controlled concealment; Mixr is luminous material, rhythm, and tactile play.

Proposed brand idea: **Make sound visible.**

Visual grammar:

- Beat grid
- Waveform ribbon
- Glass tile
- Spectral edge
- Reflected glow
- Imperfect internal bubble

Suggested Kittl artboards:

1. Identity board and “Make sound visible” statement.
2. Mixr wordmark explorations.
3. Effect-color and glass-material library.
4. Icon family for Auto, Reverb, Echo, Bass Boost, Pitch Up.
5. Waveform pattern set.
6. App Store hero and screenshots.
7. 9:16 “Designing by Building” Reel system.
8. Social decision cards: first pass vs tenth pass.
9. Editorial poster series for each effect.
10. Floating glass campaign image.
11. Motion loop: waveform enters glass and changes color.
12. Motion loop: five effect cards pass the beat between them.

## Research trail

Start with the current first-party material; Kittl has changed quickly, so older creator videos often show a different interface.

- [Kittl AI resources hub](https://kittl.notion.site/Kittl-AI-Resources-27d85ae43d47803982d7c72ed1cdc752)
- [Image and video prompting fundamentals](https://kittl.notion.site/Fundamentals-95885ae43d4782a2bc9c018d47eac0af?pvs=21)
- [Video prompt fundamentals](https://kittl.notion.site/Video-Prompt-Fundamentals-32585ae43d478287976a81027228b519?pvs=21)
- [Copy-ready prompt library](https://kittl.notion.site/Prompt-Library-45d85ae43d4782bc9a890124c52693a2?pvs=21)
- [Current AI image generator guide](https://www.kittl.com/blogs/?p=12956)
- [Kittl Video help](https://help.kittl.com/ai-tools/kittl-video/)
- [Image Style references](https://help.kittl.com/ai-tools/ai-image-style-reference/)
- [Mockup generator workflow](https://help.kittl.com/editing-and-design/mockup-generator/)
- [Current Pro plan](https://help.kittl.com/subscription-billing/about-pro-plan/)
- [Tokens and costs](https://help.kittl.com/ai-tools/tokens/)
- [Licensing](https://www.kittl.com/licensing)
- [Official Kittl YouTube channel](https://www.youtube.com/@Kittldesign)
- [Official Kittl Instagram](https://www.instagram.com/kittldesign/)
- [Art-directed brand mockup case study](https://www.kittl.com/blogs/case-study-michelle-deborah/)

Social posts and short-form videos are not a finite or fully indexable corpus. The useful recurring lessons across current first-party and community material are: begin with a strong reference, define mood before props, treat mockups as brand storytelling, generate a controlled base before motion, and reuse systems rather than starting each asset from scratch.

## Generated concept assets

- `public/case-study-hbo-max1/brand-concepts/surprise-rail-ambient-hero-v1.png`
- `public/case-study-hbo-max1/brand-concepts/surprise-rail-motion-storyboard-v1.png`
- `public/mixr/brand-concepts/mixr-brand-world-v1.png`

These are exploratory portfolio assets, not official HBO Max brand work. The image generation deliberately uses abstract, non-readable thumbnail art rather than copyrighted poster imagery.
