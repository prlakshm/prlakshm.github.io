// Builder for the PRESENT (present.cjs). Paste into use_figma and rerun until done:true.
// Same as figma-build.js plus: the next page printed on the reverse (cam.back), crease lines that fade as the sheet lands
// (cam.fadeLines), a cast shadow that goes away (cam.shadowOff), and the yarn strands + bow (cam.yarn, cam.bow).
// Path-trim keyframes are refused on dashed strokes, so the yarn's twist marks are a separate dashed line that fades in after the strand is drawn.
// cam.bow.pull (burst): the bow is undone by one tail being pulled (see PL below); without it the bow un-draws as before (bloom).
// Exit extras sit flat above the stage: cam.tiles (burst: crops of the Everything page that fly from the box to their places) and
// cam.lead (pull toy: a yarn lead from the knot out past the right edge that rides with the box).
const DATA='375:2',N=40,LINE=0.45;
const page=await figma.getNodeByIdAsync('306:2');await figma.setCurrentPageAsync(page);
const W=1440,H=900,COOL={r:0.973,g:0.98,b:0.988},HOME='087a2e383d466f4957ff119f3a1ea43c425b3fa3',EV='22886470b2cb3a6bae65b19fe9d3c1d1fe430020',INK={r:0.08,g:0.1,b:0.18};
const fr=await figma.getNodeByIdAsync(DATA);const parts=fr.findAll(n=>/^d\d{4}x/.test(n.name)).map(n=>n.name).sort();const hex=parts.map(s=>s.slice(6)).join('');let str='';for(let i=0;i<hex.length;i+=2)str+=String.fromCharCode(parseInt(hex.substr(i,2),16));const D=JSON.parse(decodeURIComponent(escape(str)));const cam=D.cam;
const EASE={io:[0.65,0,0.35,1],out:[0.22,1,0.36,1],in:[0.6,0,0.9,0.5],lin:[0,0,1,1],soft:[0.45,0.05,0.25,1],back:[0.34,1.5,0.64,1],acc:[0.55,0,0.9,0.55],push:[0.7,0,0.84,0.2],glide:[0.4,0,0.75,0.75],fly:[0.2,0.6,0.3,1],flyy:[0.2,0.75,0.3,1],draw:[0.35,0.1,0.3,1],pull:[0.5,0.05,0.8,0.7]};
const ez=k=>{const c=EASE[k||'io'];return {type:'CUSTOM_CUBIC_BEZIER',easingFunctionCubicBezier:{x1:c[0],y1:c[1],x2:c[2],y2:c[3]}};};const E0={type:'CUSTOM_CUBIC_BEZIER',easingFunctionCubicBezier:{x1:0.5,y1:0,x2:0.5,y2:1}},LIN={type:'LINEAR'},HOLD={type:'HOLD'};
const kf=(arr,mkv)=>({keyframes:arr.map((k,i)=>({timelinePosition:k[0],value:mkv?mkv(k[1]):{type:'FLOAT',value:k[1]},easing:i===0?E0:(k[2]==='hold'?HOLD:ez(k[2]))}))});
const P=name=>({type:'PROPERTY',name});const T3=o=>Object.assign({type:'FIXED_ORDER',translateZ:0,rotateX:0,rotateY:0,rotateZ:0},o);
const px=a=>({x:{unit:'PIXELS',value:a[0]},y:{unit:'PIXELS',value:a[1]}});
let top=page.children.find(n=>n.type==='FRAME'&&n.name===cam.name),stage,mover,created=false,dur=null;
if(!top){created=true;
  top=figma.createFrame();top.name=cam.name;top.resize(W,H);top.x=cam.x;top.y=cam.y;top.clipsContent=true;top.fills=[{type:'SOLID',color:COOL}];page.appendChild(top);
  const bg=figma.createRectangle();bg.name='Everything page (behind)';bg.resize(W,H);top.appendChild(bg);bg.x=0;bg.y=0;bg.fills=[{type:'IMAGE',scaleMode:'FILL',imageHash:EV}];bg.effects=[{type:'LAYER_BLUR',radius:0,visible:true,blurType:'NORMAL'}];
  const s0=cam.scrim;
  bg.applyManualKeyframeTrack(P('SCALE_XY'),kf([[0,1.04],[1.2,1,'out']],v=>({type:'VECTOR',value:{x:v,y:v}})));
  bg.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:'effects',index:0,field:'RADIUS'},kf([[0,0],[s0[1][0],6,'out'],[s0[s0.length-2][0],6],[s0[s0.length-1][0],0]]));
  // opt-in (present.cjs --emptybg, off by default): the page behind shows none of its thumbnails until they have flown out of the box (cam.bgEmpty: the emptied page sits over the real one, then fades)
  if(cam.bgEmpty){const be=figma.createRectangle();be.name='Everything page, nothing on it yet (behind)';be.resize(W,H);top.appendChild(be);be.x=0;be.y=0;be.fills=[{type:'IMAGE',scaleMode:'FILL',imageHash:cam.bgEmpty.hash}];be.effects=[{type:'LAYER_BLUR',radius:0,visible:true,blurType:'NORMAL'}];
    be.applyManualKeyframeTrack(P('SCALE_XY'),kf([[0,1.04],[1.2,1,'out']],v=>({type:'VECTOR',value:{x:v,y:v}})));
    be.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:'effects',index:0,field:'RADIUS'},kf([[0,0],[s0[1][0],6,'out'],[s0[s0.length-2][0],6],[s0[s0.length-1][0],0]]));
    be.applyManualKeyframeTrack(P('OPACITY'),kf([[0,1],[cam.bgEmpty.off[0],1],[cam.bgEmpty.off[1],0,'io']]));}
  const scr=figma.createRectangle();scr.name='Scrim · dims Everything while paper folds';scr.resize(W,H);top.appendChild(scr);scr.x=0;scr.y=0;scr.fills=[{type:'SOLID',color:COOL}];scr.opacity=0;scr.applyManualKeyframeTrack(P('OPACITY'),kf(s0));
  stage=figma.createFrame();stage.name='Stage · perspective + cast shadow';stage.resize(W,H);top.appendChild(stage);stage.x=0;stage.y=0;stage.fills=[];stage.clipsContent=false;stage.scene3d={perspective:2000,preserve3d:false};
  stage.effects=[{type:'DROP_SHADOW',radius:0,color:{r:0.06,g:0.08,b:0.14,a:0},offset:{x:0,y:0},spread:0,visible:true,blendMode:'NORMAL',showShadowBehindNode:true}];
  const scol=a=>({type:'COLOR',value:{r:0.06,g:0.08,b:0.14,a}});const so=cam.shadowOff||[cam.dur,cam.dur+1];const sh=(v)=>so[0]<cam.dur?[[0,0],[0.45,v,'out'],[so[0],v],[so[1],0,'io']]:[[0,0],[0.45,v,'out'],[cam.dur,v]];
  stage.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:'effects',index:0,field:'COLOR'},kf(sh(0.2),scol));
  stage.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:'effects',index:0,field:'OFFSET_Y'},kf(sh(26)));
  stage.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:'effects',index:0,field:'RADIUS'},kf(sh(38)));
  if(cam.sc.length>1)stage.applyManualKeyframeTrack(P('SCALE_XY'),kf(cam.sc,v=>({type:'VECTOR',value:{x:v,y:v}})));
  if(cam.tx.length>1)stage.applyManualKeyframeTrack(P('TRANSLATION_X'),kf(cam.tx));
  if(cam.ty.length>1)stage.applyManualKeyframeTrack(P('TRANSLATION_Y'),kf(cam.ty));
  mover=figma.createFrame();mover.name='Mover';mover.resize(W,H);stage.appendChild(mover);mover.x=0;mover.y=0;mover.fills=[];mover.clipsContent=false;mover.scene3d={perspective:-1,preserve3d:true};mover.transformOrigin=px(cam.origin);mover.transform3d=T3({});
  for(const [k,nm] of [['rx','TRANSFORM_3D_ROTATION_X'],['ry','TRANSFORM_3D_ROTATION_Y'],['rz','TRANSFORM_3D_ROTATION_Z']])if(cam[k]&&cam[k].length>1)mover.applyManualKeyframeTrack(P(nm),kf(cam[k]));
  try{top.setTimelineDuration(top.timelines[0].id,cam.dur);dur=top.timelines[0].duration;}catch(e){dur='ERR '+e.message;}
}else{stage=top.children.find(c=>c.name.startsWith('Stage'));mover=stage.children[0];for(const b of mover.findAll(n=>n.name==='building'&&n.parent&&n.parent.name!=='building'))b.remove();}
const map={};for(const n of mover.findAll(n=>n.type==='FRAME'&&/^f\d+( · |$)/.test(n.name)&&!n.name.includes('crease')))map[n.name.split(' · ')[0]]=n;
const todo=D.F.filter(d=>!map['f'+d.i]).slice(0,N);
const mk=(par,name)=>{const f=figma.createFrame();f.name=name;f.resize(W,H);par.appendChild(f);f.x=0;f.y=0;f.fills=[];f.clipsContent=false;f.scene3d={perspective:-1,preserve3d:true};return f;};
const idxTrack=(node,coll,i,track)=>node.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:coll,index:i},track);
const cv=a=>a>0?{r:0.03,g:0.05,b:0.12,a:Math.min(0.72,a)}:{r:1,g:1,b:1,a:Math.min(0.35,-a*0.85)};
const r2=v=>Math.round(v*100)/100;let nodes=0,built=[];const FL=cam.fadeLines;
for(const d of todo){const par=d.p<0?mover:map['f'+d.p];if(!par)throw new Error('no parent for f'+d.i+' (p='+d.p+')');
  const stagev=mk(par,'building');let cont;
  if(d.h){const a=[d.h[0],d.h[1]];const th=Math.atan2(d.h[3]-d.h[1],d.h[2]-d.h[0])*180/Math.PI;
    const h1=stagev;h1.transformOrigin=px(a);h1.transform3d=T3({rotateZ:th});
    const h2=mk(h1,'building');h2.transformOrigin=px(a);const tr=d.tr.length?d.tr:[[0,0]];h2.transform3d=T3({rotateX:tr[0][1],rotateZ:-th});
    if(tr.length>1)h2.applyManualKeyframeTrack(P('TRANSFORM_3D_ROTATION_X'),kf(tr));
    cont=h2;nodes+=2;}
  else{cont=stagev;nodes++;}
  const z0=d.z.length?d.z[0][1]:0;
  for(const front of [true,false]){const w=figma.createFrame();w.name=front?'page side':'underside';w.resize(W,H);cont.appendChild(w);w.x=0;w.y=0;w.fills=[];w.clipsContent=false;
    w.transform3d=T3({rotateY:front?0:180,translateZ:z0,backfaceVisible:false});if(d.z.length>1)w.applyManualKeyframeTrack(P('TRANSFORM_3D_TRANSLATION_Z'),kf(d.z));
    // d.v=[hide,show|null,fade]: a facet tucked inside the closed box is hidden while it is enclosed (layers sort by their centre, so it could draw over the wall it touches)
    if(d.v&&d.v.length)w.applyManualKeyframeTrack(P('OPACITY'),kf(d.v[1]==null?[[0,1],[d.v[0],0,'hold']]:d.v[2]?[[0,1],[d.v[0],0,'hold'],[d.v[1],0],[r2(d.v[1]+d.v[2]),1,'lin']]:[[0,1],[d.v[0],0,'hold'],[d.v[1],1,'hold']]));
    const pts=front?d.P:d.P.map(p=>[W-p[0],p[1]]);const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const bx=Math.min(...xs),by=Math.min(...ys),bw=Math.max(...xs)-bx,bh=Math.max(...ys)-by;
    const v=figma.createVector();w.appendChild(v);v.name=front?'page':(cam.back?'next page (reverse)':'paper');v.vectorPaths=[{windingRule:'NONZERO',data:'M '+pts.map(p=>r2(p[0]-bx)+' '+r2(p[1]-by)).join(' L ')+' Z'}];v.x=bx;v.y=by;v.strokes=[];
    const img=hash=>({type:'IMAGE',scaleMode:'CROP',imageHash:hash,imageTransform:[[bw/W,0,bx/W],[0,bh/H,by/H]]});
    const base=front?img(HOME):(cam.back?img(EV):{type:'SOLID',color:COOL});
    const s=front?d.sf:d.sb;const c0=cv(s[0][1]);const moving=s.some(k=>Math.abs(k[1]-s[0][1])>0.004);
    v.fills=[base,{type:'SOLID',color:{r:c0.r,g:c0.g,b:c0.b},opacity:moving?0:c0.a}];
    if(moving){idxTrack(v,'fills',1,{keyframes:s.map((k,i)=>({timelinePosition:k[0],value:{type:'COLOR',value:cv(k[1])},easing:i===0?E0:LIN}))});const f=JSON.parse(JSON.stringify(v.fills));f[1].opacity=0;v.fills=f;}
    nodes+=2;
    for(const [ta,segs] of d.E){const sp=segs.map(q=>front?q:[W-q[0],q[1],W-q[2],q[3]]);const ex=[],ey=[];for(const q of sp){ex.push(q[0],q[2]);ey.push(q[1],q[3]);}const cx=Math.min(...ex),cy=Math.min(...ey);
      const c=figma.createVector();w.appendChild(c);c.name='crease @'+ta+'s';c.vectorPaths=[{windingRule:'NONE',data:sp.map(q=>'M '+r2(q[0]-cx)+' '+r2(q[1]-cy)+' L '+r2(q[2]-cx)+' '+r2(q[3]-cy)).join(' ')}];c.x=cx;c.y=cy;c.fills=[];c.strokes=[{type:'SOLID',color:INK,opacity:0}];c.strokeWeight=1.5;
      const ks=[{timelinePosition:ta,value:{type:'COLOR',value:{...INK,a:0}},easing:E0},{timelinePosition:r2(ta+0.18),value:{type:'COLOR',value:{...INK,a:LINE}},easing:LIN}];
      if(FL){ks.push({timelinePosition:FL[0],value:{type:'COLOR',value:{...INK,a:LINE}},easing:LIN});ks.push({timelinePosition:FL[1],value:{type:'COLOR',value:{...INK,a:0}},easing:LIN});}
      idxTrack(c,'strokes',0,{keyframes:ks});
      const st=JSON.parse(JSON.stringify(c.strokes));st[0].opacity=0;c.strokes=st;nodes++;}}
  const label='f'+d.i+(d.n?' · '+d.n:'');
  if(d.h){stagev.name='f'+d.i+' · crease';cont.name=label;}else cont.name=label;
  map['f'+d.i]=cont;built.push(d.i);}
const have=Object.keys(map).length;const done=have===D.F.length;let yarnNodes=0;const fixes=[];
// ---------- yarn + bow (once every facet exists) ----------
if(done&&cam.yarn&&!mover.findOne(n=>n.name==='yarn')){
  const hexc=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
  const PINK=hexc(cam.pink||'#FFB0D2'),LIGHT=hexc('#FFE3EE'),DEEP=hexc('#F08CB8');const YW=13,BK=1.35; // yarn weight, bow size
  const line=(par,name,data,x,y,col,wgt,dash,anchor)=>{const v=figma.createVector();par.appendChild(v);v.name=name;v.vectorPaths=[{windingRule:'NONE',data}];v.x=x;v.y=y;v.fills=[];v.strokes=[{type:'SOLID',color:col}];v.strokeWeight=wgt;v.strokeCap='ROUND';v.strokeJoin='ROUND';if(dash)v.dashPattern=dash;yarnNodes++;
    // a vector is placed by the box of its drawn curve, not of its control points, so a curved path is re-seated on its first point
    if(anchor){const v0=v.vectorNetwork.vertices[0];const dx=anchor[0]-(v.x+v0.x),dy=anchor[1]-(v.y+v0.y);v.x+=dx;v.y+=dy;fixes.push([name,r2(dx),r2(dy)]);}return v;};
  // one strand = body + highlight (both drawn on with path trim) + dashed twist marks (fade in once drawn)
  // r = [start,end] of the strand slipping away again, or null when it stays (pull toy)
  const strand=(par,name,data,x,y,d,r,ease,yw,anchor)=>{const wd=yw||YW,made=[];
    for(const [nm,col,wgt] of [[name,PINK,wd],[name+' · highlight',LIGHT,wd*0.3]]){const v=line(par,nm,data,x,y,col,wgt,null,anchor);v.opacity=0;made.push(v);
      v.applyManualKeyframeTrack(P('PATH_TRIM_END'),kf(r?[[d[0],0],[d[1],1,ease||'lin'],[r[0],1],[r[1],0,'lin']]:[[d[0],0],[d[1],1,ease||'lin']]));
      v.applyManualKeyframeTrack(P('OPACITY'),kf(r?[[0,0],[d[0],1,'hold'],[r[1],0,'hold']]:[[0,0],[d[0],1,'hold']]));}
    const tw=line(par,name+' · twist',data,x,y,DEEP,wd,[1.5*wd/YW,10*wd/YW],anchor);tw.opacity=0;made.push(tw);const a=r?Math.min(d[1]+0.12,r[0]-0.02):d[1]+0.12;
    tw.applyManualKeyframeTrack(P('OPACITY'),kf(r?[[d[1],0],[a,0.6,'lin'],[r[0]-0.01,0.6],[r[0],0,'hold']]:[[d[1],0],[a,0.6,'lin']]));return made;};
  for(const y of cam.yarn){const cont=map['f'+y.f];const w=cont.children.find(c=>c.name==='page side');const x0=Math.min(y.a[0],y.b[0]),y0=Math.min(y.a[1],y.b[1]);
    strand(w,'yarn','M '+r2(y.a[0]-x0)+' '+r2(y.a[1]-y0)+' L '+r2(y.b[0]-x0)+' '+r2(y.b[1]-y0),x0,y0,y.d,y.r);}
  const B=cam.bow;if(B){const cont=map['f'+B.f];const [cx,cy]=B.c;const t0=B.tie[0],t1=B.tie[1],UT=B.untie,u0=UT?UT[0]:0,u1=UT?UT[1]:0;const SQ=B.seq||null; // SQ: knot, then both ears, then both tails, strictly one after the other
    // PL (burst): the untie is one tail being pulled. p(t) = how much of the far ear's string has been drawn through the knot, 0..1:
    // a small tug (the slack tail snaps taut and gives a little), a beat, then the pull, slow off the mark and fastest as the loop pops through.
    // The ear's size and the tail's length both follow p, so the string that leaves the ear is the string that arrives in the tail.
    const PL=B.pull||null,TUGP=0.07,q3=v=>Math.round(v*1000)/1000;
    const bzE=(c,u)=>{let lo=0,hi=1,m=u;for(let i=0;i<26;i++){m=(lo+hi)/2;const x=3*(1-m)*(1-m)*m*c[0]+3*(1-m)*m*m*c[2]+m*m*m;if(x<u)lo=m;else hi=m;}return 3*(1-m)*(1-m)*m*c[1]+3*(1-m)*m*m*c[3]+m*m*m;};
    const pAt=t=>!PL||t<=PL.tug[0]?0:t<PL.tug[1]?TUGP*bzE(EASE.out,(t-PL.tug[0])/(PL.tug[1]-PL.tug[0])):t<=PL.go[0]?TUGP:t<PL.go[1]?TUGP+(1-TUGP)*bzE(EASE.pull,(t-PL.go[0])/(PL.go[1]-PL.go[0])):1;
    const pTimes=[];if(PL){for(let i=0;i<=4;i++)pTimes.push(q3(PL.tug[0]+(PL.tug[1]-PL.tug[0])*i/4));const n=Math.round((PL.go[1]-PL.go[0])/0.02);for(let i=0;i<=n;i++)pTimes.push(q3(PL.go[0]+(PL.go[1]-PL.go[0])*i/n));}
    const uniq=a=>{const o=[];for(const k of a.slice().sort((x,y)=>x[0]-y[0])){if(o.length&&Math.abs(o[o.length-1][0]-k[0])<5e-4)o[o.length-1]=k;else o.push(k);}return o;};
    const vecv=v=>({type:'VECTOR',value:{x:v,y:v}});
    const flatf=(name,z,rx)=>{const f=figma.createFrame();f.name=name;f.resize(W,H);cont.appendChild(f);f.x=0;f.y=0;f.fills=[];f.clipsContent=false;f.transformOrigin=px(B.c);f.transform3d=T3({translateZ:z,rotateX:rx||0});return f;};
    // One bow, joined at the knot, shaped like a soft tied ribbon bow but drawn in yarn: two wide, slightly drooping loops, a small tight
    // knot, and two short tails of different lengths tied into the knot: they splay over the lid top, bend over its front edge and lie on the front.
    // Lid-local axes: -x is "up" once the loop frame stands, y is sideways (+y is screen-left), +x runs to the lid's front edge.
    // Loops + knot share one frame stood up off the lid about the knot (rotateY) so they face the camera; each loop leaves the knot and
    // returns to it (ends a few px apart: path trim is refused on closed shapes), and the knot sits over all loop ends and tail starts.
    // Tail path in the net: lid top -> lid front (x edge..edge2) -> front wall (x - edge2) if it ever reaches that far; one smooth curve
    // cut into one piece per facet, so it bends where the paper bends.
    const STAND=68;const lf=figma.createFrame();lf.name='bow loops + knot (standing)';lf.resize(W,H);cont.appendChild(lf);lf.x=0;lf.y=0;lf.fills=[];lf.clipsContent=false;lf.transformOrigin=px(B.c);lf.transform3d=T3({translateZ:3,rotateY:STAND});
    const cub=(q,t)=>{const u=1-t;return [0,1].map(i=>u*u*u*q[0][i]+3*u*u*t*q[1][i]+3*u*t*t*q[2][i]+t*t*t*q[3][i]);};
    const boxOf=(segs)=>{let mnx=1e9,mny=1e9;for(const sg of segs)for(let i=0;i<=60;i++){const q=cub(sg,i/60);mnx=Math.min(mnx,q[0]);mny=Math.min(mny,q[1]);}return [mnx,mny];};
    const pathOf=(segs)=>{const [mnx,mny]=boxOf(segs);const q=p=>r2(p[0]-mnx)+' '+r2(p[1]-mny);return {data:'M '+q(segs[0][0])+segs.map(sg=>' C '+q(sg[1])+' '+q(sg[2])+' '+q(sg[3])).join(''),x:mnx,y:mny,a:segs[0][0]};};
    const lenOf=sg=>{let L=0,pv=sg[0];for(let i=1;i<=24;i++){const p=cub(sg,i/24);L+=Math.hypot(p[0]-pv[0],p[1]-pv[1]);pv=p;}return L;};
    const splitAt=(sg,t)=>{const lp=(p,q)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];const a=lp(sg[0],sg[1]),b_=lp(sg[1],sg[2]),c=lp(sg[2],sg[3]),d=lp(a,b_),e=lp(b_,c),f=lp(d,e);return [[sg[0],a,d,f],[f,e,c,sg[3]]];};
    // (b = out sideways, a = up) around the knot; g=+1 is screen-left
    const bowGeom=(cx,cy)=>{
      const L=(g,k,tilt)=>{const c=Math.cos(tilt*Math.PI/180),s=Math.sin(tilt*Math.PI/180);
        const m=([b,a])=>{const B_=(b*c-a*s)*k,A_=(b*s+a*c)*k;return [cx-A_,cy+g*B_];};
        // the whole loop stays above the lid (a>0): anything below the lid plane is hidden by the lid
        return [[[3,7],[20,88],[130,126],[182,54]].map(m),[[182,54],[206,22],[94,3],[6,4]].map(m)];};
      const loops=[L(1,1,0),L(-1,0.93,4)];
      // tails: tied into the knot. Each runs over the lid top to its front edge, bends over it and lies on the front for `drop` px only
      // (the front is 360 tall). B.lean (front-on exits, lid top seen edge-on) is where the knot shows along that edge: the tails cross the
      // edge there, a few px apart, so they read as coming out of the knot, then drape apart (`spread`) and hang.
      const ED_=(B.edge||cx+180)-cx,LEAN=B.lean||0;
      const T=(g,spread,drop)=>{const k=cy+LEAN+g*7;return [[[cx,cy],[cx+ED_*0.33,cy+(k-cy)*0.33],[cx+ED_*0.67,cy+(k-cy)*0.67],[cx+ED_,k]],
        [[cx+ED_,k],[cx+ED_+drop*0.22,k+g*spread*0.6],[cx+ED_+drop*0.6,k+g*spread*1.06],[cx+ED_+drop,k+g*spread]]];};
      const tails=[T(1,60,150),T(-1,48,112)];
      return {loops,tails,knot:{w:26,h:22,up:3}};};
    const G=bowGeom(cx,cy);
    G.loops.forEach((lp,i)=>{const L=pathOf(lp);const dE=SQ?SQ.ears:[r2(t0+0.06+0.04*i),r2(t0+0.44+0.04*i)];const pulled=PL&&i===(PL.tail<0?0:1); // the ear on the far side of the knot from the pulled tail
      const made=strand(lf,pulled?'bow loop (pulled through the knot)':'bow loop',L.data,L.x,L.y,dE,pulled?null:(UT?[u0,r2(u0+0.2)]:null),SQ?'draw':'out',0,L.a);
      if(pulled){ // it keeps its shape and gets smaller about the knot (scale pivots on the node centre, so it is slid to keep the knot end still);
        // the yarn must not get thinner as the loop does, so the stroke weight is raised by the same factor until the last tenth, where it pops through
        const pv=[cx-G.knot.up,cy],tp=PL.go[1];made.forEach((v,j)=>{const c=[v.x+v.width/2,v.y+v.height/2],w0=v.strokeWeight;const S=[],X=[],Y=[],Wt=[];
          for(const t of pTimes){const sc=Math.max(0.02,1-pAt(t));S.push([t,q3(sc),'lin']);X.push([t,r2((1-sc)*(pv[0]-c[0])),'lin']);Y.push([t,r2((1-sc)*(pv[1]-c[1])),'lin']);Wt.push([t,r2(w0/Math.max(sc,0.1)),'lin']);}
          v.applyManualKeyframeTrack(P('SCALE_XY'),kf(uniq(S),vecv));v.applyManualKeyframeTrack(P('TRANSLATION_X'),kf(uniq(X)));v.applyManualKeyframeTrack(P('TRANSLATION_Y'),kf(uniq(Y)));
          try{v.applyManualKeyframeTrack(P('STROKE_WEIGHT'),kf(uniq(Wt)));}catch(e){fixes.push(['weight track refused',v.name,String(e.message||e).slice(0,80)]);}
          v.applyManualKeyframeTrack(P('OPACITY'),kf(j<2?[[0,0],[dE[0],1,'hold'],[tp,0,'hold']]:[[dE[1],0],[r2(dE[1]+0.12),0.6,'lin'],[tp,0,'hold']]));});}});
    const tails=flatf('bow tails (on the lid)',2,0);const side=id=>id!=null&&map['f'+id]?map['f'+id].children.find(c=>c.name==='page side'):null;const w2=side(B.f2),w3=side(B.f3);const ED=B.edge||1e9,ED2=B.edge2||1e9;
    const tailPieces=(segs)=>{ // -> [[parent, cubic, xShift]] in drawing order; a cubic that crosses an edge is cut there
      const out=[];const zone=x=>x<ED-0.01||!w2?0:(x<ED2-0.01||!w3?1:2);
      const cut=(sg,X)=>{let lo=0,hi=1;for(let i=0;i<40;i++){const m=(lo+hi)/2;if(cub(sg,m)[0]<X)lo=m;else hi=m;}return splitAt(sg,lo);};
      const put=sg=>{const z=zone((sg[0][0]+sg[3][0])/2);out.push([z===0?tails:(z===1?w2:w3),z===2?sg.map(p=>[p[0]-ED2,p[1]]):sg]);};
      for(let sg of segs){for(const X of [ED,ED2]){if(sg[0][0]<X-0.5&&sg[3][0]>X+0.5&&(X===ED?w2:w3)){const [p,q]=cut(sg,X);put(p);sg=q;}}put(sg);}
      return out;};
    G.tails.forEach((tl,ti)=>{const d=SQ?SQ.tails:[r2(t0+0.26+0.04*ti),t1];const pieces=tailPieces(tl);const Ls=pieces.map(p=>lenOf(p[1])),tot=Ls.reduce((x,y)=>x+y,0);let acc=0;const UD=0.2;
      // SQ: the run across the lid top is seen edge-on (hidden), so it gets little of the drawing time and the visible drape gets the rest
      const Wd=pieces.map((p,i)=>Ls[i]*(SQ&&p[0]===tails?0.2:1)),totd=Wd.reduce((x,y)=>x+y,0);let accd=0;
      pieces.forEach(([par,sg],i)=>{const f0=acc/tot,f1=(acc+Ls[i])/tot;acc+=Ls[i];const L=pathOf([sg]);
        const g0=accd/totd,g1=(accd+Wd[i])/totd;accd+=Wd[i];const dd=[r2(d[0]+(d[1]-d[0])*g0),r2(d[0]+(d[1]-d[0])*g1)];const rr=UT?[r2(u0+UD*(1-f1)),r2(u0+UD*(1-f0))]:null;
        const pulledT=PL&&ti===(PL.tail<0?1:0)&&par!==tails; // the pulled tail's drape: slack until the tug, then the taut line below takes over
        const made=strand(par,'bow tail',L.data,L.x,L.y,dd,pulledT?null:rr,i===pieces.length-1?(SQ?'draw':'out'):'lin',0,L.a);
        if(pulledT){const a=PL.tug[0],b=r2(PL.tug[0]+0.05);made.forEach((v,j)=>v.applyManualKeyframeTrack(P('OPACITY'),kf(j<2?[[0,0],[dd[0],1,'hold'],[a,1],[b,0,'lin']]:[[dd[1],0],[r2(dd[1]+0.12),0.6,'lin'],[a,0.6],[b,0,'lin']])));}});
      if(PL&&ti===(PL.tail<0?1:0)){ // THE PULL. A straight line from where the tail leaves the knot, through the tail's free end and on down the front to the foot of
        // the box. At the tug it replaces the slack drape (same two ends, so only the belly snaps straight); its drawn length then follows p,
        // so the free end runs down and outward as the far ear empties. On release the end goes under the box and the rest follows it (trim start).
        const P0=tl[1][0],E=tl[1][3],dx=E[0]-P0[0],dy=E[1]-P0[1],L0=Math.hypot(dx,dy),xEnd=w3?ED2+(ED2-ED)-1:ED2-1,LT=L0*(xEnd-P0[0])/dx,P1=[xEnd,P0[1]+dy*(xEnd-P0[0])/dx];
        const seg=[P0,[P0[0]+(P1[0]-P0[0])/3,P0[1]+(P1[1]-P0[1])/3],[P0[0]+(P1[0]-P0[0])*2/3,P0[1]+(P1[1]-P0[1])*2/3],P1];const tp=tailPieces([seg]);const Lq=tp.map(q=>lenOf(q[1])),totq=Lq.reduce((x,y)=>x+y,0);
        const q0=L0/LT,Q1=0.97,RD=0.2,endAt=t=>t<=PL.go[1]?q0+(Q1-q0)*pAt(t):Math.min(1,Q1+(1-Q1)*(t-u0)/0.06),startAt=t=>t<=u0?0:Math.min(1,bzE(EASE['in'],Math.min(1,(t-u0)/RD)));
        const times=pTimes.slice();for(let i=0;i<=10;i++)times.push(q3(u0+RD*i/10));
        // the moment the free end crosses from the lid front onto the front wall, so the two pieces meet without a gap
        let accq=0;const cuts=[];tp.forEach((q,i)=>{accq+=Lq[i];if(i<tp.length-1)cuts.push(accq/totq);});
        for(const qc of cuts){if(qc>q0&&qc<Q1){let lo=PL.go[0],hi=PL.go[1];for(let k=0;k<30;k++){const m=(lo+hi)/2;if(endAt(m)<qc)lo=m;else hi=m;}times.push(q3(hi));}}
        times.sort((x,y)=>x-y);accq=0;tp.forEach(([par,sg],i)=>{const qa=accq/totq,qb=(accq+Lq[i])/totq;accq+=Lq[i];const Lp=pathOf([sg]);const cl=v=>Math.max(0,Math.min(1,v));
          const En=[],St=[];let tOn=null,tOff=null;for(const t of times){const e=cl((endAt(t)-qa)/(qb-qa)),st=cl((startAt(t)-qa)/(qb-qa));En.push([t,q3(e),'lin']);St.push([t,q3(Math.min(st,e)),'lin']);if(tOn==null&&e>0.002)tOn=t;if(tOff==null&&st>=0.999)tOff=t;}
          if(tOn==null)return;if(tOff==null)tOff=r2(u0+RD);const first=tOn<=PL.tug[0]+1e-6;
          // the twist marks are a dashed stroke and a dashed stroke cannot be trimmed, so here their tone is a plain stroke of the same colour
          // (with round caps the dashes all but touch, so on the other strands they read as an even darker wash); like the marks, it goes at the release
          for(const [nm,col,wgt,o1,off] of [['bow tail (pulled taut)',PINK,YW,1,tOff],['bow tail (pulled taut) · highlight',LIGHT,YW*0.3,1,tOff],['bow tail (pulled taut) · tone',DEEP,YW,0.55,Math.min(tOff,u0)]]){
            if(off<=tOn+1e-6)continue;const v=line(par,nm,Lp.data,Lp.x,Lp.y,col,wgt,null,Lp.a);v.opacity=0;
            v.applyManualKeyframeTrack(P('PATH_TRIM_END'),kf(uniq(En)));v.applyManualKeyframeTrack(P('PATH_TRIM_START'),kf(uniq(St)));
            v.applyManualKeyframeTrack(P('OPACITY'),kf(first?[[0,0],[PL.tug[0],0],[r2(PL.tug[0]+0.05),o1,'lin'],[off,0,'hold']]:[[0,0],[tOn,o1,'hold'],[off,0,'hold']]));}});
        fixes.push(['pull',{q0:q3(q0),gain:r2((Q1-q0)*LT),total:r2(LT),pieces:tp.length,loop:r2(G.loops[PL.tail<0?0:1].reduce((x,sg)=>x+lenOf(sg),0))}]);}});
    const K=G.knot;const knot=figma.createEllipse();lf.appendChild(knot);knot.name='bow knot';knot.resize(K.h,K.w);knot.x=cx-K.up-K.h/2;knot.y=cy-K.w/2;knot.fills=[{type:'SOLID',color:PINK}];knot.strokes=[{type:'SOLID',color:DEEP,opacity:0.7}];knot.strokeWeight=1.5;yarnNodes++;
    const k0=SQ?SQ.knot[0]:t0,k1=SQ?SQ.knot[1]:r2(t0+0.16);knot.applyManualKeyframeTrack(P('SCALE_XY'),kf(UT?[[k0,0],[k1,1,'back'],[r2(u1-0.12),1],[u1,0,'in']]:[[k0,0],[k1,1,'back']],v=>({type:'VECTOR',value:{x:v,y:v}})));}
  // pull toy: the lead runs from the knot out past the right edge and rides with the box
  const L=cam.lead;if(L){const lay=figma.createFrame();lay.name='Yarn lead · tugs the box away';lay.resize(W,H);top.appendChild(lay);lay.x=0;lay.y=0;lay.fills=[];lay.clipsContent=false;
    const k0=L.k[0];const made=strand(lay,'lead','M 0 0 Q '+r2(L.len*0.4)+' '+L.sag+' '+L.len+' 0',k0[1]+6,k0[2]-2,L.d,null,'out',L.w);
    for(const v of made){v.applyManualKeyframeTrack(P('TRANSLATION_X'),kf(L.k.map(q=>[q[0],r2(q[1]-k0[1]),'lin'])));v.applyManualKeyframeTrack(P('TRANSLATION_Y'),kf(L.k.map(q=>[q[0],r2(q[2]-k0[2]),'lin'])));}}
}
// ---------- burst: crops of the Everything page fly from the box to their places ----------
let tiles=0;const TN='Thumbnails · fly out of the box';
if(done&&cam.tiles&&!top.children.find(n=>n.name===TN)){const lay=figma.createFrame();lay.name=TN;lay.resize(W,H);top.appendChild(lay);lay.x=0;lay.y=0;lay.fills=[];lay.clipsContent=false;const [sx,sy]=cam.src;
  cam.tiles.forEach((q,i)=>{const [x,y,w,h]=q.r;const r=figma.createRectangle();lay.appendChild(r);r.name='thumb '+(i+1);r.resize(w,h);r.x=x;r.y=y;r.fills=[{type:'IMAGE',scaleMode:'CROP',imageHash:EV,imageTransform:[[w/W,0,x/W],[0,h/H,y/H]]}];r.opacity=0;
    r.applyManualKeyframeTrack(P('OPACITY'),kf(cam.tileFade?[[0,0],[q.t0,0],[r2(q.t0+cam.tileFade),1,'lin']]:[[0,0],[q.t0,1,'hold']]));
    r.applyManualKeyframeTrack(P('SCALE_XY'),kf([[q.t0,cam.tileS0||0.05],[q.t1,1,'fly']],v=>({type:'VECTOR',value:{x:v,y:v}})));
    r.applyManualKeyframeTrack(P('TRANSLATION_X'),kf([[q.t0,r2(sx-x-w/2)],[q.t1,0,'fly']]));
    r.applyManualKeyframeTrack(P('TRANSLATION_Y'),kf([[q.t0,r2(sy-y-h/2)],[q.t1,0,'fly']]));tiles++;});}
const hasTiles=!cam.tiles||!!top.children.find(n=>n.name===TN);
const hasYarn=!!mover.findOne(n=>n.name==='yarn');if(done&&(hasYarn||!cam.yarn)&&hasTiles)fr.remove();
return {created,top:top.id,stage:stage.id,mover:mover.id,dur,built:built.length,nodes,have,total:D.F.length,done,yarnNodes,hasYarn,tiles,hasTiles,fixes};
