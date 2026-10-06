# Navigation Hydration and Route Normalization

## Problem

The portfolio currently exposes two navigation defects caused by the boundary
between the React hash-routed application and standalone case-study documents.

First, standalone case studies contain fallback navigation markup that is
painted before `src/static-chrome.tsx` loads the shared React navigation and its
CSS. The fallback Resume SVG has no intrinsic dimensions, so the browser briefly
renders it at the user-agent SVG size and in the default link color. This is the
large dark-blue arrow visible during local document navigation.

Second, `Shell` decides whether a route owns its chrome by comparing the raw
React Router pathname against an exact list. React Router accepts trailing-slash
variants such as `/about/`, but `/about/` is not equal to `/about`. The shell
therefore mounts the legacy `Header` and `Footer` around a page that already
renders `WtNav` and `SiteFooter`. The deployed `/#/about/?` URL exposes this as
duplicate old and new navigation. The same mismatch applies to `/projects/` and
`/surprise-rail-v1/`.

## Design

### Route ownership

Add a small pure pathname normalizer that:

- preserves `/`;
- removes one or more redundant trailing slashes from non-root paths; and
- leaves the meaningful path segments unchanged.

`Shell` will use the normalized value for chrome-ownership checks, body route
metadata, route-ground selection, and route-transition keys. React Router will
continue to perform route matching. This makes canonical and trailing-slash
forms behave identically without removing the legacy chrome required by `/fun`,
`/hbo-max-surprise`, and `/hbo-max-rtw`.

When the URL contains only redundant trailing slash or empty-query punctuation,
the app will replace it with the canonical hash-route form rather than adding a
history entry. Meaningful query parameters must be preserved.

### Static case-study hydration

Do not copy the full shared navigation stylesheet into standalone HTML files.
Instead, mark the fallback-only header in every static case study that mounts
`#site-nav` and give that fallback inline critical presentation:

- invisible before hydration;
- exactly the shared navigation height, so the page does not jump; and
- removed naturally when React replaces the fallback children.

The hydrated `NavBar` has no fallback marker, so the shared component and its
single CSS source become visible normally. This removes the unstyled SVG paint
while keeping one authoritative navigation implementation.

The treatment applies to every static document using the shared chrome mount,
currently Surprise Rail, Mixr, and Reasons to Watch.

## Testing

Add regression tests that prove:

- root and non-root route normalization;
- every chrome-owning route is recognized with and without trailing slashes;
- legacy routes retain legacy chrome;
- all static case-study fallbacks use the invisible, height-reserving marker;
- the fallback external-arrow SVG cannot render at the user-agent default size.

Then run the complete test suite, a production build, and browser checks for:

- canonical Home, Projects, and About routes;
- malformed/trailing-slash variants, including `/#/about/?`;
- each linked static case study during initial navigation; and
- legacy routes that still require `Header` and `Footer`.

## Scope

This change will not redesign navigation, duplicate the shared CSS, remove the
legacy chrome from routes that still need it, or alter the case-study content.
