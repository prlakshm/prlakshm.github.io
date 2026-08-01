import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import "./case-study-hbo-max2.css";

const chapters = [
  { id: "problem", number: "01", label: "Problem" },
  { id: "insight", number: "02", label: "Insight" },
  { id: "decisions", number: "03", label: "Decisions" },
  { id: "system", number: "04", label: "Behavior" },
  { id: "evaluation", number: "05", label: "Evaluation" },
  { id: "results", number: "06", label: "Results" },
];

const recommendationExamples = [
  {
    title: "Succession",
    signal: "The Righteous Gemstones",
    reason:
      "Love the chaos of The Righteous Gemstones? Its corporate cousin is a vicious fight for Daddy’s love where the jokes cut like glass.",
  },
  {
    title: "Beat Bobby Flay",
    signal: "Friends",
    reason:
      "As if Monica Geller from Friends got her own cooking show. All her sassy, competitive fire in a delicious 20-minute duel.",
  },
];

const blindOptions = [
  {
    id: "a",
    copy:
      "Glamorous old vs. new money drama. Its character depth and social navigation echo Succession’s power plays, offering a compelling historical clash.",
    source: "Personalized reason",
  },
  {
    id: "b",
    copy:
      "From Julian Fellowes, this sprawling period drama chronicles the great conflict between old and new in New York’s glittering Gilded Age.",
    source: "Default reason",
  },
] as const;

const sourceLinks = [
  {
    label: "Presentation",
    href: "https://docs.google.com/presentation/d/1re-kPSn8nNVJDsieV3Misp4Xcn-eBrfK/edit?usp=sharing&ouid=116774489859738726779&rtpof=true&sd=true",
  },
  {
    label: "Evaluation prototype",
    href: "https://www.figma.com/design/lAgF3l2u2gGhCYoctjLi4H/Hyper-personalized-RTW-Wireframes?node-id=3001-26320",
  },
  {
    label: "Prompt guide",
    href: "https://www.figma.com/design/KKvY674OEM61yypf7u31sW/Pranavi-s-Guide-to-the-Reasons-LLM?node-id=0-1",
  },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M2.25 9.75 9.75 2.25M4.25 2.25h5.5v5.5" />
    </svg>
  );
}

function CaseStudyHBOMax2() {
  const [activeExample, setActiveExample] = useState(0);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [activeSection, setActiveSection] = useState("problem");
  const [readProgress, setReadProgress] = useState(0);
  const [videoPaused, setVideoPaused] = useState(false);
  const [blindChoice, setBlindChoice] = useState<"a" | "b" | null>(null);
  const heroVideo = useRef<HTMLVideoElement>(null);
  const pipelineTimers = useRef<number[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Personalized Reasons to Watch — Pranavi Ram";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reveals = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    const honorMotionPreference = (event: MediaQueryList | MediaQueryListEvent) => {
      if (!event.matches) return;
      reveals.forEach((element) => element.classList.add("is-visible"));
      heroVideo.current?.pause();
      setVideoPaused(true);
    };

    reduceMotion.addEventListener("change", honorMotionPreference);

    if (reduceMotion.matches) {
      reveals.forEach((element) => element.classList.add("is-visible"));
      heroVideo.current?.pause();
      setVideoPaused(true);
      return () => {
        reduceMotion.removeEventListener("change", honorMotionPreference);
        pipelineTimers.current.forEach((timer) => window.clearTimeout(timer));
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12%", threshold: 0.14 },
    );

    reveals.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      reduceMotion.removeEventListener("change", honorMotionPreference);
      pipelineTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    const sectionIds = ["problem", "insight", "decisions", "system", "evaluation", "results"];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    const updateProgress = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      const progress = available > 0 ? Math.round((window.scrollY / available) * 100) : 0;
      setReadProgress(Math.min(100, Math.max(0, progress)));
    };

    const chapterObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.2, 0.55] },
    );

    sections.forEach((section) => chapterObserver.observe(section));
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });

    return () => {
      chapterObserver.disconnect();
      window.removeEventListener("scroll", updateProgress);
    };
  }, []);

  const example = recommendationExamples[activeExample];

  const scrollToChapter = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const selectExample = (index: number) => {
    setActiveExample(index);
    window.requestAnimationFrame(() => {
      document.getElementById(`rtw-example-tab-${index}`)?.focus();
    });
  };

  const handleExampleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % recommendationExamples.length;
    else if (event.key === "ArrowLeft") {
      next = (index - 1 + recommendationExamples.length) % recommendationExamples.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = recommendationExamples.length - 1;
    else return;

    event.preventDefault();
    selectExample(next);
  };

  const toggleHeroVideo = () => {
    const video = heroVideo.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const resetBlindComparison = () => {
    setBlindChoice(null);
    window.requestAnimationFrame(() => {
      document.getElementById("rtw-blind-option-a")?.focus();
    });
  };

  const runPipeline = () => {
    pipelineTimers.current.forEach((timer) => window.clearTimeout(timer));
    pipelineTimers.current = [];
    setPipelineStep(0);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPipelineStep(4);
      return;
    }

    [1, 2, 3, 4].forEach((step, index) => {
      const timer = window.setTimeout(() => setPipelineStep(step), 300 + index * 720);
      pipelineTimers.current.push(timer);
    });
  };

  return (
    <main className="rtw-case">
      <div className="rtw-shell">
        <aside className="rtw-chapter-nav" aria-label="Case study chapters">
          <p>Reasons to Watch<br /><span>HBO Max · 2025</span></p>
          <nav>
            {chapters.map((chapter) => (
              <a
                key={chapter.id}
                href={`/#/hbo-max-rtw?section=${chapter.id}`}
                aria-current={activeSection === chapter.id ? "true" : undefined}
                onClick={(event) => scrollToChapter(event, chapter.id)}
              >
                <span>{chapter.number}</span>
                {chapter.label}
              </a>
            ))}
          </nav>
          <div className="rtw-progress" aria-label={`${readProgress}% read`}>
            <span>READ</span>
            <span className="rtw-progress-track" aria-hidden="true"><i style={{ width: `${readProgress}%` }} /></span>
            <span>{readProgress}%</span>
          </div>
        </aside>

        <div className="rtw-main">

      <header className="rtw-hero rtw-page" data-reveal>
        <div className="rtw-hero-copy">
          <p className="rtw-label">HBO MAX · PRODUCT DESIGN + PROTOTYPING</p>
          <h1>Designing personalized Reasons to Watch for HBO Max</h1>
          <p className="rtw-hero-deck">
            One prompt could write a blurb. It couldn’t explain why this title
            fit this viewer. Reasons to Watch is the short pitch that appears
            when someone focuses on a title. I built a multi-agent POC that used
            watch history and explicit likes to personalize that pitch, then
            designed a blind evaluation to compare it with the default.
          </p>

          <dl className="rtw-meta" aria-label="Project details">
            <div>
              <dt>Role</dt>
              <dd>Product designer</dd>
            </div>
            <div>
              <dt>Timeline</dt>
              <dd>June–August 2025</dd>
            </div>
            <div>
              <dt>Scope</dt>
              <dd>System design, prompting, prototype, evaluation</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Internal POC · Not shipped</dd>
            </div>
          </dl>
          <dl className="rtw-meta rtw-meta-how" aria-label="Working approach">
            <div>
              <dt>How I worked</dt>
              <dd>Model the system → prototype real outputs → evaluate blind</dd>
            </div>
          </dl>

          <nav className="rtw-source-links" aria-label="Project source files">
            {sourceLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
                <ArrowIcon />
              </a>
            ))}
          </nav>
        </div>

        <figure className="rtw-hero-media">
          <div className="rtw-video-shell">
            <video
              ref={heroVideo}
              src="/case-study-hbo-max2/rtw-overview2.mp4"
              poster="/case-study-hbo-max2/preview-image.webp"
              aria-label="Reasons to Watch appearing when a title receives focus on HBO Max"
              autoPlay
              muted
              loop
              playsInline
              onPlay={() => setVideoPaused(false)}
              onPause={() => setVideoPaused(true)}
            >
              Your browser does not support the video tag.
            </video>
            <button
              className="rtw-video-control"
              type="button"
              onClick={toggleHeroVideo}
            >
              {videoPaused ? "Play prototype" : "Pause prototype"}
            </button>
          </div>
          <figcaption>
            Reasons to Watch appears in the expanded title preview after focus.
          </figcaption>
        </figure>
      </header>

      <section className="rtw-section rtw-reading" id="problem" data-reveal>
        <div className="rtw-section-head">
          <p className="rtw-label">01 · PROBLEM</p>
          <h2>One reason per segment could scale. It could not explain individual taste.</h2>
        </div>
        <div className="rtw-copy">
          <p>
            Reasons to Watch appears when a viewer focuses on a title. Instead
            of repeating a synopsis, it explains why that title may be worth
            their time. Internal research found that Reasons to Watch increased
            clarity around the recommendation rationale by 4%.
          </p>
          <p>
            The first scalable direction assigned viewers to affinity groups
            and wrote one version of copy for each group. Segment-level copy was
            practical for cost and catalog scale, but it flattened taste. The
            same person could want prestige drama, competitive cooking, and a
            comfort comedy for completely different reasons.
          </p>
        </div>
        <figure className="rtw-figure rtw-product-frame" data-reveal>
          <picture>
            <source srcSet="/case-study-hbo-max2/segmentation-example.webp" type="image/webp" />
            <img
              src="/case-study-hbo-max2/segmentation-example.png"
              alt="The Gilded Age described differently for three audience segments"
              width="1648"
              height="927"
              loading="lazy"
              decoding="async"
            />
          </picture>
          <figcaption>
            Segment-level copy changed the emphasis, but every person in a
            segment still received the same reason.
          </figcaption>
        </figure>
        <blockquote className="rtw-question">
          My goal was to write for one viewer—not only their segment—without
          breaking the 135-character limit, Max’s voice, or spoiler rules.
        </blockquote>
      </section>

      <section className="rtw-section rtw-reading" id="insight" data-reveal>
        <div className="rtw-section-head">
          <p className="rtw-label">02 · INSIGHT</p>
          <h2>A name-drop looked personal. A credible connection felt useful.</h2>
        </div>
        <div className="rtw-copy">
          <p>
            Watch history revealed broad patterns. Explicit likes showed which
            titles a viewer had positively endorsed. I needed both: behavior to
            infer taste, and stronger evidence before mentioning a familiar title.
          </p>
          <p>
            A useful reason had to capture a preferred mood or tone, create one
            meaningful bridge to something familiar, and still make the new
            title clear. Personalization was not a name-drop. It was an
            explanation of fit.
          </p>
        </div>

        <div className="rtw-example" data-reveal>
          <div className="rtw-example-tabs" role="tablist" aria-label="Personalized Reasons to Watch examples">
            {recommendationExamples.map((item, index) => (
              <button
                key={item.title}
                id={`rtw-example-tab-${index}`}
                type="button"
                role="tab"
                aria-selected={activeExample === index}
                aria-controls="rtw-example-panel"
                tabIndex={activeExample === index ? 0 : -1}
                className={activeExample === index ? "is-active" : ""}
                onClick={() => setActiveExample(index)}
                onKeyDown={(event) => handleExampleKeyDown(event, index)}
              >
                {item.title}
              </button>
            ))}
          </div>
          <div
            className="rtw-example-stage"
            id="rtw-example-panel"
            role="tabpanel"
            aria-labelledby={`rtw-example-tab-${activeExample}`}
            aria-live="polite"
          >
            <p className="rtw-label">BECAUSE YOU LIKED · {example.signal}</p>
            <p className="rtw-reason">“{example.reason}”</p>
            <p className="rtw-character-note">Written for a 135-character product surface.</p>
          </div>
        </div>
      </section>

      <section className="rtw-section rtw-page" id="decisions" data-reveal>
        <div className="rtw-section-head rtw-reading">
          <p className="rtw-label">03 · DECISIONS</p>
          <h2>Three decisions turned a prompt into a system.</h2>
        </div>

        <article className="rtw-decision rtw-reading" data-reveal>
          <p className="rtw-decision-number">01</p>
          <h3>Write a pitch, not a summary.</h3>
          <div className="rtw-copy">
            <p>
              Early prompts produced accurate plot summaries. They described
              the title, but did not create a reason to choose it. I reframed
              the task first as a recommendation, then as a 135-character pitch.
              The shorter brief forced every sentence to earn its place.
            </p>
          </div>
          <div className="rtw-copy-evolution" aria-label="Copy evolved from summary to recommendation to pitch">
            <div>
              <span>SUMMARY</span>
              <p>Accurate, but interchangeable.</p>
            </div>
            <div>
              <span>RECOMMENDATION</span>
              <p>More directional, still too broad.</p>
            </div>
            <div className="is-chosen">
              <span>135-CHARACTER PITCH</span>
              <p>Specific enough to intrigue. Short enough to scan.</p>
            </div>
          </div>
        </article>

        <article className="rtw-decision rtw-reading" data-reveal>
          <p className="rtw-decision-number">02</p>
          <h3>Use history to find patterns. Use likes to earn permission.</h3>
          <div className="rtw-copy">
            <p>
              The first model referenced titles from watch history even when I
              had no evidence the viewer enjoyed them. I added explicit likes
              and allowed one familiar title only when the analyst rated the
              connection above 85.
            </p>
          </div>
          <div className="rtw-signal-flow" aria-label="Watch history and liked titles serve different roles">
            <div>
              <span className="rtw-label">WATCH HISTORY</span>
              <strong>Find patterns</strong>
              <small>Genres · themes · tone · behavior</small>
            </div>
            <span className="rtw-flow-arrow" aria-hidden="true">+</span>
            <div>
              <span className="rtw-label">LIKED TITLES</span>
              <strong>Earn the reference</strong>
              <small>One title · connection score &gt; 85</small>
            </div>
            <span className="rtw-flow-arrow" aria-hidden="true">→</span>
            <div className="rtw-flow-output">
              <span className="rtw-label">OUTPUT</span>
              <strong>A reason, not a name-drop</strong>
            </div>
          </div>
        </article>

        <article className="rtw-decision rtw-reading" data-reveal>
          <p className="rtw-decision-number">03</p>
          <h3>One agent was doing too many jobs.</h3>
          <div className="rtw-copy">
            <p>
              A single prompt had to research a title, infer taste, write the
              copy, enforce product rules, and judge its own work. The outputs
              stayed generic and missed basic specifications. I separated those
              responsibilities so each stage could have one definition of good.
            </p>
          </div>
          <div className="rtw-before-after">
            <div className="rtw-before">
              <span className="rtw-label">BEFORE</span>
              <strong>One overloaded prompt</strong>
              <small>One failure could have several causes.</small>
            </div>
            <div className="rtw-after">
              <span className="rtw-label">AFTER</span>
              <strong>Specialized agents with explicit handoffs</strong>
              <small>Each failure could be traced to one stage and tuned independently.</small>
            </div>
          </div>

          <details className="rtw-tuning">
            <summary>What I tuned along the way</summary>
            <div className="rtw-tuning-grid">
              <p><strong>0.7</strong><span>The best balance between varied phrasing and repeatable structure in my test set.</span></p>
              <p><strong>135</strong><span>135 characters stayed scannable on the product surface.</span></p>
              <p><strong>3 sources</strong><span>IMDb, OMDb, and Wikipedia provided useful metadata without overloading the model.</span></p>
            </div>
          </details>
        </article>
      </section>

      <section className="rtw-section rtw-reading" id="system" data-reveal>
        <div className="rtw-section-head">
          <p className="rtw-label">04 · BEHAVIOR</p>
          <h2>The prototype made every output traceable.</h2>
        </div>
        <div className="rtw-copy">
          <p>
            Each stage returned a structured handoff, so I could trace a weak
            sentence back to the decision that produced it. A bad connection
            was an analysis problem. Flat language was a writing problem. A
            spoiler or broken character limit was an editing problem.
          </p>
          <p>
            I built the internal POC with the Gemini API. For this case study, I
            recreated the handoffs as a deterministic walkthrough so readers can
            inspect the system without exposing internal data or pretending to
            run a live model.
          </p>
        </div>

        <div className="rtw-pipeline-prototype" data-reveal>
          <div className="rtw-pipeline-head">
            <div>
              <p className="rtw-label">DESIGN ENGINEERING PROTOTYPE</p>
              <h3>Trace one output</h3>
            </div>
            <button type="button" onClick={runPipeline}>
              {pipelineStep === 0 ? "Run the pipeline" : "Run it again"}
            </button>
          </div>
          <ol aria-label="Deterministic handoff through three core agents and an optional Critic">
            <li className={pipelineStep >= 1 ? "is-complete" : ""}>
              <span>01</span>
              <div><strong>Pattern Analyst</strong><small>Finds “family power struggle” + “vicious comedy.”</small></div>
            </li>
            <li className={pipelineStep >= 2 ? "is-complete" : ""}>
              <span>02</span>
              <div><strong>Blurb Writer</strong><small>Drafts three reasons from the strongest connection.</small></div>
            </li>
            <li className={pipelineStep >= 3 ? "is-complete" : ""}>
              <span>03</span>
              <div><strong>Editor</strong><small>Checks 135 characters, tone, spoilers, and punctuation.</small></div>
            </li>
            <li className={pipelineStep >= 4 ? "is-complete" : ""}>
              <span>04</span>
              <div><strong>Optional Critic</strong><small>Selects a candidate when the first three drafts are too similar to judge confidently.</small></div>
            </li>
          </ol>
          <div className={`rtw-pipeline-output ${pipelineStep >= 4 ? "is-ready" : ""}`} aria-live="polite">
            <span className="rtw-label">FINAL REASON</span>
            <p>{pipelineStep >= 4 ? recommendationExamples[0].reason : "Run the pipeline to follow the handoffs."}</p>
          </div>
        </div>

        <figure className="rtw-figure rtw-product-frame rtw-agent-artifact" data-reveal>
          <picture>
            <source srcSet="/case-study-hbo-max2/agent-breakdown.webp" type="image/webp" />
            <img
              src="/case-study-hbo-max2/agent-breakdown.png"
              alt="Original workflow artifact showing the Pattern Analyst, Blurb Writer, Editor, and optional Critic"
              width="1648"
              height="927"
              loading="lazy"
              decoding="async"
            />
          </picture>
          <figcaption>
            Three core agents handled analysis, writing, and editing. An optional
            Critic helped choose among close candidates during exploration.
          </figcaption>
        </figure>

        <div className="rtw-rule-strip" data-reveal>
          <span>135 characters</span>
          <span>No spoilers</span>
          <span>No exclamation points</span>
          <span>One liked-title reference max</span>
        </div>
      </section>

      <section className="rtw-section rtw-page" id="evaluation" data-reveal>
        <div className="rtw-section-head rtw-reading">
          <p className="rtw-label">05 · WHAT CHANGED</p>
          <h2>Personalized was too easy a bar. The copy had to beat the default.</h2>
        </div>
        <div className="rtw-copy rtw-reading">
          <p>
            “Personalized” was not the success criterion. I worked with design
            technologist Travis Swan to design an internal evaluation tool.
            Participants added watched and liked titles, then compared the
            default copy with generated copy without knowing which was which.
          </p>
          <p>
            After each choice, the tool asked what made the copy useful: the
            balance of plot and theme, a familiar connection, attention, or a
            sense that the writer understood the content. While the tool was
            being built, I used an asynchronous spreadsheet to test the same
            questions sooner.
          </p>
        </div>

        <div className="rtw-blind-prototype" data-reveal>
          <div className="rtw-blind-head">
            <p className="rtw-label">DESIGN ENGINEERING PROTOTYPE</p>
            <h3>Try the blind comparison</h3>
            <p>Which reason would better help you decide whether to watch <em>The Gilded Age</em>?</p>
          </div>
          <div className="rtw-blind-options">
            {blindOptions.map((option, index) => (
              <button
                key={option.id}
                id={`rtw-blind-option-${option.id}`}
                type="button"
                className={blindChoice === option.id ? "is-selected" : ""}
                aria-pressed={blindChoice === option.id}
                onClick={() => setBlindChoice(option.id)}
              >
                <span>OPTION {index + 1}</span>
                <strong>{option.copy}</strong>
                <small>
                  {blindChoice ? option.source : "Source hidden"}
                </small>
              </button>
            ))}
          </div>
          <div className="rtw-blind-result" aria-live="polite">
            {blindChoice ? (
              <>
                <p>
                  You chose the {blindChoice === "a" ? "personalized" : "default"} reason.
                  The original tool asked why before revealing either source.
                </p>
                <button type="button" onClick={resetBlindComparison}>Reset comparison</button>
              </>
            ) : (
              <p>Both sources remain hidden until you choose.</p>
            )}
          </div>
        </div>

        <div className="rtw-eval-sequence" data-reveal>
          <figure>
            <span className="rtw-label">01 · PROVIDE SIGNALS</span>
            <picture>
              <source srcSet="/case-study-hbo-max2/eval-tool1.webp" type="image/webp" />
              <img
                src="/case-study-hbo-max2/eval-tool1.png"
                alt="Evaluation tool asking for watched and liked HBO Max titles"
                width="1648"
                height="927"
                loading="lazy"
                decoding="async"
              />
            </picture>
            <figcaption>Participants began with their own viewing context.</figcaption>
          </figure>
          <figure>
            <span className="rtw-label">02 · COMPARE BLIND</span>
            <picture>
              <source srcSet="/case-study-hbo-max2/eval-tool2.webp" type="image/webp" />
              <img
                src="/case-study-hbo-max2/eval-tool2.png"
                alt="Blind comparison between default and personalized Reasons to Watch copy"
                width="1648"
                height="927"
                loading="lazy"
                decoding="async"
              />
            </picture>
            <figcaption>Source labels stayed hidden until after the choice.</figcaption>
          </figure>
        </div>

        <a
          className="rtw-inline-link rtw-reading"
          href="https://www.figma.com/design/lAgF3l2u2gGhCYoctjLi4H/Hyper-personalized-RTW-Wireframes?node-id=3001-26320"
          target="_blank"
          rel="noopener noreferrer"
        >
          Explore the evaluation flow in Figma <ArrowIcon />
        </a>
      </section>

      <section className="rtw-section rtw-reading" id="results" data-reveal>
        <div className="rtw-section-head">
          <p className="rtw-label">06 · RESULTS</p>
          <h2>The POC clarified what useful personalization looked like—not whether it changed behavior.</h2>
        </div>
        <div className="rtw-copy">
          <p>
            Qualitative feedback pointed to three strengths: the copy reflected
            a preferred mood, was engaging to read, and made a credible
            connection to a past favorite. The work then informed the team’s
            exploration of personalized copy in single-content promotions.
          </p>
        </div>

        <div className="rtw-findings" data-reveal>
          <article>
            <p className="rtw-label">MOOD + TONE</p>
            <blockquote>“Intriguing.” “Very me.”</blockquote>
            <p>The copy emphasized the feeling a viewer already sought.</p>
          </article>
          <article>
            <p className="rtw-label">ENGAGING COPY</p>
            <blockquote>“Hilarious, fun to read, and fairly accurate.”</blockquote>
            <p>The reason could be useful without sounding like a synopsis.</p>
          </article>
          <article>
            <p className="rtw-label">TRUSTED CONNECTION</p>
            <blockquote>“I like how it draws the connection.”</blockquote>
            <p>A relevant favorite made the recommendation easier to believe.</p>
          </article>
        </div>

        <div className="rtw-limit" data-reveal>
          <p className="rtw-label">WHAT REMAINED UNPROVEN</p>
          <p>
            This internal POC evaluated copy preference and perceived relevance.
            It did not establish that personalized Reasons to Watch would
            increase playback, reduce time to selection, or improve retention.
          </p>
        </div>

        <div className="rtw-next-test" data-reveal>
          <h3>What I would test next</h3>
          <ol>
            <li><strong>Playback starts</strong><span>Did the reason lead to a watch?</span></li>
            <li><strong>Time to selection</strong><span>Did it help viewers decide faster?</span></li>
            <li><strong>Sessions without playback</strong><span>Did fewer visits end in indecision?</span></li>
          </ol>
        </div>

        <footer className="rtw-reflection" data-reveal>
          <p className="rtw-label">REFLECTION</p>
          <h2>AI didn’t make the copy personal. The system did.</h2>
          <p>
            This project changed how I design with LLMs. Better output came from
            better product decisions: choosing defensible signals, separating
            failure modes, writing explicit constraints, and evaluating the
            result without provenance bias. The model supplied language; the
            system supplied the judgment.
          </p>
          <div className="rtw-footer-links">
            <a href="/#/" aria-label="Return to the portfolio home page">Back to the red notebook</a>
            <a
              href="https://www.figma.com/board/nSerysJp3TjLb7C1wgABrw/RTW-POC-%E2%80%93-Hyper-Personalized?node-id=0-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              See every prompt iteration <ArrowIcon />
            </a>
          </div>
        </footer>
      </section>
        </div>
      </div>
    </main>
  );
}

export default CaseStudyHBOMax2;
