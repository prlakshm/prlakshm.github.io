# Reasons to Watch — Case Study Plan

## Deliverable

- Public route: `/hbo-max-rtw`
- Homepage entry: the red `Reasons to Watch` notebook
- Page implementation: `src/pages/case-study-hbo-max2/CaseStudyHBOMax2.tsx`
- Page styling: `src/pages/case-study-hbo-max2/case-study-hbo-max2.css`
- Status language: `Internal POC · Not shipped`
- Narrative model: six numbered chapters in parallel with `cs-final`

## Story thesis

> One prompt could write a blurb. It couldn’t earn trust.

The case study is not framed as a prompt-engineering exercise. It is a product-design story about turning a vague goal—“make Reasons to Watch more personal”—into a system with explicit inputs, responsibilities, constraints, and evaluation criteria.

The core argument is:

> A personalized recommendation becomes useful when it explains a credible connection, not when it merely mentions the viewer.

The page proves that argument through three design decisions, a runnable multi-agent prototype, and a blind evaluation flow.

## Final narrative architecture

The architecture mirrors `cs-final`:

1. Problem
2. Insight
3. Decisions
4. Behavior
5. Evaluation
6. Results

Every chapter uses the same storytelling unit:

`Claim → concise context → product evidence → conclusion`

The page avoids a chronological process archive. Technical tuning appears only when it explains a product decision.

## Final copy

### Overview

**Eyebrow**

HBO MAX · AI PRODUCT DESIGN

**Title**

Designing personalized Reasons to Watch for HBO Max

**Deck**

One prompt could write a blurb. It couldn’t earn trust. I built a multi-agent system that turned watch behavior into a 135-character reason to press play—and a blind evaluation tool to test whether the copy was actually more useful than the default.

**Metadata**

- Role: Product designer
- Timeline: June–August 2025
- Scope: System design, prompting, prototype, evaluation
- Status: Internal POC · Not shipped
- How I worked: Model the system → prototype real outputs → evaluate blind

**Hero proof**

The existing Reasons to Watch video plays inside one contained HBO Max frame. Its caption explains where the component appears: “Reasons to Watch appears in the expanded title preview after focus.”

### 01 · Problem

**Heading**

A segment could describe a cohort. It couldn't explain you.

**Copy**

Reasons to Watch appears when a viewer focuses on a title. Instead of repeating a synopsis, it explains why that title may be worth their time. Internal research found that Reasons to Watch increased clarity around the recommendation rationale by 4%.

The first scalable direction assigned viewers to affinity groups and wrote one version of copy for each group. It was a practical start, but it flattened taste. The same person could want prestige drama, competitive cooking, and a comfort comedy for completely different reasons.

**Question**

How might HBO Max turn one viewer’s behavior into a reason that feels specific—without losing the discipline of product copy?

**Evidence**

Use the exact segmented Reasons to Watch artifact for *The Gilded Age*. The caption makes the limitation explicit: segment-level copy changed the emphasis, but every person in a segment still received the same reason.

### 02 · Insight

**Heading**

The best recommendation explains the connection.

**Copy**

Watch history could reveal patterns. Explicit likes showed which connections a viewer had actually endorsed. I needed both: broad behavior to understand taste, and a smaller permissioned list to decide when another title was worth mentioning.

A useful reason had to capture a preferred mood or tone, create one meaningful bridge to something familiar, and still make the new title clear. Personalization was not a name-drop. It was an explanation of fit.

**Interactive proof**

One black HBO Max-style stage lets the reader switch among three real outputs:

- *Succession* from *The Righteous Gemstones*: “Love the chaos of The Righteous Gemstones? Its corporate cousin is a vicious fight for Daddy’s love where the jokes cut like glass.”
- *Beat Bobby Flay* from *Friends*: “As if Monica Geller from Friends got her own cooking show. All her sassy, competitive fire in a delicious 20-minute duel.”
- *House of the Dragon* from *Game of Thrones* and *Succession*: “The creators of Game of Thrones bring another epic series of power, politics, and family feuds. It’s Succession with dragons.”

The interaction demonstrates the output rather than asking the reader to study a table.

### 03 · Decisions

**Chapter heading**

Three decisions turned a prompt into a system.

#### Decision 1 — Write a pitch, not a summary

Early prompts produced accurate plot summaries. They described the title, but did not create a reason to choose it. I reframed the task first as a recommendation, then as a 135-character pitch. The shorter brief forced every sentence to earn its place.

Visual progression:

1. Summary — Accurate, but interchangeable.
2. Recommendation — More directional, still too broad.
3. 135-character pitch — Specific enough to intrigue. Short enough to scan.

#### Decision 2 — Use history to find patterns. Use likes to earn permission.

The first model kept name-dropping anything it found in watch history. That looked personalized, but the viewer may not have enjoyed the title. I added a Liked List and allowed one familiar title only when the connection score cleared 85.

System rule:

`Watch history / find patterns + liked titles / earn the reference → a reason, not a name-drop`

#### Decision 3 — One agent was doing four jobs

A single prompt had to research a title, infer taste, write the copy, enforce product rules, and judge its own work. The outputs stayed generic and missed basic specifications. I separated those responsibilities so each stage could have one definition of good.

Before-and-after proof:

- Before: one overloaded prompt; hard to diagnose and inconsistent by default.
- After: specialized agents with explicit handoffs; each failure had an owner and a place to fix it.

Secondary tuning evidence lives in a collapsed detail:

- Temperature 0.7 produced varied sentence structures without losing control.
- 135 characters remained scannable on the product surface.
- IMDb, OMDb, and Wikipedia supplied useful metadata without overloading the model.

### 04 · Behavior

**Heading**

Four agents. One reason to watch.

**Copy**

Each agent received only the inputs it needed and returned a structured handoff. That made the system easier to tune: weak connections belonged to analysis, flat language belonged to writing, and broken product rules belonged to editing.

**Design-engineering prototype**

The reader can press `Run the pipeline` to trace one real output:

1. Pattern Analyst finds “family power struggle” and “vicious comedy.”
2. Blurb Writer drafts three reasons from the strongest connection.
3. Editor checks 135 characters, tone, spoilers, and punctuation.
4. Critic selects the most creative and informative candidate.
5. The final *Succession* reason appears in the output surface.

The prototype is intentionally small and deterministic. It explains the system without pretending to call a live model in a public portfolio.

The original four-agent workflow artifact follows the prototype as source evidence.

Persistent writing constraints:

- 135 characters
- No spoilers
- No exclamation points
- One liked-title reference maximum

### 05 · Evaluation

**Heading**

Blind testing separated personalized from better.

**Copy**

“Personalized” was not the success criterion. I worked with design technologist Travis Swan to design an internal evaluation tool. Participants added watched and liked titles, then compared the default copy with generated copy without knowing which was which.

After each choice, the tool asked what made the copy useful: the balance of plot and theme, a familiar connection, attention, or a sense that the writer understood the content. While the tool was being built, I used an asynchronous spreadsheet to test the same questions sooner.

**Visual sequence**

1. Provide signals — participants begin with their own viewing context.
2. Compare blind — source labels stay hidden until after the choice.

The section links to the full Figma evaluation flow rather than embedding a large Figma canvas.

### 06 · Results

**Heading**

The POC proved a direction—not product impact.

**Copy**

Internal feedback consistently surfaced three qualities in the personalized copy: it captured a preferred mood, it was fun to read, and it built trust by making a credible connection to a past favorite. Those findings gave the team a clearer definition of useful personalization.

**Qualitative findings**

- Mood + tone: “Intriguing.” “Very me.”
- Engaging copy: “Hilarious, fun to read, and fairly accurate.”
- Trusted connection: “I like how it draws the connection.”

**Evidence boundary**

This internal POC evaluated comprehension and copy preference. It did not establish that personalized Reasons to Watch would increase playback, reduce time to selection, or improve retention.

**What I would test next**

1. Playback starts — Did the reason lead to a watch?
2. Time to selection — Did it help viewers decide faster?
3. Sessions without playback — Did fewer visits end in indecision?

**Reflection**

AI didn’t make the copy personal. The system did.

The strongest outputs came from treating personalization as information architecture: choose the right signals, separate the responsibilities, define the evidence, and judge the result without knowing where it came from. That was the difference between a blurb that mentioned the viewer and a reason that understood them.

## Layout and spacing specification

### Relationship to `cs-final`

- Retain a numbered six-chapter structure.
- Retain a compact desktop chapter rail outside the main reading column.
- Retain a strong overview before the first chapter.
- Use claim-first headings followed immediately by visual proof.
- Keep the existing portfolio navigation behavior. Do not create a second custom navbar.
- Keep the red notebook URL stable at `/hbo-max-rtw`.

### Widths

- Full page evidence: `1120px` maximum.
- Reading column: `720px` maximum.
- Wide supporting figure: `980px` maximum.
- Page gutters: `24px` desktop/tablet; `16px` mobile.
- Images never exceed roughly `70vh` unless the content requires vertical scrolling.

### Vertical spacing

- Hero top: `132px` desktop, `112px` tablet, `96px` mobile.
- Hero bottom: `72px` desktop, `48px` tablet/mobile.
- Chapter spacing: `112px` desktop, `80px` tablet, `72px` mobile.
- Heading group to first content: `40px`.
- Paragraph to paragraph: `18px`.
- Copy to evidence: `40px`.
- Detail relationship: `24px`.
- Decision to decision: `88px`.
- Reflection from previous content: `96px` desktop, `72px` mobile.

The rhythm is intentionally clustered: related text and proof stay close; chapters receive the larger pauses.

### Type system

Use two families only:

- Primary/body/UI: `forma-djr-text`
- Display headings: `adobe-text-pro`

Use four levels:

- Display: `clamp(3.25rem, 7vw, 5rem)`
- Chapter heading: `clamp(2.25rem, 5vw, 3.25rem)`
- Body: `clamp(1.0625rem, 1.5vw, 1.1875rem)`
- Label: `0.8125rem`

Decision headings use the body family at `1.5–1.9rem`; they do not introduce a fifth conceptual hierarchy.

### Color and material

- Preserve the portfolio background: `linear-gradient(to bottom right, #fff7ed, #ffe4e6, #fff7ed)` from the global shell.
- Keep the case-study container transparent.
- Use near-black `#0b0b10` for product/prototype stages.
- Use rose `#e11d48` for labels, links, progress, and active states.
- Use cream/off-white surfaces for supporting comparisons.
- Use one `8px` radius for major media and panels.
- Use shadows only on product frames and interactive prototypes.
- Avoid borders as general section separators. Thin rules are reserved for metadata and metric lists.

## Motion and interaction specification

### Scroll reveals

- Each chapter and major proof enters once through `IntersectionObserver`.
- Transition: `700ms` with a soft cubic Bézier.
- Distance: `24px` upward.
- Motion never loops.

### Personalized copy switcher

- Three title tabs use real generated outputs.
- The selected tab switches copy in an `aria-live` region.
- Active styling is high contrast and keyboard reachable.
- The interaction demonstrates variability without inventing data.

### Agent pipeline

- One button triggers four deterministic handoffs.
- Each handoff advances after `720ms`.
- Completed agents brighten and settle by `8px`.
- The final output changes from an instructional placeholder to a real generated Reason to Watch.
- Re-running clears pending timers and restarts from step zero.

### Reduced motion

- Scroll-reveal content is immediately visible.
- The hero video pauses.
- Animation and transition durations collapse to `0.01ms`.
- All information remains available without motion.

## Asset direction

Use exact product evidence already in the repository:

- Hero behavior: `/case-study-hbo-max2/rtw-overview2.mp4`
- Segment-level baseline: `/case-study-hbo-max2/segmentation-example.png`
- Agent system artifact: `/case-study-hbo-max2/agent-breakdown.png`
- Evaluation input: `/case-study-hbo-max2/eval-tool1.png`
- Blind comparison: `/case-study-hbo-max2/eval-tool2.png`

Build explanatory graphics in HTML/CSS so they are responsive, accessible, and stylistically consistent. Do not use generated imagery for product UI. Do not embed full Figma or FigJam canvases inside the narrative.

## Source links

- [Final presentation](https://docs.google.com/presentation/d/1re-kPSn8nNVJDsieV3Misp4Xcn-eBrfK/edit?usp=sharing&ouid=116774489859738726779&rtpof=true&sd=true)
- [Hyper-personalized RTW wireframes](https://www.figma.com/design/lAgF3l2u2gGhCYoctjLi4H/Hyper-personalized-RTW-Wireframes?node-id=3001-26320)
- [RTW POC iteration board](https://www.figma.com/board/nSerysJp3TjLb7C1wgABrw/RTW-POC-%E2%80%93-Hyper-Personalized?node-id=0-1)
- [Reasons LLM prompt guide](https://www.figma.com/design/KKvY674OEM61yypf7u31sW/Pranavi-s-Guide-to-the-Reasons-LLM?node-id=0-1)

## Evidence boundaries

- Label the 4% recommendation-rationale result as internal research.
- Do not publish participant counts until a verified sample size is available.
- Present participant language as qualitative feedback, not a measured impact result.
- Do not say the POC improved playback, time to selection, retention, or churn.
- Do not say the feature shipped.
- Treat the Critic as optional, matching the latest prompt guide.
- Treat temperature, source selection, and character length as tuning evidence—not the story’s central result.
- Keep AI subordinate to the product principle: the important design choices were signals, task decomposition, constraints, and evaluation.

## Acceptance criteria

- A first-time viewer can explain what Reasons to Watch is from the hero alone.
- The reader can identify the problem, insight, three decisions, system behavior, evaluation method, and limitation.
- The page matches the six-chapter parallel structure of `cs-final` without copying Surprise Rail content.
- The Red Notebook opens `/hbo-max-rtw`.
- The main narrative never exposes draft placeholders.
- Every image has meaningful alt text.
- Every external link opens safely.
- Interactive controls work with keyboard focus.
- Reduced-motion behavior preserves all content.
- Desktop, tablet, and mobile layouts keep one consistent reading column.
- Type uses no more than two font families and four conceptual levels.
- Production build and automated case-study tests pass.
