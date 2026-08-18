# Case-Study Movie Posters — Design Specification

**Date:** 2026-08-18  
**Status:** Approved  
**Posters:** Surprise Rail, Mixr, Pinnables

## Objective

Create a movie-poster image for each portfolio case-study card. The posters should feel like three different film genres united by one tactile, hand-drawn editorial system. The visual reference is a simple Japanese newspaper advertisement: broad areas of flat color, one cinematic landscape, one central hero object, imperfect print texture, and confident typography.

Mixr and Pinnables remain illustration-only assets with titles and metadata in live HTML. The revised Surprise Rail poster is the approved exception: its three cinematic display lines are embedded in the raster artwork, while the card's functional metadata remains live HTML.

## Shared Visual System

- Portrait poster composition at a 2:3 ratio.
- The illustration fills the canvas, but the essential scene remains in the upper 75%. The bottom 25% may be covered by an opaque live-type footer.
- One broad landscape, one directional road or line, and one unmistakable hero object per poster.
- Deliberately simple geometry and generous negative space; no collage of secondary props.
- Hand-drawn gouache and colored-pencil character translated through vintage screenprint or risograph texture.
- Flat, slightly uneven ink coverage, subtle newsprint grain, simplified perspective, and minor registration imperfections.
- Cinematic and authored, not photorealistic, glossy, 3D-rendered, anime, vector-clean, or generically retro.
- No generated words, letters, numbers, logos, captions, credits, watermarks, borders, QR codes, or fake interface text, except for the approved embedded poster typography documented for Surprise Rail below.
- Each poster uses only its project-specific palette. Notebook leather, tan paper, sepia, brown, and brass are excluded.

## Live Typography

Use the approved editorial title band as a separate HTML layer occupying the bottom 25% of the finished card.

- Display family: Forma DJR Display, bold.
- Supporting family: Berkeley Mono.
- Alignment: left.
- Hierarchy: large title, small project number and category, then one authentic project line.
- The footer background uses a light color from the corresponding project palette and carries high-contrast dark type.
- The illustration remains uninterrupted by generated typography.

### Footer Copy

| Poster | Title | Metadata | Project line |
| --- | --- | --- | --- |
| Surprise Rail | `SURPRISE RAIL` | `01 · CTV DISCOVERY CONCEPT` | `LOOK BEFORE YOU KNOW. ↗` |
| Mixr | `MIXR` | `02 · NATIVE iOS DJ APP` | `DJING SHOULDN’T REQUIRE YOU BEING A DJ. ↗` |
| Pinnables | `PINNABLES` | `03 · DEVTOOL · AI CODING AGENTS` | `THE AGENT GETS A PLAN, NOT A LIST. ↗` |

## Poster 01 — Surprise Rail

### Genre and Narrative

Mystery road movie. The viewer feels curiosity before learning what is being withheld.

### Composition

- A near-black road begins wide at the bottom and converges toward the center.
- A single oversized pearl-and-black film-strip gateway stands at the vanishing point. Its frosted center reads as concealed key art, while sparse sprocket perforations make the Surprise Rail mechanic recognizable without becoming a literal interface.
- A sparse spectral mountain range crosses the middle distance.
- Two or three tiny concealed-tile silhouettes form a restrained horizon rail; they remain clearly subordinate to the gateway and contain no legible words.
- One narrow slit of iridescent reveal light escapes from the gateway and travels down the road.
- Preserve the original poster's simplicity: one road, one gateway, one minimal horizon rail. No people, vehicles, loose film reels, popcorn, literal streaming UI, readable clue labels, recognizable actors, or extra props.

### Palette

- Ground: `#08080A`
- Raised black: `#0D0D10`
- Pearl: `#F2F0EC`
- Graphite: `#5A5A63`
- Spectral gradient at 104°:
  - `#E8DBE2` at 0%
  - `#CFC6DD` at 45%
  - `#B5BCD4` at 78%
  - `#9AA6BD` at 100%

Black should occupy about 70% of the illustration. The spectral gradient has one visible source and direction; it is not an ambient rainbow wash.

### Embedded Poster Typography

The revised Surprise Rail artwork includes three exact lines of cinematic poster copy as part of the raster image:

- Small, widely tracked top kicker: `A CASE STUDY IN AI-ENHANCED DISCOVERY`
- Oversized condensed title beneath the kicker: `SURPRISE RAIL`
- Widely tracked closing line near the bottom: `FOLLOW THE UNEXPECTED.`

Set all three lines in uppercase pearl type with subtle tactile print wear. The title carries the primary typographic weight; the kicker and closing line remain quiet. Do not add fake credits, studio names, dates, ratings, logos, or any other copy. Preserve the illustration's gateway, road, horizon rail, palette, texture, and central perspective. The closing line must remain above the opaque live-typography footer's coverage area.

## Poster 02 — Mixr

### Genre and Narrative

Coming-of-age music film. An intimidating professional interface becomes an inviting first road into making a mix.

### Composition

- A black landscape with one violet mountain silhouette.
- A single horizontal multicolor audio timeline crosses the scene and bends toward the foreground like a road.
- One small, approachable mixing deck sits at the destination in the lower center.
- The deck is symbolic and simplified, not a legible screenshot or technical control panel.
- No DJ performer, nightclub crowd, disco ball, headphones, turntables, equalizer wall, or floating app-icon collage.

### Palette

Use only black plus the approved Mixr design-system colors:

- Black: `#000000`
- Logo violet: `#7231DD`
- Track 1 pink: `#FF5FA2`
- Track 2 lavender: `#9873EB`
- Track 3 red: `#EF4444`
- Track 4 yellow: `#EAB308`
- Track 5 cyan: `#0EA5E9`
- SFX lavender: `#C9B9F4`

No navy, grey, tan, brown, brass, or additional colors.

## Poster 03 — Pinnables

### Genre and Narrative

Analog-tech detective story. A visual clue becomes structured context that an AI coding agent can act on.

### Composition

- A sparse sky and pale geometric landscape.
- One oversized red pushpin anchors the lower center.
- Two thin annotation lines lead from the pin toward one simplified browser-window billboard at the vanishing point.
- The browser object contains only abstract horizontal marks, never readable UI or text.
- No robot, magnifying glass, detective character, corkboard collage, sticky-note swarm, code rain, or floating product logos.

### Palette

- Paper white: `#FFFFFF`
- Soft paper: `#F6F5F3`
- Charcoal: `#292C33`
- Muted grey: `#6B6F78`
- Sky: `#9BD3F9`
- Cobalt: `#1E3FD8`
- Red pen: `#ED1C24`

## Prompt Construction Rules

Each final prompt must be self-contained and specify:

1. The poster’s genre and emotional premise.
2. Exact portrait ratio and footer-safe composition.
3. The one landscape, directional line, and hero object.
4. The exact palette and relative color dominance.
5. The hand-drawn gouache, colored-pencil, newsprint, and screenprint material qualities.
6. The simplicity constraint and explicit exclusions.
7. The typography rule: illustration only for Mixr and Pinnables; the three exact approved embedded lines for Surprise Rail.

The prompts may reference the supplied newspaper-poster image for composition, restraint, paper grain, and print character. They must not reproduce its vehicle, Toyota branding, Japanese copy, exact landscape, or layout details.

## Acceptance Criteria

- The three images immediately read as one collection without sharing the same genre or palette.
- Each poster remains recognizable at case-study-card size.
- Each image has one focal object and no competing cluster of symbols.
- Surprise Rail reads as concealment and curiosity.
- Surprise Rail is identifiable through its frosted film-strip gateway, concealed horizon tiles, and directional reveal light without resembling an interface screenshot.
- Mixr reads as a beginner’s path into remixing and uses the exact approved eight-color set.
- Pinnables reads as a pin-to-browser-to-agent handoff rather than a generic annotation tool.
- No notebook-derived colors appear.
- No generated text appears anywhere in Mixr or Pinnables. Surprise Rail contains only its three approved embedded poster lines, spelled exactly as documented.
- The live footer remains legible against all three poster images.
