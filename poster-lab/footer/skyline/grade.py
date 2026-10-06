# Colour looks for the skyline, to make it striking on Home (her ask,
# 2026-10-05: "I feel like the hue could be better. could accents be brighter?
# Does it need a cooler tone? More pinky? ... Right now, it is not striking
# enough"). On Home the grey sky is nearly the page's own white, so the
# painting has no top edge and the city floats; the posters above it are bold.
# Each look gives the sky a colour of its own (its clouds kept), split-tones
# the city (light one way, shadow the other) and lifts the warm accents. The
# gold is left exactly as it is.
# Usage: python3 grade.py <bake> <out> <rose|blue|golden|vivid|twilight|sky|cornflower|pale|slate> [crop row]
import sys, shutil, numpy as np, cv2, warnings; warnings.filterwarnings('ignore')
from PIL import Image
from scipy import ndimage
from skimage import color
IN, OUT, LOOK = sys.argv[1], sys.argv[2], sys.argv[3]
CROP = int(sys.argv[4]) if len(sys.argv) > 4 else 187         # the source row the site's band starts at
LOOKS = {
    # sky top -> sky at the rooftops (L, a, b); city shadows / lights (a, b shifts); accents; contrast
    'rose':   dict(top=(86, 7, -10), low=(90, 12, 9), shadow=(3, -8), light=(3, 4), accent=0.25, contrast=0.06),
    'blue':   dict(top=(78, -2, -20), low=(88, -2, -8), shadow=(1, -9), light=(1, 5), accent=0.25, contrast=0.08),
    'golden': dict(top=(83, 2, -13), low=(90, 9, 21), shadow=(2, -8), light=(2, 8), accent=0.3, contrast=0.08),
    'vivid':  dict(top=(91, 0, -4), low=(93, 0, -1), shadow=(0, -3), light=(0, 2), accent=0.35, contrast=0.12),
    # her "prettier light blue" (after vivid): a clear sky blue overhead easing
    # paler toward the roofs; the city calmer (less contrast, no extra accent
    # push, no cool shift in the shadows)
    'sky':        dict(top=(83, -5, -21), low=(90, -3, -10), shadow=(0, 1), light=(1, 2), accent=0.0, contrast=0.05),
    # paler (her: "Make it paler blue. This doesn't fit the color scheme"): a powder blue near the page's own cool white
    # slate (her: "a bit more slate"): the pale blue greyed and a shade deeper; clouds she can see move
    'slate':      dict(top=(85, -2, -8.5), low=(90.5, -1.5, -4.5), shadow=(0, 1), light=(1, 2), accent=0.0, contrast=0.05, clouds=2.2, paint=0.8),
    'pale':       dict(top=(90, -2.5, -11), low=(94, -1.5, -5), shadow=(0, 1), light=(1, 2), accent=0.0, contrast=0.05),
    'cornflower': dict(top=(82, 1, -23), low=(90, 1, -11), shadow=(0, 1), light=(1, 2), accent=0.0, contrast=0.05),
    # twilight: blue overhead, a rose band at the rooftops (the belt of Venus)
    'twilight': dict(top=(77, 0, -20), low=(89, 13, 4), shadow=(2, -9), light=(3, 5), accent=0.3, contrast=0.08),
}
P = LOOKS[LOOK]
load = lambda p: np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255
img = load(f'{IN}.png')
gold = np.load(f'{IN}-gold.npy'); matte = np.clip(np.load(f'{IN}-matte.npy'), 0, 1)
H, W = gold.shape
keep = np.clip(cv2.GaussianBlur(gold.astype(np.float32), (0, 0), 1.2) * 1.6, 0, 1) * (1 - matte)   # the gold, untouched (not the sky beside it)
lab = color.rgb2lab(img); L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]

# the sky, top of the visible band (source row CROP) to the rooftops, column by column
top = round(CROP * H / 578)
skym = matte > 0.5
hz = np.full(W, top + 40.0)
for x in np.where(skym[top:].any(0))[0]: hz[x] = top + np.nonzero(skym[top:, x])[0].max()
hz = ndimage.uniform_filter1d(hz, 301)
t = np.clip((np.arange(H)[:, None] - top) / np.maximum(hz[None, :] - top, 30), 0, 1) ** 0.8
tgt = [P['top'][i] * (1 - t) + P['low'][i] * t for i in range(3)]
# the sky's change, measured where it is pure sky and carried out to the
# rooftops' soft edges, so an edge pixel (part sky) changes by its sky share:
# no white line left tracing the roofs
pure = (matte > 0.97).astype(np.float32)
old_sky = [cv2.GaussianBlur(ch * pure, (0, 0), 6) / (cv2.GaussianBlur(pure, (0, 0), 6) + 1e-4) for ch in (L, A, B)]
_, (iy, ix) = ndimage.distance_transform_edt(pure < 0.5, return_indices=True)
# the sky's clouds, repainted at this look's strength (the measured change
# flattens the baked ones), so the site's drift has clouds to move
CLG = P.get('clouds', 0.0)
cloud = np.load(f'{IN}-cloud.npy') if CLG else np.zeros((H, W), np.float32)
delta = [tgt[i] - old_sky[i] + (CLG * cloud if i == 0 else 0) for i in range(3)]
delta = [np.where(pure > 0.5, d, d[iy, ix]) for d in delta]
ws = np.clip(cv2.GaussianBlur(matte, (0, 0), 1.3) * 1.5, 0, 1)
# the old white sky also survives as a bright fringe just outside the matte
# (the source's antialiasing and the unsharp mask's overshoot): light,
# colourless pixels within 4 px of the sky are sky too, or a white line traces
# every roof against a coloured sky
near_sky = ndimage.distance_transform_edt(pure < 0.5) <= 4
C0 = np.hypot(A, B)
fringe = near_sky & (L >= old_sky[0] - 4) & (C0 < 10)
ws = np.maximum(ws, cv2.GaussianBlur(fringe.astype(np.float32), (0, 0), 0.7))
# a tight sky (her: "I can see the mask outline/white space ... between that
# and the sky"): the matte stops 4-6 px short of every roof (its smoothness
# test reads the roof's own edge as texture), leaving a strip of the old white
# sky. Grow the sky out through every pixel still the sky's colour until it
# meets a building, then give the antialiased edge its share.
dE = np.sqrt((L - old_sky[0]) ** 2 + (A - old_sky[1]) ** 2 + (B - old_sky[2]) ** 2)
cand = ((dE < 7) | ((L > old_sky[0]) & (np.hypot(A, B) < 8))) & ~gold     # sky-coloured, or brighter than the sky and colourless (the overshoot)
grown = matte > 0.5
for _ in range(16):
    grown = grown | (ndimage.binary_dilation(grown) & cand)
edge = ndimage.binary_dilation(grown, iterations=2) & ~grown & ~gold
share = np.clip(1 - (dE - 6) / 14, 0, 1) * edge
# sky seen through gaps and notches between buildings, low on the horizon:
# brighter than the sky up top, cut off from it, so neither the matte nor its
# growth reaches them. Flat (no window texture), bright, colourless, not gold.
_tex = ndimage.uniform_filter(ndimage.gaussian_gradient_magnitude(L / 100, 1.0), 7)
_pk = (_tex < 0.006) & (L > 88) & (np.hypot(A, B) < 6) & ~gold & ~grown
_pk[:top] = False
_pl, _pn = ndimage.label(_pk)
pockets = np.zeros((H, W), bool)
if _pn:
    _sz = np.bincount(_pl.ravel()); _sz[0] = 0
    _pk = _sz[_pl] >= 15
    _pk = _pk | (ndimage.binary_dilation(_pk, iterations=4) & (L > 84) & (np.hypot(A, B) < 7) & ~gold)   # and their antialiased rims
    grown = grown | _pk; pockets = _pk
    for i in range(3):                                           # colour them as the low sky (+ clouds)
        d = tgt[i] + (CLG * cloud if i == 0 else 0) - (L, A, B)[i]
        delta[i] = np.where(_pk, d, delta[i])
    edge = ndimage.binary_dilation(grown, iterations=2) & ~grown & ~gold
    share = np.maximum(share, np.clip(1 - (dE - 6) / 14, 0, 1) * edge)
# the gold's guard covers the gold, never the sky beside it: a roof's gold cap
# had kept a 3-8 px band of the old white sky (brightened by sharpening) above it
keep = keep * (1 - cv2.GaussianBlur(grown.astype(np.float32), (0, 0), 0.5))
ws = np.maximum(ws, np.maximum(cv2.GaussianBlur(grown.astype(np.float32), (0, 0), 0.5), share)) * (1 - keep)
L = L + delta[0] * ws
A = A + delta[1] * ws
B = B + delta[2] * ws
# the strip the matte missed is old sky plus sharpening overshoot (brighter
# than the sky by up to ~5 L), so shifting it leaves a white line on a coloured
# sky: it takes the colour of the nearest true sky instead, clouds and all
rw = cv2.GaussianBlur((grown & (matte < 0.5) & ~pockets).astype(np.float32), (0, 0), 0.6) * (1 - keep)   # pockets keep their own low-sky colour
L = L * (1 - rw) + L[iy, ix] * rw
A = A * (1 - rw) + A[iy, ix] * rw
B = B * (1 - rw) + B[iy, ix] * rw

# the sky painted, not airbrushed (her: "sky illustration style is NOT the
# same painting style as buildings"): the gradient was perfectly smooth (L
# detail 0.1 against the buildings' 1.8 and the lilies' water 1.2-3.0). Broad
# horizontal strokes that waver, tonal dabs, a touch of colour in them, and
# fine grain, all along the strokes; about two-thirds the water's texture.
if P.get('paint'):
    pr = np.random.default_rng(31)
    ang = np.radians(9) * np.tanh(ndimage.gaussian_filter(pr.standard_normal((H, W)), 60) * 3)
    fx_, fy_ = np.cos(ang).astype(np.float32), np.sin(ang).astype(np.float32)
    ys_, xs_ = np.mgrid[0:H, 0:W].astype(np.float32)
    def smear(n, steps, h=1.6):
        acc = n.copy(); wsum = 1.0
        for sgn in (1, -1):
            px, py = xs_.copy(), ys_.copy()
            for i in range(1, steps + 1):
                px = px + sgn * h * cv2.remap(fx_, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
                py = py + sgn * h * cv2.remap(fy_, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
                w = np.exp(-2.0 * (i / steps) ** 2)
                acc = acc + w * cv2.remap(n, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT); wsum += w
        a = acc / wsum
        return a / (a.std() + 1e-6)
    strokes = smear(ndimage.gaussian_filter(pr.standard_normal((H, W)), (4.5, 3.0)).astype(np.float32), 22)   # broad brush, not hairlines
    dabs = smear(ndimage.gaussian_filter(pr.standard_normal((H, W)), (11, 22)).astype(np.float32), 12)
    dabs = np.tanh(dabs * 1.6)                                     # dabs with edges, not haze
    grain = smear(pr.standard_normal((H, W)).astype(np.float32), 5, h=1.0)
    hue = smear(ndimage.gaussian_filter(pr.standard_normal((H, W)), (9, 18)).astype(np.float32), 10)
    k = P['paint']
    sky_w = np.clip(ws, 0, 1) * (1 - keep)
    L = L + sky_w * k * (1.1 * strokes + 0.6 * dabs + 0.35 * grain)    # dabs at 2.0 read "too cloudy"
    A = A + sky_w * k * 0.7 * hue
    B = B + sky_w * k * (0.3 * dabs - 0.6 * hue)

# the city: light one way, shadow the other, a touch more contrast, warm accents up
wc = (1 - np.maximum(matte, cv2.GaussianBlur(grown.astype(np.float32), (0, 0), 0.5))) * (1 - keep)   # the city only: not the sky, nor the strip it took back
sh = np.clip((48 - L) / 32, 0, 1); li = np.clip((L - 58) / 30, 0, 1)
A = A + wc * (sh * P['shadow'][0] + li * P['light'][0])
B = B + wc * (sh * P['shadow'][1] + li * P['light'][1])
L = L + wc * (L - 55) * P['contrast']
C = np.hypot(A, B); hue = np.degrees(np.arctan2(B, A)) % 360
warm = np.clip(1 - np.maximum(0, np.abs(((hue - 20 + 180) % 360) - 180) - 40) / 15, 0, 1) * np.clip((C - 13) / 8, 0, 1)
k = 1 + P['accent'] * warm * wc
A, B = A * k, B * k
lab[..., 0], lab[..., 1], lab[..., 2] = np.clip(L, 0, 100), A, B
out = np.clip(color.lab2rgb(lab), 0, 1).astype(np.float32)
out = out * (1 - keep[..., None]) + img * keep[..., None]
import os
if os.environ.get('GRADE_DEBUG'):
    np.savez('grade-debug.npz', grown=grown, matte=matte, keep=keep, ws=ws, rw=rw, cand=cand, dE=dE, pure=pure, oldL=old_sky[0])
Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(f'{OUT}.png')
for suf in ('-gold.npy', '-cloud.npy', '-cloud-rgb.npy', '-matte.npy'):
    shutil.copy(f'{IN}{suf}', f'{OUT}{suf}')
if CLG:
    # what one unit of cloud now does to the sky (sRGB), for the shader
    m = (matte > 0.97)
    sl = lab.copy(); su = sl.copy(); su[..., 0] += CLG
    np.save(f'{OUT}-cloud-rgb.npy', (color.lab2rgb(su)[m] - color.lab2rgb(sl)[m]).mean(0))
print(OUT, 'done')
