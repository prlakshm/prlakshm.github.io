import { useEffect } from "react";
import "./case-study-hbo-max1.css";

const figmaUrl =
  "https://www.figma.com/design/7ALenAe4ALVk0Y6FBKUl74/Surprise-Tiles-Component-Idea?node-id=6006-97068&t=Ou8IRhd2VOBNg5d9-1";

const KEY_ART = "/case-study-hbo-max1/generated-v5/suburban-key-art.png";

function LinkOut({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="sr4-link">
      {children} <span aria-hidden="true">↗</span>
    </a>
  );
}

function ChapterHeading({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sr4-chapter-heading">
      <p className="sr4-eyebrow">{number}</p>
      <h2>{title}</h2>
      {children && <div className="sr4-deck">{children}</div>}
    </header>
  );
}

/**
 * A single portrait Surprise tile, rebuilt in the browser from the real Figma
 * layer spec (key art → black 75% → frost + descriptor) so every state uses the
 * exact same crop and sits directly on the page background.
 */
function Tile({
  variant,
  clue,
  label,
  className = "",
}: {
  variant: "art" | "black" | "frost" | "reveal";
  clue?: string;
  label?: string;
  className?: string;
}) {
  const isRevealed = variant === "art" || variant === "reveal";
  return (
    <figure className={`sr4-tile-wrap ${className}`}>
      {label && <figcaption className="sr4-tile-label">{label}</figcaption>}
      <div className={`sr4-tile sr4-tile--${variant}`}>
        <img
          className="sr4-tile-art"
          src={KEY_ART}
          alt={isRevealed ? "The Naked Kiss key art revealed under the tile" : ""}
          aria-hidden={isRevealed ? undefined : true}
          loading="lazy"
        />
        {(variant === "black" || variant === "frost") && (
          <span className="sr4-tile-black" aria-hidden="true" />
        )}
        {variant === "frost" && clue && <span className="sr4-tile-clue">{clue}</span>}
        {variant === "reveal" && <span className="sr4-tile-grad" aria-hidden="true" />}
      </div>
    </figure>
  );
}

export default function CaseStudyHBOMax1() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.classList.add("surprise-page-active");
    document.documentElement.classList.add("sr-motion-enabled");

    const motionElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-sr-motion]"),
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      motionElements.forEach((element) => element.classList.add("is-in-view"));
    }

    const observer = reducedMotion
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-in-view");
              observer?.unobserve(entry.target);
            });
          },
          { threshold: 0.18, rootMargin: "0px 0px -15%" },
        );

    motionElements.forEach((element) => observer?.observe(element));

    const heroVideo = document.querySelector<HTMLVideoElement>("[data-sr-autoplay]");
    const videoObserver =
      heroVideo && !reducedMotion
        ? new IntersectionObserver(
            ([entry]) => {
              if (entry?.isIntersecting) void heroVideo.play();
              else heroVideo.pause();
            },
            { threshold: 0.45 },
          )
        : null;

    if (heroVideo) {
      if (reducedMotion) heroVideo.pause();
      else videoObserver?.observe(heroVideo);
    }

    return () => {
      observer?.disconnect();
      videoObserver?.disconnect();
      document.body.classList.remove("surprise-page-active");
      document.documentElement.classList.remove("sr-motion-enabled");
    };
  }, []);

  return (
    <main className="surprise-study-v4">
      <section className="sr4-shell sr4-hero">
        <div className="sr4-hero-grid">
          <div className="sr4-hero-copy">
            <p className="sr4-eyebrow">HBO Max · Product design · Summer 2025</p>
            <h1>Surprise Rail</h1>
            <p className="sr4-thesis">Turning decision paralysis into curiosity</p>
            <p className="sr4-hero-deck">
              Surprise Rail is a tested concept for Max. It hides each poster behind a
              short clue, then reveals the title when someone focuses on it.
            </p>
            <p className="sr4-hero-goal">
              The goal was to help people who opened Max without knowing what they
              wanted to watch.
            </p>

            <div className="sr4-meta" aria-label="Project details">
              <div><span>Role</span><p>Product Design Intern</p></div>
              <div><span>Timeline</span><p>Summer 2025</p></div>
              <div><span>Platform</span><p>Connected TV, with mobile</p></div>
              <div><span>Status</span><p>Tested concept · Not shipped</p></div>
            </div>
            <p className="sr4-collaboration">
              I led concept, interaction design, visual direction and prototyping with
              partners in UX research, visual design, UX writing and design leadership.
            </p>
            <LinkOut href={figmaUrl}>Explore the Figma</LinkOut>
          </div>

          <figure className="sr4-product-media sr4-hero-media">
            <video
              src="/case-study-hbo-max1/surprise-rail-overview.mp4"
              aria-label="Surprise Rail prototype on HBO Max Connected TV"
              data-sr-autoplay
              autoPlay
              muted
              loop
              playsInline
              poster="/case-study-hbo-max1/generated-v4/storyboard-1-default.png"
              preload="metadata"
            />
            <figcaption>Final CTV prototype</figcaption>
          </figure>
        </div>
      </section>

      <section className="sr4-shell sr4-section sr4-rule-after-hero" id="problem">
        <ChapterHeading
          number="01 · The problem"
          title="Max had plenty to watch. Viewers still struggled to choose."
        >
          <p>
            Max already had plenty to watch. The problem was that some viewers kept
            scrolling without choosing anything.
          </p>
        </ChapterHeading>

        <div className="sr4-evidence" data-sr-motion>
          <article>
            <header><h3>Platform analytics</h3><p>Internal U.S. HBO Max analytics · Summer 2025</p></header>
            <dl>
              <div><dt>78%</dt><dd>of U.S. HBO Max users browsed on CTV</dd></div>
              <div><dt>98%</dt><dd>of users did not move beyond Home</dd></div>
              <div><dt>Rail 6</dt><dd>Most viewers did not browse this far</dd></div>
            </dl>
          </article>
          <article>
            <header><h3>Observed sessions</h3><p>Seven browsing sessions</p></header>
            <dl>
              <div><dt>≈ 2 min</dt><dd>spent looking for a title</dd></div>
              <div><dt>5 of 7</dt><dd>ended without playback</dd></div>
            </dl>
          </article>
        </div>

        <div className="sr4-audience">
          <p className="sr4-eyebrow">The undecided viewer</p>
          <h3>Designing for people who arrived without a title in mind</h3>
          <p>
            This problem was most relevant for viewers who arrived without a specific
            title in mind—an internal browsing mode called the “Wanderer.” These
            sessions did not prove that browsing caused churn. They showed something
            more immediate: five of seven ended without a watch.
          </p>
        </div>

        <p className="sr4-opportunity-line">
          Max already grouped titles into genres and themed collections. I wondered
          whether those collections could change the clue and make a title feel more
          relevant in that moment.
        </p>

        <blockquote className="sr4-question">
          How might Max give undecided viewers a reason to stop scrolling?
        </blockquote>
      </section>

      <section className="sr4-shell sr4-section" id="mechanic">
        <ChapterHeading
          number="02 · The idea"
          title="The idea started with a book I could not see."
        >
          <p>
            At the Strand, I found books wrapped in paper with only a few clues written
            outside. Because I could not judge the title or cover, I spent more time
            guessing what each book might be.
          </p>
          <p>
            I brought that same sequence into Max: hide the title, offer a clue, then
            reveal the poster.
          </p>
        </ChapterHeading>

        <p className="sr4-book-lead">
          The book hid its identity behind a few clues. I used the same idea for titles
          on Max.
        </p>

        <figure className="sr4-book-origin" data-sr-motion>
          <div className="sr4-book-row">
            <figure className="sr4-tile-wrap sr4-book">
              <figcaption className="sr4-tile-label">Hide</figcaption>
              <div className="sr4-book-frame">
                <img
                  src="/case-study-hbo-max1/blind-date-book.png"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = "1";
                      img.src = "/case-study-hbo-max1/blind-date-book.svg";
                    }
                  }}
                  alt="A hardback book wrapped in kraft paper with a few handwritten genre clues and a red wax seal"
                />
              </div>
            </figure>
            <span className="sr4-book-arrow" aria-hidden="true">→</span>
            <Tile variant="frost" clue="Suburban Secrets" label="Hint" />
            <span className="sr4-book-arrow" aria-hidden="true">→</span>
            <Tile variant="reveal" label="Reveal" />
          </div>

          <figcaption>
            Show enough to make someone guess. Hide enough to make them want more.
          </figcaption>
        </figure>

        <div className="sr4-constraints" aria-label="Design constraints" data-sr-motion>
          <p><span>01</span>Readable during a fast television scan</p>
          <p><span>02</span>Compatible with familiar remote navigation</p>
          <p><span>03</span>Clearly concealed rather than unavailable</p>
        </div>
      </section>

      <section className="sr4-shell sr4-section" id="decisions">
        <ChapterHeading number="03 · Design decisions" title="Three decisions made the idea work." />

        <article className="sr4-decision">
          <div className="sr4-claim" data-sr-motion>
            <p className="sr4-eyebrow">Decision 01 · Rail architecture</p>
            <h3>One rail made the surprise feel intentional.</h3>
            <p>
              I first mixed hidden titles into regular rows. That made them noticeable,
              but it was not clear why some posters were missing.
            </p>
            <p>
              Putting them in one dedicated Surprise Rail gave the interaction a clear
              rule without changing how people browsed Home. I proposed placing it among
              the pinned editorial rails, before the point where most browsing stopped.
            </p>
          </div>

          <figure className="sr4-product-media sr4-placement-proof" data-sr-motion>
            <div>
              <img src="/case-study-hbo-max1/generated-v4/storyboard-1-default.png" alt="CTV Home prototype with the Surprise Rail positioned below the first content row" loading="lazy" />
              <span className="sr4-placement-callout">Pinned inside the part of Home viewers reached</span>
              <span className="sr4-dropoff-callout">Most viewers did not reach rail 6</span>
            </div>
            <figcaption>The final rail appears early on Home, inside the existing vertical browsing model.</figcaption>
          </figure>

          <div className="sr4-comparison" data-sr-motion>
            <figure className="sr4-product-media">
              <div className="sr4-matched-frame"><img src="/case-study-hbo-max1/film-reel-tiles.png" alt="Early concealed film-reel tiles scattered through ordinary HBO Max rows" loading="lazy" /></div>
              <figcaption><b>Explored</b> Scattered tiles behaved like unexplained exceptions.</figcaption>
            </figure>
            <figure className="sr4-product-media">
              <div className="sr4-matched-frame"><img src="/case-study-hbo-max1/CTV-Themed-Rail.png" alt="Final dedicated Surprise Indie rail" loading="lazy" /></div>
              <figcaption><b>Final</b> One rail established a consistent rule.</figcaption>
            </figure>
          </div>
          <p className="sr4-takeaway">The content could be mysterious. The navigation could not.</p>
        </article>

        <article className="sr4-decision">
          <div className="sr4-claim" data-sr-motion>
            <p className="sr4-eyebrow">Decision 02 · Clue system</p>
            <h3>The clue changed depending on where the title appeared.</h3>
            <p>
              The clues had to be short enough to read from a television, but specific
              enough to make someone curious. Longer descriptions gave away too much.
              One-word clues were often too vague.
            </p>
            <p>
              I landed on two- or three-word clues. The title stayed the same, but the
              clue changed with the collection.
            </p>
          </div>

          <div className="sr4-tile-figure" data-sr-motion>
            <div className="sr4-tile-row sr4-tile-row--3">
              <Tile variant="frost" clue="Fame Gets Feral" label="Comedy" />
              <Tile variant="frost" clue="Outsiders With Mics" label="LGBTQ+" />
              <Tile variant="frost" clue="Bloodline Betrayal" label="Drama" />
            </div>
            <p className="sr4-tile-caption">
              Same title, same poster. Only the collection and the clue change.
            </p>
          </div>

          <div className="sr4-ai-note" data-sr-motion>
            <p>
              I used AI to generate and compare variations across different titles and
              collections. The important product decision was giving it the current page
              as context—not asking it for one generic tagline.
            </p>
          </div>

          <div className="sr4-type-detail" data-sr-motion>
            <div className="sr4-type-copy">
              <p className="sr4-eyebrow">CTV readability</p>
              <h4>The clue had to read at two distances.</h4>
              <p>Two or three words survived a quick scan up close and across a room. Longer copy lost the interaction’s pace.</p>
              <ul>
                <li><b>2 words</b> Suburban Secrets</li>
                <li><b>3 words</b> Fame Gets Feral</li>
                <li className="is-rejected"><b>Too long</b> A dark comedy about fame and rivalry</li>
              </ul>
            </div>
            <div className="sr4-type-proof">
              <Tile variant="frost" clue="Suburban Secrets" label="Mobile" className="sr4-tile--phone" />
              <Tile variant="frost" clue="Suburban Secrets" label="Connected TV" className="sr4-tile--ctv" />
            </div>
          </div>
          <p className="sr4-tile-caption sr4-tile-caption--wide">
            The same clue at phone size and at TV distance—proof the system held on both platforms.
          </p>
        </article>

        <article className="sr4-decision">
          <div className="sr4-claim" data-sr-motion>
            <p className="sr4-eyebrow">Decision 03 · Visual affordance</p>
            <h3>Frosted glass made the poster feel hidden, not missing.</h3>
            <p>
              Solid black created mystery, but it also made the tile look empty. The
              frosted version kept the poster’s color and shape visible without revealing
              the title too quickly.
            </p>
          </div>

          <div className="sr4-tile-figure" data-sr-motion>
            <div className="sr4-tile-row sr4-tile-row--3">
              <Tile variant="art" label="Cover art" />
              <Tile variant="black" label="Black overlay" />
              <Tile variant="frost" clue="Suburban Secrets" label="Frosted glass" />
            </div>
            <p className="sr4-tile-caption">
              Each layer hides a little more of the title without removing the poster completely.
            </p>
          </div>

          <details className="sr4-implementation-note">
            <summary>Technical detail</summary>
            <p>
              Cover art at full opacity, a black fill at 75%, a six-stop angular gradient
              at 60%, and a white soft-light pass, all behind a white 75% frost edge with
              an 8px foreground blur. Descriptor: Roboto Bold, 34px with 51px line height.
            </p>
          </details>
        </article>
      </section>

      <section className="sr4-shell sr4-section" id="interaction">
        <ChapterHeading number="04 · Final interaction" title="The reveal changed. The navigation did not.">
          <p>
            Viewers still moved through the rail the same way. The only new moment
            happened after focus: the clue cleared and the poster appeared underneath.
          </p>
        </ChapterHeading>

        <div className="sr4-storyboard" data-sr-motion>
          {[
            ["Default rail", "The Surprise Rail sits inside the familiar Home hierarchy.", "storyboard-1-default.png"],
            ["Focus", "The familiar focus state keeps the clue visible long enough to form a guess.", "storyboard-2-focus.png"],
            ["Reveal", "The surface clears in place, so the same tile becomes the poster.", "storyboard-3-reveal.png"],
            ["Preview", "The familiar title preview supplies confidence before playback.", "storyboard-4-preview.png"],
          ].map(([title, copy, image]) => (
            <figure className="sr4-product-media" key={title}>
              <h3>{title}</h3>
              <img src={`/case-study-hbo-max1/generated-v4/${image}`} alt={`${title} stage from the CTV prototype`} loading="lazy" />
              <figcaption>{copy}</figcaption>
            </figure>
          ))}
        </div>

        <figure className="sr4-product-media sr4-final-video">
          <video src="/case-study-hbo-max1/demo-video.mp4" aria-label="Complete Surprise Rail focus, reveal and preview interaction" controls muted loop playsInline preload="metadata" poster="/case-study-hbo-max1/generated-v4/storyboard-1-default.png" />
          <figcaption>Complete Figma prototype</figcaption>
        </figure>
      </section>

      <section className="sr4-shell sr4-section sr4-validation" id="testing">
        <ChapterHeading number="05 · Validation" title="What I learned from testing">
          <p>
            I used early concept tests to see whether people understood that the titles
            were hidden, whether the clues made them want to reveal a title, and which
            visual treatment felt clearest.
          </p>
        </ChapterHeading>

        <div className="sr4-findings" data-sr-motion>
          <p><span>01</span>Scattered tiles became <b>one dedicated rail.</b></p>
          <p><span>02</span>Longer, generic descriptors became <b>short contextual clues.</b></p>
          <p><span>03</span>Solid black became <b>a frosted treatment.</b></p>
        </div>

        <p className="sr4-limit">
          This was a concept test, not a live product experiment. It did not show whether
          Surprise Rail would increase playback or affect retention.
        </p>

        <div className="sr4-next-test">
          <h3>What I would test next</h3>
          <p>
            In a live test, I would compare it with a standard editorial rail and measure
            <b> playback starts</b>, <b>time to choose</b>, and <b>sessions that ended
            without a watch.</b>
          </p>
        </div>
      </section>

      <section className="sr4-shell sr4-section sr4-reflection" id="reflection">
        <p className="sr4-eyebrow">06 · Reflection</p>
        <blockquote>Mystery is not the absence of information. It is the order in which you reveal it.</blockquote>
        <p>
          Surprise Rail did not add another way to browse. It changed what people saw
          first inside a familiar rail: a clue, then the poster.
        </p>
        <p>
          The project taught me that hiding information can be useful when the reveal is
          clear and intentional. Sometimes showing less at first gives people a reason to
          look closer.
        </p>
        <LinkOut href={figmaUrl}>Explore the Figma</LinkOut>
      </section>
    </main>
  );
}
