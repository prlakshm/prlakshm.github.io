'use strict';
// Flat-fold simulator v2: exact 180° folds, explicit layer order -> z offsets, per-edge crease activation,
// offline textured renderer, and a compact export for the Figma builder.
const fs=require('fs');
const W=1440,H=900,EPS=0.6,ZE=2,TONE=0.035; // ZE = px between stacked layers (a model may set sim.ZE; Figma orders layers correctly down to 0.02px)
const R=d=>d*Math.PI/180, DEG=r=>r*180/Math.PI;
const EASE={io:[0.65,0,0.35,1],out:[0.22,1,0.36,1],in:[0.6,0,0.9,0.5],lin:[0,0,1,1],soft:[0.45,0.05,0.25,1],back:[0.34,1.5,0.64,1],acc:[0.55,0,0.9,0.55],push:[0.7,0,0.84,0.2],glide:[0.4,0,0.75,0.75]};
const bz=(c,u)=>{const [x1,y1,x2,y2]=c;let lo=0,hi=1,s=u;for(let i=0;i<30;i++){s=(lo+hi)/2;const x=3*(1-s)*(1-s)*s*x1+3*(1-s)*s*s*x2+s*s*s;if(x<u)lo=s;else hi=s;}return 3*(1-s)*(1-s)*s*y1+3*(1-s)*s*s*y2+s*s*s;};
const ev=(tr,t)=>{if(!tr||!tr.length)return 0;if(t<=tr[0][0])return tr[0][1];for(let i=1;i<tr.length;i++){if(t<=tr[i][0]){const a=tr[i-1],b=tr[i];if(b[0]===a[0])return b[1];return a[1]+(b[1]-a[1])*bz(EASE[b[2]||'io'],(t-a[0])/(b[0]-a[0]));}}return tr[tr.length-1][1];};
const lastv=tr=>tr&&tr.length?tr[tr.length-1][1]:0;
const mx=(a,b)=>{const r=[[0,0,0],[0,0,0],[0,0,0]];for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)r[i][j]+=a[i][k]*b[k][j];return r;};
const mv3=(m,v)=>[m[0][0]*v[0]+m[0][1]*v[1]+m[0][2]*v[2],m[1][0]*v[0]+m[1][1]*v[1]+m[1][2]*v[2],m[2][0]*v[0]+m[2][1]*v[1]+m[2][2]*v[2]];
const Rx=d=>{const c=Math.cos(R(d)),s=Math.sin(R(d));return [[1,0,0],[0,c,-s],[0,s,c]];};
const Ry=d=>{const c=Math.cos(R(d)),s=Math.sin(R(d));return [[c,0,s],[0,1,0],[-s,0,c]];};
const Rz=d=>{const c=Math.cos(R(d)),s=Math.sin(R(d));return [[c,-s,0],[s,c,0],[0,0,1]];};
const I3=[[1,0,0],[0,1,0],[0,0,1]];
const ap=(A,p)=>[A[0]*p[0]+A[2]*p[1]+A[4],A[1]*p[0]+A[3]*p[1]+A[5]];
const amul=(B,A)=>[B[0]*A[0]+B[2]*A[1],B[1]*A[0]+B[3]*A[1],B[0]*A[2]+B[2]*A[3],B[1]*A[2]+B[3]*A[3],B[0]*A[4]+B[2]*A[5]+B[4],B[1]*A[4]+B[3]*A[5]+B[5]];
const ainv=A=>{const det=A[0]*A[3]-A[1]*A[2];const a=A[3]/det,b=-A[1]/det,c=-A[2]/det,d=A[0]/det;return [a,b,c,d,-(a*A[4]+c*A[5]),-(b*A[4]+d*A[5])];};
const refl=(p,q)=>{const dx=q[0]-p[0],dy=q[1]-p[1],Lq=dx*dx+dy*dy;const a=(dx*dx-dy*dy)/Lq,b=2*dx*dy/Lq;return [a,b,b,-a,p[0]-(a*p[0]+b*p[1]),p[1]-(b*p[0]-a*p[1])];};
const side=(p,q,x)=>((q[0]-p[0])*(x[1]-p[1])-(q[1]-p[1])*(x[0]-p[0]))/Math.hypot(q[0]-p[0],q[1]-p[1]);
const clip=(poly,p,q,sg,eps=EPS)=>{const out=[];for(let i=0;i<poly.length;i++){const A=poly[i],B=poly[(i+1)%poly.length];const sa=side(p,q,A)*sg,sb=side(p,q,B)*sg;if(sa>=-eps)out.push(A);if((sa>eps&&sb<-eps)||(sa<-eps&&sb>eps)){const t=sa/(sa-sb);out.push([A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t]);}}return out;};
const area=poly=>poly.length<3?0:Math.abs(poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
const cen=poly=>[poly.reduce((s,a)=>s+a[0],0)/poly.length,poly.reduce((s,a)=>s+a[1],0)/poly.length];
const overlap=(P,Q)=>{let poly=P;const c=cen(Q);for(let i=0;i<Q.length&&poly.length>=3;i++){const p=Q[i],q=Q[(i+1)%Q.length];if(Math.hypot(q[0]-p[0],q[1]-p[1])<1e-6)continue;const sg=Math.sign(side(p,q,c))||1;poly=clip(poly,p,q,sg,0);}return area(poly)>3;};
const rotPt=(P,deg,x)=>{const c=Math.cos(R(deg)),s=Math.sin(R(deg));const dx=x[0]-P[0],dy=x[1]-P[1];return [P[0]+dx*c-dy*s,P[1]+dx*s+dy*c];};
const reflPt=(p,q,x)=>ap(refl(p,q),x);

function makeSim(){
  let nid=0;
  const F0={id:nid++,pts:[[0,0],[W,0],[W,H],[0,H]],parent:null,h:null,track:[],A:[1,0,0,1,0,0],hist:[],zw:[],oo:[],kk:[],cv:[],tags:new Set(),wall:null,sw:null};
  const facets=[F0]; let order=[F0]; const steps=[];
  const depth=f=>{let d=0,q=f;while(q.parent){d++;q=q.parent;}return d;};
  const hingeR=(h,phi,sw)=>mx(mx(Rz(h.th+(sw||0)),Rx(phi)),Rz(-h.th));
  const worldEnd=(f,X,ov)=>{let Pt=[X[0],X[1],X[2]||0];for(let g=f;g&&g.h;g=g.parent){const phi=ov&&ov.has(g)?ov.get(g):lastv(g.track);const M=hingeR(g.h,phi,0);const a=g.h.a;const v=mv3(M,[Pt[0]-a[0],Pt[1]-a[1],Pt[2]]);Pt=[a[0]+v[0],a[1]+v[1],v[2]];}return Pt;};
  // sharing an edge in sheet coords
  const shared=(f,g)=>{const out=[];for(let i=0;i<f.pts.length;i++){const A=f.pts[i],B=f.pts[(i+1)%f.pts.length];const L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<1)continue;const ux=(B[0]-A[0])/L,uy=(B[1]-A[1])/L;
    for(let j=0;j<g.pts.length;j++){const C=g.pts[j],D=g.pts[(j+1)%g.pts.length];if(Math.abs(side(A,B,C))>0.8||Math.abs(side(A,B,D))>0.8)continue;const s0=(C[0]-A[0])*ux+(C[1]-A[1])*uy,s1=(D[0]-A[0])*ux+(D[1]-A[1])*uy;const lo=Math.max(0,Math.min(s0,s1)),hi=Math.min(L,Math.max(s0,s1));if(hi-lo>1.5)out.push([i,[A[0]+ux*lo,A[1]+uy*lo],[A[0]+ux*hi,A[1]+uy*hi]]);}}return out;};
  const sameHist=(f,g)=>{for(let k=0;k<f.hist.length;k++)if(f.hist[k]!==g.hist[k])return false;return true;};
  function levels(){
    const polys=new Map(order.map(f=>[f,f.pts.map(x=>ap(f.A,x))]));
    // panels: adjacent facets that have never moved apart
    const par=new Map(order.map(f=>[f,f]));const find=f=>{while(par.get(f)!==f){par.set(f,par.get(par.get(f)));f=par.get(f);}return f;};
    for(let i=0;i<order.length;i++)for(let j=i+1;j<order.length;j++){const f=order[i],g=order[j];if(f.wall===g.wall&&sameHist(f,g)&&shared(f,g).length)par.set(find(f),find(g));}
    const ov=order.map((f,i)=>{const l=[];for(let j=0;j<i;j++)if(overlap(polys.get(f),polys.get(order[j])))l.push(order[j]);return l;});
    const lv=new Map(order.map(f=>[f,1]));
    for(let it=0;it<200;it++){let ch=false;
      order.forEach((f,i)=>{let L=lv.get(f);for(const g of ov[i])if(lv.get(g)+1>L)L=lv.get(g)+1;if(L!==lv.get(f)){lv.set(f,L);ch=true;}});
      const gm=new Map();for(const f of order){const r=find(f);gm.set(r,Math.max(gm.get(r)||0,lv.get(f)));}
      for(const f of order){const L=gm.get(find(f));if(L!==lv.get(f)){lv.set(f,L);ch=true;}}
      if(!ch)break;}
    // occlusion depth: longest chain of overlapping layers above
    const kd=new Map(order.map(f=>[f,0]));
    for(let it=0;it<50;it++){let ch=false;
      for(let i=order.length-1;i>=0;i--){const f=order[i];let k=kd.get(f);for(let j=i+1;j<order.length;j++){const g=order[j];if(ov[j].includes(f)&&kd.get(g)+1>k)k=kd.get(g)+1;}if(k!==kd.get(f)){kd.set(f,k);ch=true;}}
      const gm=new Map();for(const f of order){const r=find(f);gm.set(r,Math.max(gm.get(r)||0,kd.get(f)));}
      for(const f of order){const k=gm.get(find(f));if(k!==kd.get(f)){kd.set(f,k);ch=true;}}
      if(!ch)break;}
    // covered fraction: how much of each facet sits under layers in front of it
    const inPoly=(Q,x)=>{let sg=0;for(let i=0;i<Q.length;i++){const a=Q[i],b=Q[(i+1)%Q.length];const c=(b[0]-a[0])*(x[1]-a[1])-(b[1]-a[1])*(x[0]-a[0]);if(Math.abs(c)<1e-9)continue;if(!sg)sg=Math.sign(c);else if(Math.sign(c)!==sg)return false;}return true;};
    const cv=new Map();const NB=6;
    order.forEach((f,i)=>{const P=polys.get(f);const above=[];for(let j=i+1;j<order.length;j++)if(ov[j].includes(f))above.push(polys.get(order[j]));
      if(!above.length||P.length<3){cv.set(f,0);return;}let tot=0,cov=0;
      for(let k=1;k<P.length-1;k++){const a=P[0],b=P[k],c=P[k+1];const w=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));if(w<1e-6)continue;
        for(let u=0;u<NB;u++)for(let v=0;v<NB-u;v++){const s1=(u+1/3)/NB,s2=(v+1/3)/NB;const x=[a[0]+(b[0]-a[0])*s1+(c[0]-a[0])*s2,a[1]+(b[1]-a[1])*s1+(c[1]-a[1])*s2];tot+=w;if(above.some(Q=>inPoly(Q,x)))cov+=w;}}
      cv.set(f,tot?cov/tot:0);});
    lv.kd=kd;lv.cv=cv;
    return lv;
  }
  function fold(st){
    const {p,q,m,sel,place='none',ang=180,dir=-1,t0,t1,e='io',tag,name}=st;
    const sm=Math.sign(side(p,q,m));if(!sm)throw new Error('m on fold line: '+name);
    const Rf=refl(p,q);
    const pre=new Map(facets.map(f=>[f,worldEnd(f,cen(f.pts))]));
    const byDepth=facets.slice().sort((a,b)=>depth(a)-depth(b));
    const moved=new Set(),delta=new Map();
    const dirOf=f=>typeof dir==='function'?dir(f):dir;
    const push=(F,d)=>{const c=lastv(F.track);if(F.track.length){const lt=F.track[F.track.length-1][0];if(lt>t0+1e-6)console.warn('!! track overlap facet',F.id,'last',lt,'t0',t0,name);if(lt<t0-1e-6)F.track.push([t0,c]);F.track.push([t1,c+d,e]);}else F.track=[[t0,0],[t1,d,e]];delta.set(F,[c,c+d]);};
    const midOv=extra=>{const ov=new Map();for(const [f,[a,b]] of delta)ov.set(f,(a+b)/2);if(extra)for(const [f,v] of extra)ov.set(f,v);return ov;};
    const rot=G=>{const c0=lastv(G.track),c=cen(G.pts);
      if(st.crimp){ // second crease of a crimp, same time window: pick the sense that keeps the part near its final place mid-fold
        const pe=worldEnd(G,c,new Map([[G,c0+ang]]));const ov0=new Map();
        for(const f of facets){const tr=f.track,n=tr.length;if(f!==G&&n>=2&&Math.abs(tr[n-1][0]-t1)<1e-6&&Math.abs(tr[n-2][0]-t0)<1e-6)ov0.set(f,(tr[n-1][1]+tr[n-2][1])/2);}
        let best=1,bd=1e18;for(const sg of [1,-1]){const ov=new Map(ov0);ov.set(G,c0+sg*ang/2);const pm=worldEnd(G,c,ov);const d=Math.hypot(pm[0]-pe[0],pm[1]-pe[1],pm[2]-pe[2]);if(d<bd){bd=d;best=sg;}}
        push(G,best*ang);return;}
      const zp=worldEnd(G,c,new Map([[G,c0+90]]))[2],zm=worldEnd(G,c,new Map([[G,c0-90]]))[2];push(G,(((dirOf(G)>0)===(zp>zm))?1:-1)*ang);};
    const counter=(F,tgt)=>{const c0=lastv(F.track),c=cen(F.pts);tgt=tgt||pre.get(F);let best=1,bd=1e18;for(const s of [1,-1]){const pm=worldEnd(F,c,midOv([[F,c0+s*ang/2]]));const d=Math.hypot(pm[0]-tgt[0],pm[1]-tgt[1],pm[2]-tgt[2]);if(d<bd){bd=d;best=s;}}if(bd>3)console.warn('!! counter miss',F.id,bd.toFixed(1),name);push(F,best*ang);};
    const onMove=k=>{const on=k.pts.filter(v=>Math.abs(side(k.h.a,k.h.b,v))<1).map(v=>side(p,q,ap(k.A,v))*sm);return on.length&&on.every(s=>s>-EPS)&&on.some(s=>s>EPS);};
    for(const F of byDepth){
      const parentMoved=F.parent&&moved.has(F.parent);
      if(sel&&!sel(F,ap(F.A,cen(F.pts)))){if(parentMoved){moved.add(F);F.A=amul(Rf,F.A);}continue;}
      const C=F.pts.map(x=>ap(F.A,x)),sd=C.map(x=>side(p,q,x)*sm);
      let mvs=sd.some(s=>s>EPS),stay=sd.some(s=>s<-EPS),cm,cs,Ai;
      if(mvs&&stay){Ai=ainv(F.A);cm=clip(C,p,q,sm).map(x=>ap(Ai,x));cs=clip(C,p,q,-sm).map(x=>ap(Ai,x));if(area(cs)<4)stay=false;else if(area(cm)<4)mvs=false;}
      if(mvs&&stay){
        const kids=facets.filter(k=>k.parent===F);
        const keepMove=F.h?onMove(F):false;
        const a=ap(Ai,p),b=ap(Ai,q);const hh={a,b,th:DEG(Math.atan2(b[1]-a[1],b[0]-a[0]))};
        const oldA=F.A;
        const mk=(pts,parent)=>{const G={id:nid++,pts,parent,h:hh,track:[],A:oldA,hist:F.hist.slice(),zw:F.zw.slice(),oo:F.oo.slice(),kk:F.kk.slice(),cv:F.cv.slice(),tags:new Set(F.tags),wall:F.wall,sw:null};facets.push(G);order.splice(order.indexOf(F)+1,0,G);return G;};
        if(!keepMove){F.pts=cs;if(parentMoved)counter(F);
          const G=mk(cm,F);for(const k of kids)if(onMove(k))k.parent=G;
          rot(G);moved.add(G);G.A=amul(Rf,oldA);
        }else{const tgtStay=worldEnd(F,cen(cs),sim.stayPre?new Map([...delta].map(([f,v])=>[f,v[0]])):undefined); // sim.stayPre (opt-in): aim at where the part sat BEFORE this fold; with a parent that already turned, the old target sent it round a full 360
          F.pts=cm;if(!parentMoved){if(!F.h)throw new Error('root would move: '+name);rot(F);}moved.add(F);F.A=amul(Rf,oldA);
          const G=mk(cs,F);for(const k of kids)if(!onMove(k))k.parent=G;
          counter(G,tgtStay);}
      }else if(mvs){if(!parentMoved){if(!F.h)throw new Error('root would move: '+name);rot(F);}moved.add(F);F.A=amul(Rf,F.A);}
      else{if(parentMoved)counter(F);}
    }
    for(const f of facets)f.hist.push(moved.has(f)?1:0);
    if(tag)for(const f of moved)f.tags.add(tag);
    let zTop=steps.length?steps[steps.length-1].zTop:0;
    if(place!=='none'){
      const orig=order.slice();const mvd=order.filter(f=>moved.has(f));order=order.filter(f=>!moved.has(f));const rv=mvd.slice().reverse();
      if(typeof place==='function'){order=place(orig.slice(),moved);}
      else if(place==='front')order.push(...rv);
      else if(place==='behind')order.unshift(...rv);
      else if(place==='spine'){for(const f of rv)f.wall='far';for(const f of order)f.wall='near';order.unshift(...rv);}
      else{const nm=mvd.filter(f=>f.wall==='near').reverse(),fm=mvd.filter(f=>f.wall==='far').reverse();const nf=order.filter(f=>f.wall==='far').length;
        if(place==='inside')order.splice(nf,0,...fm,...nm);else{order.push(...nm);order.unshift(...fm);}}
      const lv=levels();zTop=(sim.ZE||ZE)*(Math.max(...lv.values())-1);
      for(const f of facets){const z=(sim.ZE||ZE)*(lv.get(f)-1);const sg=Math.sign(f.A[0]*f.A[3]-f.A[1]*f.A[2]);f.zw.push(z);f.oo.push(sg*z);f.kk.push(lv.kd.get(f));f.cv.push(lv.cv.get(f));}
    }else for(const f of facets){f.zw.push(f.zw.length?f.zw[f.zw.length-1]:0);f.oo.push(f.oo.length?f.oo[f.oo.length-1]:0);f.kk.push(f.kk.length?f.kk[f.kk.length-1]:0);f.cv.push(f.cv.length?f.cv[f.cv.length-1]:0);}
    steps.push({t0,t1,zTop,name,n:moved.size});
    return moved;
  }
  // additive step interpolation for per-step arrays
  const stepVal=(arr,t,init=0)=>{let v=init,prev=init;for(let k=0;k<steps.length;k++){const s=steps[k];const cur=arr[k];const u=t<=s.t0?0:t>=s.t1?1:bz(EASE.io,(t-s.t0)/(s.t1-s.t0));v+=(cur-prev)*u;prev=cur;}return v;};
  const sim={facets,steps,fold,worldEnd,depth,get order(){return order;},cur:f=>ap(f.A,cen(f.pts)),curPt:(f,x)=>ap(f.A,x),
    tagged:t=>facets.filter(f=>f.tags.has(t))};

  // ---------- finishing: crease activation + shading ----------
  // validity: adjacent facets must still meet along their shared edge, and the hinge tracks must agree with the flat map
  sim.check=function(flatOnly=true){let bad=0;
    for(let i=0;i<facets.length;i++)for(let j=i+1;j<facets.length;j++){const f=facets[i],g=facets[j];if(area(f.pts)<4||area(g.pts)<4)continue;for(const [,a,b] of shared(f,g)){const d=Math.max(Math.hypot(...[0,1].map(k=>ap(f.A,a)[k]-ap(g.A,a)[k])),Math.hypot(...[0,1].map(k=>ap(f.A,b)[k]-ap(g.A,b)[k])));if(d>2){bad++;if(bad<12)console.warn('!! TEAR between',f.id,[...f.tags].join('+'),'and',g.id,[...g.tags].join('+'),d.toFixed(0)+'px');}}}
    if(flatOnly)for(const f of facets){if(area(f.pts)<4)continue;const c=cen(f.pts);const w=worldEnd(f,c),m=ap(f.A,c);const d=Math.hypot(w[0]-m[0],w[1]-m[1]);if(d>2){bad++;if(bad<12)console.warn('!! TRACK MISMATCH facet',f.id,[...f.tags].join('+'),d.toFixed(0)+'px');}}
    console.log(bad?('!! '+bad+' validity problems'):'valid: no tears, tracks agree');return bad;};
  sim.finish=function(cam){
    sim.cam=cam;const dur=cam.dur;
    const onB=(A,B)=>(Math.abs(A[0])<1&&Math.abs(B[0])<1)||(Math.abs(A[0]-W)<1&&Math.abs(B[0]-W)<1)||(Math.abs(A[1])<1&&Math.abs(B[1])<1)||(Math.abs(A[1]-H)<1&&Math.abs(B[1]-H)<1);
    for(const f of facets){f.E=[];for(let i=0;i<f.pts.length;i++){const A=f.pts[i],B=f.pts[(i+1)%f.pts.length];if(Math.hypot(B[0]-A[0],B[1]-A[1])>1&&onB(A,B))f.E.push([A,B,cam.lift||0]);}}
    for(let i=0;i<facets.length;i++)for(let j=0;j<facets.length;j++){if(i===j)continue;const f=facets[i],g=facets[j];if(area(f.pts)<4||area(g.pts)<4)continue;const sh=shared(f,g);if(!sh.length)continue;let k=-1;for(let s=0;s<f.hist.length;s++)if(f.hist[s]!==g.hist[s]){k=s;break;}if(k<0)continue;for(const [,a,b] of sh)f.E.push([a,b,steps[k].t0]);}
    // tone per step and zs tracks
    const zTops=steps.map(s=>s.zTop);
    for(const f of facets){f.tone=f.kk.map((k,i)=>Math.min(sim.toneCap||0.16,(sim.toneK||0.055)*k)*Math.max(0,Math.min(1,((f.cv[i]||0)-0.3)/0.4)));}
  };
  const camM=t=>{const c=sim.cam;return mx(mx(Rx(ev(c.rx,t)),Ry(ev(c.ry,t))),Rz(ev(c.rz,t)));};
  const facetT=(f,t,memo)=>{if(memo.has(f))return memo.get(f);let Tm;if(!f.h)Tm={M:I3,T:[0,0,0]};else{const P=facetT(f.parent,t,memo);const Rh=hingeR(f.h,ev(f.track,t),f.sw?ev(f.sw,t):0);const a=[f.h.a[0],f.h.a[1],0];const ra=mv3(Rh,a);const T=[a[0]-ra[0],a[1]-ra[1],a[2]-ra[2]];const pt=mv3(P.M,T);Tm={M:mx(P.M,Rh),T:[pt[0]+P.T[0],pt[1]+P.T[1],pt[2]+P.T[2]]};}memo.set(f,Tm);return Tm;};
  const L0=[-0.35,-0.6,0.72],ln=Math.hypot(...L0),LV=L0.map(v=>v/ln),BASE=LV[2];
  // signed overlay value: >0 navy alpha, <0 white alpha
  sim.shade=(f,t,front,memo)=>{memo=memo||new Map();const Tm=facetT(f,t,memo);const c=sim.cam;const Mr=mx(Rz(-(-ev(c.rot,t))),mx(camM(t),Tm.M));const n=mv3(Mr,[0,0,1]);const d=n[0]*LV[0]+n[1]*LV[1]+n[2]*LV[2];const v=front?BASE-d:BASE+d;return (v>0?0.42*v:0.3*v)+stepVal(f.tone,t,0);};
  sim.offsetAt=(f,t)=>stepVal(f.oo,t,0);
  // full transform to screen (ortho): returns fn(x,y,z)->[X,Y,Z] and normal z
  sim.xf=(t)=>{const memo=new Map();const c=sim.cam;const Mm=camM(t),O=[c.origin[0],c.origin[1],0];const s=ev(c.sc,t)||1,rot=-ev(c.rot,t),tx=ev(c.tx,t),ty=ev(c.ty,t);const Rs=Rz(rot);
    return f=>{const Tm=facetT(f,t,memo);const o=sim.offsetAt(f,t);const fn=(x,y)=>{let p=mv3(Tm.M,[x,y,o]);p=[p[0]+Tm.T[0]-O[0],p[1]+Tm.T[1]-O[1],p[2]+Tm.T[2]];p=mv3(Mm,p);p=[p[0]+O[0]-720,p[1]+O[1]-450,p[2]];p=mv3(Rs,p);const k=sim.persp?sim.persp/(sim.persp-p[2]):1; // sim.persp (opt-in): the Figma stage's perspective, so previews show the layer parallax
      const X=720+s*k*p[0]+tx,Y=450+s*k*p[1]+ty;if(sim.zoomF){const [fx,fy,fz]=sim.zoomF;return [720+(X-fx)*fz,450+(Y-fy)*fz,s*p[2]];}return [X,Y,s*p[2]];};const n=mv3(mx(Rs,mx(Mm,Tm.M)),[0,0,1]);return {fn,nz:n[2],memo};};};

  // ---------- offline renderer ----------
  sim.render=function(t,file,opts={}){
    const sc=opts.scale||0.5,RW=Math.round(W*sc),RH=Math.round(H*sc);const tex=opts.tex;
    const buf=new Float32Array(RW*RH*3),zb=new Float32Array(RW*RH).fill(-1e9);
    const bg=opts.bg||[232,236,242];for(let i=0;i<RW*RH;i++){buf[i*3]=bg[0];buf[i*3+1]=bg[1];buf[i*3+2]=bg[2];}
    const xf=sim.xf(t);const lines=[];
    for(const f of facets){if(area(f.pts)<4)continue;if(f.hideAt!=null&&t>=f.hideAt)continue;const {fn,nz,memo}=xf(f);const P=f.pts.map(p=>fn(p[0],p[1]).map((v,i)=>i<2?v*sc:v));
      // affine screen->sheet and z plane from first non-degenerate triple
      let ok=false,inv,zc;for(let i=1;i<P.length-1&&!ok;i++){const a=P[0],b=P[i],c=P[i+1];const det=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(det)<1e-3)continue;const sa=f.pts[0],sb=f.pts[i],scc=f.pts[i+1];
        inv=(X,Y)=>{const u=((X-a[0])*(c[1]-a[1])-(Y-a[1])*(c[0]-a[0]))/det,v=((b[0]-a[0])*(Y-a[1])-(b[1]-a[1])*(X-a[0]))/det;return [sa[0]+u*(sb[0]-sa[0])+v*(scc[0]-sa[0]),sa[1]+u*(sb[1]-sa[1])+v*(scc[1]-sa[1]),a[2]+u*(b[2]-a[2])+v*(c[2]-a[2])];};ok=true;}
      if(!ok)continue;
      const front=nz>0;const a=sim.shade(f,t,front,memo);
      const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);const x0=Math.max(0,Math.floor(Math.min(...xs))),x1=Math.min(RW-1,Math.ceil(Math.max(...xs))),y0=Math.max(0,Math.floor(Math.min(...ys))),y1=Math.min(RH-1,Math.ceil(Math.max(...ys)));
      const n=P.length;let sgn=0;for(let i=0;i<n;i++){const A=P[i],B=P[(i+1)%n],C=P[(i+2)%n];const cr=(B[0]-A[0])*(C[1]-B[1])-(B[1]-A[1])*(C[0]-B[0]);if(Math.abs(cr)>1e-6){sgn=Math.sign(cr);break;}}
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const X=x+0.5,Y=y+0.5;let ins=true;for(let i=0;i<n;i++){const A=P[i],B=P[(i+1)%n];if(((B[0]-A[0])*(Y-A[1])-(B[1]-A[1])*(X-A[0]))*sgn<-0.01){ins=false;break;}}if(!ins)continue;
        const s=inv(X,Y);const idx=y*RW+x;if(s[2]<=zb[idx])continue;zb[idx]=s[2];let col;
        if(front&&tex){const tx=Math.max(0,Math.min(W-1,Math.round(s[0]))),ty=Math.max(0,Math.min(H-1,Math.round(s[1])));const o=(ty*W+tx)*3;col=[tex[o],tex[o+1],tex[o+2]];}else col=front?[205,170,120]:[248,250,252];
        if(a>0){const al=Math.min(0.72,a);col=col.map((v,i)=>v*(1-al)+[8,13,31][i]*al);}else{const al=Math.min(0.35,-a*0.85);col=col.map(v=>v*(1-al)+255*al);}
        buf[idx*3]=col[0];buf[idx*3+1]=col[1];buf[idx*3+2]=col[2];}
      for(const [A,B,ta] of f.E||[]){if(t<ta)continue;const al=0.4*Math.min(1,(t-ta)/0.15);const a3=fn(A[0],A[1]),b3=fn(B[0],B[1]);lines.push([a3[0]*sc,a3[1]*sc,a3[2],b3[0]*sc,b3[1]*sc,b3[2],al]);}
    }
    for(const [ax,ay,az,bx,by,bz2,al] of lines){const L=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.ceil(L*1.5));for(let i=0;i<=n;i++){const u=i/n,x=Math.round(ax+(bx-ax)*u-0.5),y=Math.round(ay+(by-ay)*u-0.5),z=az+(bz2-az)*u;if(x<0||y<0||x>=RW||y>=RH)continue;const idx=y*RW+x;if(z<zb[idx]-0.6*(sim.ZE||ZE))continue;for(let c=0;c<3;c++)buf[idx*3+c]=buf[idx*3+c]*(1-al)+[20,26,46][c]*al;}}
    const out=Buffer.alloc(RW*RH*3);for(let i=0;i<out.length;i++)out[i]=Math.max(0,Math.min(255,Math.round(buf[i])));
    fs.writeFileSync(file,Buffer.concat([Buffer.from(`P6\n${RW} ${RH}\n255\n`),out]));
  };


  // ---------- audit: what is actually visible at time t ----------
  sim.audit=function(t,sc=1){const RW=Math.round(W*sc),RH=Math.round(H*sc);const id=new Int32Array(RW*RH).fill(-1),zb=new Float32Array(RW*RH).fill(-1e9);const xf=sim.xf(t);
    for(const f of facets){if(area(f.pts)<4)continue;if(f.hideAt!=null&&t>=f.hideAt)continue;const {fn}=xf(f);const P=f.pts.map(p=>fn(p[0],p[1]).map((v,i)=>i<2?v*sc:v));
      let ok=false,zf;for(let i=1;i<P.length-1&&!ok;i++){const a=P[0],b=P[i],c=P[i+1];const det=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(det)<1e-3)continue;zf=(X,Y)=>{const u=((X-a[0])*(c[1]-a[1])-(Y-a[1])*(c[0]-a[0]))/det,v=((b[0]-a[0])*(Y-a[1])-(b[1]-a[1])*(X-a[0]))/det;return a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]);};ok=true;}
      if(!ok)continue;const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);const x0=Math.max(0,Math.floor(Math.min(...xs))),x1=Math.min(RW-1,Math.ceil(Math.max(...xs))),y0=Math.max(0,Math.floor(Math.min(...ys))),y1=Math.min(RH-1,Math.ceil(Math.max(...ys)));
      const n=P.length;let sgn=0;for(let i=0;i<n;i++){const A=P[i],B=P[(i+1)%n],C=P[(i+2)%n];const cr=(B[0]-A[0])*(C[1]-B[1])-(B[1]-A[1])*(C[0]-B[0]);if(Math.abs(cr)>1e-6){sgn=Math.sign(cr);break;}}
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const X=x+0.5,Y=y+0.5;let ins=true;for(let i=0;i<n;i++){const A=P[i],B=P[(i+1)%n];if(((B[0]-A[0])*(Y-A[1])-(B[1]-A[1])*(X-A[0]))*sgn<-0.01){ins=false;break;}}if(!ins)continue;const z=zf(X,Y);const k=y*RW+x;if(z<=zb[k])continue;zb[k]=z;id[k]=f.id;}}
    const cnt=new Map();let tot=0,inner=0,outline=0,minx=1e9,maxx=-1,miny=1e9,maxy=-1;
    for(let y=0;y<RH;y++)for(let x=0;x<RW;x++){const k=y*RW+x,v=id[k];if(v<0)continue;tot++;cnt.set(v,(cnt.get(v)||0)+1);if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;
      const r=x+1<RW?id[k+1]:-1,d=y+1<RH?id[k+RW]:-1,l=x>0?id[k-1]:-1,u=y>0?id[k-RW]:-1;if(r<0||d<0||l<0||u<0)outline++;else if(r!==v||d!==v)inner++;}
    const parts=[...cnt.values()].sort((a,b)=>b-a);const big=parts.filter(v=>v/tot>=0.01).length;
    return {facets:facets.filter(f=>area(f.pts)>4).length,folds:steps.length,visible:parts.length,visibleOver1pct:big,top1:+(parts[0]/tot*100).toFixed(1),top3:+(parts.slice(0,3).reduce((a,b)=>a+b,0)/tot*100).toFixed(1),hiddenPct:+(100-tot/(W*H*sc*sc*Math.pow(ev(sim.cam.sc,t)||1,2))*100).toFixed(1),innerLinePx:Math.round(inner/sc),outlinePx:Math.round(outline/sc),innerPerOutline:+(inner/outline).toFixed(2),bbox:[Math.round((maxx-minx)/sc),Math.round((maxy-miny)/sc)],compact:+(outline*outline/(sc*sc)/(tot/(sc*sc))/16).toFixed(2)};};
  // ---------- export for the Figma builder ----------
  sim.export=function(){
    const cam=sim.cam,dur=cam.dur;const r1=v=>Math.round(v*10)/10,r2=v=>Math.round(v*100)/100,r3=v=>Math.round(v*1000)/1000;
    const live=facets.filter(f=>area(f.pts)>4).sort((a,b)=>depth(a)-depth(b));
    const camWin=[];for(const k of ['rx','ry','rz','rot'])for(let i=1;i<(cam[k]||[]).length;i++){const a=cam[k][i-1],b=cam[k][i];if(a[1]!==b[1])camWin.push([a[0],b[0]]);}
    const bleed=(pts,b=0.6)=>{const c=cen(pts);const n=pts.length;const out=[];for(let i=0;i<n;i++){const P0=pts[(i+n-1)%n],P1=pts[i],P2=pts[(i+1)%n];const nrm=(A,B)=>{const L=Math.hypot(B[0]-A[0],B[1]-A[1])||1;let nx=(B[1]-A[1])/L,ny=-(B[0]-A[0])/L;if(side(A,B,c)>0){}const s=((c[0]-A[0])*nx+(c[1]-A[1])*ny)>0?-1:1;return [nx*s,ny*s];};const n1=nrm(P0,P1),n2=nrm(P1,P2);let mxv=[n1[0]+n2[0],n1[1]+n2[1]];const ml=Math.hypot(mxv[0],mxv[1])||1;mxv=[mxv[0]/ml,mxv[1]/ml];const cosv=Math.max(0.45,mxv[0]*n1[0]+mxv[1]*n1[1]);out.push([P1[0]+mxv[0]*b/cosv,P1[1]+mxv[1]*b/cosv]);}return out;};
    const res=[];
    for(const f of live){
      // shading keyframes
      const ts=new Set([0,dur]);steps.forEach((s,k)=>{const mvd=f.hist[k]===1,tch=(f.tone[k]!==(k?f.tone[k-1]:0));if(mvd){for(let i=0;i<=8;i++)ts.add(r3(s.t0+(s.t1-s.t0)*i/8));}else if(tch){ts.add(s.t0);ts.add(r3((s.t0+s.t1)/2));ts.add(s.t1);}});
      for(const [a,b] of camWin)for(let i=0;i<=5;i++)ts.add(r3(a+(b-a)*i/5));
      if(f.sw)for(const k of f.sw)ts.add(k[0]);
      for(const t of (sim.extraT||[]))ts.add(r3(t));
      const T=[...ts].sort((a,b)=>a-b);
      const mkS=front=>{const arr=T.map(t=>[t,r2(Math.max(-0.4,Math.min(0.72,sim.shade(f,t,front))))]);return arr.filter((k,i)=>i===0||i===arr.length-1||!(Math.abs(k[1]-arr[i-1][1])<0.004&&Math.abs(k[1]-arr[i+1][1])<0.004));};
      // z offset keyframes
      const zt=new Set();steps.forEach((s,k)=>{if(f.oo[k]!==(k?f.oo[k-1]:0)){zt.add(s.t0);zt.add(s.t1);}});const Z=[...zt].sort((a,b)=>a-b).map(t=>[t,r2(sim.offsetAt(f,t))]);
      // group edges by activation time
      const eg={};for(const [A,B,ta] of f.E){const k=r2(ta);(eg[k]=eg[k]||[]).push([r1(A[0]),r1(A[1]),r1(B[0]),r1(B[1])]);}
      res.push({i:f.id,p:f.parent?f.parent.id:-1,P:bleed(f.pts).map(p=>[r1(p[0]),r1(p[1])]),h:f.h?[r1(f.h.a[0]),r1(f.h.a[1]),r1(f.h.b[0]),r1(f.h.b[1])]:0,tr:f.track.map(k=>k[2]&&k[2]!=='io'?[k[0],r1(k[1]),k[2]]:[k[0],r1(k[1])]),sw:f.sw?f.sw.map(k=>[k[0],r1(k[1])]):0,z:Z,sf:mkS(true),sb:mkS(false),E:Object.entries(eg).map(([t,l])=>[+t,l]),v:f.hideAt!=null?f.hideAt:0});
    }
    return res;
  };
  return sim;
}
module.exports={makeSim,W,H,R,DEG,cen,ap,area,rotPt,reflPt,side,ev,EASE};
