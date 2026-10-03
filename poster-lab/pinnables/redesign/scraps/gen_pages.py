"""Five front pages in the manner of the Times references: skybox teasers,
masthead, a big photograph under a wide headline, an opinion column on the
left, a second story on the right, a strip across the bottom. Every word is
the case study's or the post's; headlines are their headings and sentences.
Images from anywhere in the case study. Run: python3 gen_pages.py"""
import json, os, html, subprocess
import numpy as np
from PIL import Image, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
CS = json.load(open(f'{HERE}/copy/case-studies.json'))
POSTS = {p['id']: p for p in json.load(open(f'{HERE}/copy/posts.json'))}
E = html.escape

def halftone(src, dst, w, cell=4.6, angle=22.5):
    if os.path.exists(dst): return
    im = Image.open(src).convert('L')
    im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    a = 0.1 + 0.78 * (np.asarray(im).astype(float) / 255)
    H, W = a.shape; S = 3
    big = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((W * S, H * S), Image.BILINEAR)).astype(float) / 255
    yy, xx = np.mgrid[0:H * S, 0:W * S].astype(float)
    t = np.deg2rad(angle); u = (xx * np.cos(t) + yy * np.sin(t)) / (cell * S); v = (-xx * np.sin(t) + yy * np.cos(t)) / (cell * S)
    du = u - np.floor(u) - 0.5; dv = v - np.floor(v) - 0.5
    ink = (np.sqrt(du * du + dv * dv) < np.sqrt(1 - big) * 0.62).astype(float)
    Image.fromarray(((1 - ink) * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.45)).save(dst)

IMAGES = {
    'blind-date': 'public/surprise-rail/art/blind-date-book.jpg', 'tiles': 'public/surprise-rail/art/tile-options.jpg',
    'descriptors': 'public/surprise-rail/art/descriptors.jpg', 'reel': 'public/surprise-rail/art/film-reel.jpg',
    'one-rail': 'public/surprise-rail/art/one-rail.jpg', 'check': 'public/surprise-rail/art/check.jpg',
    'eval1': 'public/reasons-to-watch/art/eval-tool1.png', 'eval2': 'public/reasons-to-watch/art/eval-tool2.png',
    'sheet': 'public/reasons-to-watch/art/synch-spreadsheet.png', 'prompt': 'public/reasons-to-watch/art/single-agent-prompt.png',
    'grad-main': 'poster-lab/pinnables/redesign/scraps/src/grad-main.png', 'grad-pillar': 'poster-lab/pinnables/redesign/scraps/src/grad-pillar.png',
    'grad-cap': 'poster-lab/pinnables/redesign/scraps/src/grad-cap.png', 'prom': 'public/about/4.jpg',
    'video': 'poster-lab/pinnables/redesign/scraps/src/video-full.png', 'portrait': 'public/about/3.jpg',
}
for k, f in IMAGES.items(): halftone(os.path.join(ROOT, f), f'{HERE}/src/half/pg-{k}.png', 1000)
IMG = lambda k: f'../src/half/pg-{k}.png'

def T(name, i): return CS[name][i][1]
def strip_sec(t): return t.split('— ', 1)[1] if '— ' in t else t

CSS = """
@import url('https://fonts.googleapis.com/css2?family=UnifrakturCook:wght@700&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&family=Noticia+Text:ital,wght@0,400;0,700;1,400&family=Libre+Franklin:wght@500;700&display=swap');
html,body{margin:0;background:#fff}
body{width:1200px;height:1560px;overflow:hidden;color:#141210;font-family:"Noticia Text",Georgia,serif;font-size:13.2px;line-height:1.25}
.page{padding:20px 30px 0;box-sizing:border-box;height:1560px;overflow:hidden;position:relative}
.sky{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 18px;border-bottom:1px solid #222;padding-bottom:8px}
.sky .t{display:flex;gap:10px;align-items:flex-start}
.sky img{width:118px;height:70px;object-fit:cover;flex:none}
.sky .k{font:700 12px/1.2 "Libre Franklin",sans-serif;color:#b3261e;text-transform:uppercase;letter-spacing:.02em}
.sky .h{font:400 15.5px/1.12 "Old Standard TT",serif;text-transform:uppercase;margin:2px 0 4px}
.sky .pg{font:10px "Libre Franklin",sans-serif;text-transform:uppercase;letter-spacing:.08em;color:#333}
.sky .pg b{font-weight:700;margin-right:6px}
.mast{text-align:center;font:700 74px/1 "UnifrakturCook",serif;margin:14px 0 8px}
.mast.small{font-size:64px}
.ed{text-align:center;font:10.5px "Libre Franklin",sans-serif;text-transform:uppercase;letter-spacing:.14em;border-top:1px solid #222;border-bottom:1px solid #222;padding:4px 0;margin-bottom:14px}
.grid{display:grid;grid-template-columns:200px 1fr 200px;gap:0 18px}
.col{border-right:1px solid #222;padding-right:18px}
.colr{border-left:1px solid #222;padding-left:18px}
.op-h{font:400 31px/1.02 "Old Standard TT",serif;margin:0 0 8px}
.op-img{width:100%;display:block;margin:6px 0 4px}
.name{font:700 13px "Libre Franklin",sans-serif;margin:4px 0 10px}
.kick{font:700 10px "Libre Franklin",sans-serif;text-transform:uppercase;letter-spacing:.1em;border-top:1px solid #222;padding-top:4px;margin:0 0 6px;color:#333}
.body p{margin:0 0 5px;text-indent:1em;text-align:justify;hyphens:auto}
.body p.f{text-indent:0}
.body p.f::first-letter{font:700 36px/.8 "Old Standard TT",serif;float:left;margin:4px 4px 0 0}
.pull{font:700 12px/1.25 "Libre Franklin",sans-serif;border-top:1px solid #222;border-bottom:1px solid #222;padding:6px 0;margin:8px 0;width:60%}
.big img{width:100%;display:block}
.cap{font:10.5px/1.3 "Libre Franklin",sans-serif;color:#222;margin:4px 0 8px}
.cap i{font-style:normal;color:#777;float:right;font-size:9px;text-transform:uppercase}
h1{font:400 56px/1.02 "Old Standard TT",serif;margin:0 0 6px;letter-spacing:-.01em}
.date{font:700 10px "Libre Franklin",sans-serif;text-transform:uppercase;letter-spacing:.1em;margin:0 0 8px}
.sub3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 16px}
.sub3 .mid img,.sub3 .r img{width:100%;display:block}
.h3{font:400 22px/1.1 "Old Standard TT",serif;margin:0 0 6px}
.h3b{font:700 20px/1.1 "Old Standard TT",serif;margin:0 0 6px}
.by{font:700 10px "Libre Franklin",sans-serif;text-transform:uppercase;letter-spacing:.08em;margin:0 0 6px}
.r-h{font:400 33px/1.02 "Old Standard TT",serif;margin:0 0 8px}
.r-d{font:400 15.5px/1.2 "Old Standard TT",serif;margin:0 0 8px;border-bottom:1px solid #222;padding-bottom:6px}
.jump{font:italic 10.5px "Old Standard TT",serif;text-align:right}
.bottom{position:absolute;left:30px;right:30px;bottom:0;border-top:1px solid #222;padding-top:8px;display:grid;grid-template-columns:1fr 260px;gap:0 18px;height:150px;overflow:hidden}
.bottom .bh{font:400 40px/1.02 "Old Standard TT",serif;margin:0 0 6px}
.bottom .dark{background:#111;color:#fff;padding:10px 12px;font:700 22px/1.1 "Libre Franklin",sans-serif;text-transform:uppercase}
.bottom .dark small{display:block;font:500 10px/1.3 "Libre Franklin",sans-serif;text-transform:none;margin-top:8px;color:#ddd}
.body.two{column-count:2;column-gap:16px;column-rule:1px solid #cfcac0}
.body.three{column-count:3;column-gap:16px;column-rule:1px solid #cfcac0}
ul{margin:0 0 6px;padding-left:1.1em}
.stat{font:700 26px/1 "Old Standard TT",serif;margin:6px 0 0}
.statl{font:10px "Libre Franklin",sans-serif;text-transform:uppercase;letter-spacing:.06em;margin:2px 0 8px}
"""

def P(text, first=False): return f'<p class="{"f" if first else ""}">{E(text)}</p>'
def PS(texts): return ''.join(P(t, i == 0) for i, t in enumerate(texts))
def sky(items):
    return '<div class="sky">' + ''.join(
        f'<div class="t">{"<img src=%s>" % IMG(im) if im else ""}<div><div class="k">{E(k)}</div><div class="h">{E(h)}</div><div class="pg"><b>Page {pg}</b>{E(sec)}</div></div></div>'
        for k, h, pg, sec, im in items) + '</div>'
def page(title, parts):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="page">{"".join(parts)}</div></body></html>'

# ----------------------------------------------------------------- page 1: Surprise Rail
sr = 'surprise-rail'
p1 = page('sr', [
    sky([(strip_sec(T(sr, 14)), T(sr, 15), 2, 'Insights', 'reel'), (strip_sec(T(sr, 31)), T(sr, 32), 4, 'Behavior', 'descriptors'), (strip_sec(T(sr, 43)), T(sr, 44), 6, 'Results', None)]),
    f'<div class="mast">{E(T(sr, 4))}</div><div class="ed">Case study &nbsp;|&nbsp; {E(T(sr, 10))}</div>',
    '<div class="grid">',
    # left: opinion-style column, section 05
    f'<div class="col"><div class="op-h">{E(T(sr, 38))}</div><img class="op-img" src="{IMG("check")}"><div class="name">Pranavi Ram</div><div class="kick">{E(strip_sec(T(sr, 37)))}</div><div class="body">{PS([T(sr, 39), T(sr, 40)])}<div class="pull">{E(T(sr, 42)[:60])}</div>{PS([T(sr, 41), T(sr, 42)])}</div></div>',
    # centre: big photo, headline, three columns
    f'<div><div class="big"><img src="{IMG("reel")}" style="height:440px;object-fit:cover;object-position:50% 50%"></div><div class="cap">{E(T(sr, 16))} <i>Pranavi Ram</i></div>'
    f'<h1>{E(T(sr, 18))}</h1><div class="date">{E(strip_sec(T(sr, 17)))}</div>'
    f'<div class="sub3"><div><div class="h3">{E(T(sr, 19))}</div><div class="by">By Pranavi Ram</div><div class="body">{PS([T(sr, 20), T(sr, 21)])}</div></div>'
    f'<div class="mid"><img src="{IMG("blind-date")}"><div class="cap">{E(T(sr, 25))}: {E(T(sr, 26))}; {E(T(sr, 27))}; {E(T(sr, 28))}; {E(T(sr, 29))}</div><div class="body">{PS([T(sr, 23)])}</div></div>'
    f'<div class="r"><div class="h3b">{E(T(sr, 22))}</div><div class="body">{PS([T(sr, 24)])}</div></div></div></div>',
    # right: section 01 + 02
    f'<div class="colr"><div class="r-h">{E(T(sr, 9))}</div><div class="r-d">{E(T(sr, 5))}</div><div class="by">By Pranavi Ram</div>'
    f'<div class="stat">{E(T(sr, 11).split(" ", 2)[0] + " " + T(sr, 11).split(" ", 2)[1])}</div><div class="statl">{E(T(sr, 11).split(" ", 2)[2])}</div>'
    f'<div class="stat">{E(" ".join(T(sr, 12).split(" ")[:3]))}</div><div class="statl">{E(" ".join(T(sr, 12).split(" ")[3:]))}</div>'
    f'<div class="body">{PS([T(sr, 13), T(sr, 16)])}</div><div class="jump">{E(strip_sec(T(sr, 14)))}, Page 2</div></div>',
    '</div>',
    f'<div class="bottom"><div><div class="bh">{E(T(sr, 32))}</div><div class="body three">{PS([T(sr, 33), T(sr, 34), T(sr, 35)])}</div></div><div class="dark">{E(T(sr, 44))}<small>{E(T(sr, 45))}</small></div></div>',
])

# ----------------------------------------------------------------- page 2: Reasons to Watch (01–03)
rw = 'reasons-to-watch'
p2 = page('rw', [
    sky([(strip_sec(T(rw, 26)), T(rw, 27), 2, 'Insight', 'sheet'), (strip_sec(T(rw, 44)), T(rw, 45), 4, 'Behavior', 'prompt'), (strip_sec(T(rw, 129)), T(rw, 130), 7, 'Results', None)]),
    f'<div class="mast small">{E(T(rw, 4))}</div><div class="ed">Case study &nbsp;|&nbsp; {E(T(rw, 7))} &nbsp;|&nbsp; {E(T(rw, 8))} &nbsp;·&nbsp; {E(T(rw, 9))}</div>',
    '<div class="grid">',
    f'<div class="col"><div class="op-h">{E(T(rw, 27))}</div><img class="op-img" src="{IMG("portrait")}"><div class="name">Pranavi Ram</div><div class="kick">{E(strip_sec(T(rw, 26)))}</div><div class="body">{PS([T(rw, 28), T(rw, 29)])}<div class="pull">{E(T(rw, 31))}</div>{PS([T(rw, 30)])}</div></div>',
    f'<div><div class="big"><img src="{IMG("eval1")}" style="height:400px;object-fit:cover;object-position:50% 0"></div><div class="cap">{E(T(rw, 106))} {E(T(rw, 107))} <i>Pranavi Ram</i></div>'
    f'<h1>{E(T(rw, 13))}</h1><div class="date">{E(strip_sec(T(rw, 12)))}</div>'
    f'<div class="sub3"><div><div class="h3">{E(T(rw, 14))}</div><div class="stat">{E(T(rw, 15).split(" ")[0])}</div><div class="statl">{E(" ".join(T(rw, 15).split(" ")[1:]))}</div><div class="stat">{E(T(rw, 16).split(" ")[0])}</div><div class="statl">{E(" ".join(T(rw, 16).split(" ")[1:]))}</div><div class="body">{PS([T(rw, 17)])}</div></div>'
    f'<div class="mid"><img src="{IMG("sheet")}"><div class="cap">{E(T(rw, 24))}</div><div class="body">{PS([T(rw, 18)])}</div></div>'
    f'<div class="r"><div class="h3b">{E(T(rw, 19))}</div><div class="body">{PS([T(rw, 20), T(rw, 21)])}</div><div class="body"><p><i>{E(T(rw, 25))}</i></p></div></div></div></div>',
    f'<div class="colr"><div class="r-h">{E(T(rw, 33))}</div><div class="r-d">{E(T(rw, 5))}</div><div class="by">By Pranavi Ram</div><div class="kick">{E(T(rw, 34))}</div><div class="body">{PS([T(rw, 35)])}</div><ul>{"".join("<li>%s</li>" % E(T(rw, i)) for i in (36, 37, 38, 39))}</ul><div class="kick">{E(T(rw, 40))}</div><div class="body">{PS([T(rw, 41)])}</div><div class="jump">{E(strip_sec(T(rw, 32)))}, Page 3</div></div>',
    '</div>',
    f'<div class="bottom"><div><div class="bh">{E(T(rw, 42))}</div><div class="body three">{PS([T(rw, 43), T(rw, 46)])}</div></div><div class="dark">{E(T(rw, 91))}<small>{E(T(rw, 92))}</small></div></div>',
])

# ----------------------------------------------------------------- page 3: Reasons to Watch (04–06)
p3 = page('rw2', [
    sky([(strip_sec(T(rw, 12)), T(rw, 13), 1, 'Problem', 'eval1'), (strip_sec(T(rw, 32)), T(rw, 33), 3, 'Decisions', None), (T(rw, 122), T(rw, 123)[:60], 6, 'What changed', 'prompt')]),
    f'<div class="mast small">{E(T(rw, 4))}</div><div class="ed">Case study &nbsp;|&nbsp; {E(T(rw, 82))} &nbsp;|&nbsp; {E(T(rw, 108))}</div>',
    '<div class="grid">',
    f'<div class="col"><div class="op-h">{E(T(rw, 130))}</div><div class="name">Pranavi Ram</div><div class="kick">{E(strip_sec(T(rw, 129)))}</div><div class="body">{PS([T(rw, 131)])}</div><div class="kick">{E(T(rw, 132))}</div><ul>{"".join("<li>%s</li>" % E(T(rw, i)) for i in (133, 134, 135))}</ul><div class="kick">{E(T(rw, 136))}</div><div class="body">{PS([T(rw, 137), T(rw, 141)])}</div></div>',
    f'<div><div class="big"><img src="{IMG("prompt")}" style="height:380px;object-fit:cover;object-position:50% 0"></div><div class="cap">{E(T(rw, 81))} <i>Pranavi Ram</i></div>'
    f'<h1>{E(T(rw, 103))}</h1><div class="date">{E(strip_sec(T(rw, 102)))}</div>'
    f'<div class="sub3"><div><div class="h3">{E(T(rw, 115))}</div><div class="body">{PS([T(rw, 117), T(rw, 119), T(rw, 120)])}</div><div class="cap">{E(T(rw, 121))}</div></div>'
    f'<div class="mid"><img src="{IMG("eval2")}"><div class="cap">{E(T(rw, 114))}</div><div class="body">{PS([T(rw, 104)])}</div></div>'
    f'<div class="r"><div class="h3b">{E(T(rw, 109).replace(" ?", "?"))}</div><div class="body">{PS([T(rw, 105), T(rw, 112)])}</div></div></div></div>',
    f'<div class="colr"><div class="r-h">{E(T(rw, 45))}</div><div class="r-d">{E(T(rw, 46)[:160])}</div><div class="by">By Pranavi Ram</div><div class="kick">{E(T(rw, 48))}</div><div class="body">{PS([T(rw, 49), T(rw, 59), T(rw, 65), T(rw, 74)])}</div><div class="kick">{E(T(rw, 91))}</div><ul>{"".join("<li>%s</li>" % E(T(rw, i)) for i in (93, 94, 95, 97))}</ul></div>',
    '</div>',
    f'<div class="bottom"><div><div class="bh">{E(T(rw, 153).split(". ")[0] + ". " + T(rw, 153).split(". ")[1] + ".")}</div><div class="body three">{PS([T(rw, 153), T(rw, 113), T(rw, 138)])}</div></div><div class="dark">{E(T(rw, 122))}<small>{E(T(rw, 128))}</small></div></div>',
])

# ----------------------------------------------------------------- page 4: graduation post
g = POSTS['li-grad']['text'].replace('🐻🤎 ', '').replace(' 💞', '')
gp = [x for x in g.split('\n\n')]
s1 = gp[0].split('! ')  # "Officially a Brown alum" / "This May, I graduated ... start."
p4 = page('grad', [
    sky([('Brown University', 'B.S. in Computer Science and B.A. in Literary Arts', 1, 'Graduation', 'grad-cap'), ('Rewriting the Code', 'The best organizations eva', 2, 'Thanks', None), ('Emma Bowen Foundation', 'Providing me the resources to be here today', 2, 'Thanks', 'grad-pillar')]),
    '<div class="mast">Pranavi Ram</div><div class="ed">Officially a Brown alum &nbsp;|&nbsp; May 2026</div>',
    '<div class="grid">',
    f'<div class="col"><div class="op-h">Brown has truly been my dream school.</div><img class="op-img" src="{IMG("grad-cap")}"><div class="name">Pranavi Ram</div><div class="kick">Opinion</div><div class="body">{PS([gp[1]])}</div></div>',
    f'<div><div class="big"><img src="{IMG("grad-main")}" style="height:520px;object-fit:cover;object-position:50% 30%"></div><div class="cap">{E(s1[1])} <i>Pranavi Ram</i></div>'
    f'<h1>{E(s1[0])}!</h1><div class="date">Providence, R.I.</div>'
    f'<div class="sub3"><div><div class="h3">It gave me four years full of growth, creativity, and community.</div><div class="by">By Pranavi Ram</div><div class="body">{PS([gp[1]])}</div></div>'
    f'<div class="mid"><img src="{IMG("grad-pillar")}"><div class="cap">{E(gp[2])}</div></div>'
    f'<div class="r"><div class="h3b">Special thanks to Claribel Nunez for always checking in on me and being a steadfast guide!</div><div class="body">{PS([gp[1].split("Special thanks")[1].strip().split("! ", 1)[1] if "! " in gp[1].split("Special thanks")[1] else gp[2]])}</div></div></div></div>',
    f'<div class="colr"><div class="r-h">Congrats to all the graduates this year</div><div class="r-d">{E(s1[1])}</div><div class="by">By Pranavi Ram</div><div class="body">{PS([gp[2], gp[0]])}</div></div>',
    '</div>',
    f'<div class="bottom"><div><div class="bh">My heart is so full I don\'t know where to start.</div><div class="body three">{PS([gp[0], gp[1]])}</div></div><div class="dark">I\'m excited for what comes next!<small>{E(gp[2])}</small></div></div>',
])

# ----------------------------------------------------------------- page 5: Warner Bros. Discovery posts
w = POSTS['li-wbd']['text'].replace('🦄 ', '').replace('🌱 ', '').replace('🧭 ', '')
wp = w.split('\n\n')
a = POSTS['li-almost']['text'].replace('🎉 ', '').replace('🍿 ', '')
ap = a.split('\n\n')
n = POSTS['li-next']['text'].replace('🎬 ', '').replace('🌟 ', '')
np_ = n.split('\n\n')
p5 = page('wbd', [
    sky([('Warner Bros. Discovery', 'Product Design intern for the HBO Max team', 1, 'Summer', 'prom'), ('Intern Appreciation Week', 'See me and my manager\'s interview', 3, 'Video', 'video'), ('What\'s next for me?', 'Joining Warner Bros. Discovery as a Product Design Intern in NYC', 5, 'Announcement', None)]),
    '<div class="mast">Pranavi Ram</div><div class="ed">Warner Bros. Discovery &nbsp;|&nbsp; HBO Max &nbsp;|&nbsp; New York</div>',
    '<div class="grid">',
    f'<div class="col"><div class="op-h">Making work feel like a playground</div><div class="name">Pranavi Ram</div><div class="kick">Intern Appreciation Week</div><div class="body">{PS([ap[0], ap[1]])}</div><div class="pull">Find out what HBO Max character I think he\'s most like</div><div class="body">{PS([POSTS["li-thanks"]["text"]])}</div></div>',
    f'<div><div class="sub3" style="grid-template-columns:1fr 1fr;gap:0 14px"><div><img src="{IMG("prom")}" style="width:100%;display:block"><div class="cap">{E(wp[3])}</div></div><div><img src="{IMG("video")}" style="width:100%;display:block"><div class="cap">Tune into Warner Bros. Discovery next week for Intern Appreciation Week to see me and my manager\'s interview. <i>Warner Bros. Discovery</i></div></div></div>'
    f'<h1>From changing the way I stream to the way I design!</h1><div class="date">New York</div>'
    f'<div class="sub3"><div><div class="h3">I joined Warner Bros. Discovery as a Product Design intern for the HBO Max team</div><div class="by">By Pranavi Ram</div><div class="body">{PS([wp[0]])}</div></div>'
    f'<div class="mid"><div class="h3b">Through this internship, I gained a deeper appreciation for strategy-based design</div><div class="body">{PS([wp[1]])}</div></div>'
    f'<div class="r"><div class="h3b">A heartfelt thank you to my amazing and thoughtful manager, Hakha Mashayekhi</div><div class="body">{PS([wp[2]])}</div></div></div></div>',
    f'<div class="colr"><div class="r-h">What\'s next for me?</div><div class="r-d">{E(np_[0].split("? ", 1)[1])}</div><div class="by">By Pranavi Ram</div><div class="body">{PS([np_[1], np_[2]])}</div><div class="jump">{E(np_[3].replace("hashtag ", ""))}</div></div>',
    '</div>',
    f'<div class="bottom"><div><div class="bh">This is a huge milestone in my career</div><div class="body three">{PS([np_[1], wp[0]])}</div></div><div class="dark">Nothing short of a transformative experience<small>{E(wp[1])}</small></div></div>',
])

ims = []
for name, src in [('sr-front', p1), ('rtw-front', p2), ('rtw-two', p3), ('grad', p4), ('wbd', p5)]:
    p = f'{HERE}/pages/{name}.html'; open(p, 'w').write(src)
    png = f'{HERE}/pages/{name}.png'
    subprocess.run([CHROME, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=2', '--virtual-time-budget=8000',
                    '--window-size=1200,1560', f'--screenshot={png}', f'file://{p}'], capture_output=True)
    ims.append(Image.open(png).convert('RGB')); print(name, ims[-1].size)
th = [i.resize((600, 780), Image.LANCZOS) for i in ims]
sheet = Image.new('RGB', (600 * 5 + 40 * 6, 860), '#777'); x = 40
for t in th: sheet.paste(t, (x, 40)); x += 640
sheet.save(f'{HERE}/pages/contact-sheet-pages.png')
