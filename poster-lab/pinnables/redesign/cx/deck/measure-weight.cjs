// Visual weight = sum over pixels of the CIE76 ΔE between the frame with the piece and the frame without it (final pose, real background).
const {chromium}=require('/Users/pranavi/Documents/GitHub/prlakshm.github.io/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome'});const c=await b.newContext({viewport:{width:1600,height:900},reducedMotion:'reduce'});const p=await c.newPage();
await p.goto('http://localhost:5173/codex/');await p.waitForTimeout(600);await p.evaluate(()=>{window.__heroPlay()});await p.waitForTimeout(300);
const box=await p.evaluate(()=>{const r=document.querySelector('.hx-frame').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}});
const keys=['cloud','marks','codex','bookmark','spTR'];
const shot=async(vis)=>{await p.evaluate((vis)=>{document.querySelectorAll('.hx-piece').forEach(n=>n.style.visibility=vis.includes(n.dataset.k)?'visible':'hidden');document.querySelector('.hx-shadow').style.visibility='hidden'},vis);await p.waitForTimeout(80);return (await p.screenshot({clip:box})).toString('base64')};
const bg=await shot([]);const out={};for(const k of keys)out[k]=await shot([k]);
const res=await p.evaluate(async({bg,out})=>{const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);r(x.getImageData(0,0,i.width,i.height).data)};i.src='data:image/png;base64,'+s});
 const lab=(r,g,b)=>{const f=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)};r=f(r);g=f(g);b=f(b);let X=(r*0.4124+g*0.3576+b*0.1805)/0.95047,Y=r*0.2126+g*0.7152+b*0.0722,Z=(r*0.0193+g*0.1192+b*0.9505)/1.08883;const h=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;X=h(X);Y=h(Y);Z=h(Z);return [116*Y-16,500*(X-Y),200*(Y-Z)]};
 const B=await load(bg);const o={};for(const k in out){const A=await load(out[k]);let de=0,dl=0,n=0;for(let i=0;i<A.length;i+=4){if(A[i]===B[i]&&A[i+1]===B[i+1]&&A[i+2]===B[i+2])continue;const a=lab(A[i],A[i+1],A[i+2]),b=lab(B[i],B[i+1],B[i+2]);de+=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);dl+=Math.abs(a[0]-b[0]);n++}o[k]={pixels:n,deltaE:Math.round(de),lightness:Math.round(dl)}}return o},{bg,out});
console.log(JSON.stringify(res));await b.close()})();
