"""Torn newspaper masks for the redesign mock, built on scripts/torn_paper's rip.
Writes, per sheet: torn-mK.png (alpha = the sheet) and torn-fK.png (the pale
fibre core just inside the rip, as an overlay). Same fractal edge as the notes."""
import sys, numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, 'scripts/torn_paper')
from generate import edge_profile
OUT='poster-lab/pinnables/redesign/img'
def sheet(k, W, H, seed):
    rng=np.random.default_rng(seed); yy,xx=np.mgrid[0:H,0:W]
    s=W/860
    top=edge_profile(W,seed+1,depth=64*s,base=14*s); bot=edge_profile(W,seed+2,depth=64*s,base=14*s)
    left=edge_profile(H,seed+3,depth=50*s,base=12*s); right=edge_profile(H,seed+4,depth=50*s,base=12*s)
    dist=np.minimum(np.minimum(yy-top[None,:],(H-1-yy)-bot[None,:]),np.minimum(xx-left[:,None],(W-1-xx)-right[:,None]))
    FR=6.0*s; a=np.clip(dist/FR,0,1); sp=rng.random((H,W)); fib=(dist>-5*s)&(dist<FR)&(sp>.5); a[fib]=np.maximum(a[fib],sp[fib]*.9)
    m=Image.fromarray((np.clip(a,0,1)*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.5))
    mask=Image.new('RGBA',(W,H),(0,0,0,0)); mask.putalpha(m); mask.save(f'{OUT}/torn-m{k}.png')
    core=np.clip(1-dist/(26*s),0,1)**1.5
    f=Image.new('RGBA',(W,H),(252,250,244,0)); f.putalpha(Image.fromarray((core*a*235).astype(np.uint8))); f.save(f'{OUT}/torn-f{k}.png')
    print(k,W,H)
for k,(W,H,seed) in enumerate([(1100,1180,7),(860,920,4201),(800,1040,88123)],1): sheet(k,W,H,seed)
