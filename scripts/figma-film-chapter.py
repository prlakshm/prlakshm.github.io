"""One-time edit: the Figma Sound chapter of public/branding/index.html becomes the launch-film chapter.

    film (hero) -> "a design system material" -> the interaction / variables / Dev Mode mocks
    on the film's black dot canvas, in the film's colours (ink #0D0C0F as the video decodes it, cream #F4EDE0,
    the "sound" yellow #FFE38A, canvas dots #34343A).

Every replacement asserts it matched exactly once, so a changed source fails loudly instead of half-applying.
Run once from the repo root: python3 scripts/figma-film-chapter.py, then node scripts/build-figma-deck.mjs."""
import re
from pathlib import Path

P = Path(__file__).resolve().parent.parent / "public/branding/index.html"
h = P.read_text()


def rep(old, new, n=1):
    global h
    c = h.count(old)
    assert c == n, f"expected {n} x {old[:70]!r}, found {c}"
    h = h.replace(old, new)


# ---------------------------------------------------------------- tokens + canvas
rep("--sound-ground: #052427;", "--sound-ground: #0D0C0F;")
rep("--sound-ink: #82a6a6;", "--sound-ink: #F4EDE0;")
rep(".key-phrase { color: #b8d0cf;", ".key-phrase { color: #FFE38A;")
rep("""        height: 2px;
        background: #0d99ff;""", """        height: 2px;
        background: #FFE38A;""")
rep("""      .sound-slide {
        background: var(--sound-ground);""", """      .sound-slide {
        /* the film's canvas: near-black with a dot every ~2.5 % of the width (48 px at 1920) */
        --dot-gap: max(20px, 2.5vw);
        background-color: var(--sound-ground);
        background-image: radial-gradient(circle at center, #34343A 0 calc(var(--dot-gap) * .046), transparent calc(var(--dot-gap) * .046 + .75px));
        background-position: center;
        background-size: var(--dot-gap) var(--dot-gap);""")
rep(".sound-title { background: var(--sound-ground); isolation: isolate; }", ".sound-title { isolation: isolate; }")
rep("background: rgba(5, 36, 39, .78);", "background: rgba(13, 12, 15, .78);")
rep("border: 1px solid rgba(184, 208, 207, .44);", "border: 1px solid rgba(244, 237, 224, .32);")
rep("""        bottom: max(18px, env(safe-area-inset-bottom));
        color: #b8d0cf;""", """        bottom: max(18px, env(safe-area-inset-bottom));
        color: #F4EDE0;""")
rep("box-shadow: 0 0 0 4px rgba(130,166,166,.18);", "box-shadow: 0 0 0 4px rgba(255,227,138,.22);")

FILM_CSS = """
      /* The launch film. The slide is the film's own dotted canvas, so whatever shape the screen is, the space
         around the 16:9 picture reads as more canvas, not a letterbox. */
      .film-slide { padding: 0; }
      .film-stage { aspect-ratio: 16 / 9; position: relative; width: min(100vw, calc(100svh * 16 / 9)); }
      .film-video { background: transparent; cursor: pointer; display: block; height: 100%; object-fit: contain; width: 100%; }
      .film-replay {
        backdrop-filter: blur(12px);
        background: rgba(13, 12, 15, .78);
        border: 1px solid rgba(244, 237, 224, .32);
        border-radius: 999px;
        bottom: 50%;
        color: #F4EDE0;
        cursor: pointer;
        font: 400 13px/1 "General Sans", "Helvetica Neue", Arial, sans-serif;
        left: 50%;
        letter-spacing: .02em;
        padding: 10px 16px;
        position: absolute;
        transform: translate(-50%, 50%);
      }
      .film-replay[hidden] { display: none; }
      .film-rotate-hint {
        bottom: max(22px, env(safe-area-inset-bottom));
        color: rgba(244, 237, 224, .55);
        display: none;
        font: 400 12px/1 "General Sans", "Helvetica Neue", Arial, sans-serif;
        left: 50%;
        letter-spacing: .02em;
        position: absolute;
        transform: translateX(-50%);
        white-space: nowrap;
      }
      /* portrait phones: the film sits centred on the canvas, with a nudge to turn the phone */
      @media (orientation: portrait) and (max-width: 700px) {
        .film-rotate-hint { display: block; }
      }
      /* phone turned sideways: the film takes the whole screen (full height; phones are wider than 16:9, so the
         dotted canvas carries the thin strips at the sides) and the slide chrome steps aside */
      @media (orientation: landscape) and (max-height: 560px) {
        .film-slide { height: 100svh; min-height: 100svh; }
        .film-stage { aspect-ratio: auto; height: 100svh; width: 100vw; }
      }
"""
rep("""      .sound-copy .reveal-line { display: block;""", FILM_CSS.lstrip("\n") + """      .sound-copy .reveal-line { display: block;""")

# ---------------------------------------------------------------- slides
a = h.index('      <section class="slide sound-slide sound-title" data-slide="10"')
b = h.index('</section>', h.index('data-slide="10"')) + len('</section>')
FILM = """      <section class="slide sound-slide sound-title film-slide" data-slide="10" aria-label="Figma Sound launch film">
        <div class="film-stage">
          <video class="film-video" id="figmaFilm" muted playsinline preload="metadata" poster="./assets/film/figma-sound-film-poster.jpg" aria-label="Figma Sound launch film, 27 seconds. Tap to play or pause.">
            <source src="./assets/film/figma-sound-film.webm" type="video/webm" />
            <source src="./assets/film/figma-sound-film.mp4" type="video/mp4" />
          </video>
          <button class="film-replay" id="filmReplay" type="button" hidden>Replay</button>
        </div>
        <span class="film-rotate-hint" aria-hidden="true">Rotate to watch full screen</span>
      </section>"""
h = h[:a] + FILM + h[b:]
for n in ("11", "13", "17", "18"):
    a = h.index(f'      <section class="slide sound-slide', h.index(f'data-slide="{n}"') - 200)
    a = h.rindex("      <section", 0, h.index(f'data-slide="{n}"'))
    b = h.index("</section>", a) + len("</section>")
    while h[b:b + 1] == "\n":
        b += 1
    h = h[:a] + h[b:]
    assert f'data-slide="{n}"' not in h, n
# renumber the chapter's folios (the Cursor chapter uses the same "0N / 09" text, so edit inside each section)
for n, (was, now) in {"12": ("03 / 09", "02 / 05"), "14": ("05 / 09", "03 / 05"), "15": ("06 / 09", "04 / 05"),
                      "16": ("07 / 09", "05 / 05")}.items():
    a = h.rindex("      <section", 0, h.index(f'data-slide="{n}"'))
    b = h.index("</section>", a)
    sec = h[a:b]
    tag = f'<span class="folio" aria-hidden="true">{was}</span>'
    assert sec.count(tag) == 1, (n, was)
    h = h[:a] + sec.replace(tag, f'<span class="folio" aria-hidden="true">{now}</span>') + h[b:]

# ---------------------------------------------------------------- JS: the prototypes moved; the film follows the deck
rep('{ frame: document.getElementById("interactionProto"), index: 13 }', '{ frame: document.getElementById("interactionProto"), index: 11 }')
rep('{ frame: document.getElementById("variablesProto"), index: 14 }', '{ frame: document.getElementById("variablesProto"), index: 12 }')
rep('{ frame: document.getElementById("devmodeProto"), index: 15 }', '{ frame: document.getElementById("devmodeProto"), index: 13 }')
rep("""      const playTitleSequence = () => {
        clearTitleTimers();""", """      /* The launch film is the chapter's hero: it plays while it is the slide in view (muted until the reader
         turns sound on, as browsers require), pauses when they move on, and offers a replay at the end. */
      const film = document.getElementById("figmaFilm");
      const filmReplay = document.getElementById("filmReplay");
      let filmPausedByReader = false;
      const syncFilm = () => {
        if (!film) return;
        film.muted = !(soundEnabled && audioUnlocked);
        const onFilm = currentIndex() === slides.indexOf(titleSlide);
        if (onFilm && film.paused && !film.ended && !filmPausedByReader) film.play().catch(() => {});
        else if (!onFilm && !film.paused) film.pause();
        if (!onFilm) filmPausedByReader = false;
      };
      if (film) {
        film.addEventListener("click", () => {
          if (film.paused) { filmPausedByReader = false; film.play().catch(() => {}); }
          else { filmPausedByReader = true; film.pause(); }
        });
        film.addEventListener("ended", () => { if (filmReplay) filmReplay.hidden = false; });
        film.addEventListener("play", () => { if (filmReplay) filmReplay.hidden = true; });
      }
      if (filmReplay) filmReplay.addEventListener("click", () => {
        film.currentTime = 0;
        filmPausedByReader = false;
        film.play().catch(() => {});
      });

      const playTitleSequence = () => {
        clearTitleTimers();
        if (film) { syncFilm(); return; }""")
rep("""          win.postMessage({ type: "sound-proto", run: index === own, sound: soundEnabled && audioUnlocked }, "*");
        }
      };""", """          win.postMessage({ type: "sound-proto", run: index === own, sound: soundEnabled && audioUnlocked }, "*");
        }
        syncFilm();
      };""")

P.write_text(h)
print("ok", P, len(h))


# ---------------------------------------------------------------- the three prototypes (iframes that fill their slides)
CANVAS = ("background-color: #0D0C0F; background-image: radial-gradient(circle at center, #34343A 0 calc(max(20px, 2.5vw) * .046), "
          "transparent calc(max(20px, 2.5vw) * .046 + .75px)); background-position: center; background-size: max(20px, 2.5vw) max(20px, 2.5vw);")
FONT = ('@font-face { font-family: "JetBrains Mono"; src: url("../fonts/jetbrains-mono/JetBrainsMono-Variable.woff2") format("woff2"); '
        'font-weight: 100 800; font-display: swap; }\n')
# the film's .wav chip: the yellow "sound" pill, ink JetBrains Mono (kit d1_film_keys.wav_chip)
CHIP = 'background: #FFE38A; border-radius: 999px; color: #0D0C0F; font-family: "JetBrains Mono", ui-monospace, monospace;'


def patch(name, pairs):
    p = P.parent / name
    s = p.read_text()
    for old, new in pairs:
        c = s.count(old)
        assert c == 1, f"{name}: expected 1 x {old[:60]!r}, found {c}"
        s = s.replace(old, new)
    p.write_text(s)
    print("ok", p)


if __name__ == "__main__":
    patch("interaction-proto.html", [
        ("    background: #052427;\n", f"    {CANVAS}\n"),
    ])
    patch("variables-proto.html", [
        ("  body { background: #052427; }", "  body { " + CANVAS + " }"),
        ("  .chip.chip-tap { background: #3d5a82; }", "  .chip, .chip.chip-tap { " + CHIP + " }"),
        ("<style>", "<style>\n" + FONT, ),
    ])
    patch("devmode-proto.html", [
        ("  body { background: #052427; }", "  body { " + CANVAS + " }"),
        ("""    font-size: 12px;
  }
  .play {""", """    font-size: 12px;
    """ + CHIP + """
  }
  .play {"""),
        ("<style>", "<style>\n" + FONT),
    ])
# The Figma marks in the mock slides' corners keep their brand colours (a later pass made them cream, then reverted).
