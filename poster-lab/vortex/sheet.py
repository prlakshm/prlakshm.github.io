import sys,subprocess,os
from PIL import Image, ImageDraw, ImageFont
vid,out,cols=sys.argv[1],sys.argv[2],int(sys.argv[3]);times=[float(t) for t in sys.argv[4].split(',')]
try: font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',18)
except: font=ImageFont.load_default()
tiles=[]
for t in times:
    f=f'_f_{t}.png';subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',vid,'-frames:v','1',f],check=True)
    im=Image.open(f).convert('RGB');d=ImageDraw.Draw(im);d.rectangle((0,0,64,24),fill=(255,255,255));d.text((6,3),f'{t}s',fill=(0,0,0),font=font);tiles.append(im);os.remove(f)
W,H=tiles[0].size;rows=(len(tiles)+cols-1)//cols
sh=Image.new('RGB',(W*cols+4*(cols-1),H*rows+4*(rows-1)),(200,0,120))
for i,c in enumerate(tiles): sh.paste(c,((i%cols)*(W+4),(i//cols)*(H+4)))
sh.save(out);print(sh.size)
