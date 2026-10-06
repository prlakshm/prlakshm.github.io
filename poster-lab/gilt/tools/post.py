#!/usr/bin/env python3
"""post.py <capdir> [--ref <dir>] - crops, filmstrip, debug strip, contact sheet and metrics
for one capture made by capture.cjs. All frames are dpr 2 (2 device px per CSS px).

Outputs in <capdir>:
  zoom_hero_rest.png, zoom_hero_lamp.png, zoom_edge.png, zoom_small.png   3x nearest of 200x120 CSS px
  zooms.png       the four close-ups (with --ref: each beside a same-scale study crop; study only)
  film.png        8 idle frames 1 s apart, 720 px wide, stacked
  debugstrip.png  caught / hot / glow / height / near / normal around the hero
  mask_d.png, mask_m.png   foil coverage masks (white = foil), for measure scripts
  cs.png          contact sheet
  metrics.json    the plan §4.3 numbers this capture can answer
"""
import json, os, sys, argparse
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi, stats as sst
from skimage import color

ap = argparse.ArgumentParser()
ap.add_argument('cap')
ap.add_argument('--ref', default=None, help='dir with same-scale study crops (crop_theirs_*.png, 2x device scale)')
a = ap.parse_args()
D = a.cap
DPR = 2
np.seterr(all='ignore')


def load(name):
    p = os.path.join(D, name)
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float64) / 255 if os.path.exists(p) else None


def luma(im):
    return im[..., 0] * 0.299 + im[..., 1] * 0.587 + im[..., 2] * 0.114


def lab(im):
    with np.errstate(all='ignore'):
        return color.rgb2lab(np.clip(im, 0, 1))


def save(arr, name):
    Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(D, name))


def label(img, text):
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)) if isinstance(img, np.ndarray) else img
    out = Image.new('RGB', (im.width, im.height + 18), 'white')
    out.paste(im, (0, 18))
    ImageDraw.Draw(out).text((4, 3), text, fill=(23, 23, 23))
    return out


def crop(im, cx, cy, w=400, h=240):
    H, W = im.shape[:2]
    x0 = int(np.clip(cx - w / 2, 0, max(0, W - w)))
    y0 = int(np.clip(cy - h / 2, 0, max(0, H - h)))
    return im[y0:y0 + h, x0:x0 + w], (x0, y0)


def up(arr, k=3):
    return np.repeat(np.repeat(arr, k, 0), k, 1)


def de00(rgb1, rgb2):
    l1 = color.rgb2lab(np.array(rgb1, float).reshape(1, 1, 3) / 255)
    l2 = color.rgb2lab(np.array(rgb2, float).reshape(1, 1, 3) / 255)
    return float(color.deltaE_ciede2000(l1, l2)[0, 0])


sp = json.load(open(os.path.join(D, 'spots.json')))
spots, pieces = sp['spots'], sp['pieces']
st = json.load(open(os.path.join(D, 'stats.json')))
rest = load('d_rest_t0.png')
off = load('d_lamp_off.png')
lamp = load('d_lamp_hero.png')
cov = load('cov_d.png')
foilm = cov[..., 0] > 0.5
covm = cov[..., 1]
core = ndi.binary_erosion(foilm, iterations=2)
save(np.stack([foilm] * 3, -1).astype(float), 'mask_d.png')
covmb = load('cov_m.png')
if covmb is not None:
    save(np.stack([covmb[..., 0] > 0.5] * 3, -1).astype(float), 'mask_m.png')

# ------------------------------------------------------------------ close-ups
hs = np.array(spots['hero']['spot']) * DPR
zr, o_r = crop(rest, *hs)
zl, _ = crop(lamp, *hs)
# hero edge: the top-left-most boundary point of the hero's foil
bx = np.array(spots['hero']['bbox']) * DPR
edge = foilm & ~ndi.binary_erosion(foilm)
ys, xs = np.nonzero(edge)
sel = (xs >= bx[0]) & (xs <= bx[2]) & (ys >= max(bx[1], 8)) & (ys <= bx[3])
if sel.any():
    k = np.argmin((xs[sel] - bx[0]) + 1.6 * (ys[sel] - bx[1]))
    ex, ey = xs[sel][k], ys[sel][k]
else:
    ex, ey = hs
ze, _ = crop(rest, ex + 120, ey + 60)
small = spots.get('smallest') or spots['hero']
zs, _ = crop(rest, *(np.array(small['centre']) * DPR))
zooms = [('hero rest', zr), ('hero lamp', zl), ('edge (rim, shoulder, pooled shade)', ze), ('smallest foil', zs)]
for (n, z), f in zip(zooms, ['zoom_hero_rest.png', 'zoom_hero_lamp.png', 'zoom_edge.png', 'zoom_small.png']):
    save(up(z), f)
tiles = []
refs = {'hero rest': 'crop_theirs_at-rest.png', 'hero lamp': 'crop_theirs_cursor-lamp.png',
        'edge (rim, shoulder, pooled shade)': 'crop_theirs_at-rest.png', 'smallest foil': 'crop_theirs-stripe_rest.png'}
for n, z in zooms:
    t = label(up(z), f'ours: {n} (3x)')
    if a.ref and os.path.exists(os.path.join(a.ref, refs[n])):
        r = Image.open(os.path.join(a.ref, refs[n])).convert('RGB')
        r = r.resize((int(r.width * 1.5), int(r.height * 1.5)), Image.NEAREST)   # 2x device -> 3x
        r = label(r, 'study crop, same scale (not shipped)')
        row = Image.new('RGB', (t.width + r.width + 8, max(t.height, r.height)), 'white')
        row.paste(t, (0, 0)); row.paste(r, (t.width + 8, 0))
        t = row
    tiles.append(t)
zs_h = sum(t.height for t in tiles) + 8 * len(tiles)
zsheet = Image.new('RGB', (max(t.width for t in tiles), zs_h), 'white')
y = 0
for t in tiles:
    zsheet.paste(t, (0, y)); y += t.height + 8
zsheet.save(os.path.join(D, 'zooms.png'))

# ------------------------------------------------------------------ filmstrip
film = []
for i in range(8):
    f = Image.open(os.path.join(D, f'film_{i}.png')).convert('RGB')
    film.append(label(f.resize((720, int(round(720 * f.height / f.width))), Image.LANCZOS), f't = {i} s'))
fs_img = Image.new('RGB', (720, sum(f.height for f in film)), 'white')
y = 0
for f in film:
    fs_img.paste(f, (0, y)); y += f.height
fs_img.save(os.path.join(D, 'film.png'))

# ------------------------------------------------------------------ debug strip
dbg = []
for d in ['caught', 'hot', 'glow', 'height', 'near', 'normal']:
    im = load(f'dbg_{d}.png')
    if im is None:
        continue
    c, _ = crop(im, *hs, w=600, h=300)
    dbg.append(label(c, d))
if dbg:
    ds = Image.new('RGB', (3 * 600 + 16, 2 * dbg[0].height + 8), 'white')
    for i, t in enumerate(dbg):
        ds.paste(t, ((i % 3) * 608, (i // 3) * (t.height + 8)))
    ds.save(os.path.join(D, 'debugstrip.png'))

# ------------------------------------------------------------------ metrics
M = {}


def foil_stats(im, mask):
    L = luma(im)[mask]
    p = np.percentile(L, [5, 10, 50, 90, 99])
    rgb = im[mask] * 255
    return dict(mean=round(L.mean(), 3), p5=round(p[0], 3), p50=round(p[2], 3), p99=round(p[4], 3),
                skew=round(float(sst.skew(L)), 2), frac_gt_0_9=round(float((L > 0.9).mean()), 3),
                rgb_p10=[int(v) for v in np.percentile(rgb, 10, 0)], rgb_p50=[int(v) for v in np.percentile(rgb, 50, 0)],
                rgb_p90=[int(v) for v in np.percentile(rgb, 90, 0)])


M['foil_rest_idle_lamp'] = foil_stats(rest, core)
M['foil_rest_lamp_off'] = foil_stats(off, core)
fr = M['foil_rest_lamp_off']
M['gold_colour'] = dict(p10_dE00=round(de00(fr['rgb_p10'], (137, 96, 19)), 1), p50_dE00=round(de00(fr['rgb_p50'], (172, 132, 48)), 1))
lab_off = lab(off)
Lf, af, bf = lab_off[..., 0][core], lab_off[..., 1][core], lab_off[..., 2][core]
hue = (np.degrees(np.arctan2(bf, af)) + 360) % 360
M['gold_colour']['olive_px_frac'] = round(float(((Lf < 70) & (hue > 105) & (np.hypot(af, bf) > 8)).mean()), 4)
# lamp: within 150 CSS px of the hero spot
yy, xx = np.mgrid[0:rest.shape[0], 0:rest.shape[1]]
near_lamp = core & (np.hypot(xx - hs[0], yy - hs[1]) < 150 * DPR)
if near_lamp.sum() > 50:
    Ll, Lo = luma(lamp)[near_lamp], luma(off)[near_lamp]
    M['foil_under_lamp'] = dict(mean=round(Ll.mean(), 3), frac_gt_0_9=round(float((Ll > 0.9).mean()), 3),
                                frac_lifted_0_08=round(float(((Ll - Lo) > 0.08).mean()), 3))
# glints at rest (lamp off): hot specks > 0.85 per 1000 CSS px^2
Lr = luma(off)
hot = (Lr > 0.85) & core
lbl, n = ndi.label(hot)
sizes = ndi.sum(hot, lbl, range(1, n + 1)) if n else np.array([0])
area_css = core.sum() / DPR ** 2
M['glints_rest'] = dict(per_1000_css_px2=round(n / area_css * 1000, 1), largest_share=round(float(sizes.max() / max(1, hot.sum())), 3))
# texture scale inside the hero (power share by wavelength, CSS px)
hb = (np.array(spots['hero']['bbox']) * DPR).astype(int)
sub = (slice(max(0, hb[1]), hb[3]), slice(max(0, hb[0]), hb[2]))
Lh, mh = Lr[sub], core[sub]
if mh.sum() > 400:
    m = ndi.gaussian_filter(mh.astype(float), 2) * mh
    x = (Lh - (Lh * m).sum() / m.sum()) * m
    n0 = 256
    cy, cx = [int(v.mean()) for v in np.nonzero(mh)]
    pad = np.zeros((n0, n0))
    s2 = x[max(0, cy - n0 // 2):cy + n0 // 2, max(0, cx - n0 // 2):cx + n0 // 2]
    pad[:s2.shape[0], :s2.shape[1]] = s2
    P = np.abs(np.fft.fft2(pad)) ** 2
    f = np.hypot(np.fft.fftfreq(n0)[:, None], np.fft.fftfreq(n0)[None, :]) * DPR
    P[0, 0] = 0
    tot = P.sum()
    M['texture'] = dict(lt2px=round(float(P[f > 0.5].sum() / tot), 3), lt4px=round(float(P[f > 0.25].sum() / tot), 3),
                        gt8px=round(float(P[(f < 0.125) & (f > 0)].sum() / tot), 3))
    G0, G1 = Lh, ndi.gaussian_filter(Lh, 0.7)
    inner = ndi.binary_erosion(mh, iterations=6)
    M['texture']['finest_dog_contrast'] = round(float((G0 - G1)[inner].std() / Lh[inner].mean()), 3)
# ground grain and colour
dist = ndi.distance_transform_edt(covm < 0.02)
ground = covm < 0.02
far_g = dist > 12 * DPR
near_g = ground & (dist <= 6 * DPR) & (dist > 1)
Lg = luma(off)
hp = Lg - ndi.gaussian_filter(Lg, 2.0)
M['ground'] = dict(hp_std_overall=round(float(hp[far_g].std()), 4), hp_std_near_gold=round(float(hp[near_g].std()), 4),
                   foil_over_ground=round(float(hp[core].std() / max(1e-6, hp[far_g].std())), 1))
gl = lab_off[ground]
gh = (np.degrees(np.arctan2(gl[:, 2], gl[:, 1])) + 360) % 360
green = (gh > 115) & (gh < 190) & (np.hypot(gl[:, 1], gl[:, 2]) > 10)
M['no_green'] = dict(frac_of_band=round(float(green.sum() / Lg.size), 5), pass_=bool(green.sum() / Lg.size <= 0.005))
# top edge
top = rest[:4].mean()
below = rest[4:11].mean()
M['top_edge'] = dict(rows0_3_vs_4_10=round(float(top / below - 1), 4), coverage_rows0_2=round(float(covm[:3].max()), 3),
                     pass_=bool(abs(top / below - 1) <= 0.02 and covm[:3].max() < 0.01))
# no-outline: darkening in a ring 0.5-3 CSS px outside the hero, by direction
hero_lbl, _ = ndi.label(foilm)
hid = hero_lbl[int(np.clip(hs[1], 0, rest.shape[0] - 1)), int(np.clip(hs[0], 0, rest.shape[1] - 1))]
if hid:
    hm = hero_lbl == hid
    dd = ndi.distance_transform_edt(~hm)
    ring = (dd >= 1) & (dd <= 6) & (covm < 0.5)
    ref = (dd >= 16) & (dd <= 28) & (covm < 0.02)
    cyx = np.array(np.nonzero(hm)).mean(1)
    ang = np.arctan2(yy - cyx[0], xx - cyx[1])
    bins = ((ang + np.pi) / (2 * np.pi) * 16).astype(int) % 16
    dark = []
    for b in range(16):
        r1, r2 = ring & (bins == b), ref & (bins == b)
        if r1.sum() > 10 and r2.sum() > 10:
            dark.append(1 - Lg[r1].mean() / Lg[r2].mean())
    dark = np.array(dark)
    if len(dark):
        M['no_outline_hero'] = dict(mean_darkening=round(float(dark.mean()), 3), std=round(float(dark.std()), 3),
                                    ratio=round(float(dark.std() / max(1e-6, abs(dark.mean()))), 2),
                                    pass_=bool(dark.std() >= 0.3 * abs(dark.mean())))
# motion in the filmstrip
fl = [load(f'film_{i}.png') for i in range(8)]
fm = [luma(f)[core].mean() for f in fl]
gm = [luma(f)[far_g].mean() for f in fl]
diffs = [float(np.abs(ndi.uniform_filter(luma(fl[i + 1]), 9) - ndi.uniform_filter(luma(fl[i]), 9))[far_g].mean()) for i in range(7)]
M['motion_idle_8s'] = dict(foil_mean=[round(v, 3) for v in fm], foil_swing=round(max(fm) / min(fm), 3),
                           ground_swing=round(max(gm) / min(gm), 4), ground_mean_abs_diff_1s=round(max(diffs), 4))
M['coverage'] = dict(desktop=st.get('coverage_d'), mobile=st.get('coverage_m'))
for k in ['perf', 'bench', 'perf4x', 'offscreen', 'hidden', 'reduced', 'contextLoss', 'noHalf']:
    if k in st:
        M[k] = st[k]
nh = load('d_nohalf.png')
if nh is not None:
    M['noHalf_foil_rest'] = foil_stats(nh, core)
json.dump(M, open(os.path.join(D, 'metrics.json'), 'w'), indent=1, default=float)

# ------------------------------------------------------------------ contact sheet
W = 1440
rows = []
def band_row(name, f):
    im = Image.open(os.path.join(D, f)).convert('RGB')
    return label(im.resize((W, int(round(W * im.height / im.width))), Image.LANCZOS), name)
for n, f in [('rest t=0 (idle lamp parked on the hero)', 'd_rest_t0.png'), ('rest t=6', 'd_rest_t6.png'),
             ('lamp: hero', 'd_lamp_hero.png'), ('lamp: open water', 'd_lamp_water.png'), ('lamp: far gold', 'd_lamp_far.png'),
             ('lamp off', 'd_lamp_off.png')]:
    if os.path.exists(os.path.join(D, f)):
        rows.append(band_row(n, f))
mob = [label(Image.open(os.path.join(D, f)).convert('RGB'), n) for n, f in [('mobile rest', 'm_rest.png'), ('mobile lamp', 'm_lamp.png')] if os.path.exists(os.path.join(D, f))]
if mob:
    r = Image.new('RGB', (W, max(m.height for m in mob)), 'white')
    for i, m in enumerate(mob):
        r.paste(m, (i * (m.width + 16), 0))
    rows.append(r)
zt = [Image.open(os.path.join(D, f)).convert('RGB') for f in ['zoom_hero_rest.png', 'zoom_hero_lamp.png', 'zoom_edge.png', 'zoom_small.png']]
zr_ = Image.new('RGB', (W, 216 + 18), 'white')
for i, (z, n) in enumerate(zip(zt, ['hero rest 3x', 'hero lamp 3x', 'edge 3x', 'smallest 3x'])):
    zr_.paste(label(z.resize((354, 212), Image.LANCZOS), n), (i * 362, 0))
rows.append(zr_)
fr_ = Image.new('RGB', (W, fs_img.height // 2 + 4), 'white')
half = fs_img.height // 2
fr_.paste(fs_img.crop((0, 0, 720, half)), (0, 0)); fr_.paste(fs_img.crop((0, half, 720, fs_img.height)), (720, 0))
rows.append(fr_)
M = json.loads(json.dumps(M, default=float))
txt = Image.new('RGB', (W, 260), 'white')
dr = ImageDraw.Draw(txt)
lines = [f"{st.get('id')}  coverage d {M['coverage']['desktop']}  m {M['coverage']['mobile']}",
         f"foil rest (lamp off) {M['foil_rest_lamp_off']}",
         f"foil rest (idle lamp) {M['foil_rest_idle_lamp']}",
         f"under lamp {M.get('foil_under_lamp')}  glints {M['glints_rest']}",
         f"texture {M.get('texture')}  gold {M['gold_colour']}",
         f"ground {M['ground']}  green {M['no_green']}  top {M['top_edge']}",
         f"outline {M.get('no_outline_hero')}  motion {M['motion_idle_8s']['foil_swing']} / ground {M['motion_idle_8s']['ground_swing']}",
         f"perf {M.get('perf', {}).get('intervals')}  bench {M.get('bench')}",
         f"4x {M.get('perf4x', {}).get('intervals')}  off-screen {M.get('offscreen')} hidden {M.get('hidden')} reduced {M.get('reduced')} ctx {M.get('contextLoss')} noHalf {M.get('noHalf')}"]
for i, l in enumerate(lines):
    dr.text((6, 6 + i * 26), l[:260], fill=(23, 23, 23))
rows.append(txt)
cs = Image.new('RGB', (W, sum(r.height + 6 for r in rows)), 'white')
y = 0
for r in rows:
    cs.paste(r, (0, y)); y += r.height + 6
cs.save(os.path.join(D, 'cs.png'))
print(json.dumps(M, indent=1, default=float))
