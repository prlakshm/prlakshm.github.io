"""Every article option, set as a newspaper clipping. Nothing is written here:
case studies are their own headings and body copy, LinkedIn posts are the
posts, word for word. No mastheads, no invented titles."""
import json, os, re, subprocess, html
import numpy as np
from PIL import Image, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

def halftone(src, dst, w, cell=5, angle=22.5):
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

ART = {
    'surprise-rail': ['public/surprise-rail/art/blind-date-book.jpg', 'public/surprise-rail/art/tile-options.jpg'],
    'mixr': ['public/mixr/art/editor-hero-poster.jpg', 'public/mixr/art/origin-mock.webp'],
    'reasons-to-watch': ['public/reasons-to-watch/art/eval-tool1.png', 'public/reasons-to-watch/art/synch-spreadsheet.png'],
}
for k, files in ART.items():
    for i, f in enumerate(files):
        dst = f'{HERE}/src/half/{k}-{i}.png'
        if not os.path.exists(dst): halftone(os.path.join(ROOT, f), dst, 900)

CSS = """
html,body{margin:0;background:#fff}
body{width:%dpx;color:#141210;font-family:"Noticia Text",Georgia,serif;font-size:14.5px;line-height:1.26}
.page{padding:22px 30px 30px;box-sizing:border-box}
h1{font:700 42px/1.03 "Old Standard TT",serif;margin:0 0 10px;letter-spacing:-.01em}
h2{font:700 21px/1.12 "Old Standard TT",serif;margin:14px 0 5px;break-after:avoid}
h3{font:700 15.5px/1.2 "Old Standard TT",serif;margin:10px 0 3px;break-after:avoid}
.lede{font:italic 16px/1.3 "Old Standard TT",serif;margin:0 0 12px;column-span:all}
.body{column-count:%d;column-gap:16px;column-rule:1px solid #cfcac0;text-align:justify;hyphens:auto}
.body p{margin:0 0 7px;text-indent:1em}
.body p.first{text-indent:0}
.body p.first::first-letter{font:700 40px/.8 "Old Standard TT",serif;float:left;margin:4px 5px 0 0}
.body ul{margin:0 0 7px;padding-left:1.1em}
figure{margin:4px 0 10px;break-inside:avoid}figure img{width:100%%;display:block}
figcaption{font:11px/1.3 "Libre Franklin",sans-serif;color:#222;margin-top:4px}
.post{column-count:%d;column-gap:16px;column-rule:1px solid #cfcac0;text-align:justify;hyphens:auto}
.post p{margin:0 0 8px}
.post p.first::first-letter{font:700 40px/.8 "Old Standard TT",serif;float:left;margin:4px 5px 0 0}
"""
HEAD = '<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&family=Noticia+Text:ital,wght@0,400;0,700;1,400&family=Libre+Franklin:wght@500;700&display=swap" rel="stylesheet"><style>%s</style></head><body><div class="page">'

SKIP = re.compile(r'^(WORK|ABOUT|RESUME|Case study|🔗|Recorded on|Rebuilt in|Working prototype|The interface|The surface|0 / 135|Succession$|Drama · Series|Get Mixr|Sign up|Final reason|Reason for|Your watch|Titles you|Mini prototype|Design engineering prototype|Pick at least|Runs on Claude|Which would better|The four agents|Personalized output|What participants|Segmented copy|What we were|Summer 2025|Iridescent|Waveform, Transition|Each effect gets|Day 1|iPad|Mac laptop|Tip:)')

def case(name, items, width, cols):
    out = [HEAD % (CSS % (width, cols, cols))]
    body = []
    first = True
    figs = iter(ART[name])
    fi = 0
    for tag, t in items:
        if SKIP.match(t) or re.match(r'^\d\d — ', t) or tag == 'figcaption': continue
        if tag == 'h1':
            out.append(f'<h1>{html.escape(t)}</h1>')
            continue
        if tag == 'h2':
            body.append(f'<h2>{html.escape(t)}</h2>')
            # a photograph after the first two sections
            if fi < 2 and len(body) > 4:
                body.append(f'<figure><img src="../src/half/{name}-{fi}.png"></figure>'); fi += 1
        elif tag == 'h3': body.append(f'<h3>{html.escape(t)}</h3>')
        elif tag == 'li': body.append(f'<ul><li>{html.escape(t)}</li></ul>')
        else:
            if first and not body:
                out.append(f'<p class="lede">{html.escape(t)}</p>'); first = False
            else:
                body.append(f'<p class="{"first" if not any(b.startswith("<p") for b in body) else ""}">{html.escape(t)}</p>')
    out.append('<div class="body">' + ''.join(body) + '</div></div></body></html>')
    return ''.join(out)

def post(p, width, cols):
    out = [HEAD % (CSS % (width, cols, cols))]
    if p['photo']: out.append(f'<figure><img src="../src/half/{p["photo"]}.png"></figure>')
    paras = [x for x in p['text'].split('\n\n') if x.strip()]
    out.append('<div class="post">' + ''.join(f'<p class="{"first" if i == 0 else ""}">{html.escape(x)}</p>' for i, x in enumerate(paras)) + '</div>')
    out.append('</div></body></html>')
    return ''.join(out)

def render(name, src, width):
    p = f'{HERE}/options/{name}.html'; open(p, 'w').write(src)
    png = f'{HERE}/options/{name}.png'
    subprocess.run([CHROME, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=2', '--virtual-time-budget=6000',
                    f'--window-size={width},3400', f'--screenshot={png}', f'file://{p}'], capture_output=True)
    im = Image.open(png).convert('RGB')
    a = np.asarray(im.convert('L')); rows = np.where((a < 250).any(axis=1))[0]
    im = im.crop((0, 0, im.width, min(im.height, rows.max() + 60))); im.save(png)
    print(name, im.size)
    return im

CS = json.load(open(f'{HERE}/copy/case-studies.json'))
POSTS = json.load(open(f'{HERE}/copy/posts.json'))
ims = []
for name, (w, c) in {'surprise-rail': (780, 3), 'mixr': (780, 3), 'reasons-to-watch': (780, 3)}.items():
    ims.append(render('cs-' + name, case(name, CS[name], w, c), w))
for p in POSTS:
    ims.append(render(p['id'], post(p, 520, 2), 520))
# contact sheet of options at 1x
th = [i.resize((i.width // 2, i.height // 2), Image.LANCZOS) for i in ims]
H = max(t.height for t in th) + 80; W = sum(t.width for t in th) + 40 * (len(th) + 1)
sheet = Image.new('RGB', (W, H), '#777'); x = 40
for t in th: sheet.paste(t, (x, 40)); x += t.width + 40
sheet.save(f'{HERE}/options/contact-sheet-options.png'); print('sheet', sheet.size)
