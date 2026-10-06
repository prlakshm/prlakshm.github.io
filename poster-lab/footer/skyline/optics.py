# Optical comparison with the lilies: fine detail relative to mid-scale shapes
# (painted softness), value range, temperature, gold tones. Gold excluded
# from the texture measures; same gold detector for both images.
import sys, numpy as np, cv2, warnings; warnings.filterwarnings('ignore')
from PIL import Image
from skimage import color
def measure(path, extra_mask=None):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32) / 255
    if a.shape[1] != 3376: a = cv2.resize(a, (3376, round(a.shape[0] * 3376 / a.shape[1])), interpolation=cv2.INTER_AREA)
    lab = color.rgb2lab(a); L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
    C = np.hypot(A, B); h = np.degrees(np.arctan2(B, A)) % 360
    g = (C > 30) & (h > 50) & (h < 100) & (L > 40)
    keep = ~cv2.dilate(g.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    if extra_mask is not None: keep &= ~extra_mask
    Y = L / 100
    g1 = cv2.GaussianBlur(Y, (0, 0), 1); g4 = cv2.GaussianBlur(Y, (0, 0), 4); g12 = cv2.GaussianBlur(Y, (0, 0), 12)
    fine = np.abs(Y - g1)[keep].mean(); mid = np.abs(g1 - g4)[keep].mean(); big = np.abs(g4 - g12)[keep].mean()
    ng = ~g
    return dict(fine_per_mid=fine / mid, mid_per_big=mid / big, meanL=L[ng].mean(), b=B[ng].mean(), dark2=np.percentile(L[ng], 2), light98=np.percentile(L[ng], 98),
                gold=100 * g.mean(), goldL=tuple(np.percentile(L[g], [10, 50, 90]).round()), goldC=C[g].mean(), goldh=np.median(h[g]))
rows = [('lilies 5b-smooth', '/Users/pranavi/Documents/GitHub/prlakshm.github.io/public/home/footer/water-lilies-5b-smooth.webp')] + [(p, p) for p in sys.argv[1:]]
for name, p in rows:
    m = measure(p)
    print(f"{name[:26]:26s} fine/mid {m['fine_per_mid']:.2f} mid/big {m['mid_per_big']:.2f} | L {m['meanL']:.0f} b* {m['b']:+.1f} dark2 {m['dark2']:.0f} light98 {m['light98']:.0f} | gold {m['gold']:.1f}% L {m['goldL']} C {m['goldC']:.0f} h {m['goldh']:.0f}")
