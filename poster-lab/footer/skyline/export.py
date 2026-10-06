# Export a repainted skyline for the site: the painting, its fx map (R gold,
# G nothing ripples, B the leaf's soft shoulder) and its cloud layer (R the
# cloud field, 0.5 = none, encoded x1/8; G where the sky is), both at half size.
# Usage: python3 export.py <bake name> <site name> [top bottom]
# top/bottom slice a whole-painting bake (`base.py 0 578`) to source rows
# top..bottom (of 578); print the canvas size for FRAME_SKYLINE.
import sys, os, numpy as np, cv2
from PIL import Image
bake, name = sys.argv[1], sys.argv[2]
OUT = '/Users/pranavi/Documents/GitHub/prlakshm.github.io/public/home/footer'
paint = Image.open(f'{bake}.png').convert('RGB')
r0, r1 = 0, paint.height
if len(sys.argv) > 4:
    k = paint.height / 578
    r0, r1 = round(int(sys.argv[3]) * k), round(int(sys.argv[4]) * k)
rows = lambda a: a[r0:r1]
paint.crop((0, r0, paint.width, r1)).save(f'{OUT}/{name}.webp', 'WEBP', quality=88, method=6)
print(f'{name}: canvas {paint.width} x {r1 - r0} (rows {r0}-{r1} of {paint.height})')
g = rows(np.load(f'{bake}-gold.npy')).astype(np.float32)
fx = np.dstack([cv2.GaussianBlur(g, (0, 0), 0.6), np.zeros_like(g), cv2.GaussianBlur(g, (0, 0), 2.0)])
half = lambda a: cv2.resize(a, (a.shape[1] // 2, a.shape[0] // 2), interpolation=cv2.INTER_AREA)
Image.fromarray((np.clip(half(fx), 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{OUT}/{name}-fx.webp', 'WEBP', lossless=True, method=6)
cloud = rows(np.load(f'{bake}-cloud.npy')); matte = rows(np.load(f'{bake}-matte.npy'))
cl = np.dstack([0.5 + cloud / 8.0, matte, np.zeros_like(matte)])
Image.fromarray((np.clip(half(cl), 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{OUT}/{name}-clouds.webp', 'WEBP', lossless=True, method=6)
rgb = np.load(f'{bake}-cloud-rgb.npy')
sz = lambda f: os.path.getsize(f'{OUT}/{f}') // 1024
print(f'{name}: painting {sz(name + ".webp")}KB, fx {sz(name + "-fx.webp")}KB, clouds {sz(name + "-clouds.webp")}KB | cloud rgb per unit [{rgb[0]:.4f}, {rgb[1]:.4f}, {rgb[2]:.4f}]')
