# Navigation Hydration and Route Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the pre-hydration arrow flash on standalone case studies and prevent legacy navigation from appearing on trailing-slash variants of pages that own their chrome.

**Architecture:** Put route canonicalization and chrome ownership in a small pure TypeScript policy module, then consume that normalized policy from `Shell` before its first paint. Keep the standalone case studies on the single shared React chrome implementation; their server-rendered fallback header will be an invisible 78px placeholder, with intrinsic SVG dimensions as a second line of defense, until React replaces it.

**Tech Stack:** React 18, React Router 6 `HashRouter`, TypeScript 4.9, Vite 5, Node's built-in test runner, Playwright browser verification.

## Global Constraints

- Do not duplicate the shared navigation CSS in standalone case studies.
- Preserve `/` while removing redundant trailing slashes from non-root routes.
- Preserve meaningful query parameters; remove only empty `?` punctuation.
- Keep legacy `Header` and `Footer` on `/fun`, `/hbo-max-surprise`, and `/hbo-max-rtw`.
- Apply the hydration treatment to Surprise Rail, Mixr, and Reasons to Watch.
- Do not alter case-study content or the user's unrelated About/Home worktree changes.

---

### Task 1: Normalize Route Chrome Ownership

**Files:**
- Create: `src/routePolicy.ts`
- Create: `tests/navigation-shell.test.mjs`
- Modify: `src/App.tsx:1-77`

**Interfaces:**
- Produces: `normalizeRoutePath(pathname: string): string`
- Produces: `normalizeRouteSearch(search: string): string`
- Produces: `pageOwnsChrome(pathname: string): boolean`
- Consumes: React Router's `pathname`, hash-route `search`, `useNavigate`, and the browser's outer `window.location.search`.

- [ ] **Step 1: Write the failing route-policy tests**

Create `tests/navigation-shell.test.mjs`. Read `src/routePolicy.ts`, falling back to an empty string if it does not exist; transpile it with the installed `typescript` package; import the emitted JavaScript through a data URL. Assert:

```js
assert.equal(normalizeRoutePath("/"), "/");
assert.equal(normalizeRoutePath("/about/"), "/about");
assert.equal(normalizeRoutePath("/projects///"), "/projects");
assert.equal(normalizeRouteSearch("?"), "");
assert.equal(normalizeRouteSearch("?cards=gallery"), "?cards=gallery");

for (const path of ["/", "/projects", "/projects/", "/about", "/about/", "/surprise-rail-v1", "/surprise-rail-v1/"]) {
  assert.equal(pageOwnsChrome(path), true, `${path} should suppress legacy chrome`);
}

for (const path of ["/fun", "/fun/", "/hbo-max-surprise", "/hbo-max-rtw/"]) {
  assert.equal(pageOwnsChrome(path), false, `${path} should keep legacy chrome`);
}
```

Also read `src/App.tsx` and assert that `Shell` uses `pageOwnsChrome(pathname)`, uses the normalized path for body ground and animation dependencies, replaces noncanonical hash locations with `navigate(..., { replace: true })`, and removes an outer query only when `window.location.search === '?'`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/navigation-shell.test.mjs`

Expected: FAIL because the route-policy functions and their `Shell` integration do not exist.

- [ ] **Step 3: Implement the pure route policy**

Create `src/routePolicy.ts` with the following behavior:

```ts
const OWN_CHROME = new Set(['/', '/projects', '/about', '/surprise-rail-v1']);

export function normalizeRoutePath(pathname: string) {
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

export function normalizeRouteSearch(search: string) {
  return search === '?' ? '' : search;
}

export function pageOwnsChrome(pathname: string) {
  return OWN_CHROME.has(normalizeRoutePath(pathname));
}
```

- [ ] **Step 4: Integrate canonical route state into `Shell`**

In `src/App.tsx`, import `useNavigate` and the three policy helpers. In `Shell`, retain the raw `pathname` and `search`, derive `routePath` and `routeSearch`, and compute `ownsChrome` from the raw pathname through `pageOwnsChrome`.

Add an effect that first removes the browser-level empty query marker only when `window.location.search === '?'`, preserving the current hash, then calls:

```ts
navigate(
  { pathname: routePath, search: routeSearch },
  { replace: true },
);
```

only when the hash pathname or hash search is noncanonical. Use `routePath` instead of the raw pathname for `body.dataset.route`, ground selection, and route-animation dependencies. This suppresses duplicate chrome during the initial render, before canonicalization runs.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test tests/navigation-shell.test.mjs`

Expected: PASS for all route normalization, ownership, and integration assertions.

- [ ] **Step 6: Run type/build verification for this task**

Run: `npm run build`

Expected: TypeScript and Vite complete with exit code 0.

- [ ] **Step 7: Commit the route fix**

```bash
git add src/routePolicy.ts src/App.tsx tests/navigation-shell.test.mjs
git commit -m "fix: normalize chrome-owning routes"
```

---

### Task 2: Prevent Static Case-Study Fallback Paint

**Files:**
- Modify: `tests/navigation-shell.test.mjs`
- Modify: `public/surprise-rail/index.html:644-657`
- Modify: `public/mixr/index.html:1613-1626`
- Modify: `public/reasons-to-watch/index.html:558-571`

**Interfaces:**
- Consumes: the existing `#site-nav` mount and `src/static-chrome.tsx` replacement behavior.
- Produces: identical `.wt-nav-fallback` placeholder markup in every shared-chrome static document.

- [ ] **Step 1: Add the failing static-fallback regression test**

For each of the three static documents, isolate the markup inside `#site-nav` and assert it contains exactly one fallback header with:

```html
<header class="wt-nav wt-nav-fallback" style="visibility:hidden;height:var(--nav-height,78px)">
```

Assert the fallback Resume SVG carries `width="13" height="13"` in addition to its existing `viewBox`, so it cannot assume the browser's 300×150 default dimensions even if fallback visibility is changed later. Assert that the source does not contain a duplicated block of `.wt-nav` navigation rules.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/navigation-shell.test.mjs`

Expected: FAIL because all three fallback headers are currently visible and their SVGs lack intrinsic width and height.

- [ ] **Step 3: Apply the minimal fallback markup to all static case studies**

In Surprise Rail, Mixr, and Reasons to Watch:

```html
<header class="wt-nav wt-nav-fallback" style="visibility:hidden;height:var(--nav-height,78px)">
```

and:

```html
<svg class="ext-arrow" viewBox="0 0 10 10" width="13" height="13" aria-hidden="true" focusable="false">
```

Do not add or copy any navigation stylesheet. React replaces the fallback header, including its marker and inline placeholder style, when `static-chrome.tsx` mounts.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/navigation-shell.test.mjs`

Expected: PASS for the route and static fallback assertions.

- [ ] **Step 5: Commit the hydration fix**

```bash
git add public/surprise-rail/index.html public/mixr/index.html public/reasons-to-watch/index.html tests/navigation-shell.test.mjs
git commit -m "fix: hide unstyled case-study chrome fallback"
```

---

### Task 3: Full Regression and Browser Verification

**Files:**
- Verify only; no planned production edits.

**Interfaces:**
- Consumes: the completed route policy and static fallback treatment.
- Produces: fresh evidence that the two reported bugs and their sibling cases are resolved.

- [ ] **Step 1: Run the complete automated suite**

Run: `node --test tests/*.test.mjs`

Expected: all tests pass with zero failures. If an unrelated pre-existing failure appears, record it separately and do not weaken its assertion.

- [ ] **Step 2: Run a fresh production build**

Run: `npm run build`

Expected: TypeScript and Vite finish with exit code 0 and produce `dist/`.

- [ ] **Step 3: Verify chrome ownership in the browser**

Against the local Vite server, inspect `.header`, `.footer`, `.wt-nav`, and `.wt-foot` counts for:

```text
/#/                    legacy 0/0, current 1/1
/#/projects            legacy 0/0, current 1/1
/#/projects/           legacy 0/0, current 1/1; URL canonicalized
/#/about               legacy 0/0, current 1/1
/?#/about/?            legacy 0/0, current 1/1; URL canonicalized
/#/surprise-rail-v1/   legacy 0/0
/#/fun/                legacy 1/1, current 0/0
/#/hbo-max-rtw/        legacy 1/1, current 0/0
```

- [ ] **Step 4: Verify standalone case-study navigation**

Open `/surprise-rail/`, `/mixr/`, and `/reasons-to-watch/`. Confirm each settles with one shared `.wt-nav`, no `.wt-nav-fallback`, a 13px rendered external arrow, and no console errors. Navigate from Home into the two linked case studies and visually confirm there is no large blue-arrow frame.

- [ ] **Step 5: Review the final diff and workspace isolation**

Run `git diff --check HEAD~2..HEAD` and `git status --short`.

Expected: only the planned navigation files and the plan/design documents belong to this fix; the user's pre-existing About/Home modifications and untracked assets remain untouched.
