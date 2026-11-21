// pack a model JSON into an SVG whose element ids carry the data as hex (Figma keeps ids as layer names)
const fs=require('fs');const [,,inp,out]=process.argv;const h=Buffer.from(fs.readFileSync(inp,'utf8'),'utf8').toString('hex');const N=180;
let s='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="60" viewBox="0 0 600 60">';let k=0;
for(let i=0;i<h.length;i+=N,k++)s+=`<rect id="d${String(k).padStart(4,'0')}x${h.slice(i,i+N)}" x="${(k%200)*3}" y="${Math.floor(k/200)*3}" width="2" height="2" fill="#000"/>`;
s+='</svg>';fs.writeFileSync(out,s);console.log(out,'chunks',k,'bytes',s.length);
