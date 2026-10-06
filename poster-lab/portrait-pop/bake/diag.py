import numpy as np, io
from PIL import Image
import kit
from kit import canvas, tri, tissue_crumpled
def oklch(rgb):
    c=np.asarray(rgb,float)/255; c=np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
    M1=np.array([[0.4122214708,0.5363325363,0.0514459929],[0.2119034982,0.6806995451,0.1073969566],[0.0883024619,0.2817188376,0.6299787005]])
    lms=np.cbrt(c@M1.T)
    M2=np.array([[0.2104542553,0.7936177850,-0.0040720468],[1.9779984951,-2.4285922050,0.4505937099],[0.0259040371,0.7827717662,-0.8086757660]])
    L,a,b=(lms@M2.T).T if lms.ndim==2 else lms@M2.T
    return L, np.hypot(a,b)
bg=np.array([248,250,252.])
kit.PX=10; w,h=canvas(24,24); mask=tri(w,h,801)
for name,hexc in [('blush','#ff9ccc'),('sky','#8fd3ff'),('chart','#d6f07a'),('lilac','#c9a6ff')]:
    rgba=tissue_crumpled(mask,w,h,hexc,801,S=18.0,alpha=0.45)
    inside=rgba[...,3]>0.3
    sheet=rgba[...,:3][inside]*255
    a=rgba[...,3:][inside]
    comp=sheet*a+bg*(1-a)
    # webp round trip
    arr=np.clip(rgba*255+.5,0,255).astype(np.uint8); buf=io.BytesIO(); Image.fromarray(arr,'RGBA').save(buf,'WEBP',quality=90,method=6)
    wb=np.asarray(Image.open(buf).convert('RGBA')).astype(float)[inside]
    compw=wb[:,:3]*(wb[:,3:]/255)+bg*(1-wb[:,3:]/255)
    T=oklch([int(hexc[i:i+2],16) for i in (1,3,5)])
    Ld,Cd=oklch(np.median(sheet,0)); Lc,Cc=oklch(np.median(comp,0)); Lw,Cw=oklch(np.median(compw,0))
    _,Cpix=oklch(comp)
    print(f"{name}: target L{T[0]:.2f} C{T[1]:.3f} | dye-sheet L{Ld:.2f} C{Cd:.3f} | on page L{Lc:.2f} C{Cc:.3f} (pixel C spread p10 {np.percentile(Cpix,10):.3f}) | after webp C{Cw:.3f} | alpha med {np.median(a):.2f}")
