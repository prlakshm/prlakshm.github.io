# Ephemeral Shared Badges and Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a temporary star collection shared by all live portfolio tabs, give Reimagine and Read their requested journey timing, remove the approved obsolete assertions, and fix both navigation regressions.

**Architecture:** A testable badge-session coordinator stores each tab's snapshot in `sessionStorage` and synchronizes live peers with `BroadcastChannel`; `badgeStore.ts` remains the React-facing adapter. A separate concept-journey helper and tiny standalone bridge prove that a concept opened before Back/focus can award Reimagine, while static case-study chrome explicitly awards Read after destination mount. Route normalization and hidden fallback markup fix the old/new nav collision and the pre-hydration SVG flash without duplicating nav CSS.

**Tech Stack:** React 18, React Router 6, TypeScript 4.9, Vite 5, browser `sessionStorage`, browser `BroadcastChannel`, Node's built-in test runner, Codex browser verification.

## Global Constraints

- Do not use permanent storage, accounts, a database, or analytics.
- Preserve badge progress through reload, Back, Forward, and live duplicate tabs.
- Start empty after all ordinary portfolio tabs close.
- Reimagine requires a confirmed concept open followed by Back or focus return.
- Read is awarded by the loaded case-study page, never its landing-page link.
- Pinnables does not count as Read while it remains an external in-progress tool.
- Do not duplicate the shared navigation stylesheet.
- Preserve the user's unrelated About, footer, painting, and mobile-nav edits.
- Stop before push or deployment.

---

### Task 1: Remove Only the Approved Obsolete Assertions

**Files:**
- Modify: `tests/home-hero-copy.test.mjs`
- Modify: `tests/home-journal-order.test.mjs`
- Modify: `tests/journal-annotations.test.mjs`
- Modify: `tests/journal-tooltip-only.test.mjs`
- Modify: `tests/manifesto-handwriting.test.mjs`
- Modify: `tests/pinnables-position.test.mjs`
- Modify: `tests/resume-link.test.mjs`
- Modify: `tests/rtw-final.test.mjs`
- Modify: `tests/surprise-rail.test.mjs`

**Interfaces:**
- Consumes: the 23 failing test names recorded in the 65-pass/23-fail baseline.
- Produces: a clean baseline containing every still-passing assertion.

- [ ] **Step 1: Delete the exact 23 obsolete `test(...)` blocks**

Remove only the blocks named in the baseline: the old hero-copy test; five notebook/annotation tests; five obsolete manifesto/wash tests; Pinnables positioning; the old resume source list; two old RTW expectations; and eight old Surprise Rail markup/copy expectations. If removing the last test from a file leaves unused imports/constants, remove only those now-unused declarations.

- [ ] **Step 2: Verify the remaining baseline**

Run: `node --test tests/*.test.mjs`

Expected: the 65 previously passing tests plus current new tests pass with zero failures. A new failure is investigated rather than deleted.

- [ ] **Step 3: Commit the approved test cleanup**

```bash
git add tests/home-hero-copy.test.mjs tests/home-journal-order.test.mjs tests/journal-annotations.test.mjs tests/journal-tooltip-only.test.mjs tests/manifesto-handwriting.test.mjs tests/pinnables-position.test.mjs tests/resume-link.test.mjs tests/rtw-final.test.mjs tests/surprise-rail.test.mjs
git commit -m "test: remove obsolete portfolio assertions"
```

---

### Task 2: Build the Ephemeral Cross-Tab Collection

**Files:**
- Create: `src/components/badges/badgeSession.ts`
- Create: `tests/badge-session.test.mjs`
- Modify: `src/components/badges/badgeStore.ts`
- Modify: `src/components/badges/BadgeCard.tsx`

**Interfaces:**
- Produces: `createBadgeSession(options)` with `getFound()`, `earn(id)`, `reset()`, `subscribeState(fn)`, `subscribeEarn(fn)`, and `close()`.
- Produces: badge-store `earn(id, from?, opts?)`, `awardOnArrival(id)`, `getFound()`, `subscribe`, and `onEarn` backed by the session coordinator.
- Consumes: `Storage`-compatible session storage and `BroadcastChannel`-compatible channel factory injected into tests and supplied by the browser in production.

- [ ] **Step 1: Write failing coordinator tests**

Create fake session storage and an in-memory channel bus. Assert that a coordinator:

```js
assert.deepEqual(first.getFound(), []);
first.earn("name");
assert.deepEqual(first.getFound(), ["name"]);
assert.deepEqual(JSON.parse(firstTabStorage.getItem(SESSION_KEY)).found, ["name"]);
assert.equal(permanentStorage.getItem("pr-badges-v1"), null);
```

Then assert that a second live coordinator requests/merges the first snapshot, live earns propagate once to both peers, duplicate events do not duplicate a badge, reset clears both peers, and closing all coordinators followed by fresh empty session storage starts at zero.

- [ ] **Step 2: Run the coordinator test and verify RED**

Run: `node --test tests/badge-session.test.mjs`

Expected: FAIL because `badgeSession.ts` does not exist.

- [ ] **Step 3: Implement the coordinator**

Implement stable event records `{ id, eventId, foundAt }`, session key `pr-badges-session-v2`, and channel `pr-badges-channel-v2`. Support `hello`, `snapshot`, `earn`, and `reset` messages. Merge by `eventId`, sort by `foundAt` then `eventId`, persist only to the injected session storage, and never read the v1 local-storage collection.

- [ ] **Step 4: Verify coordinator GREEN**

Run: `node --test tests/badge-session.test.mjs`

Expected: PASS for lifetime, merge, live synchronization, ordering, deduplication, and reset.

- [ ] **Step 5: Adapt `badgeStore` and `BadgeCard`**

Replace the module's direct `localStorage` state and return-pending mechanism with the coordinator. Keep normal hidden interactions subject to `ARM_MS`; add `awardOnArrival(id)` to bypass only that timing gate. Map a live remote earn into `onEarn` with `from: null`, queue its celebration while `document.visibilityState === "hidden"`, and play it after visibility returns. Snapshot joins update filled slots without replaying historic flights.

Remove `takePending`, `bootPending`, `bootHidden`, and the generic deferred-return effects because journey timing moves to explicit journey code.

- [ ] **Step 6: Add adapter assertions and verify**

Extend `tests/badge-session.test.mjs` to assert the source uses `sessionStorage`, does not call `localStorage.setItem`, exports `awardOnArrival`, and contains no generic `PENDING`/`takePending` flow. Run the focused test and `npm run build`; both must pass.

- [ ] **Step 7: Commit the collection coordinator**

```bash
git add src/components/badges/badgeSession.ts src/components/badges/badgeStore.ts src/components/badges/BadgeCard.tsx tests/badge-session.test.mjs
git commit -m "feat: share ephemeral badge collections across tabs"
```

---

### Task 3: Implement the Reimagine Visit-and-Return Journey

**Files:**
- Create: `src/components/badges/conceptJourney.ts`
- Create: `public/badge-concept-bridge.js`
- Create: `tests/badge-journeys.test.mjs`
- Modify: `src/pages/home/PosterGallery.tsx`
- Modify: `src/pages/home/WorkGrid.tsx`
- Modify: `src/pages/home/PosterRail.tsx`
- Modify: `public/figma/index.html`
- Modify: `public/codex/index.html`
- Modify: `src/components/badges/badgeStore.ts`

**Interfaces:**
- Produces: `beginConceptJourney(pathname)`, `mountConceptReturnListener(onComplete)`, and `disposeConceptJourneys()`.
- Consumes: a tab-scoped pending journey in `sessionStorage` and bridge messages on `pr-badge-journeys-v2`.
- Consumes: `awardOnArrival("reimagine")` only after `opened === true` and landing Back/focus return.

- [ ] **Step 1: Write failing journey tests**

Assert with fake storage/events that a click alone never completes, a same-tab bridge confirmation plus `pageshow` completes once, and a new-tab bridge confirmation plus blur/focus completes once. Assert the two concept HTML files load `/badge-concept-bridge.js`. Assert PosterGallery, WorkGrid, and PosterRail contain no linger/dwell call to `earn("reimagine")` and use `beginConceptJourney` for concept activations.

- [ ] **Step 2: Run the journey test and verify RED**

Run: `node --test tests/badge-journeys.test.mjs`

Expected: FAIL because concept journeys and the bridge do not exist and dwell awarding remains.

- [ ] **Step 3: Implement tab-scoped journey state**

Store `{ id, origin, target, opened, leftOrigin }` under `pr-badge-concept-journey-v2`. `beginConceptJourney` creates it. The landing listener marks `leftOrigin` on blur/hidden, marks `opened` from the bridge, and completes only when the landing page is visible after both flags are true. On same-tab Back, `pageshow` completes an opened journey. Completion removes the record before calling `awardOnArrival("reimagine")`.

- [ ] **Step 4: Implement and attach the concept bridge**

`public/badge-concept-bridge.js` marks a same-tab matching journey opened and broadcasts `{ type: "concept-opened", path: location.pathname }`. Load it as a module from Figma Sound and Codex Bookmarks.

- [ ] **Step 5: Replace every dwell/click award path**

Remove hover timers that earn Reimagine from all three gallery variants. Concept link activation calls `beginConceptJourney(new URL(item.href, location.href).pathname)`; case studies do not create concept journeys. Update the Reimagine hint to “Visit a reimagined product and come back.”

- [ ] **Step 6: Verify journey GREEN and build**

Run `node --test tests/badge-journeys.test.mjs` and `npm run build`.

Expected: all focused tests pass and TypeScript/Vite exit 0.

- [ ] **Step 7: Commit the journey**

```bash
git add src/components/badges/conceptJourney.ts src/components/badges/badgeStore.ts src/pages/home/PosterGallery.tsx src/pages/home/WorkGrid.tsx src/pages/home/PosterRail.tsx public/badge-concept-bridge.js public/figma/index.html public/codex/index.html tests/badge-journeys.test.mjs
git commit -m "feat: award reimagine after returning from a concept"
```

---

### Task 4: Award Read on Case-Study Arrival

**Files:**
- Modify: `src/static-chrome.tsx`
- Modify: `src/pages/home/PosterGallery.tsx`
- Modify: `src/pages/home/WorkGrid.tsx`
- Modify: `src/pages/home/PosterRail.tsx`
- Modify: `public/surprise-rail/index.html`
- Modify: `public/mixr/index.html`
- Modify: `public/reasons-to-watch/index.html`
- Modify: `tests/badge-journeys.test.mjs`

**Interfaces:**
- Consumes: `awardOnArrival("read")` after the destination `BadgeCard` subscribes.
- Produces: `data-badge-on-open="read"` on every current static case-study nav mount.

- [ ] **Step 1: Add failing arrival tests**

Assert all three static case-study mounts carry `data-badge-on-open="read"`; `static-chrome.tsx` reads that marker and awards in a mounted effect; landing-gallery code never calls `earn(item.badge, ..., { defer: ... })`; and Pinnables has no arrival marker or direct Read award.

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/badge-journeys.test.mjs`

Expected: FAIL on missing destination markers/effect and existing landing click awards.

- [ ] **Step 3: Implement arrival awarding**

Wrap static navigation rendering in a component whose effect reads its mount marker and calls `awardOnArrival("read")` after child effects subscribe. Add the marker to Surprise Rail, Mixr, and Reasons to Watch. Remove Read earning from every landing layout; leave case-study navigation itself unchanged.

- [ ] **Step 4: Verify arrival GREEN and build**

Run `node --test tests/badge-journeys.test.mjs` and `npm run build`.

Expected: PASS and build exit 0.

- [ ] **Step 5: Commit the arrival behavior**

```bash
git add src/static-chrome.tsx src/pages/home/PosterGallery.tsx src/pages/home/WorkGrid.tsx src/pages/home/PosterRail.tsx public/surprise-rail/index.html public/mixr/index.html public/reasons-to-watch/index.html tests/badge-journeys.test.mjs
git commit -m "feat: award read when a case study opens"
```

---

### Task 5: Fix Route Ownership and Static Hydration

**Files:**
- Create: `src/routePolicy.ts`
- Create: `tests/navigation-shell.test.mjs`
- Modify: `src/App.tsx`
- Modify: `public/surprise-rail/index.html`
- Modify: `public/mixr/index.html`
- Modify: `public/reasons-to-watch/index.html`

**Interfaces:**
- Produces: `normalizeRoutePath`, `normalizeRouteSearch`, and `pageOwnsChrome`.
- Produces: invisible 78px fallback-only headers with intrinsic 13×13 arrow size.

- [ ] **Step 1: Write failing route and fallback tests**

Assert `/`, `/about`, `/about/`, `/projects/`, and `/surprise-rail-v1/` suppress legacy chrome; legacy routes retain it; `?` normalizes to an empty route search while meaningful search remains; App uses normalized values before first paint; and all three static fallbacks use `class="wt-nav wt-nav-fallback"`, `visibility:hidden;height:var(--nav-height,78px)`, and `width="13" height="13"` on the external arrow.

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/navigation-shell.test.mjs`

Expected: FAIL on exact-path ownership and visible unbounded fallback SVGs.

- [ ] **Step 3: Implement route normalization**

Normalize trailing slashes before chrome ownership, body route ground, and animation keys. Replace noncanonical hash pathname/search with React Router navigation using `{ replace: true }`; remove only a browser-level empty `?`, preserving meaningful outer queries.

- [ ] **Step 4: Implement minimal fallback markup**

Add only the fallback marker, inline invisible 78px reservation, and SVG width/height attributes to all three static pages. Do not copy navigation CSS.

- [ ] **Step 5: Verify navigation GREEN and build**

Run `node --test tests/navigation-shell.test.mjs` and `npm run build`.

Expected: PASS and build exit 0.

- [ ] **Step 6: Commit navigation fixes**

```bash
git add src/routePolicy.ts src/App.tsx public/surprise-rail/index.html public/mixr/index.html public/reasons-to-watch/index.html tests/navigation-shell.test.mjs
git commit -m "fix: normalize routes and hide static chrome fallback"
```

---

### Task 6: Full Automated and Browser Verification

**Files:**
- Verify all touched files; no planned production edits.

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: fresh evidence for badge lifetime, journey timing, cross-tab behavior, and navigation correctness.

- [ ] **Step 1: Run all automated tests**

Run: `node --test tests/*.test.mjs`

Expected: zero failures; no failing assertion is deleted unless it is one of the 23 explicitly approved in Task 1.

- [ ] **Step 2: Run a fresh production build**

Run: `npm run build`

Expected: TypeScript and Vite exit 0.

- [ ] **Step 3: Verify one-tab collection lifetime**

In the browser: reset; earn a nonjourney badge; reload; navigate away/back; confirm it remains. Close the only portfolio tab, open a new ordinary portfolio tab, and confirm 0/5.

- [ ] **Step 4: Verify Reimagine timing**

Confirm hover never awards. In one tab open a concept and Back; confirm the stamp occurs only after return. Open a concept in another tab; confirm no award until that concept reports open and focus returns to the landing tab; confirm later focus changes do not replay it.

- [ ] **Step 5: Verify Read timing**

Confirm clicking Surprise Rail or Mixr does not stamp on Home. Confirm its destination card stamps Read on load and Home already shows it when revisited. Confirm a duplicate landing tab synchronizes the same live award. Confirm Pinnables does not award Read.

- [ ] **Step 6: Verify navigation regressions**

Confirm `/?#/about/?` canonicalizes and renders one current nav/footer with no legacy pair; repeat for `/projects/` and `/surprise-rail-v1/`; confirm `/fun/` and `/hbo-max-rtw/` retain legacy chrome. Navigate Home → Surprise Rail/Mixr and confirm no large blue-arrow frame; inspect all three static case studies for one hydrated nav, no fallback marker, and a 13px rendered external arrow.

- [ ] **Step 7: Review diff and stop**

Run `git diff --check`, `git status --short`, and a scoped diff review. Confirm the user's unrelated dirty files remain unchanged by this work. Do not push and do not deploy.
