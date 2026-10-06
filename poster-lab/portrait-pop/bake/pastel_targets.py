"""Vivid pastel targets: each approved hue at a pastel lightness with as much
chroma as sRGB holds there (x share). Prints target hexes."""
import numpy as np, sys
def oklab_to_srgb(L,a,b):
    l_=L+0.3963377774*a+0.2158037573*b; m_=L-0.1055613458*a-0.0638541728*b; s_=L-0.0894841775*a-1.2914855480*b
    l,m,s=l_**3,m_**3,s_**3
    r=4.0767416621*l-3.3077115913*m+0.2309699292*s; g=-1.2684380046*l+2.6097574011*m-0.3413193965*s; bb=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    c=np.array([r,g,bb]); return np.where(c<=0.0031308,12.92*c,1.055*np.abs(c)**(1/2.4)-0.055)
def srgb_to_oklch(hexc):
    c=np.array([int(hexc[i:i+2],16) for i in (1,3,5)])/255; c=np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
    l=0.4122214708*c[0]+0.5363325363*c[1]+0.0514459929*c[2]; m=0.2119034982*c[0]+0.6806995451*c[1]+0.1073969566*c[2]; s=0.0883024619*c[0]+0.2817188376*c[1]+0.6299787005*c[2]
    l,m,s=np.cbrt([l,m,s]); L=0.2104542553*l+0.7936177850*m-0.0040720468*s; a=1.9779984951*l-2.4285922050*m+0.4505937099*s; b=0.0259040371*l+0.7827717662*m-0.8086757660*s
    return L,np.hypot(a,b),np.arctan2(b,a)
share=float(sys.argv[1]); spec=sys.argv[2:]
for item in spec:
    hexc,L=item.split('@'); L=float(L)
    _,_,h=srgb_to_oklch(hexc)
    lo,hi=0,0.4
    for _ in range(40):
        mid=(lo+hi)/2; rgb=oklab_to_srgb(L,mid*np.cos(h),mid*np.sin(h))
        (lo,hi)=(mid,hi) if (rgb.min()>=0 and rgb.max()<=1) else (lo,mid)
    C=lo*share; rgb=oklab_to_srgb(L,C*np.cos(h),C*np.sin(h))
    print('#%02x%02x%02x'%tuple(int(round(v*255)) for v in rgb), f'L{L} Cmax{lo:.3f} C{C:.3f}')
