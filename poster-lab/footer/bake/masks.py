# Footer painting bake. Run from this folder, in order:
#   1. python3 -c "from PIL import Image; Image.open('../lily-top-full.png').convert('RGB').crop((0, 648, 3376, 1334)).save('paint_crop.png')"
#   2. python3 masks.py    -> m_*.npy masks (gold, lily, pad, motion, height) + mask_overlay.png
#   3. python3 smooth.py   -> smooth_{light,medium,strong}.png (water and pads blended; gold and lilies untouched)
# The site uses smooth_strong.png as public/home/footer/water-lilies-5b-smooth.webp (q86);
# the fx map (water-lilies-5b-wide-fx.webp) is packed from the masks at half size.
# Split the painting into gold / lily / pad / water, and build the gold's height map.
import numpy as np, cv2
from PIL import Image
from scipy import ndimage
from skimage import color

img = np.asarray(Image.open('paint_crop.png').convert('RGB'))
a = img.astype(np.float32) / 255
lab = color.rgb2lab(a); L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
C = np.hypot(A, B); hue = (np.degrees(np.arctan2(B, A)) + 360) % 360
H, W = L.shape

def clean(m, open_=1, close=2, min_area=0):
    if open_: m = ndimage.binary_opening(m, iterations=open_)
    if close: m = ndimage.binary_closing(m, iterations=close)
    if min_area:
        lab_, n = ndimage.label(m); sz = ndimage.sum(m, lab_, range(1, n + 1))
        m = np.isin(lab_, 1 + np.nonzero(sz >= min_area)[0])
    return m

# gold leaf: warm and fairly saturated, from dark bronze to near-white highlights
gold = (B > 12) & (hue >= 35) & (hue <= 115) & (C > 12) & (L > 30)
gold |= (L > 82) & (B > 6) & (A > -4)                       # the hottest, palest glints
gold = clean(gold, open_=0, close=1, min_area=6)

# lilies: bright pink flowers (their dimmer reflections stay water, so they can ripple)
pinkish = (A > 22) & ((hue < 40) | (hue > 320)) & (C > 25)
flower = clean(pinkish & (L > 50) & (C > 32), open_=1, close=3, min_area=400)
lab_, n = ndimage.label(flower)
hulls = np.zeros((H, W), np.uint8)
for i in range(1, n + 1):
    ys, xs = np.nonzero(lab_ == i)
    pts = np.stack([xs, ys], 1).astype(np.int32)
    cv2.fillConvexPoly(hulls, cv2.convexHull(pts), 1)
lily = ndimage.binary_dilation(hulls > 0, iterations=3)

# pads: teal-green paint (water here is blue/lavender), smoothed into whole shapes
tealish = (A < -4) & (B > -16) & (hue > 130) & (hue < 230) & (L > 30)
tealish = cv2.medianBlur(tealish.astype(np.uint8) * 255, 9) > 127
pad = clean(tealish, open_=2, close=6, min_area=2500)
pad = ndimage.binary_fill_holes(pad)
rim = gold & ndimage.binary_dilation(pad, iterations=14)      # gold rims belong to their pads
pad_all = pad | rim
frozen = lily | pad_all

# what may ripple: water only, fading out within ~10 px of pads and lilies
dist = ndimage.distance_transform_edt(~frozen)
motion = np.clip((dist - 2) / 10, 0, 1)

# gold relief (Ann's recipe): a soft raised shoulder + the leaf's own detail
Y = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
g = gold.astype(np.float32)
shoulder = cv2.GaussianBlur(g, (0, 0), 2.0)
detail = (Y - cv2.GaussianBlur(Y, (0, 0), 3.0)) * g
height = np.clip((0.6 * shoulder + 2.2 * detail) * 0.85 + 0.08, 0, 1)

np.save('m_gold.npy', gold); np.save('m_lily.npy', lily); np.save('m_pad.npy', pad_all); np.save('m_motion.npy', motion); np.save('m_height.npy', height)
for nm, m in [('gold', gold), ('lily', lily), ('pad', pad_all), ('water (moves)', motion > 0.5)]:
    print('%-14s %5.1f%%' % (nm, 100 * m.mean()))

# overlay for checking: gold yellow, lilies magenta, pads green; water left as painted (dimmed)
ov = (img.astype(np.float32) * 0.45)
ov[pad_all] = ov[pad_all] * 0.4 + np.array([40, 200, 120]) * 0.6
ov[gold] = np.array([255, 205, 60])
ov[lily] = ov[lily] * 0.3 + np.array([255, 60, 200]) * 0.7
Image.fromarray(np.clip(ov, 0, 255).astype(np.uint8)).resize((1688, 343), Image.LANCZOS).save('mask_overlay.png')
