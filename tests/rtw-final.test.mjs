import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = new URL(
  "../src/pages/case-study-hbo-max2/CaseStudyHBOMax2.tsx",
  import.meta.url,
);
const cssPath = new URL(
  "../src/pages/case-study-hbo-max2/case-study-hbo-max2.css",
  import.meta.url,
);
const journalsPath = new URL("../src/pages/home/journals.ts", import.meta.url);
const planPath = new URL("../docs/rtw-case-study-plan.md", import.meta.url);

test("uses the red notebook as the stable entry to the finished RTW case study", async () => {
  const journals = await readFile(journalsPath, "utf8");

  assert.match(
    journals,
    /id: "reasons-to-watch",[\s\S]*?closed: "\/home\/journals\/red-closed\.png",[\s\S]*?href: "\/hbo-max-rtw"/,
  );
});

test("follows the six-chapter claim-first structure from cs-final", async () => {
  const source = await readFile(componentPath, "utf8");
  const chapters = ["problem", "insight", "decisions", "system", "evaluation", "results"];

  for (const chapter of chapters) {
    assert.match(source, new RegExp(`id=["']${chapter}["']`));
  }

  assert.match(source, /A segment could describe a cohort\. It couldn't explain you\./);
  assert.match(source, /The best recommendation explains the connection\./);
  assert.match(source, /Three decisions turned a prompt into a system\./);
  assert.match(source, /Four agents\. One reason to watch\./);
  assert.match(source, /Blind testing separated personalized from better\./);
  assert.match(source, /The POC proved a direction—not product impact\./);
});

test("states the concept, ownership, and evidence boundary in the hero", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /Designing personalized Reasons to Watch for HBO Max/);
  assert.match(source, /135-character\s+reason to press play/);
  assert.match(source, /Product designer/);
  assert.match(source, /System design, prompting, prototype, evaluation/);
  assert.match(source, /Internal POC · Not shipped/);
  assert.doesNotMatch(source, /improved retention|reduced churn|POC was successful/i);
});

test("keeps technical evidence concrete and links the source artifacts", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /Pattern Analyst/);
  assert.match(source, /Blurb Writer/);
  assert.match(source, /Editor/);
  assert.match(source, /Critic/);
  assert.match(source, /135 characters/);
  assert.match(source, /temperature of 0\.7/);
  assert.match(source, /IMDb, OMDb, and Wikipedia/);
  assert.match(source, /lAgF3l2u2gGhCYoctjLi4H/);
  assert.match(source, /KKvY674OEM61yypf7u31sW/);
  assert.match(source, /1re-kPSn8nNVJDsieV3Misp4Xcn-eBrfK/);
});

test("uses one narrow editorial system with four type levels and explicit spacing", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /--rtw-page: 1120px/);
  assert.match(css, /--rtw-reading: 720px/);
  assert.match(css, /--rtw-section: 112px/);
  assert.match(css, /--rtw-cluster: 40px/);
  assert.match(css, /--rtw-detail: 24px/);
  assert.match(css, /--rtw-sans: "forma-djr-text", sans-serif/);
  assert.match(css, /--rtw-serif: "adobe-text-pro", serif/);
  assert.match(css, /--rtw-display: clamp\(3\.25rem, 7vw, 5rem\)/);
  assert.match(css, /--rtw-heading: clamp\(2\.25rem, 5vw, 3\.25rem\)/);
  assert.match(css, /--rtw-body: clamp\(1\.0625rem, 1\.5vw, 1\.1875rem\)/);
  assert.match(css, /--rtw-label: 0\.8125rem/);
  assert.doesNotMatch(css, /font-family:\s*"(?:Krub|Flotha|punch-holes|GS)"/i);
});

test("supports restrained scroll motion and reduced motion", async () => {
  const source = await readFile(componentPath, "utf8");
  const css = await readFile(cssPath, "utf8");

  assert.match(source, /IntersectionObserver/);
  assert.match(source, /data-reveal/);
  assert.match(css, /\[data-reveal\]/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation-duration: 0\.01ms/);
});

test("uses exact product evidence instead of embeds or decorative process boards", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /rtw-overview2\.mp4/);
  assert.match(source, /segmentation-example\.png/);
  assert.match(source, /agent-breakdown\.png/);
  assert.match(source, /eval-tool1\.png/);
  assert.match(source, /eval-tool2\.png/);
  assert.doesNotMatch(source, /<iframe|side-nav/);
});

test("matches cs-final with a numbered chapter rail and a How I worked line", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /className="rtw-chapter-nav"/);
  assert.match(source, /01<\/span>Problem/);
  assert.match(source, /06<\/span>Results/);
  assert.match(source, /How I worked/);
  assert.match(source, /Model the system → prototype real outputs → evaluate blind/);
});

test("includes a runnable agent trace as the design-engineering prototype", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /pipelineStep/);
  assert.match(source, /Run the pipeline/);
  assert.match(source, /Trace one output/);
  assert.match(source, /aria-live="polite"/);
});

test("ships a comprehensive written plan beside the webpage", async () => {
  const plan = await readFile(planPath, "utf8");

  assert.match(plan, /# Reasons to Watch — Case Study Plan/);
  assert.match(plan, /## Final narrative architecture/);
  assert.match(plan, /## Final copy/);
  assert.match(plan, /## Layout and spacing specification/);
  assert.match(plan, /## Motion and interaction specification/);
  assert.match(plan, /## Evidence boundaries/);
  assert.match(plan, /\/hbo-max-rtw/);
});
