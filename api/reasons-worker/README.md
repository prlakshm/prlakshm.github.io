# Reasons to Watch — live agent backend

Powers the "Generate a reason" prototype at the end of `/reasons-to-watch/`.

The portfolio is a static site (`gh-pages -d dist`), so it has nowhere to keep a
secret. This Worker is the only place the Anthropic key exists. The browser
calls the Worker; the Worker calls the model.

## Deploy

```bash
cd api/reasons-worker && npx wrangler deploy
```

Then set the key. **Run this yourself — it prompts for the value and sends it
straight to Cloudflare, so the key never lands in the repo, a log, or a chat:**

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

Wrangler prints the deployed URL. Put it in `public/reasons-to-watch/index.html`
as `RTW_ENDPOINT` (search for that constant — there is exactly one).

## What it does

`POST /` with `{stage, payload}`. One agent per call, four calls per generation,
orchestrated by the page so each handoff renders the moment it exists rather
than after a single long silence.

| stage | in | out |
|---|---|---|
| `analyst` | watch history, liked titles, recommended title | affinities, overlaps, one linked title + connection score |
| `writer` | analysis | three drafts, each a different angle |
| `editor` | drafts | same three, edited to the product rules |
| `critic` | edited drafts | scores and a winner |

The prompts follow *Pranavi's Guide to the Reasons LLM*, with one deliberate
change: the writer is asked for three **different angles** (mood / connection /
image). The guide records that asking for three drafts produced three
near-identical ones, leaving the critic nothing to choose between. Naming the
angle per draft is the fix.

## Guardrails

- **Origin allowlist** — `pranaviram.com`, the legacy `pranaviln.com` domain,
  `prlakshm.github.io`, and localhost. A public endpoint that answers anyone is
  a way to run up a bill on your key.
- **Rate limit** — 12 requests per IP per minute, in-isolate. A speed bump; the
  real ceilings are the title cap and the `max_tokens` on each call.
- **Input clamping** — titles are capped at 12 × 80 characters and stripped of
  newlines and braces, so a pasted "title" cannot open a new instruction block
  or close the prompt's own JSON scaffolding.
- **Error text** — upstream messages can echo request detail, so they are logged
  for you and replaced with something plain for the browser.

## Cost

Four calls per generation, all small. On `claude-sonnet-5` a run is well under a
cent. Switch `MODEL` in `wrangler.toml` to `claude-opus-5` for stronger copy at
higher latency and cost.

## Local

```bash
npx wrangler dev
```

Serves on `http://localhost:8787`; localhost:5173 is already in the allowlist.
