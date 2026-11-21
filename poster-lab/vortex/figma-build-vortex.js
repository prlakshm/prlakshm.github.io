// COMIC VORTEX — Home -> Everything, three variations, built straight into Figma with Motion keyframes.
// Run through use_figma with a `CFG` in scope (packed loader: new Function('figma','CFG', code)), or paste with `const CFG={mode:'A'};` on top.
//   mode 'A' Drain    — flat. Every Home element spirals down the hole on its own; Everything spirals back out.
//   mode 'B' Rings    — flat. The whole page splits into concentric rings that spin at different speeds and fall in, inner first.
//   mode 'C' Cave-in  — 3D tilt. The collapse spreads outward from the hole (nearest piece first); each piece falls straight in,
//                       shrinking and tipping over the lip, then Everything is thrown back out. Nothing but the rim cracks.
//   mode 'S' Shards   — the first cave-in (3D tilt): cracks run to the edges, the page breaks into shards that tip in as they spiral.
// CFG.freeze = seconds  -> builds a STILL of that moment instead (every track evaluated and baked), because export_video and
//                          screenshots of a timeline ignore 3D. Stills are named "... · t=Ns" and placed to the right.
// The hole is centred on the hole of the bagel on the Everything page. ROTATION is counter-clockwise-positive in Figma;
// DIR=1 makes the vortex turn clockwise on screen.
const page=await figma.getNodeByIdAsync('306:2');await figma.setCurrentPageAsync(page);
const W=1440,H=900,HOME='087a2e383d466f4957ff119f3a1ea43c425b3fa3',EV='22886470b2cb3a6bae65b19fe9d3c1d1fe430020';
const COOL={r:0.973,g:0.98,b:0.988},INK={r:0.067,g:0.067,b:0.075},PIT={r:0.03,g:0.03,b:0.035};
const M=CFG.mode,HC=CFG.hc||[586,398],DIR=CFG.dir||1,R=CFG.R||115,FZ=CFG.freeze==null?null:CFG.freeze;
const NAMES={A:'Vortex A · Drain',B:'Vortex B · Rings',C:'Vortex C · Cave-in',S:'Vortex C0 · Shards (old)'},YS={A:13200,B:14400,C:15600,S:16800};
const DUR=CFG.dur||{A:5.2,B:5.3,C:5.25,S:5.6}[M];
let seed=CFG.seed||11;const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296;};const rr=(a,b)=>a+(b-a)*rnd();
const r2=v=>Math.round(v*100)/100,r3=v=>Math.round(v*1000)/1000;
const EASE={io:[0.65,0,0.35,1],out:[0.22,1,0.36,1],in:[0.6,0,0.9,0.5],soft:[0.45,0.05,0.25,1],back:[0.34,1.5,0.64,1],acc:[0.55,0,0.9,0.55]};
const ez=k=>k==='hold'?{type:'HOLD'}:k==='lin'?{type:'LINEAR'}:(c=>({type:'CUSTOM_CUBIC_BEZIER',easingFunctionCubicBezier:{x1:c[0],y1:c[1],x2:c[2],y2:c[3]}}))(EASE[k||'io']);
const clean=arr=>{const a=arr.map(k=>[r3(k[0]),k[1],k[2]]).sort((p,q)=>p[0]-q[0]);const o=[];for(const k of a){if(o.length&&Math.abs(o[o.length-1][0]-k[0])<1e-4)o[o.length-1]=k;else o.push(k);}return o;};
const bz=(c,u)=>{let lo=0,hi=1,s=u;for(let i=0;i<24;i++){s=(lo+hi)/2;const x=3*(1-s)*(1-s)*s*c[0]+3*(1-s)*s*s*c[2]+s*s*s;if(x<u)lo=s;else hi=s;}return 3*(1-s)*(1-s)*s*c[1]+3*(1-s)*s*s*c[3]+s*s*s;};
const evalK=(arr,t)=>{const a=clean(arr);if(t<=a[0][0])return a[0][1];for(let i=1;i<a.length;i++){if(t<a[i][0]){const p=a[i-1],q=a[i];let u=(t-p[0])/(q[0]-p[0]);if(q[2]==='hold')u=0;else if(q[2]!=='lin')u=bz(EASE[q[2]||'io'],u);return p[1]+(q[1]-p[1])*u;}}return a[a.length-1][1];};
const P=name=>({type:'PROPERTY',name});const pend=new Map();let tracks=0,durSet=false,top=null;
// every keyframe track goes through tr(): a real track when animating, a baked value when freezing
const tr=(n,name,arr)=>{if(arr.length<2&&FZ==null)arr=[arr[0],[arr[0][0]+0.01,arr[0][1],'lin']];
  if(FZ==null){const a=clean(arr);n.applyManualKeyframeTrack(P(name),{keyframes:a.map((k,i)=>({timelinePosition:k[0],value:name==='SCALE_XY'?{type:'VECTOR',value:{x:k[1],y:k[1]}}:{type:'FLOAT',value:k[1]},easing:ez(i===0?'lin':k[2])}))});tracks++;if(!durSet){durSet=true;try{top.setTimelineDuration(top.timelines[0].id,DUR);}catch(e){}}return;}
  let p=pend.get(n.id);if(!p){p={n};pend.set(n.id,p);}p[name]=evalK(arr,FZ);};
const strokeA=(n,arr)=>{const a=clean(arr);const c=n.strokes[0].color;const set=v=>{const st=JSON.parse(JSON.stringify(n.strokes));st[0].opacity=Math.max(0,Math.min(1,v));n.strokes=st;};
  if(FZ!=null){set(evalK(a,FZ));return;}
  n.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:'strokes',index:0},{keyframes:a.map((k,i)=>({timelinePosition:k[0],value:{type:'COLOR',value:{r:c.r,g:c.g,b:c.b,a:k[1]}},easing:ez(i===0?'lin':k[2])}))});set(a[0][1]);tracks++;};
// ---------- nodes ----------
const solid=(c,op)=>({type:'SOLID',color:c,opacity:op==null?1:op});
const imgFill=(hash,bx,by,bw,bh)=>({type:'IMAGE',scaleMode:'CROP',imageHash:hash,imageTransform:[[bw/W,0,bx/W],[0,bh/H,by/H]]});
const frame=(par,name,x,y,w,h)=>{const f=figma.createFrame();par.appendChild(f);f.name=name;f.resize(w,h);f.x=x;f.y=y;f.fills=[];f.clipsContent=false;return f;};
const full=(par,name)=>frame(par,name,0,0,W,H);
const rect=(par,name,x,y,w,h,paint)=>{const r=figma.createRectangle();par.appendChild(r);r.name=name;r.resize(w,h);r.x=x;r.y=y;r.fills=[paint];return r;};
const C_=new Map();const cen=v=>C_.get(v.id);
const bboxOf=pts=>{const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const x=Math.min(...xs),y=Math.min(...ys);return {x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y};};
// pts are in page coordinates; org is the page position of the parent's origin
const vec=(par,name,pts,o)=>{o=o||{};const org=o.org||[0,0];const b=bboxOf(pts);const v=figma.createVector();par.appendChild(v);v.name=name;
  v.vectorPaths=[{windingRule:o.open?'NONE':'NONZERO',data:'M '+pts.map(p=>r2(p[0]-b.x)+' '+r2(p[1]-b.y)).join(' L ')+(o.open?'':' Z')}];v.x=b.x-org[0];v.y=b.y-org[1];
  v.fills=o.img?[imgFill(o.img,b.x,b.y,b.w,b.h)]:o.fill?[solid(o.fill,o.fillOp)]:[];
  if(o.stroke){v.strokes=[solid(o.stroke,o.strokeOp)];v.strokeWeight=o.w||2;v.strokeJoin=o.join||'MITER';v.strokeCap=o.cap||'NONE';if(o.align)v.strokeAlign=o.align;}else v.strokes=[];
  C_.set(v.id,[b.x+b.w/2,b.y+b.h/2]);return v;};
const pol=(r,a,c)=>{c=c||HC;return [c[0]+r*Math.cos(a),c[1]+r*Math.sin(a)];};
// grow/shrink a node about a fixed page point `base` (SCALE pivots on the node's own centre, so slide it to compensate)
const scaleAbout=(n,c,base,sArr)=>{tr(n,'SCALE_XY',sArr);tr(n,'TRANSLATION_X',sArr.map(k=>[k[0],r2((1-k[1])*(base[0]-c[0])),k[2]]));tr(n,'TRANSLATION_Y',sArr.map(k=>[k[0],r2((1-k[1])*(base[1]-c[1])),k[2]]));};
// the vortex path: a node whose resting centre is c spirals into the hole (inward) or out of it to c (outward).
// q = 0 at rest, 1 at the hole. Radius falls slowly then fast; the turn tightens near the centre; it shrinks and spins with the turn.
const spiral=(n,c,o)=>{const dx=c[0]-HC[0],dy=c[1]-HC[1],r0=Math.hypot(dx,dy)||1,p0=Math.atan2(dy,dx),N=o.n||14,sg=o.inward?1:-1;
  const X=[],Y=[],S=[],Ro=[],TX=[],TY=[];
  for(let i=0;i<=N;i++){const u=i/N,q=o.inward?u:1-u,t=o.t0+o.D*u;const fall=Math.pow(q,o.pw||2.2),turn=o.sw*Math.pow(q,1.7);
    const r=r0*(1-fall),a=p0+DIR*sg*turn;const rot=-DIR*sg*turn*180/Math.PI*(o.spin==null?0.9:o.spin);
    X.push([t,r2(HC[0]+r*Math.cos(a)-c[0]),'lin']);Y.push([t,r2(HC[1]+r*Math.sin(a)-c[1]),'lin']);S.push([t,r3(Math.max(0.012,Math.pow(1-fall,0.85))),'lin']);Ro.push([t,r2(rot),'lin']);
    if(o.tilt){const g=a+Math.PI+rot*Math.PI/180;const tau=o.tilt*Math.pow(q,1.1);TX.push([t,r2(-tau*Math.sin(g)),'lin']);TY.push([t,r2(tau*Math.cos(g)),'lin']);}}
  tr(n,'TRANSLATION_X',X);tr(n,'TRANSLATION_Y',Y);tr(n,'SCALE_XY',S);tr(n,'ROTATION',Ro);
  tr(n,'OPACITY',o.inward?[[o.t0,1],[o.t0+o.D*0.86,1,'lin'],[o.t0+o.D,0,'lin']]:[[o.t0,0],[o.t0+o.D*0.1,1,'lin']]);
  return {TX,TY};};
// ---------- the top frame ----------
const name=NAMES[M]+(FZ==null?'':' · t='+FZ+'s');
for(const n of page.children.filter(n=>n.name===name))n.remove();
top=figma.createFrame();top.name=name;top.resize(W,H);page.appendChild(top);top.x=FZ==null?0:1600+(CFG.slot||0)*1460;top.y=YS[M];top.clipsContent=true;top.fills=[solid(COOL)];
// ---------- hole geometry: a jagged rim, walls going down, a black pit ----------
// irregular on purpose: even corners push out (cracks start there), odd ones cut in, and the angles wander
const NR=22;const rim=[];for(let i=0;i<NR;i++)rim.push({a:(i+rr(-0.34,0.34))/NR*2*Math.PI,r:R*(i%2?rr(0.72,1.0):rr(0.98,1.32))});
const rimP=rim.map(v=>pol(v.r,v.a));const WK=M==='C'?0.84:0.56,WD=M==='C'?4:7; // C: thin walls, so the hole is almost all black
const innerP=rimP.map(p=>[HC[0]+(p[0]-HC[0])*WK,HC[1]+(p[1]-HC[1])*WK+WD]);
const T=Object.assign({crack:0.25,fall:M==='C'?0.33:0.45},CFG.T||{});
const makeHole=(par,o)=>{const B=R*1.7,org=[HC[0]-B,HC[1]-B];const body=frame(par,'Hole · caved in',org[0],org[1],2*B,2*B);
  if(o.flat){vec(body,'black',rimP,{org,fill:{r:0,g:0,b:0},stroke:{r:0,g:0,b:0},w:3});tr(body,'OPACITY',[[0,0],[T.crack,1,'hold']]);tr(body,'SCALE_XY',o.scale);return body;}
  const walls=frame(body,'walls',0,0,2*B,2*B);const G=[0.12,0.16,0.21,0.26,0.19,0.14];
  for(let i=0;i<NR;i++){const j=(i+1)%NR;const g=G[(i*5+Math.floor(rnd()*2))%G.length];vec(walls,'wall',[rimP[i],rimP[j],innerP[j],innerP[i]],{org,fill:{r:g,g:g,b:g+0.012}});
    // a second, darker strip inside each wall: the striations of the reference
    const m=[(rimP[i][0]+rimP[j][0])/2,(rimP[i][1]+rimP[j][1])/2],mi=[(innerP[i][0]+innerP[j][0])/2,(innerP[i][1]+innerP[j][1])/2];if(i%2===0)vec(walls,'wall strip',[rimP[i],m,mi,innerP[i]],{org,fill:{r:g*0.7,g:g*0.7,b:g*0.72}});}
  vec(body,'pit',innerP,{org,fill:M==='C'?{r:0,g:0,b:0}:PIT});
  if(o.noSwirl){vec(body,'rim ink',rimP,{org,stroke:INK,w:3.5});tr(body,'OPACITY',[[0,0],[T.crack,1,'hold']]);tr(body,'SCALE_XY',o.scale);return body;}
  const sw=frame(body,'swirl',0,0,2*B,2*B);for(let k=0;k<3;k++){const pts=[];for(let i=0;i<=22;i++){const u=i/22;pts.push(pol(R*(0.4-0.35*u),k*2.094+DIR*u*5.2));}vec(sw,'swirl arm',pts,{org,open:true,stroke:{r:0.42,g:0.42,b:0.46},w:2.2,cap:'ROUND',join:'ROUND'});}
  tr(sw,'ROTATION',[[0,0],[DUR,-DIR*360*(o.turns||5),'lin']]);
  vec(body,'rim ink',rimP,{org,stroke:INK,w:3.5});
  tr(body,'OPACITY',[[0,0],[T.crack,1,'hold']]);
  tr(body,'SCALE_XY',o.scale);return body;};
// lids: the page over the hole, in chunks that crack and fall in
const makeLids=(par,hash)=>{const lay=full(par,'Lids · the page caves in');const order=[];for(let i=0;i<NR;i+=2)order.push(i);order.sort(()=>rnd()-0.5);
  order.forEach((i,k)=>{const pts=[HC,rimP[i],rimP[(i+1)%NR],rimP[(i+2)%NR]];let v=vec(lay,'lid',pts,{img:hash,stroke:INK,w:2.2,strokeOp:0});const c=cen(v);const pv=v;let w3=null;if(M==='C'){w3=frame(lay,'lid (tips in)',v.x,v.y,v.width,v.height);w3.appendChild(v);v.x=0;v.y=0;w3.scene3d={perspective:520,preserve3d:false};v.transform3d={type:'FIXED_ORDER',translateZ:0,rotateX:0,rotateY:0,rotateZ:0};}
    strokeA(v,[[0,0],[T.crack,1,'hold']]);if(w3){v=w3;}const t0=T.fall+k*(M==='C'?0.025:0.05),D=M==='C'?0.32:0.42,to=[(HC[0]-c[0])*0.8,(HC[1]-c[1])*0.8+10];const sag=[(HC[0]-c[0])*0.05,(HC[1]-c[1])*0.05];
    tr(v,'TRANSLATION_X',[[0,0],[T.crack,r2(sag[0]),'hold'],[t0,r2(sag[0])],[t0+D,r2(to[0]),'acc']]);tr(v,'TRANSLATION_Y',[[0,0],[T.crack,r2(sag[1]),'hold'],[t0,r2(sag[1])],[t0+D,r2(to[1]),'acc']]);
    tr(v,'SCALE_XY',[[t0,1],[t0+D,0.1,'acc']]);tr(v,'ROTATION',[[t0,0],[t0+D,r2(rr(30,80)*(M==='C'?0.2:1)*(rnd()<0.5?-1:1)),'acc']]);tr(v,'OPACITY',[[t0+D*0.55,1],[t0+D,0,'lin']]);
    if(w3){const g0=Math.atan2(HC[1]-c[1],HC[0]-c[0]);tr(pv,'TRANSFORM_3D_ROTATION_X',[[0,0],[T.crack,r2(-9*Math.sin(g0)),'hold'],[t0,r2(-9*Math.sin(g0))],[t0+D,r2(-82*Math.sin(g0)),'acc']]);tr(pv,'TRANSFORM_3D_ROTATION_Y',[[0,0],[T.crack,r2(9*Math.cos(g0)),'hold'],[t0,r2(9*Math.cos(g0))],[t0+D,r2(82*Math.cos(g0)),'acc']]);}});return lay;};
// cracks: tapered jagged wedges with a branch, snapping out of the rim in three jumps
const makeCracks=(par,o)=>{const lay=full(par,'Cracks');const wedge=(start,dir,L,w0,ns)=>{const cl=[start];let d=dir,p=start;for(let k=1;k<=ns;k++){d=dir+rr(-0.55,0.55);p=[p[0]+Math.cos(d)*L/ns,p[1]+Math.sin(d)*L/ns];cl.push(p);}
    const l=[],r=[];for(let k=0;k<ns;k++){const a=cl[k],b=cl[k+1];const nx=-(b[1]-a[1]),ny=b[0]-a[0],nl=Math.hypot(nx,ny)||1,w=w0*Math.pow(1-k/ns,1.15);l.push([a[0]+nx/nl*w,a[1]+ny/nl*w]);r.push([a[0]-nx/nl*w,a[1]-ny/nl*w]);}
    return {pts:l.concat([cl[ns]],r.reverse()),cl};};
  const grow=(v,base,t)=>scaleAbout(v,cen(v),base,[[t,0.01],[t+0.05,0.4,'hold'],[t+0.1,0.74,'hold'],[t+0.15,1,'hold'],[o.heal[0],1],[o.heal[1],0.01,'in']]);
  let k=0;for(let i=0;i<NR;i+=2){const start=pol(rim[i].r*0.92,rim[i].a),dir=rim[i].a+rr(-0.22,0.22),L=R*rr(0.75,2.0)*(o.len||1);const t=T.crack+0.03+k*0.035;k++;
    const m=wedge(start,dir,L,rr(4.5,7.5),6);const v=vec(lay,'crack',m.pts,{fill:INK});grow(v,start,t);tr(v,'OPACITY',[[0,0],[t,1,'hold'],[o.heal[1],0,'hold']]);
    const bi=2+Math.floor(rnd()*2),bs=m.cl[bi];const b=wedge(bs,dir+(rnd()<0.5?-1:1)*rr(0.6,1.05),L*rr(0.32,0.5),3.2,4);const bv=vec(lay,'crack branch',b.pts,{fill:INK});grow(bv,bs,t+0.1);tr(bv,'OPACITY',[[0,0],[t+0.1,1,'hold'],[o.heal[1],0,'hold']]);}
  return lay;};
// comic whirl lines: spiral streaks that circle the hole
const makeArcs=(par,o)=>{const half=R*3.6,org=[HC[0]-half,HC[1]-half];for(let g=0;g<2;g++){const f=frame(par,'Whirl lines '+(g+1),org[0],org[1],2*half,2*half);
    for(let k=0;k<7;k++){const r0=R*rr(1.35,3.3),a0=rr(0,6.283),span=rr(0.5,1.2);const pts=[];for(let i=0;i<=10;i++){const u=i/10;pts.push(pol(r0*(1-0.16*u),a0+DIR*span*u));}vec(f,'whirl',pts,{org,open:true,stroke:INK,w:rr(1.6,3.2),cap:'ROUND',join:'ROUND'});}
    tr(f,'ROTATION',[[0,0],[DUR,-DIR*360*(g?2.4:4),'lin']]);tr(f,'OPACITY',[[o.on[0],0],[o.on[0]+0.25,0.9,'lin'],[o.on[1]-0.3,0.9],[o.on[1],0,'lin']]);}};
const evFull=(t0,t1)=>{const r=rect(top,'Everything page (lands)',0,0,W,H,imgFill(EV,0,0,W,H));tr(r,'OPACITY',[[t0,0],[t1,1,'lin']]);return r;};
const closeScale=(t)=>[[0,1],[T.crack,1],[T.fall+0.5,1.04,'hold'],[T.fall+0.62,1,'hold'],[t[0],1],[t[1],0.27,'io'],[t[2],0.27],[t[3],0.01,'in']];
// ---------- page pieces ----------
// Home: [x,y,w,h,text?]  text crops use DARKEN so their paper-coloured box never covers a neighbour
const HE=[[306,168,118,112,1],[430,168,150,112,1],[590,168,346,112,1],[946,168,190,112,1],[300,290,460,66,1],[856,290,286,66,1],[308,366,64,64,1],[379,366,64,64,1],[450,366,64,64,1],[521,366,64,64,1],
  [44,508,788,26,1],[876,508,520,26,1],[44,549,254,316,0],[311,549,254,316,0],[577,549,254,316,0],[877,549,254,316,0],[1143,549,254,316,0],[44,870,254,30,1],[311,870,254,30,1],[577,870,254,30,1],[877,870,254,30,1],[1143,870,254,30,1],
  [948,26,84,26,1],[1064,26,116,26,1],[1212,26,62,26,1],[1306,26,92,26,1],[40,6,182,68,0]];
// Everything: thumbnail clusters, then the nav and the star card; BAG is the bagel cluster
const ER=[[360,165,102,62],[464,165,138,84],[322,232,140,58],[686,133,274,66],[742,201,54,64],[906,200,220,66],[233,319,110,115],[512,284,296,210],[861,349,190,73],[886,430,182,84],[190,481,246,74],[569,527,246,74],[1073,556,261,62],[346,597,146,220],[747,646,118,108],[889,646,178,108],
  [948,26,84,26],[1064,26,116,26],[1212,26,62,26],[1306,26,92,26],[40,6,182,68]];const BAG=7;
const dist=r=>Math.hypot(r[0]+r[2]/2-HC[0],r[1]+r[3]/2-HC[1]);
let out={mode:M};
if(M==='A'){
  const tOut=3.0,tb=3.5;
  // under the hole: the bagel, which grows out from beneath it so the black hole ends up as the bagel's own hole
  const bg=ER[BAG];const bag=rect(top,'bagel (rises under the hole)',bg[0],bg[1],bg[2],bg[3],imgFill(EV,bg[0],bg[1],bg[2],bg[3]));scaleAbout(bag,[bg[0]+bg[2]/2,bg[1]+bg[3]/2],HC,[[tb,0.01],[tb+0.95,1,'out']]);tr(bag,'OPACITY',[[0,0],[tb,1,'hold']]);
  makeCracks(top,{heal:[3.9,4.25]});makeHole(top,{scale:closeScale([4.0,4.5,4.62,4.85]),turns:6});makeLids(top,HOME);
  const he=full(top,'Home · everything spirals in');const ord=HE.map((r,i)=>i).sort((a,b)=>dist(HE[a])-dist(HE[b]));const dmax=Math.max(...HE.map(dist));
  ord.forEach((ri,i)=>{const r=HE[ri];const n=rect(he,'home piece',r[0],r[1],r[2],r[3],imgFill(HOME,r[0],r[1],r[2],r[3]));if(r[4])n.blendMode='DARKEN';
    spiral(n,[r[0]+r[2]/2,r[1]+r[3]/2],{inward:true,t0:0.72+1.0*i/(ord.length-1),D:0.95+0.3*dist(r)/dmax,sw:2*Math.PI*(1.05+0.25*dist(r)/dmax)});});
  const et=full(top,'Everything · spirals back out');const eo=ER.map((r,i)=>i).filter(i=>i!==BAG).sort((a,b)=>dist(ER[a])-dist(ER[b]));const emax=Math.max(...ER.map(dist));
  eo.forEach((ri,i)=>{const r=ER[ri];const n=rect(et,'everything piece',r[0],r[1],r[2],r[3],imgFill(EV,r[0],r[1],r[2],r[3]));if(ri>=16&&ri<20)n.blendMode='DARKEN';
    spiral(n,[r[0]+r[2]/2,r[1]+r[3]/2],{inward:false,t0:tOut+0.7*i/(eo.length-1),D:0.9+0.25*dist(r)/emax,sw:2*Math.PI*(0.8+0.25*dist(r)/emax)});});
  makeArcs(top,{on:[0.6,4.4]});evFull(4.75,5.05);
}
if(M==='B'){
  const void_=rect(top,'void',0,0,W,H,solid({r:0.085,g:0.085,b:0.1}));tr(void_,'OPACITY',[[0,0],[T.crack,1,'hold']]);
  const b=[R*0.74,150,225,305,395,495,605,730,870,1010];const NK=b.length-1;
  const ring=(par,nm,hash,k)=>{const ro=b[k],ri=b[k-1];const e=figma.createEllipse();par.appendChild(e);e.name=nm+' '+k;e.resize(2*ro,2*ro);e.x=HC[0]-ro;e.y=HC[1]-ro;e.arcData={startingAngle:0,endingAngle:2*Math.PI,innerRadius:ri/ro};
    e.fills=[imgFill(hash,HC[0]-ro,HC[1]-ro,2*ro,2*ro)];e.strokes=[solid(INK,0)];e.strokeWeight=3;e.strokeAlign='INSIDE';return e;};
  const th=k=>430-30*k; // inner rings turn further
  // Everything (below): comes out outermost ring first, unwinding in the same direction
  const el=full(top,'Everything · rings unwind out');const tO=3.1;
  for(let k=NK;k>=1;k--){const e=ring(el,'everything ring',EV,k);const t0=tO+(NK-k)*0.07,D=1.0,S=[],Ro=[];for(let i=0;i<=12;i++){const u=i/12;S.push([t0+D*u,r3(Math.max(0.004,1-Math.pow(1-u,2.6))),'lin']);Ro.push([t0+D*u,r2(DIR*th(k)*Math.pow(1-u,2.2)),'lin']);}
    tr(e,'SCALE_XY',S);tr(e,'ROTATION',Ro);tr(e,'OPACITY',[[0,0],[t0,1,'hold']]);strokeA(e,[[0,1],[t0+D*0.5,1],[t0+D*0.92,0,'lin']]);}
  const disc=figma.createEllipse();el.appendChild(disc);disc.name='everything centre (the bagel)';disc.resize(2*b[0],2*b[0]);disc.x=HC[0]-b[0];disc.y=HC[1]-b[0];disc.fills=[imgFill(EV,HC[0]-b[0],HC[1]-b[0],2*b[0],2*b[0])];
  tr(disc,'SCALE_XY',[[tO+0.6,0.004],[tO+1.5,1,'out']]);tr(disc,'OPACITY',[[0,0],[tO+0.6,1,'hold']]);
  // Home (above): each ring loosens, then winds up and falls in, innermost first
  const hl=full(top,'Home · rings wind in');
  for(let k=NK;k>=1;k--){const e=ring(hl,'home ring',HOME,k);const tk=1.0+(k-1)*0.1,D=0.85+0.04*k,ts=0.8,te=tk+D,S=[[0,1],[tk-0.16,0.986,'hold']],Ro=[];
    for(let i=0;i<=12;i++){const u=i/12;Ro.push([ts+(te-ts)*u,r2(-DIR*th(k)*Math.pow(u,3)),'lin']);}for(let i=1;i<=10;i++){const u=i/10;S.push([tk+D*u,r3(Math.max(0.004,0.986*(1-Math.pow(u,2.5)))),'lin']);}S.push([tk,0.986]);
    tr(e,'SCALE_XY',S);tr(e,'ROTATION',Ro);tr(e,'OPACITY',[[0,1],[te,0,'hold']]);strokeA(e,[[0,0],[tk-0.16,1,'hold']]);}
  makeCracks(top,{heal:[0.95,1.2],len:0.8});makeHole(top,{scale:closeScale([4.25,4.7,4.8,5.0]),turns:7});makeLids(top,HOME);evFull(4.95,5.2);
}
if(M==='C'){
  // CAVE-IN. Drain's hole and cracks (thin walls, black pit), nothing turns and nothing is drawn on the rest of the page.
  // Mechanics: the page is a sheet over a funnel. The collapse starts at the rim and the FRONT TRAVELS OUTWARD at a steady speed,
  // so a piece is held still until the front reaches it: nearest goes first, farthest last. Once released it falls from rest
  // down the funnel (radial free-fall cycloid: slow start, very fast at the end). Size is depth in the well, so it only shrinks.
  // 3D: the funnel wall steepens toward the hole, and a piece lies on the wall, so its hole-side edge dips away from the viewer
  // more and more (tilt about the tangent, up to TILT degrees at the lip). No in-plane turning. Coming back, Everything is thrown
  // out near-first, tilted, flattens as it rises, and rocks once past flat as it lands.
  // (All-released-at-once was rejected 2026-11-20: "no clear physics". Slide-then-drop-straight-down was rejected earlier.)
  const WA=R*1.2,RF=R*0.22,well=r=>r/(r+WA),TILT=CFG.tilt||80,PERSP=CFG.persp||500;
  const wrap3=(lay,n,nm)=>{const w=frame(lay,nm,n.x,n.y,n.width,n.height);w.appendChild(n);n.x=0;n.y=0;w.scene3d={perspective:PERSP,preserve3d:false};n.transform3d={type:'FIXED_ORDER',translateZ:0,rotateX:0,rotateY:0,rotateZ:0};return w;};
  const suck=(n,v,c,o)=>{const dx=c[0]-HC[0],dy=c[1]-HC[1],r0=Math.hypot(dx,dy)||1,N=20,w0=well(r0),g0=Math.atan2(-dy,-dx);const X=[],Y=[],S=[],O=[],TX=[],TY=[];
    for(let i=0;i<=N;i++){const eta=Math.PI*i/N,uu=(eta+Math.sin(eta))/Math.PI,ff=(1-Math.cos(eta))/2;const t=o.inward?o.t0+o.D*uu:o.t0+o.D*(1-uu);const r=r0*(1-ff);const sc=Math.max(0.004,well(r)/w0),tau=TILT*Math.pow(1-sc,0.38);
      X.push([t,r2(-dx*ff),'lin']);Y.push([t,r2(-dy*ff),'lin']);S.push([t,r3(sc),'lin']);O.push([t,r3(Math.min(1,r/Math.min(r0,RF))),'lin']);TX.push([t,r2(-tau*Math.sin(g0)),'lin']);TY.push([t,r2(tau*Math.cos(g0)),'lin']);}
    if(!o.inward){const te=o.t0+o.D,k=-0.2*TILT;TX.push([te+0.13,r2(-k*Math.sin(g0)),'out']);TY.push([te+0.13,r2(k*Math.cos(g0)),'out']);TX.push([te+0.34,0,'io']);TY.push([te+0.34,0,'io']);}
    tr(n,'TRANSLATION_X',X);tr(n,'TRANSLATION_Y',Y);tr(n,'SCALE_XY',S);tr(n,'OPACITY',o.inward?O:[[0,0],[o.t0,0,'hold']].concat(O));if(!o.flat){tr(v,'TRANSFORM_3D_ROTATION_X',TX);tr(v,'TRANSFORM_3D_ROTATION_Y',TY);}};
  // Thin text rows (section headers with their rules, poster labels, nav words) stay FLAT: tilted in perspective a long strip
  // reads as lifting off the page and rotating (rejected: "It should not lift. Only get dragged/pulled in"). They are only pulled.
  const thin=r=>r[3]<=32||(r[4]&&r[2]>4*r[3]); // also the small mono copy blocks (wider than 4:1); the big title words still tip
  // A piece lets go only when the collapse front has passed ALL of it, so its release distance is its FARTHEST corner, not its
  // centre. (Centre distance let long thin rows like "01 CASE STUDIES ——" go early and drag text in from the page edge: rejected.)
  const farD=r=>Math.max(...[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0],r[1]+r[3]],[r[0]+r[2],r[1]+r[3]]].map(q=>Math.hypot(q[0]-HC[0],q[1]-HC[1])));
  const tRel=T.fall+0.08,tb=3.85,FRONT=CFG.front||1.35,FP=0.7,tOut=2.85; // FP<1: the front speeds up as it spreads, so the farthest pieces (Codex poster) are not left alone on screen
  const bg=ER[BAG];const bag=rect(top,'bagel (rises under the hole)',bg[0],bg[1],bg[2],bg[3],imgFill(EV,bg[0],bg[1],bg[2],bg[3]));scaleAbout(bag,[bg[0]+bg[2]/2,bg[1]+bg[3]/2],HC,[[tb,0.01],[tb+0.9,1,'out']]);tr(bag,'OPACITY',[[0,0],[tb,1,'hold']]);
  // the hole shuts in one smooth close (shrink to the bagel's hole size, pause, then shut was rejected as a two-step)
  makeCracks(top,{heal:[4.0,4.35]});makeHole(top,{scale:closeScale([4.15,4.6,4.68,4.88]).slice(0,5).concat([[4.88,0.01,'io']]),noSwirl:true});makeLids(top,HOME);
  const et=full(top,'Everything · thrown back out');const emax=Math.max(...ER.map(farD));
  ER.map((r,i)=>i).filter(i=>i!==BAG).sort((a,b)=>farD(ER[a])-farD(ER[b])).forEach(ri=>{const r=ER[ri],d=farD(r)/emax;const v=rect(et,'paper',r[0],r[1],r[2],r[3],imgFill(EV,r[0],r[1],r[2],r[3]));const n=wrap3(et,v,'everything piece');
    if(ri>=16&&ri<20)n.blendMode='DARKEN'; // nav words come back as words only, no paper box
    const D=0.5+0.5*d;suck(n,v,[r[0]+r[2]/2,r[1]+r[3]/2],{inward:false,t0:tOut+0.6*d,D,flat:thin(r)});});
  // Home pieces. The page over the hole belongs to the lids, so any piece that reaches over the hole has that part cut away.
  const he=full(top,'Home · falls straight in');const dmax=Math.max(...HE.map(farD));const rmax=Math.max(...rim.map(v=>v.r));let cut=0,gone=0;
  const inPoly=(q)=>{let c=false;for(let i=0,j=NR-1;i<NR;j=i++){const a=rimP[i],b=rimP[j];if((a[1]>q[1])!==(b[1]>q[1])&&q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
  HE.map((r,i)=>i).sort((a,b)=>farD(HE[b])-farD(HE[a])).forEach(ri=>{const r=HE[ri],d=farD(r)/dmax;
    const nearD=Math.hypot(Math.max(r[0]-HC[0],0,HC[0]-r[0]-r[2]),Math.max(r[1]-HC[1],0,HC[1]-r[1]-r[3]));
    if(nearD<rmax&&[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0],r[1]+r[3]],[r[0]+r[2],r[1]+r[3]],[r[0]+r[2]/2,r[1]+r[3]/2]].every(inPoly)){gone++;return;}
    let n=rect(he,'home piece',r[0],r[1],r[2],r[3],imgFill(HOME,r[0],r[1],r[2],r[3]));let c=[r[0]+r[2]/2,r[1]+r[3]/2];
    if(nearD<rmax){const bite=vec(he,'bite',rimP,{fill:INK});const bo=figma.subtract([n,bite],he);bo.name='home piece (cut at the hole)';bo.fills=[imgFill(HOME,bo.x,bo.y,bo.width,bo.height)];bo.strokes=[];c=[bo.x+bo.width/2,bo.y+bo.height/2];n=bo;cut++;}
    const v=n;n=wrap3(he,v,v.name);v.name='paper';
    if(r[4])n.blendMode='DARKEN'; // words only, no paper box. Dark words cannot show on the black pit, so they are seen shrinking up to the rim and are gone inside it
    suck(n,v,c,{inward:true,t0:tRel+FRONT*Math.pow(d,FP),D:0.6+0.35*d,flat:thin(r)});});
  evFull(4.9,5.15);out.cut=cut;out.gone=gone;
}
if(M==='S'){
  // crack lines from every second rim corner to past the page edge; the same lines are the shard edges
  const K=NR/2,MM=18,step=58;const edges=[];for(let j=0;j<K;j++){const v=rim[2*j];const e=[pol(v.r,v.a)];for(let m=1;m<MM;m++){const rho=v.r+m*step;e.push(pol(rho,v.a+rr(-13,13)/rho+rr(-0.012,0.012)*m));}edges.push(e);}
  const clip=(pts)=>{let p=pts;const cl=(inside,ix)=>{const o=[];for(let i=0;i<p.length;i++){const a=p[i],b2=p[(i+1)%p.length];const ia=inside(a),ib=inside(b2);if(ia)o.push(a);if(ia!==ib)o.push(ix(a,b2));}p=o;};
    const ixX=x=>(a,b2)=>[x,a[1]+(b2[1]-a[1])*(x-a[0])/(b2[0]-a[0])],ixY=y=>(a,b2)=>[a[0]+(b2[0]-a[0])*(y-a[1])/(b2[1]-a[1]),y];
    cl(q=>q[0]>=0,ixX(0));if(p.length)cl(q=>q[0]<=W,ixX(W));if(p.length)cl(q=>q[1]>=0,ixY(0));if(p.length)cl(q=>q[1]<=H,ixY(H));return p;};
  const area=p=>{let s=0;for(let i=0;i<p.length;i++){const a=p[i],b2=p[(i+1)%p.length];s+=a[0]*b2[1]-b2[0]*a[1];}return Math.abs(s)/2;};
  const bands=[[0,3],[3,7],[7,MM-1]];const shards=[];
  for(let j=0;j<K;j++){const e0=edges[j],e1=edges[(j+1)%K];bands.forEach((bd,bi)=>{let pts=e0.slice(bd[0],bd[1]+1).concat(e1.slice(bd[0],bd[1]+1).reverse());if(bi===0)pts.push(rimP[2*j+1]);pts=clip(pts);if(pts.length>=3&&area(pts)>400)shards.push({pts,bi,j});});}
  // backdrop: comic focus lines racing to the hole, seen wherever the page has gone
  const FH=1300,forg=[HC[0]-FH,HC[1]-FH];const fl=frame(top,'Focus lines',forg[0],forg[1],2*FH,2*FH);for(let i=0;i<46;i++){const a=i/46*6.283+rr(-0.04,0.04),hw=rr(0.006,0.02),tip=R*rr(1.9,4.2);vec(fl,'focus line',[pol(1250,a-hw),pol(1250,a+hw),pol(tip,a)],{org:forg,fill:INK});}
  tr(fl,'ROTATION',[[0.8,0],[DUR,-DIR*38,'lin']]);tr(fl,'OPACITY',[[0,0],[0.85,1,'hold'],[4.9,1],[5.2,0,'lin']]);
  const plug=vec(top,'everything centre (the bagel)',rimP.map(p=>[HC[0]+(p[0]-HC[0])*1.04,HC[1]+(p[1]-HC[1])*1.04]),{img:EV});scaleAbout(plug,cen(plug),HC,[[4.15,0.01],[4.85,1,'out']]);tr(plug,'OPACITY',[[0,0],[4.15,1,'hold']]);
  makeHole(top,{scale:closeScale([4.5,4.95,5.02,5.2]),turns:7});makeLids(top,HOME);
  const tS=0.85,SW=2*Math.PI*0.62,TILT=56,SAG=8;
  const build=(lay,hash,inward)=>{shards.forEach((s,idx)=>{const b=bboxOf(s.pts),c=[b.x+b.w/2,b.y+b.h/2];const wrap=frame(lay,'shard',b.x,b.y,b.w,b.h);wrap.scene3d={perspective:820,preserve3d:false};
      const v=vec(wrap,'paper',s.pts,{org:[b.x,b.y],img:hash,stroke:INK,w:2.4,strokeOp:0});v.transform3d={type:'FIXED_ORDER',translateZ:0,rotateX:0,rotateY:0,rotateZ:0};
      const ph=((s.j+K*0.37)%K)/K;let t0,D;
      if(inward){t0=1.05+s.bi*0.25+ph*0.4;D=0.9+0.1*s.bi;}else{t0=3.15+(2-s.bi)*0.25+ph*0.4;D=0.95;}
      const r=spiral(wrap,c,{inward,t0,D,sw:SW*(0.8+0.15*s.bi),tilt:TILT,spin:0.75,n:14});
      const g0=Math.atan2(HC[1]-c[1],HC[0]-c[0]);const sx=r2(-SAG*Math.sin(g0)),sy=r2(SAG*Math.cos(g0));
      if(inward){tr(v,'TRANSFORM_3D_ROTATION_X',[[0,0],[tS,sx,'hold']].concat(r.TX.map(k=>[k[0],r2(k[1]+sx*(1-(k[0]-t0)/D)),'lin'])));tr(v,'TRANSFORM_3D_ROTATION_Y',[[0,0],[tS,sy,'hold']].concat(r.TY.map(k=>[k[0],r2(k[1]+sy*(1-(k[0]-t0)/D)),'lin'])));strokeA(v,[[0,0],[tS,1,'hold']]);}
      else{tr(v,'TRANSFORM_3D_ROTATION_X',r.TX);tr(v,'TRANSFORM_3D_ROTATION_Y',r.TY);strokeA(v,[[0,1],[5.05,1],[5.3,0,'lin']]);}});};
  build(full(top,'Everything · shards rise back'),EV,false);build(full(top,'Home · shards cave in'),HOME,true);
  // the cracks as they travel, before the page lets go
  const cl=full(top,'Crack lines (travelling)');edges.forEach((e,j)=>{const pts=e.filter(p=>p[0]>-60&&p[0]<W+60&&p[1]>-60&&p[1]<H+60);if(pts.length<2)return;const v=vec(cl,'crack line',pts,{open:true,stroke:INK,w:2.6,join:'MITER',cap:'NONE'});
    const t=T.crack+0.05+((j*5)%K)*0.03;tr(v,'PATH_TRIM_END',[[t,0],[t+0.42,1,'out']]);tr(v,'OPACITY',[[0,0],[t,1,'hold'],[tS,0,'hold']]);});
  evFull(5.2,5.45);out.shards=shards.length;
}
// ---------- finish ----------
if(FZ==null){top.setTimelineDuration(top.timelines[0].id,DUR);out.dur=top.timelines[0].duration;}
else{const ps=[...pend.values()].reverse();for(const p of ps){const n=p.n;
    if(p.OPACITY!=null){if(p.OPACITY<0.01)n.visible=false;else n.opacity=Math.min(1,p.OPACITY);}
    if(p.PATH_TRIM_END!=null&&p.PATH_TRIM_END<0.5)n.visible=false;
    if(p.TRANSFORM_3D_ROTATION_X!=null||p.TRANSFORM_3D_ROTATION_Y!=null)n.transform3d={type:'FIXED_ORDER',translateZ:0,rotateX:p.TRANSFORM_3D_ROTATION_X||0,rotateY:p.TRANSFORM_3D_ROTATION_Y||0,rotateZ:0};
    if(p.SCALE_X!=null){const sx=p.SCALE_X,sy=p.SCALE_Y,cx=n.x+n.width/2+(p.TRANSLATION_X||0),cy=n.y+n.height/2+(p.TRANSLATION_Y||0);if(n.width*sx<1||n.height*sy<1){n.visible=false;continue;}n.resize(n.width*sx,n.height*sy);n.x=cx-n.width/2;n.y=cy-n.height/2;continue;}
    if(p.SCALE_XY!=null||p.ROTATION!=null||p.TRANSLATION_X!=null||p.TRANSLATION_Y!=null){const s=p.SCALE_XY==null?1:p.SCALE_XY,rot=p.ROTATION||0;const cx=n.x+n.width/2+(p.TRANSLATION_X||0),cy=n.y+n.height/2+(p.TRANSLATION_Y||0);
      if(s<0.03||n.width*s<1||n.height*s<1){n.visible=false;continue;}if(Math.abs(s-1)>1e-4)n.rescale(s);const w=n.width,h=n.height,th=rot*Math.PI/180,c=Math.cos(th),sn=Math.sin(th);
      n.relativeTransform=[[c,sn,cx-(c*w/2+sn*h/2)],[-sn,c,cy-(-sn*w/2+c*h/2)]];}}}
out.top=top.id;out.name=name;out.tracks=tracks;out.nodes=top.findAll(()=>true).length;return out;
