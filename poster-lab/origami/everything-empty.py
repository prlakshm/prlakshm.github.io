# Makes everything-empty.png for the burst present: the Everything page (1440x900 screenshot, the image the Figma frames use) with every
# thumbnail region (R, the same list as R_ in present.cjs) plus an 8px margin replaced by the page's own dotted paper, so nothing is seen
# behind the box before it flies out. The dot grid repeats every 162px (7 dots), so paper is copied from the nearest clear spot a multiple
# of 162px away. usage: python3 everything-empty.py everything.png everything-empty.png   (prints the sha1 = Figma image hash for present.cjs)
import sys,hashlib
from PIL import Image
import numpy as np
im=np.asarray(Image.open(sys.argv[1]).convert('RGB')).copy();H,W=im.shape[:2]
R=[[360,165,102,62],[464,165,138,84],[322,232,140,58],[686,133,274,66],[742,201,54,64],[906,200,220,66],[233,319,110,115],[512,284,296,210],[861,349,190,73],[886,430,182,84],[190,481,246,74],[569,527,246,74],[1073,556,261,62],[346,597,146,220],[747,646,118,108],[889,646,178,108]]
MF,MS,P=8,12,162
occ=np.zeros((H,W),bool);fill=np.zeros((H,W),bool)
for x,y,w,h in R:
    occ[max(0,y-MS):y+h+MS,max(0,x-MS):x+w+MS]=True;fill[max(0,y-MF):y+h+MF,max(0,x-MF):x+w+MF]=True
occ[:112,:]=True  # the nav band is not paper
shifts=sorted([(i*P,j*P) for i in range(-8,9) for j in range(-5,6) if (i,j)!=(0,0)],key=lambda s:s[0]**2+s[1]**2)
out=im.copy();miss=0
for yy,xx in zip(*np.nonzero(fill)):
    for dx,dy in shifts:
        sx,sy=xx+dx,yy+dy
        if 0<=sx<W and 0<=sy<H and not occ[sy,sx]:out[yy,xx]=im[sy,sx];break
    else:miss+=1
Image.fromarray(out).save(sys.argv[2],optimize=True);print('unfilled',miss,'sha1',hashlib.sha1(open(sys.argv[2],'rb').read()).hexdigest())
