/* Reasons to Watch — live agent backend.
 *
 * The portfolio itself is a static site on GitHub Pages, so it has nowhere to
 * keep a secret. This Worker is the only place the Anthropic key exists: the
 * page calls it, it calls the model. The key is a Wrangler secret and is never
 * committed, never sent to the browser, and never logged.
 *
 * One endpoint, one agent per call: POST /agent {stage, payload}. The client
 * runs the pipeline stage by stage rather than the Worker running it end to
 * end, for two reasons. Each handoff lands in the UI the moment it exists
 * instead of after a ~30s silence, and the structure of the system is visible
 * in the network tab — which is the whole thesis of the case study.
 */

const MODEL = "claude-sonnet-5";
const API = "https://api.anthropic.com/v1/messages";

/* Only these may call the Worker. A public portfolio endpoint that answers
   anyone is an invitation to run up a bill on someone else's key. */
const ALLOWED_ORIGINS = [
  "https://pranaviram.com",
  "https://www.pranaviram.com",
  "https://pranaviln.com",
  "https://www.pranaviln.com",
  "https://prlakshm.github.io",
  "http://localhost:5173",
];

/* Per-IP budget. Deliberately small: this is a portfolio demo, not a service.
   Held in memory per isolate, so it is a speed bump rather than a guarantee —
   the real ceiling is MAX_TITLES plus the token caps on each call. */
const RATE = { windowMs: 60_000, max: 12 };
const hits = new Map();

const MAX_TITLES = 12;
const MAX_TITLE_LEN = 80;

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });
}

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    hits.set(ip, { n: 1, reset: now + RATE.windowMs });
    return false;
  }
  rec.n += 1;
  return rec.n > RATE.max;
}

/* Titles arrive from a fixed picker in the UI, but nothing stops a caller
   posting whatever it likes, so they are treated as untrusted: clamped in
   count and length, stripped of newlines and braces so a title cannot open a
   new instruction block or close the prompt's own JSON scaffolding. */
function cleanTitles(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((t) => typeof t === "string")
    .map((t) => t.replace(/[\r\n{}]/g, " ").trim().slice(0, MAX_TITLE_LEN))
    .filter(Boolean)
    .slice(0, MAX_TITLES);
}

async function callClaude(env, { system, user, maxTokens, prefill }) {
  const messages = [{ role: "user", content: user }];
  // Prefilling the opening brace keeps the model from wrapping JSON in prose
  // or a code fence, which is the single most common cause of a parse failure.
  if (prefill) messages.push({ role: "assistant", content: prefill });

  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.MODEL || MODEL,
      max_tokens: maxTokens,
      temperature: 0.7,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`upstream ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || "").join("");
  return prefill ? prefill + text : text;
}

function parseJson(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("model returned no JSON object");
  return JSON.parse(raw.slice(start, end + 1));
}

/* ---------------------------------------------------------------- agents -- */

/* The affinity groups are Pranavi's, from the Reasons LLM guide — a mix of
   content- and need-based segmentation. They stay verbatim: the case study's
   claim is that the SYSTEM supplied the judgment, so the taxonomy has to be
   the real one rather than something the model invents per request. */
const AFFINITIES = `
- Popular, binge-worthy fantasy blockbusters with big fanbases and cultural buzz (Game of Thrones, House of the Dragon)
- Iconic, character-driven, often female-led shows with comforting or sassy throwback energy (Sex and the City, Friends)
- Elevated, curated cinema — international gems, arthouse, award-season darlings (Call Me by Your Name, The Grand Budapest Hotel)
- Spectacle, high-stakes action, major studio films — big stars, big budgets (Dune, The Batman)
- Sleuth-lovers piecing together the mystery before the reveal (Mare of Easttown, The Staircase)
- Emmy-winning prestige series known for gravitas, depth and performance (Succession, The Sopranos)
- Immersive fantasy universes with rich lore and worldbuilding (The Lord of the Rings, The Witcher)
- Provocative, stylized, boundary-pushing shows reflecting youth culture (Euphoria, Generation)
- Modern horror — stylish, twisted, elevated or experimental (The Conjuring, It)
- Superhero and graphic-novel worlds, gritty antiheroes to ensemble sagas (Peacemaker, Watchmen)
- Global cinema — open to subtitles and acclaimed international content (Parasite, Amélie)
- Classic TV and film, golden age through early aughts (The Fresh Prince of Bel-Air, Casablanca)
- Prestige-level mysteries and character-rich investigations (The Night Of, Sharp Objects)
- Feel-good, light content that sparks joy and discovery (Queer Eye, Selena + Chef)
- Rugged, intense, morally complex drama (Band of Brothers, Boardwalk Empire)
- Jaw-dropping reality — drama, glam, confrontation (The Real Housewives, 90 Day Fiancé)
- Authentic, culturally expansive storytelling across identity and geography (Insecure, Ramy)`;

const AGENTS = {
  /* 1 — Pattern Analyst. Infers taste and, critically, scores ONE connection.
     The score is what later earns the right to name a familiar title. */
  analyst: (p) => ({
    maxTokens: 1400,
    prefill: "{",
    system:
      "You are a pattern analysis assistant for a personalized TV and film pitch writer. " +
      "You infer what a viewer consistently enjoys and why they watch — the emotional and " +
      "behavioural motivation, not just the genre. You return only JSON.",
    user: `### Recommended title
${p.recommended}

### Watch history
${p.history.join(", ") || "(none given)"}

### Explicitly liked titles
${p.liked.join(", ") || "(none given)"}

### Affinity groups to choose from
${AFFINITIES}

### Task
1. Choose the 2 affinity groups this viewer most belongs to, and say how the recommended title fits them.
2. Find the genuine overlaps between the recommended title and their history — theme, tone, structure, character dynamic. Avoid bare genre matches.
3. Name what is NEW about the recommendation relative to what they already watch.
4. Select exactly ONE title from the liked list with a meaningful connection to the recommendation, and score that connection 0-100. Be strict: 85+ means a specific, defensible link (shared creator, mirrored character dynamic, same emotional architecture), not "both are dramas". If nothing clears 85, still return your best candidate with its honest lower score.

Return only this JSON:
{
  "affinities": ["...", "..."],
  "fit": "one sentence on how the recommended title fits those affinities",
  "overlaps": {"theme": ["..."], "tone": ["..."], "structure": ["..."]},
  "new_elements": ["..."],
  "linked_title": {"title": "<from liked list>", "connection_score": 0, "reason": "specific and surprising explanation of the link"}
}`,
  }),

  /* 2 — Blurb Writer. Three drafts in ONE call.
     The guide records that asking for three drafts produced three near-identical
     ones, which left the Critic with nothing to choose between. Naming a
     distinct angle per draft is the fix, and it is the one place these prompts
     deliberately depart from the originals. */
  writer: (p) => ({
    maxTokens: 900,
    prefill: "{",
    system:
      "You write short, mood-driven pitches for television and film. You are not a " +
      "summarizer: you answer 'why should I watch this?' in a way that feels written " +
      "for one person. You return only JSON.",
    user: `### About the viewer
Affinities: ${(p.analysis.affinities || []).join(" · ")}
How this title fits: ${p.analysis.fit || ""}
Overlaps with what they watch: ${JSON.stringify(p.analysis.overlaps || {})}
What is new for them: ${(p.analysis.new_elements || []).join(", ")}

### The connection you may use
Liked title: ${p.analysis.linked_title?.title || "(none)"}
Connection score: ${p.analysis.linked_title?.connection_score ?? 0}
Why: ${p.analysis.linked_title?.reason || ""}

RULE: you may name that liked title ONLY if its connection score is above 85. At or below 85, write the pitch without naming any previous title — an unearned name-drop reads as a trick.

### Recommended title
${p.recommended}

### Task
Write THREE pitches of at most 135 characters each. Match the emotional tone this viewer gravitates toward. Use vivid, figurative language. Do not summarize the plot; convey the emotional journey.

The three must take genuinely DIFFERENT angles — not three phrasings of one idea:
  A. Lead with mood — what it feels like to watch.
  B. Lead with the connection or contrast to what they already love.
  C. Lead with a specific vivid image, character dynamic, or tension from the title itself.

Return only this JSON:
{"drafts": [{"angle": "mood", "text": "..."}, {"angle": "connection", "text": "..."}, {"angle": "image", "text": "..."}]}`,
  }),

  /* 3 — Editor. The product rules. These are the real constraint list from the
     guide, including the culinary exception on "delicious" — the exception is
     load-bearing, not decoration. */
  editor: (p) => ({
    maxTokens: 900,
    prefill: "{",
    system:
      "You are a professional television blurb editor. You make the minimum edits " +
      "needed to bring a pitch inside the rules, and you change nothing else. " +
      "You return only JSON.",
    user: `### Rules
- 135 characters maximum, after editing.
- Friendly and conversational.
- Replace any specific award or network name (Emmy, Golden Globe, HBO) with a general phrase: critically acclaimed, award-winning, fan favourite.
- Never refer to the recommended title as "this show", "this series" or "this movie", and do not state its name.
- A referenced liked title must appear in full and in italics as <em>Title</em>. If a character is named, pair them with their title.
- No abbreviations. "&" is allowed, sparingly.
- Do not use three-adjective or three-noun structures.
- Do not use the words "grit", "chess" or "delicious" — unless it is genuinely a culinary title, where "delicious" is allowed.
- Not presumptuous: avoid "If you enjoy..." and "You love...".
- Avoid one-to-three word sentences; delete them unless they carry real weight.
- No exclamation points. No em dashes.

### Recommended title
${p.recommended}

### Drafts
${(p.drafts || []).map((d, i) => `${i + 1}. [${d.angle}] ${d.text}`).join("\n")}

Edit each draft to satisfy every rule while preserving its distinct angle. If a draft already complies, return it unchanged.

Return only this JSON:
{"edited": [{"angle": "...", "text": "...", "changes": ["short note per change, or empty array"]}]}`,
  }),

  /* 4 — Critic. Scores and picks. Kept last so a weak choice is traceable to
     judgement rather than to writing. */
  critic: (p) => ({
    maxTokens: 900,
    prefill: "{",
    system:
      "You are a professional television blurb critic. You score candidates against " +
      "explicit criteria and justify the winner. You return only JSON.",
    user: `### The viewer
Affinities: ${(p.analysis?.affinities || []).join(" · ")}
How the title fits: ${p.analysis?.fit || ""}

### Candidates
${(p.edited || []).map((d, i) => `${"ABC"[i]}. [${d.angle}] ${d.text}`).join("\n")}

Score each from 1 (lowest) to 5 (highest) on:
- Creativity — original voice, avoids cliché, would stand out among similar recommendations.
- Informativeness — conveys premise, theme and mood well enough to decide.

Choose the highest total. If two are within one point, creativity breaks the tie.

Return only this JSON:
{
  "winner": "A",
  "winning_text": "the full text of the winning pitch, verbatim",
  "scores": {"A": {"creativity": 0, "informativeness": 0}, "B": {"creativity": 0, "informativeness": 0}, "C": {"creativity": 0, "informativeness": 0}},
  "explanation": "one or two sentences on what made the winner win"
}`,
  }),
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405, origin);
    }
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "origin not allowed" }, 403, origin);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "server is not configured" }, 500, origin);
    }
    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    if (rateLimited(ip)) {
      return json({ error: "Slow down a moment, then try again." }, 429, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid JSON body" }, 400, origin);
    }

    const stage = body.stage;
    const build = AGENTS[stage];
    if (!build) return json({ error: "unknown stage" }, 400, origin);

    const payload = body.payload || {};
    const recommended = typeof payload.recommended === "string"
      ? payload.recommended.replace(/[\r\n{}]/g, " ").trim().slice(0, MAX_TITLE_LEN)
      : "";
    if (!recommended) return json({ error: "no recommended title" }, 400, origin);

    const safe = {
      ...payload,
      recommended,
      history: cleanTitles(payload.history),
      liked: cleanTitles(payload.liked),
    };
    if (stage === "analyst" && !safe.history.length && !safe.liked.length) {
      return json({ error: "add at least one title first" }, 400, origin);
    }

    try {
      const spec = build(safe);
      const raw = await callClaude(env, spec);
      return json({ stage, result: parseJson(raw) }, 200, origin);
    } catch (err) {
      // The upstream message can carry request detail, so it is logged for the
      // operator and replaced with something plain for the browser.
      console.error(`[${stage}]`, err && err.message);
      return json({ error: `The ${stage} step did not come back cleanly. Try again.` }, 502, origin);
    }
  },
};
