import { useEffect, useRef, useState } from "react";
import "./case-study-hbo-max2.css";

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
  {
    title: "House of the Dragon",
    signal: "Game of Thrones + Succession",
    reason:
      "The creators of Game of Thrones bring another epic series of power, politics, and family feuds. It’s Succession with dragons.",
  },
];

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
  const heroVideo = useRef<HTMLVideoElement>(null);
  const pipelineTimers = useRef<number[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Personalized Reasons to Watch — Pranavi Ram";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reveals = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (reduceMotion.matches) {
      reveals.forEach((element) => element.classList.add("is-visible"));
      heroVideo.current?.pause();
      return;
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
      pipelineTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const example = recommendationExamples[activeExample];
  const runPipeline = () => {
    pipelineTimers.current.forEach((timer) => window.clearTimeout(timer));
    pipelineTimers.current = [];
    setPipelineStep(0);

    [1, 2, 3, 4].forEach((step, index) => {
      const timer = window.setTimeout(() => setPipelineStep(step), 300 + index * 720);
      pipelineTimers.current.push(timer);
    });
  };

  return (
    <main className="rtw-case">
      <aside className="rtw-chapter-nav" aria-label="Case study chapters">
        <p>Reasons to Watch<br /><span>HBO Max · 2025</span></p>
        <nav>
          <a href="#problem"><span>01</span>Problem</a>
          <a href="#insight"><span>02</span>Insight</a>
          <a href="#decisions"><span>03</span>Decisions</a>
          <a href="#system"><span>04</span>Behavior</a>
          <a href="#evaluation"><span>05</span>Evaluation</a>
          <a href="#results"><span>06</span>Results</a>
        </nav>
      </aside>

      <header className="rtw-hero rtw-page" data-reveal>
        <div className="rtw-hero-copy">
          <p className="rtw-label">HBO MAX · AI PRODUCT DESIGN</p>
          <h1>Designing personalized Reasons to Watch for HBO Max</h1>
          <p className="rtw-hero-deck">
            One prompt could write a blurb. It couldn’t earn trust. I built a
            multi-agent system that turned watch behavior into a 135-character
            reason to press play—and a blind evaluation tool to test whether the
            copy was actually more useful than the default.
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
          <video
            ref={heroVideo}
            src="/case-study-hbo-max2/rtw-overview2.mp4"
            aria-label="Reasons to Watch appearing when a title receives focus on HBO Max"
            autoPlay
            muted
            loop
            playsInline
          >
            Your browser does not support the video tag.
          </video>
          <figcaption>
            Reasons to Watch appears in the expanded title preview after focus.
          </figcaption>
        </figure>
      </header>

      <section className="rtw-section rtw-reading" id="problem" data-reveal>
        <div className="rtw-section-head">
          <p className="rtw-label">01 · PROBLEM</p>
          <h2>A segment could describe a cohort. It couldn't explain you.</h2>
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
            and wrote one version of copy for each group. It was a practical
            start, but it flattened taste. The same person could want prestige
            drama, competitive cooking, and a comfort comedy for completely
            different reasons.
          </p>
        </div>
        <figure className="rtw-figure rtw-product-frame" data-reveal>
          <img
            src="/case-study-hbo-max2/segmentation-example.png"
            alt="The Gilded Age described differently for three audience segments"
            loading="lazy"
          />
          <figcaption>
            Segment-level copy changed the emphasis, but every person in a
            segment still received the same reason.
          </figcaption>
        </figure>
        <blockquote className="rtw-question">
          How might HBO Max turn one viewer’s behavior into a reason that feels
          specific—without losing the discipline of product copy?
        </blockquote>
      </section>

      <section className="rtw-section rtw-reading" id="insight" data-reveal>
        <div className="rtw-section-head">
          <p className="rtw-label">02 · INSIGHT</p>
          <h2>The best recommendation explains the connection.</h2>
        </div>
        <div className="rtw-copy">
          <p>
            Watch history could reveal patterns. Explicit likes showed which
            connections a viewer had actually endorsed. I needed both: broad
            behavior to understand taste, and a smaller permissioned list to
            decide when another title was worth mentioning.
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
                type="button"
                role="tab"
                aria-selected={activeExample === index}
                className={activeExample === index ? "is-active" : ""}
                onClick={() => setActiveExample(index)}
              >
                {item.title}
              </button>
            ))}
          </div>
          <div className="rtw-example-stage" role="tabpanel" aria-live="polite">
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
              The first model kept name-dropping anything it found in watch
              history. That looked personalized, but the viewer may not have
              enjoyed the title. I added a Liked List and allowed one familiar
              title only when the connection score cleared 85.
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
          <h3>One agent was doing four jobs.</h3>
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
              <small>Hard to diagnose. Inconsistent by default.</small>
            </div>
            <div className="rtw-after">
              <span className="rtw-label">AFTER</span>
              <strong>Specialized agents with explicit handoffs</strong>
              <small>Each failure had an owner and a place to fix it.</small>
            </div>
          </div>

          <details className="rtw-tuning">
            <summary>What I tuned along the way</summary>
            <div className="rtw-tuning-grid">
              <p><strong>0.7</strong><span>A temperature of 0.7 created varied structures without losing control.</span></p>
              <p><strong>135</strong><span>135 characters stayed scannable on the product surface.</span></p>
              <p><strong>3 sources</strong><span>IMDb, OMDb, and Wikipedia provided useful metadata without overloading the model.</span></p>
            </div>
          </details>
        </article>
      </section>

      <section className="rtw-section rtw-reading" id="system" data-reveal>
        <div className="rtw-section-head">
          <p className="rtw-label">04 · BEHAVIOR</p>
          <h2>Four agents. One reason to watch.</h2>
        </div>
        <div className="rtw-copy">
          <p>
            Each agent received only the inputs it needed and returned a
            structured handoff. That made the system easier to tune: weak
            connections belonged to analysis, flat language belonged to
            writing, and broken product rules belonged to editing.
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
          <ol aria-label="Live four-agent handoff">
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
              <div><strong>Critic</strong><small>Selects the most creative, informative candidate.</small></div>
            </li>
          </ol>
          <div className={`rtw-pipeline-output ${pipelineStep >= 4 ? "is-ready" : ""}`} aria-live="polite">
            <span className="rtw-label">FINAL REASON</span>
            <p>{pipelineStep >= 4 ? recommendationExamples[0].reason : "Run the pipeline to follow the handoffs."}</p>
          </div>
        </div>

        <figure className="rtw-figure rtw-product-frame rtw-agent-artifact" data-reveal>
          <img
            src="/case-study-hbo-max2/agent-breakdown.png"
            alt="Original four-agent workflow artifact showing the Pattern Analyst, Blurb Writer, Editor, and Critic"
            loading="lazy"
          />
          <figcaption>
            The handoffs made quality debuggable. The agent that created a
            failure was also the place to correct it.
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
          <p className="rtw-label">05 · EVALUATION</p>
          <h2>Blind testing separated personalized from better.</h2>
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

        <div className="rtw-eval-sequence" data-reveal>
          <figure>
            <span className="rtw-label">01 · PROVIDE SIGNALS</span>
            <img
              src="/case-study-hbo-max2/eval-tool1.png"
              alt="Evaluation tool asking for watched and liked HBO Max titles"
              loading="lazy"
            />
            <figcaption>Participants began with their own viewing context.</figcaption>
          </figure>
          <figure>
            <span className="rtw-label">02 · COMPARE BLIND</span>
            <img
              src="/case-study-hbo-max2/eval-tool2.png"
              alt="Blind comparison between default and personalized Reasons to Watch copy"
              loading="lazy"
            />
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
          <h2>The POC proved a direction—not product impact.</h2>
        </div>
        <div className="rtw-copy">
          <p>
            Internal feedback consistently surfaced three qualities in the
            personalized copy: it captured a preferred mood, it was fun to
            read, and it built trust by making a credible connection to a past
            favorite. Those findings gave the team a clearer definition of
            useful personalization.
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
            This internal POC evaluated comprehension and copy preference. It
            did not establish that personalized Reasons to Watch would increase
            playback, reduce time to selection, or improve retention.
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
            The strongest outputs came from treating personalization as
            information architecture: choose the right signals, separate the
            responsibilities, define the evidence, and judge the result without
            knowing where it came from. That was the difference between a blurb
            that mentioned the viewer and a reason that understood them.
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
    </main>
  );
}

export default CaseStudyHBOMax2;
