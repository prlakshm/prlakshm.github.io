# Reasons to Watch — Case Study Plan

## Deliverables

- React route: `/hbo-max-rtw`
- Browser URL: `/#/hbo-max-rtw`
- Homepage entry: the red **Reasons to Watch** notebook
- Webpage: `src/pages/case-study-hbo-max2/CaseStudyHBOMax2.tsx`
- Styles: `src/pages/case-study-hbo-max2/case-study-hbo-max2.css`
- Status language: **Internal POC · Not shipped**
- Narrative model: six numbered chapters in parallel with the finished Surprise Rail case study

The footer returns to the landing page with **Back to the red notebook**. The homepage notebook uses the explicit hash URL `#/hbo-max-rtw`, which is required by the portfolio’s `HashRouter`.

## Relationship to the finished Surprise Rail case study

The two case studies share one portfolio grammar:

- A numbered chapter rail on desktop.
- A narrow, claim-first reading column.
- One complete overview before the first chapter.
- Six chapters: Problem, Insight, Decisions, Behavior, What changed, Results.
- Short paragraphs followed immediately by product evidence.
- Exact project artifacts inside consistent media frames.
- A subtle 32px background grid.
- Reading progress and an active chapter state.
- One-sided chapter spacing, so gaps never double between sections.
- A four-level type scale and restrained use of color.

They remain intentionally different where the work is different:

- Surprise Rail focuses on interaction and visual material craft.
- Reasons to Watch focuses on system design, copy constraints, evaluation, and design engineering.
- Surprise Rail uses its warm paper palette; Reasons to Watch preserves the portfolio’s pink gradient and uses dark HBO Max stages for product behavior.
- The RTW case study includes two inspectable prototypes: a deterministic agent trace and a blind-comparison recreation.

The target is not to copy the Surprise Rail art direction. It is to make both pages feel authored by the same designer using the same editorial logic.

## Story thesis

> One prompt could write a blurb. It couldn’t explain why this title fit this viewer.

The story is about turning a broad personalization request into a product system with defensible inputs, separate failure modes, explicit copy rules, and an evaluation that controlled for provenance bias.

The core argument is:

> A name-drop looked personal. A credible connection felt useful.

AI is the mechanism, not the headline. The senior product-design work is visible in five judgments:

1. Segment-level copy was scalable, but individual personalization needed to justify its added complexity.
2. Watch history was useful for patterns but too ambiguous for direct references.
3. Explicit likes provided stronger evidence that a familiar-title comparison was welcome.
4. Specialized stages made failures traceable and independently tunable.
5. Blind comparison made personalized copy compete with the default instead of rewarding it merely for sounding personal.

## Final narrative architecture

1. Problem
2. Insight
3. Decisions
4. Behavior
5. What changed
6. Results

Every chapter follows the same unit:

`Claim → concise context → exact evidence or interaction → conclusion`

The page is not a chronological process archive. Technical detail appears only when it explains a product decision.

## Final copy

### Overview

**Eyebrow**

HBO MAX · PRODUCT DESIGN + PROTOTYPING

**Title**

Designing personalized Reasons to Watch for HBO Max

**Deck**

> One prompt could write a blurb. It couldn’t explain why this title fit this viewer. Reasons to Watch is the short pitch that appears when someone focuses on a title. I built a multi-agent POC that used watch history and explicit likes to personalize that pitch, then designed a blind evaluation to compare it with the default.

**Metadata**

- Role: Product designer
- Timeline: June–August 2025
- Scope: System design, prompting, prototype, evaluation
- Status: Internal POC · Not shipped
- How I worked: Model the system → prototype real outputs → evaluate blind

**Hero proof**

The contained product video demonstrates where Reasons to Watch appears after focus. A visible play/pause control prevents the looping behavior from becoming compulsory. Reduced-motion mode pauses the video and preserves the poster frame.

### 01 · Problem

**Heading**

One reason per segment could scale. It could not explain individual taste.

**Copy**

> Reasons to Watch appears when a viewer focuses on a title. Instead of repeating a synopsis, it explains why that title may be worth their time. Internal research found that Reasons to Watch increased clarity around the recommendation rationale by 4%.

> The first scalable direction assigned viewers to affinity groups and wrote one version of copy for each group. Segment-level copy was practical for cost and catalog scale, but it flattened taste. The same person could want prestige drama, competitive cooking, and a comfort comedy for completely different reasons.

**Evidence**

Use the exact *Gilded Age* segmentation artifact. The caption states:

> Segment-level copy changed the emphasis, but every person in a segment still received the same reason.

**Design constraint**

> My goal was to write for one viewer—not only their segment—without breaking the 135-character limit, Max’s voice, or spoiler rules.

### 02 · Insight

**Heading**

A name-drop looked personal. A credible connection felt useful.

**Copy**

> Watch history revealed broad patterns. Explicit likes showed which titles a viewer had positively endorsed. I needed both: behavior to infer taste, and stronger evidence before mentioning a familiar title.

> A useful reason had to capture a preferred mood or tone, create one meaningful bridge to something familiar, and still make the new title clear. Personalization was not a name-drop. It was an explanation of fit.

**Interactive proof**

The reader can switch between two verified outputs. The switcher uses an accessible tab pattern with arrow keys, Home, End, `aria-controls`, and `aria-labelledby`.

**Succession · because you liked The Righteous Gemstones**

> “Love the chaos of The Righteous Gemstones? Its corporate cousin is a vicious fight for Daddy’s love where the jokes cut like glass.”

**Beat Bobby Flay · because you liked Friends**

> “As if Monica Geller from Friends got her own cooking show. All her sassy, competitive fire in a delicious 20-minute duel.”

The earlier *House of the Dragon* example is excluded from the final switcher because its two-title wording made the one-liked-title rule harder to understand.

### 03 · Decisions

**Chapter heading**

Three decisions turned a prompt into a system.

#### Decision 1 — Write a pitch, not a summary

> Early prompts produced accurate plot summaries. They described the title, but did not create a reason to choose it. I reframed the task first as a recommendation, then as a 135-character pitch. The shorter brief forced every sentence to earn its place.

The visual progression is open and rule-based rather than card-based:

1. Summary — Accurate, but interchangeable.
2. Recommendation — More directional, still too broad.
3. 135-character pitch — Specific enough to intrigue. Short enough to scan.

#### Decision 2 — Use history to find patterns. Use likes to earn permission.

> The first model referenced titles from watch history even when I had no evidence the viewer enjoyed them. I added explicit likes and allowed one familiar title only when the analyst rated the connection above 85.

System rule:

`Watch history / find patterns + liked titles / earn the reference → a reason, not a name-drop`

The connection threshold is presented as a POC rule, not as a validated universal score.

#### Decision 3 — One agent was doing too many jobs

> A single prompt had to research a title, infer taste, write the copy, enforce product rules, and judge its own work. The outputs stayed generic and missed basic specifications. I separated those responsibilities so each stage could have one definition of good.

Before-and-after proof:

- Before: one overloaded prompt; one failure could have several causes.
- After: specialized agents with explicit handoffs; each failure could be traced to one stage and tuned independently.

Secondary tuning evidence stays collapsed:

- `0.7` — the best balance between varied phrasing and repeatable structure in the test set.
- `135` — the character limit for the product surface.
- `3 sources` — IMDb, OMDb, and Wikipedia supplied useful metadata.

### 04 · Behavior

**Heading**

The prototype made every output traceable.

**Copy**

> Each stage returned a structured handoff, so I could trace a weak sentence back to the decision that produced it. A bad connection was an analysis problem. Flat language was a writing problem. A spoiler or broken character limit was an editing problem.

> I built the internal POC with the Gemini API. For this case study, I recreated the handoffs as a deterministic walkthrough so readers can inspect the system without exposing internal data or pretending to run a live model.

**Design-engineering prototype**

`Run the pipeline` reveals one real output through four visible handoffs:

1. Pattern Analyst finds “family power struggle” and “vicious comedy.”
2. Blurb Writer drafts three reasons from the strongest connection.
3. Editor checks 135 characters, tone, spoilers, and punctuation.
4. Optional Critic selects a candidate when the first three drafts are too similar to judge confidently.
5. The final *Succession* reason settles into the output surface.

The Critic is always described as optional, matching the final prompt guide. The internal POC was model-backed; the public interaction is deterministic and labeled accordingly.

Persistent constraints remain visible beside the artifact:

- 135 characters
- No spoilers
- No exclamation points
- One liked-title reference maximum

### 05 · What changed

**Heading**

Personalized was too easy a bar. The copy had to beat the default.

**Copy**

> “Personalized” was not the success criterion. I worked with design technologist Travis Swan to design an internal evaluation tool. Participants added watched and liked titles, then compared the default copy with generated copy without knowing which was which.

> After each choice, the tool asked what made the copy useful: the balance of plot and theme, a familiar connection, attention, or a sense that the writer understood the content. While the tool was being built, I used an asynchronous spreadsheet to test the same questions sooner.

**Blind-comparison prototype**

The public page recreates the evaluation mechanic with the exact copy shown in the internal artifact. The reader chooses first; only then do the source labels appear.

Option 1:

> Glamorous old vs. new money drama. Its character depth and social navigation echo Succession’s power plays, offering a compelling historical clash.

Option 2:

> From Julian Fellowes, this sprawling period drama chronicles the great conflict between old and new in New York’s glittering Gilded Age.

The selected option exposes its state with `aria-pressed`. Reset returns focus to the first option instead of dropping keyboard focus.

The exact input and blind-comparison screens follow at full column width. They are never cropped into an invented aspect ratio.

### 06 · Results

**Heading**

The POC clarified what useful personalization looked like—not whether it changed behavior.

**Copy**

> Qualitative feedback pointed to three strengths: the copy reflected a preferred mood, was engaging to read, and made a credible connection to a past favorite. The work then informed the team’s exploration of personalized copy in single-content promotions.

**Qualitative findings**

- Mood + tone: “Intriguing.” “Very me.”
- Engaging copy: “Hilarious, fun to read, and fairly accurate.”
- Trusted connection: “I like how it draws the connection.”

These remain qualitative. No participant count is published until it can be verified.

**Evidence boundary**

> This internal POC evaluated copy preference and perceived relevance. It did not establish that personalized Reasons to Watch would increase playback, reduce time to selection, or improve retention.

**What I would test next**

1. Playback starts — Did the reason lead to a watch?
2. Time to selection — Did it help viewers decide faster?
3. Sessions without playback — Did fewer visits end in indecision?

**Reflection**

AI didn’t make the copy personal. The system did.

> This project changed how I design with LLMs. Better output came from better product decisions: choosing defensible signals, separating failure modes, writing explicit constraints, and evaluating the result without provenance bias. The model supplied language; the system supplied the judgment.

## Layout and spacing specification

### Desktop shell

- Total shell: `1080px` maximum.
- Grid: `192px` chapter rail + `64px` gap + `824px` main column.
- Reading measure: `720px` maximum.
- Outer width: `calc(100% - 48px)`.
- Top offset: `132px`.
- Main bottom runway: `120px`.
- Chapter rail: sticky at `108px` from the viewport top.

The overview uses the complete `824px` main column. Narrative copy stays at `720px`; exact evidence may expand to the full main column without changing alignment.

### Responsive shell

- Below `1100px`: one-column shell, `880px` maximum; the chapter rail becomes the horizontal chapter strip used by the Surprise Rail system.
- Below `820px`: `40px` total outer gutters, `112px` top offset, `80px` chapter spacing.
- Below `600px`: `32px` total outer gutters, `96px` top offset, `72px` chapter spacing, `88px` bottom runway.
- Comparisons and the pipeline collapse from multiple columns to one column where needed.
- No horizontal overflow is permitted at `390px`.

### Spacing tokens

- Chapter to chapter: `104px` desktop, `80px` tablet, `72px` mobile.
- Heading group to content: `40px`.
- Paragraph to paragraph: `18px`.
- Copy to evidence: `40px`.
- Related detail: `24px`.
- Decision to decision: `88px` desktop, `72px` mobile.
- Hero copy to video: `52px`.
- Visual to caption: `10px`.
- Reflection from previous content: `96px` desktop, `72px` mobile.

Chapter spacing is applied only as `margin-top`. Sections have no symmetric vertical padding, preventing the doubled gaps that made earlier iterations feel long.

## Type specification

Use two families maximum:

- Primary/body/UI: `forma-djr-text`
- Secondary editorial accent: `adobe-text-pro`

Forma is used for the hero, all chapter and decision headings, body copy, diagrams, metadata, controls, labels, and captions. The secondary serif is reserved for one constrained editorial statement; the portfolio’s title-hole-punch font is never used.

Use exactly four size tokens:

| Token | Value | Use |
|---|---:|---|
| Display | `clamp(3rem, 5.2vw, 4rem)` | Hero title |
| Heading | `clamp(1.75rem, 3.3vw, 2.5rem)` | Chapter headings, decision headings, key output copy |
| Body | `clamp(1.0625rem, 1.3vw, 1.1875rem)` | Deck, paragraphs, metadata, supporting copy, controls |
| Label | `0.8125rem` | Eyebrows, captions, chapter rail, status text |

No element introduces another font size. Hierarchy comes from weight, position, color, and whitespace.

## Color and surface specification

- Preserve the portfolio background: `linear-gradient(to bottom right, #fff7ed, #ffe4e6, #fff7ed)` from the global shell.
- Add a subtle 32px rose grid over the transparent case-study container.
- Ink: `#171719`.
- Body copy: `#4f4a4c`.
- Soft text: `#685d61`.
- Rose accent: `#9f1239`.
- Max stage: `#0b0b10`.
- Major radius: `8px`.

Dark contained surfaces are reserved for product or runnable behavior:

1. Hero product video.
2. Verified output switcher.
3. Agent handoff prototype.
4. Blind-comparison prototype.

All other diagrams use open editorial rows and thin rules. Findings, limitations, reflection, signal logic, and before/after comparisons do not receive separate rounded cards. This keeps the page from feeling assembled from unrelated presentation components.

## Motion and interaction specification

### Chapter navigation

- Active chapter updates through `IntersectionObserver`.
- Reading progress updates from document scroll position.
- Chapter clicks use `scrollIntoView` without changing the HashRouter route.
- Reduced-motion mode switches chapter travel from `smooth` to `auto`.

### Scroll reveals

- Each chapter and major proof enters once.
- Duration: `700ms`.
- Distance: `24px` upward.
- Easing: `cubic-bezier(0.2, 0.72, 0.2, 1)`.
- Nothing loops except the controllable hero demonstration.

### Hero product video

- Muted, inline, looping demonstration.
- Visible play/pause control.
- Static WebP poster prevents an empty frame and reserves a `1103 / 620` aspect ratio.
- Reduced-motion mode pauses the video.

### Personalized output switcher

- Two verified examples.
- APG-style tabs support click, Arrow Left, Arrow Right, Home, and End.
- The active panel uses `aria-live="polite"`.

### Agent trace

- A button triggers four deterministic stages.
- First stage begins after `300ms`; subsequent stages use `720ms` intervals.
- The final output resolves to a verified Reason to Watch.
- Reduced-motion mode resolves immediately.
- Re-running clears existing timers before starting again.

### Blind comparison

- Sources remain hidden until a choice.
- Selected state is visible and exposed with `aria-pressed`.
- One live result region announces the reveal.
- Reset returns focus to Option 1.

## Asset specification

Exact project evidence remains the source of truth:

- Hero behavior: `/case-study-hbo-max2/rtw-overview2.mp4`
- Hero poster: `/case-study-hbo-max2/preview-image.webp`
- Segment baseline: `/case-study-hbo-max2/segmentation-example.webp`
- Agent artifact: `/case-study-hbo-max2/agent-breakdown.webp`
- Evaluation input: `/case-study-hbo-max2/eval-tool1.webp`
- Blind comparison: `/case-study-hbo-max2/eval-tool2.webp`

Every static image keeps its original PNG as a `<picture>` fallback. Optimized WebP files render at `1648 × 927`, which is 2× the maximum displayed width. Intrinsic dimensions and asynchronous decoding prevent layout shift; exact evaluation frames use `object-fit: contain` and are never cropped.

## Source links

- [Final presentation](https://docs.google.com/presentation/d/1re-kPSn8nNVJDsieV3Misp4Xcn-eBrfK/edit?usp=sharing&ouid=116774489859738726779&rtpof=true&sd=true)
- [Hyper-personalized RTW wireframes](https://www.figma.com/design/lAgF3l2u2gGhCYoctjLi4H/Hyper-personalized-RTW-Wireframes?node-id=3001-26320)
- [RTW POC iteration board](https://www.figma.com/board/nSerysJp3TjLb7C1wgABrw/RTW-POC-%E2%80%93-Hyper-Personalized?node-id=0-1)
- [Reasons LLM prompt guide](https://www.figma.com/design/KKvY674OEM61yypf7u31sW/Pranavi-s-Guide-to-the-Reasons-LLM?node-id=0-1)

## Evidence boundaries

- Label the 4% result as internal research about clarity of recommendation rationale.
- Do not publish participant counts until the sample size is verified.
- Present quotes as qualitative feedback, not measured product impact.
- Do not say the POC improved playback, time to selection, retention, or churn.
- Do not say the feature shipped.
- Treat the Critic as optional everywhere.
- Treat the 0.7 temperature, source selection, threshold, and character limit as POC tuning evidence.
- State that the internal POC used the Gemini API and the public walkthrough is deterministic.
- Keep AI subordinate to the product choices: signals, task decomposition, constraints, traceability, and evaluation.

## Acceptance criteria

- A first-time viewer can define Reasons to Watch from the hero without playing the video.
- The page communicates the problem, insight, three decisions, system behavior, evaluation method, limitation, and project status.
- The page follows the same six-chapter visual and writing system as the finished Surprise Rail case study.
- The red notebook opens `/#/hbo-max-rtw` without a broken route.
- The footer links back to the red notebook.
- The Pinnables landing-page label reads `MCP · AI CODING AGENTS`.
- Every image has meaningful alt text, intrinsic dimensions, and an optimized WebP source.
- Every external link opens safely.
- Chapter navigation does not overwrite the HashRouter path.
- The hero video can be paused.
- Tabs, blind-choice controls, reset focus, and the agent prototype work by keyboard.
- Reduced motion preserves all information without delayed animation.
- Evaluation screenshots remain full-width and uncropped.
- The page uses no more than two font families and four font-size tokens.
- Desktop, tablet, and mobile CSS preserve one coherent reading system without horizontal overflow.
- The targeted case-study tests and production build pass.
