// Paste into use_figma and rerun until it returns done:true. It creates the frame on the first run, then builds the next N unbuilt facets each run.
// DATA = the node the packed SVG landed on (placedOnNodeId). 32 facets per run has been safe once the frame exists.
const DATA='364:2',N=16,LINE=0.45;
const page=await figma.getNodeByIdAsync('306:2');await figma.setCurrentPageAsync(page);
const W=1440,H=900,COOL={r:0.973,g:0.98,b:0.988},HOME='087a2e383d466f4957ff119f3a1ea43c425b3fa3',EV='22886470b2cb3a6bae65b19fe9d3c1d1fe430020',INK={r:0.08,g:0.1,b:0.18};
const fr=await figma.getNodeByIdAsync(DATA);const parts=fr.findAll(n=>/^d\d{4}x/.test(n.name)).map(n=>n.name).sort();const hex=parts.map(s=>s.slice(6)).join('');let str='';for(let i=0;i<hex.length;i+=2)str+=String.fromCharCode(parseInt(hex.substr(i,2),16));const D=JSON.parse(decodeURIComponent(escape(str)));const cam=D.cam;
const EASE={io:[0.65,0,0.35,1],out:[0.22,1,0.36,1],in:[0.6,0,0.9,0.5],lin:[0,0,1,1],soft:[0.45,0.05,0.25,1],back:[0.34,1.5,0.64,1],acc:[0.55,0,0.9,0.55],push:[0.7,0,0.84,0.2],glide:[0.4,0,0.75,0.75]};
const ez=k=>{const c=EASE[k||'io'];return {type:'CUSTOM_CUBIC_BEZIER',easingFunctionCubicBezier:{x1:c[0],y1:c[1],x2:c[2],y2:c[3]}};};const E0={type:'CUSTOM_CUBIC_BEZIER',easingFunctionCubicBezier:{x1:0.5,y1:0,x2:0.5,y2:1}},LIN={type:'LINEAR'};
const kf=(arr,mkv)=>({keyframes:arr.map((k,i)=>({timelinePosition:k[0],value:mkv?mkv(k[1]):{type:'FLOAT',value:k[1]},easing:i===0?E0:ez(k[2])}))});
const P=name=>({type:'PROPERTY',name});const T3=o=>Object.assign({type:'FIXED_ORDER',translateZ:0,rotateX:0,rotateY:0,rotateZ:0},o);
const px=a=>({x:{unit:'PIXELS',value:a[0]},y:{unit:'PIXELS',value:a[1]}});
let top=page.children.find(n=>n.type==='FRAME'&&n.name===cam.name),stage,mover,created=false,dur=null;
if(!top){created=true;
  top=figma.createFrame();top.name=cam.name;top.resize(W,H);top.x=cam.x;top.y=cam.y;top.clipsContent=true;top.fills=[{type:'SOLID',color:COOL}];page.appendChild(top);
  const bg=figma.createRectangle();bg.name='Everything page (behind)';bg.resize(W,H);top.appendChild(bg);bg.x=0;bg.y=0;bg.fills=[{type:'IMAGE',scaleMode:'FILL',imageHash:EV}];bg.effects=[{type:'LAYER_BLUR',radius:0,visible:true,blurType:'NORMAL'}];
  const s0=cam.scrim;
  bg.applyManualKeyframeTrack(P('SCALE_XY'),kf([[0,1.04],[1.2,1,'out']],v=>({type:'VECTOR',value:{x:v,y:v}})));
  bg.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:'effects',index:0,field:'RADIUS'},kf([[0,0],[s0[1][0],6,'out'],[s0[2][0],6],[s0[3][0],0]]));
  const scr=figma.createRectangle();scr.name='Scrim · dims Everything while paper folds';scr.resize(W,H);top.appendChild(scr);scr.x=0;scr.y=0;scr.fills=[{type:'SOLID',color:COOL}];scr.opacity=0;scr.applyManualKeyframeTrack(P('OPACITY'),kf(s0));
  stage=figma.createFrame();stage.name='Stage · perspective + cast shadow';stage.resize(W,H);top.appendChild(stage);stage.x=0;stage.y=0;stage.fills=[];stage.clipsContent=false;stage.scene3d={perspective:2000,preserve3d:false};
  stage.effects=[{type:'DROP_SHADOW',radius:0,color:{r:0.06,g:0.08,b:0.14,a:0},offset:{x:0,y:0},spread:0,visible:true,blendMode:'NORMAL',showShadowBehindNode:true}];
  const scol=a=>({type:'COLOR',value:{r:0.06,g:0.08,b:0.14,a}});
  stage.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:'effects',index:0,field:'COLOR'},kf([[0,0],[0.45,0.2,'out'],[cam.dur,0.2]],scol));
  stage.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:'effects',index:0,field:'OFFSET_Y'},kf([[0,0],[0.45,26,'out'],[cam.dur,26]]));
  stage.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:'effects',index:0,field:'RADIUS'},kf([[0,0],[0.45,38,'out'],[cam.dur,38]]));
  if(cam.sc.length>1)stage.applyManualKeyframeTrack(P('SCALE_XY'),kf(cam.sc,v=>({type:'VECTOR',value:{x:v,y:v}})));
  if(cam.tx.length>1)stage.applyManualKeyframeTrack(P('TRANSLATION_X'),kf(cam.tx));
  if(cam.ty.length>1)stage.applyManualKeyframeTrack(P('TRANSLATION_Y'),kf(cam.ty));
  mover=figma.createFrame();mover.name='Mover';mover.resize(W,H);stage.appendChild(mover);mover.x=0;mover.y=0;mover.fills=[];mover.clipsContent=false;mover.scene3d={perspective:-1,preserve3d:true};mover.transformOrigin=px(cam.origin);mover.transform3d=T3({});
  for(const [k,nm] of [['rx','TRANSFORM_3D_ROTATION_X'],['ry','TRANSFORM_3D_ROTATION_Y'],['rz','TRANSFORM_3D_ROTATION_Z']])if(cam[k]&&cam[k].length>1)mover.applyManualKeyframeTrack(P(nm),kf(cam[k]));
  try{top.setTimelineDuration(top.timelines[0].id,cam.dur);dur=top.timelines[0].duration;}catch(e){dur='ERR '+e.message;}
}else{stage=top.children.find(c=>c.name.startsWith('Stage'));mover=stage.children[0];for(const x of mover.findAll(n=>n.name==='building'&&n.parent&&n.parent.name!=='building'))x.remove();}
const map={};for(const n of mover.findAll(n=>n.type==='FRAME'&&/^f\d+$/.test(n.name)))map[n.name]=n;
const todo=D.F.filter(d=>!map['f'+d.i]).slice(0,N);
const mk=(par,name)=>{const f=figma.createFrame();f.name=name;f.resize(W,H);par.appendChild(f);f.x=0;f.y=0;f.fills=[];f.clipsContent=false;f.scene3d={perspective:-1,preserve3d:true};return f;};
const idxTrack=(node,coll,i,track)=>node.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:coll,index:i},track);
const cv=a=>a>0?{r:0.03,g:0.05,b:0.12,a:Math.min(0.72,a)}:{r:1,g:1,b:1,a:Math.min(0.35,-a*0.85)};
const r2=v=>Math.round(v*100)/100;let nodes=0,built=[];
for(const d of todo){const par=d.p<0?mover:map['f'+d.p];if(!par)throw new Error('no parent for f'+d.i+' (p='+d.p+')');
  const stagev=mk(par,'building');let cont;
  if(d.h){const a=[d.h[0],d.h[1]];const th=Math.atan2(d.h[3]-d.h[1],d.h[2]-d.h[0])*180/Math.PI;
    const h1=stagev;h1.transformOrigin=px(a);h1.transform3d=T3({rotateZ:th});
    const h2=mk(h1,'building');h2.transformOrigin=px(a);const tr=d.tr.length?d.tr:[[0,0]];h2.transform3d=T3({rotateX:tr[0][1],rotateZ:-th});
    if(tr.length>1)h2.applyManualKeyframeTrack(P('TRANSFORM_3D_ROTATION_X'),kf(tr));
    if(d.sw&&d.sw.length>1)h1.applyManualKeyframeTrack(P('TRANSFORM_3D_ROTATION_Z'),kf(d.sw.map(k=>[k[0],th+k[1],'soft'])));
    cont=h2;nodes+=2;}
  else{cont=stagev;nodes++;}
  const z0=d.z.length?d.z[0][1]:0;
  for(const front of [true,false]){const w=figma.createFrame();w.name=front?'page side':'underside';w.resize(W,H);cont.appendChild(w);w.x=0;w.y=0;w.fills=[];w.clipsContent=false;
    w.transform3d=T3({rotateY:front?0:180,translateZ:z0,backfaceVisible:false});if(d.z.length>1)w.applyManualKeyframeTrack(P('TRANSFORM_3D_TRANSLATION_Z'),kf(d.z));
    if(d.v)w.applyManualKeyframeTrack(P('OPACITY'),{keyframes:[{timelinePosition:0,value:{type:'FLOAT',value:1},easing:E0},{timelinePosition:d.v,value:{type:'FLOAT',value:0},easing:{type:'HOLD'}}]});
    const pts=front?d.P:d.P.map(p=>[W-p[0],p[1]]);const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const bx=Math.min(...xs),by=Math.min(...ys),bw=Math.max(...xs)-bx,bh=Math.max(...ys)-by;
    const v=figma.createVector();w.appendChild(v);v.name=front?'page':'paper';v.vectorPaths=[{windingRule:'NONZERO',data:'M '+pts.map(p=>r2(p[0]-bx)+' '+r2(p[1]-by)).join(' L ')+' Z'}];v.x=bx;v.y=by;v.strokes=[];
    const base=front?{type:'IMAGE',scaleMode:'CROP',imageHash:HOME,imageTransform:[[bw/W,0,bx/W],[0,bh/H,by/H]]}:{type:'SOLID',color:COOL};
    const s=front?d.sf:d.sb;const c0=cv(s[0][1]);const moving=s.some(k=>Math.abs(k[1]-s[0][1])>0.004);
    v.fills=[base,{type:'SOLID',color:{r:c0.r,g:c0.g,b:c0.b},opacity:moving?0:c0.a}];
    if(moving){idxTrack(v,'fills',1,{keyframes:s.map((k,i)=>({timelinePosition:k[0],value:{type:'COLOR',value:cv(k[1])},easing:i===0?E0:LIN}))});const f=JSON.parse(JSON.stringify(v.fills));f[1].opacity=0;v.fills=f;}
    nodes+=2;
    for(const [ta,segs] of d.E){const sp=segs.map(q=>front?q:[W-q[0],q[1],W-q[2],q[3]]);const ex=[],ey=[];for(const q of sp){ex.push(q[0],q[2]);ey.push(q[1],q[3]);}const cx=Math.min(...ex),cy=Math.min(...ey);
      const c=figma.createVector();w.appendChild(c);c.name='crease @'+ta+'s';c.vectorPaths=[{windingRule:'NONE',data:sp.map(q=>'M '+r2(q[0]-cx)+' '+r2(q[1]-cy)+' L '+r2(q[2]-cx)+' '+r2(q[3]-cy)).join(' ')}];c.x=cx;c.y=cy;c.fills=[];c.strokes=[{type:'SOLID',color:INK,opacity:0}];c.strokeWeight=1.5;
      idxTrack(c,'strokes',0,{keyframes:[{timelinePosition:ta,value:{type:'COLOR',value:{...INK,a:0}},easing:E0},{timelinePosition:r2(ta+0.18),value:{type:'COLOR',value:{...INK,a:LINE}},easing:LIN}]});
      const st=JSON.parse(JSON.stringify(c.strokes));st[0].opacity=0;c.strokes=st;nodes++;}}
  if(d.h){stagev.name='f'+d.i+' · crease';cont.name='f'+d.i;}else cont.name='f'+d.i;
  map['f'+d.i]=cont;built.push(d.i);}
const have=Object.keys(map).length;const done=have===D.F.length;if(done)fr.remove();
return {created,top:top.id,stage:stage.id,mover:mover.id,dur,built,nodes,have,total:D.F.length,done};