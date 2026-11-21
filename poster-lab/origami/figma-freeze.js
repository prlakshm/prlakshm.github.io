// Paste into use_figma. Clones SRC once per time in TIMES and bakes every keyframe track at that time, so get_screenshot shows that moment
// (export_video and node.screenshot ignore 3D). Handles fold angles, z offsets, fill/stroke colours, effects, opacity, path trim start/end
// (lines and curves are cut to the drawn stretch by length), the knot's scale, a vector's own scale/slide/stroke weight (the bow ear pulled
// through the knot), and flat 2D scale/slide tracks (the burst thumbnails, the pull-toy lead). The copies are gathered in one "· check frames" frame so one screenshot shows them all; delete it when done.
// Optional, declared before this code: EXACT=true bakes the stage scale so the perspective matches playback exactly (the default approximation
// shows only about half of the parallax between near and far layers); ZOOM=[x,y,k] (or a function of the time returning that) with EXACT blows up the area around frame point (x,y).
const SRC='378:2',TIMES=[1.9,2.95,4.2,5.55,6.25];
const page=await figma.getNodeByIdAsync('306:2');await figma.setCurrentPageAsync(page);
const src=await figma.getNodeByIdAsync(SRC);
const bez=(c,u)=>{const x1=c.x1,y1=c.y1,x2=c.x2,y2=c.y2;let lo=0,hi=1,s=u;for(let i=0;i<24;i++){s=(lo+hi)/2;const x=3*(1-s)*(1-s)*s*x1+3*(1-s)*s*s*x2+s*s*s;if(x<u)lo=s;else hi=s;}return 3*(1-s)*(1-s)*s*y1+3*(1-s)*s*s*y2+s*s*s;};
const lerp=(a,b,u)=>{if(typeof a==='number')return a+(b-a)*u;const o={};for(const k in a)o[k]=a[k]+(b[k]-a[k])*u;return o;};
const ev=(tr,t)=>{const k=tr.keyframes.slice().sort((a,b)=>a.timelinePosition-b.timelinePosition);if(t<=k[0].timelinePosition)return k[0].value.value;for(let i=1;i<k.length;i++){if(t<k[i].timelinePosition){const a=k[i-1],b=k[i];const span=b.timelinePosition-a.timelinePosition;let u=span>0?(t-a.timelinePosition)/span:1;const e=b.easing||{};if(e.type==='HOLD')u=0;else if(e.type==='CUSTOM_CUBIC_BEZIER'&&e.easingFunctionCubicBezier)u=bez(e.easingFunctionCubicBezier,u);return lerp(a.value.value,b.value.value,u);}}return k[k.length-1].value.value;};
const out=[];const holder=figma.createFrame();holder.name=src.name+' · check frames';page.appendChild(holder);holder.x=1600;holder.y=src.y;holder.resize(TIMES.length*1460-20,900);holder.fills=[];holder.clipsContent=false;
for(let ti=0;ti<TIMES.length;ti++){const t=TIMES[ti];const cl=src.clone();holder.appendChild(cl);cl.x=ti*1460;cl.y=0;cl.name=src.name+' · t='+t+'s';
  let S={s:1,tx:0,ty:0};
  const all=cl.findAll(()=>true);
  for(const n of all){const tr=n.manualKeyframeTracks;if(!tr)continue;const keys=Object.keys(tr);if(!keys.length)continue;
    let t3=n.transform3d&&n.transform3d.type==='FIXED_ORDER'?{...n.transform3d}:null;let t3c=false;const rm=[];let nf=null,ns=null,ne=null,op,trim,trim0,sw,hide=false;const n2={};
    for(const key of keys){const v=tr[key];
      if(key==='fills'||key==='strokes'){const arr=JSON.parse(JSON.stringify(n[key]));for(const i in v){const c=ev(v[i],t);arr[+i]={type:'SOLID',color:{r:c.r,g:c.g,b:c.b},opacity:Math.max(0,Math.min(1,c.a))};rm.push({type:'INDEXED_ITEM',collection:key,index:+i});}if(key==='fills')nf=arr;else ns=arr;}
      else if(key==='effects'){const arr=JSON.parse(JSON.stringify(n.effects));for(const i in v){for(const f in v[i]){const c=ev(v[i][f],t);const e=arr[+i];if(f==='RADIUS')e.radius=c;else if(f==='COLOR')e.color=c;else if(f==='OFFSET_X')e.offset.x=c;else if(f==='OFFSET_Y')e.offset.y=c;rm.push({type:'INDEXED_ITEM',collection:'effects',index:+i,field:f});}}ne=arr;}
      else{const c=ev(v,t);rm.push({type:'PROPERTY',name:key});
        if(key==='TRANSFORM_3D_ROTATION_X'){t3.rotateX=c;t3c=true;}else if(key==='TRANSFORM_3D_ROTATION_Y'){t3.rotateY=c;t3c=true;}else if(key==='TRANSFORM_3D_ROTATION_Z'){t3.rotateZ=c;t3c=true;}else if(key==='TRANSFORM_3D_TRANSLATION_Z'){t3.translateZ=c;t3c=true;}
        else if(key==='OPACITY'){op=c;}else if(key==='PATH_TRIM_END'){trim=c;}else if(key==='PATH_TRIM_START'){trim0=c;}else if(key==='STROKE_WEIGHT'){sw=c;}
        else if(n.type==='ELLIPSE'&&key==='SCALE_XY'){if(c.x<0.5)hide=true;}
        else if(n.name.startsWith('Stage')){if(key==='SCALE_XY')S.s=c.x;else if(key==='TRANSLATION_X')S.tx=c;else if(key==='TRANSLATION_Y')S.ty=c;}
        else if(key==='SCALE_XY')n2.s=c.x;else if(key==='TRANSLATION_X')n2.tx=c;else if(key==='TRANSLATION_Y')n2.ty=c;}}
    for(const r of rm){try{n.removeManualKeyframeTrack(r);}catch(e){}}
    if(t3c)n.transform3d=t3;if(nf)n.fills=nf;if(ns)n.strokes=ns;if(ne)n.effects=ne;if(op!==undefined)n.opacity=op;
    // a vector with its own scale (the bow ear pulled through the knot): scale about its centre, slide, stroke weight scaled with it as in playback
    if(n.type==='VECTOR'&&n2.s!==undefined){const sc=n2.s;if(sc<0.03)hide=true;else{if(sw!==undefined)n.strokeWeight=sw;const c0=[n.x+n.width/2,n.y+n.height/2];if(Math.abs(sc-1)>1e-4)n.rescale(sc);n.x=c0[0]-n.width/2+(n2.tx||0);n.y=c0[1]-n.height/2+(n2.ty||0);}delete n2.s;delete n2.tx;delete n2.ty;}
    else if(sw!==undefined)n.strokeWeight=sw;
    // path trim: the path (lines and cubics) is cut to the drawn stretch by length and re-seated on its new first point
    if(!hide&&(trim!==undefined||trim0!==undefined)){const a0=trim0===undefined?0:trim0,a1=trim===undefined?1:trim;if(a1-a0<0.012||a1<0.02)hide=true;else if(a0>0.003||a1<0.997){
      const tk=n.vectorPaths[0].data.match(/[MLCQ]|-?[\d.]+(?:e-?\d+)?/g);const segs=[];let cur=null,i=0;const num=()=>+tk[i++];
      while(i<tk.length){const cmd=tk[i++];if(cmd==='M'){cur=[num(),num()];}else if(cmd==='L'){const p=[num(),num()];segs.push([cur,[cur[0]+(p[0]-cur[0])/3,cur[1]+(p[1]-cur[1])/3],[cur[0]+(p[0]-cur[0])*2/3,cur[1]+(p[1]-cur[1])*2/3],p]);cur=p;}
        else if(cmd==='C'){const p1=[num(),num()],p2=[num(),num()],p=[num(),num()];segs.push([cur,p1,p2,p]);cur=p;}else if(cmd==='Q'){const q=[num(),num()],p=[num(),num()];segs.push([cur,[cur[0]+(q[0]-cur[0])*2/3,cur[1]+(q[1]-cur[1])*2/3],[p[0]+(q[0]-p[0])*2/3,p[1]+(q[1]-p[1])*2/3],p]);cur=p;}}
      const cub=(q,u)=>{const w=1-u;return [0,1].map(k=>w*w*w*q[0][k]+3*w*w*u*q[1][k]+3*w*u*u*q[2][k]+u*u*u*q[3][k]);};const NS=80;
      const tabs=segs.map(sg=>{const tb=[0];let pv=sg[0];for(let k=1;k<=NS;k++){const p=cub(sg,k/NS);tb.push(tb[k-1]+Math.hypot(p[0]-pv[0],p[1]-pv[1]));pv=p;}return tb;});const tot=tabs.reduce((x,tb)=>x+tb[NS],0);
      const uAt=(tb,len)=>{if(len<=0)return 0;if(len>=tb[NS])return 1;let k=1;while(tb[k]<len)k++;return (k-1+(len-tb[k-1])/(tb[k]-tb[k-1]))/NS;};
      const sub=(sg,ua,ub)=>{const lp=(p,q,u)=>[p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u];const sp=(g,u)=>{const a=lp(g[0],g[1],u),b=lp(g[1],g[2],u),c=lp(g[2],g[3],u),d=lp(a,b,u),e=lp(b,c,u),f=lp(d,e,u);return [[g[0],a,d,f],[f,e,c,g[3]]];};
        let g=sg;if(ub<1)g=sp(g,ub)[0];if(ua>0)g=sp(g,ub>0?ua/ub:0)[1];return g;};
      const A=a0*tot,B=a1*tot;let acc=0;const keep=[];segs.forEach((sg,k)=>{const L=tabs[k][NS],s0=acc,s1=acc+L;acc=s1;if(B<=s0+1e-6||A>=s1-1e-6)return;keep.push(sub(sg,uAt(tabs[k],A-s0),uAt(tabs[k],B-s0)));});
      if(!keep.length)hide=true;else{const v0=n.vectorNetwork.vertices[0],d0=segs[0][0];const want=[n.x+v0.x+(keep[0][0][0]-d0[0]),n.y+v0.y+(keep[0][0][1]-d0[1])];let mnx=1e9,mny=1e9;for(const g of keep)for(const p of g){mnx=Math.min(mnx,p[0]);mny=Math.min(mny,p[1]);}
        const f=p=>(Math.round((p[0]-mnx)*100)/100)+' '+(Math.round((p[1]-mny)*100)/100);const cap=n.strokeCap;n.vectorPaths=[{windingRule:'NONE',data:'M '+f(keep[0][0])+keep.map(g=>' C '+f(g[1])+' '+f(g[2])+' '+f(g[3])).join('')}];
        if(typeof cap==='string')n.strokeCap=cap;const v1=n.vectorNetwork.vertices[0];n.x=want[0]-v1.x;n.y=want[1]-v1.y;}}}
    if(n2.s!==undefined||n2.tx!==undefined||n2.ty!==undefined){const s=n2.s===undefined?1:n2.s,w=n.width,h=n.height;if(s!==1&&n.type==='RECTANGLE'){const nw=Math.max(0.01,w*s),nh=Math.max(0.01,h*s);n.resize(nw,nh);n.x+=(w-nw)/2;n.y+=(h-nh)/2;}n.x+=n2.tx||0;n.y+=n2.ty||0;}
    if(hide)n.visible=false;}
  // the stage's 2D scale/translate would be lost with its tracks: fold them into the mover instead
  const stage=cl.children.find(c=>c.name.startsWith('Stage'));const mover=stage.children[0];const m3={...mover.transform3d};
  if(typeof EXACT!=='undefined'&&EXACT){ // same projection as playback: perspective P*s with the mover pushed back P*(1-s) equals "project at P, then scale by s"
    const Pp=stage.scene3d.perspective;let s=S.s,tx=S.tx,ty=S.ty;
    if(typeof ZOOM!=='undefined'&&ZOOM){const [fx,fy,fz]=typeof ZOOM==='function'?ZOOM(t,ti):ZOOM;tx=fz*(720+tx-fx);ty=fz*(450+ty-fy);s=s*fz;} // ZOOM=[x,y,k]: frame point (x,y) goes to the centre, k times larger
    stage.scene3d={...stage.scene3d,perspective:Pp*s};m3.translateZ=-Pp*(1-s);mover.transform3d=m3;stage.x=tx;stage.y=ty;
  }else{m3.translateZ=2000*(1-1/S.s);mover.transform3d=m3;mover.x=S.tx/S.s;mover.y=S.ty/S.s;} // older approximation: halves the parallax between layers at different depths
  out.push({t,id:cl.id});}
return {holder:holder.id,out};
