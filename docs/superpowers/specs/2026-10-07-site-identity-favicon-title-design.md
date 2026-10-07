# Site identity, favicon, and iPhone title design

## Goal

Use the gold frame as the only active site icon across the public portfolio and keep the primary Safari/iPhone page title concise: `Pranavi Ram | Product Designer`.

## Root cause

The repository still publishes a red-notebook `/favicon.ico`. The main shell and several static case studies list that legacy icon before the gold-frame SVG and PNG icons, while other standalone pages can request `/favicon.ico` implicitly. Browser icon selection and caching can therefore continue to surface the notebook.

The primary document title is already `Pranavi Ram | Product Designer`, but the homepage also declares `og:site_name` as `Pranavi Ram`. An iPhone presentation that combines site identity and page title can consequently repeat the name. No application code currently rewrites `document.title`.

## Design

1. Replace the contents of the root `/favicon.ico` with the gold-frame artwork at standard favicon sizes. Do not leave an active red-notebook fallback at that URL.
2. Use the existing gold-frame SVG, 16-pixel PNG, 32-pixel PNG, and Apple touch icon as the explicit icon set on every user-facing HTML entry point.
3. Add a shared cache-version query to the explicit gold-frame icon URLs so Safari requests the new identity instead of relying on an older cached notebook response.
4. Keep the primary document, Open Graph, and Twitter title as `Pranavi Ram | Product Designer`.
5. Remove the redundant homepage `og:site_name="Pranavi Ram"` rather than introducing a second visible site-name prefix.
6. Do not change page-specific titles for individual case studies, decks, or prototypes; only make their favicon identity consistent.
7. Do not change visual page layouts or duplicate stylesheet rules.

## Scope

The audit covers every shipped HTML entry point under the repository root and `public/`, excluding source-only documentation pages and generated `dist/` output. Standalone public pages should receive explicit metadata when they are intended to be opened directly. Nested prototype helpers may inherit the gold frame from the corrected root favicon, but none may explicitly reference the notebook icons.

The old notebook asset files and their asset-generation script may remain as inactive historical material. They must not be referenced by shipped HTML or occupy `/favicon.ico`.

## Verification

- Add a repository test that enumerates shipped HTML entry points and rejects active notebook favicon references.
- Assert that the primary shell has the exact canonical title and no duplicate `og:site_name`.
- Assert that public user-facing entry points resolve to the gold-frame icon set or the corrected root fallback.
- Run the new test once before implementation and confirm that it fails for the current red-notebook root/favicon metadata.
- After implementation, run the targeted test, the complete test suite, and the production build.
- Inspect the built output to confirm `/favicon.ico` and explicit icon references use the gold frame.
- After deployment, verify the Pages workflow succeeds and the live favicon/title metadata is current.

## Deployment

Commit the verified production changes to `main`, push `main`, publish `dist` to `gh-pages`, and verify the custom domain after GitHub Pages completes.
