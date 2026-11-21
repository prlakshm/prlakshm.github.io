// PRESENT: the page folds into a hinged gift box (print on the outside), pink yarn climbs up from underneath and ties a bow,
// then it unties and the box blooms flat into the next page, which is printed on the reverse of the sheet.
// Every fold is rigid: 90° wall folds plus eight pinched corner gussets whose angles are solved, not faked.
// Net (h = wall height 180):  x: front wall | base | tall back wall | lid top | lid front      y: side strip | middle | side strip
'use strict';
const {makeSim,R,DEG,cen,area,ev}=require('./fold2.cjs');const fs=require('fs');
const S=makeSim();const AR=process.argv.slice(2);const arg=(k,d)=>{const i=AR.indexOf('--'+k);return i<0?d:AR[i+1];};
const W=1440,H=900,h=180;
const mx=(a,b)=>{const r=[[0,0,0],[0,0,0],[0,0,0]];for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)r[i][j]+=a[i][k]*b[k][j];return r;};
const mv3=(m,v)=>[m[0][0]*v[0]+m[0][1]*v[1]+m[0][2]*v[2],m[1][0]*v[0]+m[1][1]*v[1]+m[1][2]*v[2],m[2][0]*v[0]+m[2][1]*v[1]+m[2][2]*v[2]];
const Rx=d=>{const c=Math.cos(R(d)),s=Math.sin(R(d));return [[1,0,0],[0,c,-s],[0,s,c]];};
const Ry=d=>{const c=Math.cos(R(d)),s=Math.sin(R(d));return [[c,0,s],[0,1,0],[-s,0,c]];};
const Rz=d=>{const c=Math.cos(R(d)),s=Math.sin(R(d));return [[c,-s,0],[s,c,0],[0,0,1]];};
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(a[0],a[1],a[2]),unit=a=>{const l=len(a)||1;return [a[0]/l,a[1]/l,a[2]/l];};
// ---------- the net ----------
let nid=0;const F=[];
const mkf=(name,pts,parent,hl)=>{const f={id:nid++,name,pts,parent,h:hl?{a:hl[0],b:hl[1],th:DEG(Math.atan2(hl[1][1]-hl[0][1],hl[1][0]-hl[0][0]))}:null,track:[],A:[1,0,0,1,0,0],hist:[],zw:[],oo:[],kk:[],cv:[],tone:[],tags:new Set([name]),wall:null,sw:null,E:[]};F.push(f);return f;};
const X0=h,X1=3*h,X2=5*h,X3=7*h,Y0=h,Y1=H-h,XM=(X1+X2)/2,XL=(X2+X3)/2,XB=(X0+X1)/2,YC=H/2;
const base=mkf('base',[[X0,Y0],[X1,Y0],[X1,Y1],[X0,Y1]],null,null);
const FW=mkf('front wall',[[0,Y0],[X0,Y0],[X0,Y1],[0,Y1]],base,[[X0,Y0],[X0,Y1]]);
const BW=mkf('back wall',[[X1,Y0],[X2,Y0],[X2,Y1],[X1,Y1]],base,[[X1,Y0],[X1,Y1]]);
const LT=mkf('lid top',[[X2,Y0],[X3,Y0],[X3,Y1],[X2,Y1]],BW,[[X2,Y0],[X2,Y1]]);
const LF=mkf('lid front',[[X3,Y0],[W,Y0],[W,Y1],[X3,Y1]],LT,[[X3,Y0],[X3,Y1]]);
const sides=[],lidSides=[],corners=[];
for(const k of [0,1]){const ye=k?Y1:Y0,yo=k?H:0,nm=k?' (near)':' (far)';
  const Sw=mkf('side wall'+nm,[[X0,ye],[X1,ye],[X1,yo],[X0,yo]],base,[[X0,ye],[X1,ye]]);sides.push(Sw);
  const Ls=mkf('lid side'+nm,[[X2,ye],[X3,ye],[X3,yo],[X2,yo]],LT,[[X2,ye],[X3,ye]]);lidSides.push(Ls);
  // front corner of the base tray
  const fa=mkf('front gusset A'+nm,[[X0,ye],[X0,yo],[0,yo]],Sw,[[X0,ye],[X0,yo]]),fb=mkf('front gusset B'+nm,[[X0,ye],[0,yo],[0,ye]],fa,[[X0,ye],[0,yo]]);
  corners.push({O:[X0,ye],tip:[0,yo],TA:fa,TB:fb,wallA:Sw,PA:[X0,yo],wallB:FW,X:[0,ye],floor:base});
  // front corner of the lid tray
  const la=mkf('lid gusset A'+nm,[[X3,ye],[X3,yo],[W,yo]],Ls,[[X3,ye],[X3,yo]]),lb=mkf('lid gusset B'+nm,[[X3,ye],[W,yo],[W,ye]],la,[[X3,ye],[W,yo]]);
  corners.push({O:[X3,ye],tip:[W,yo],TA:la,TB:lb,wallA:Ls,PA:[X3,yo],wallB:LF,X:[W,ye],floor:LT});
  // back corners: one ear on the tall back wall, with a wing to each side wall
  const D=mkf('back ear'+nm,[[X1,ye],[X2,ye],[XM,yo]],BW,[[X1,ye],[X2,ye]]),U1=mkf('back ear wing A'+nm,[[X1,ye],[XM,yo],[X1,yo]],D,[[X1,ye],[XM,yo]]),U2=mkf('back ear wing B'+nm,[[X2,ye],[X2,yo],[XM,yo]],D,[[X2,ye],[XM,yo]]);
  corners.push({O:[X1,ye],tip:[XM,yo],TA:D,TB:U1,wallA:BW,PA:[X1+h,ye],wallB:Sw,X:[X1,yo],floor:base,TB2:U2,wallB2:Ls,X2:[X2,yo]});
}
S.facets.length=0;S.facets.push(...F);
// ---------- kinematics ----------
const hingeM=(hh,phi)=>mx(mx(Rz(hh.th),Rx(phi)),Rz(-hh.th));
const wpt=(f,X,ang)=>{let P=[X[0],X[1],X[2]||0];for(let g=f;g&&g.h;g=g.parent){const M=hingeM(g.h,ang.get(g)||0);const a=g.h.a;const v=mv3(M,[P[0]-a[0],P[1]-a[1],P[2]]);P=[a[0]+v[0],a[1]+v[1],v[2]];}return P;};
const sgnAway=f=>{const m=new Map([[f,10]]);return wpt(f,cen(f.pts),m)[2]<0?1:-1;};
const walls=[FW,BW,LT,LF,...sides,...lidSides];const SG=new Map(walls.map(f=>[f,sgnAway(f)]));
// ---------- timeline ----------
// exits: bloom = unties and opens flat into the next page (printed on the reverse) | burst = unties, the front opens like a mouth and the
// Everything thumbnails fly out to their places, the box drops away | pull = stays tied, a yarn lead tugs it off to the right like a pull toy
const EXIT=arg('exit','bloom');const BLOOM=EXIT==='bloom',BURST=EXIT==='burst',PULL=EXIT==='pull';
const T=BLOOM?{settle:0.45,s:[0.5,0.95],b:[1.0,1.6],f:[1.65,2.15],press:[2.15,2.42],yarn:[2.45,3.35],tie:[3.35,3.98],untie:[4.5,4.74],retract:[4.68,5.04],unpress:[4.7,5.04],bloom:[5.08,6.1]}
 :BURST?{settle:0.45,s:[0.5,0.95],b:[1.0,1.6],f:[1.65,2.15],press:[2.15,2.42],yarn:[2.45,2.95],tie:[2.95,3.59],seq:{knot:[2.95,3.03],ears:[3.03,3.33],tails:[3.33,3.59]},pull:{tug:[4.09,4.17],go:[4.22,4.6]},untie:[4.61,4.76],retract:[4.72,4.92],unpress:[4.72,4.96],bloom:[4.98,5.51],fly:[5.26,7.09],drop:[5.94,6.6]}
 :{settle:0.45,s:[0.5,0.95],b:[1.0,1.6],f:[1.65,2.15],press:[2.15,2.42],yarn:[2.45,3.35],tie:[3.35,3.98],lead:[4.2,4.72],tug:4.86,go:5.2,gone:6.2};
const DUR=+arg('dur',BLOOM?6.3:BURST?7.32:6.4);const BE=arg('be','io');const OPENF=+arg('openf',22);
// REL = the interval in which the pressed corners are released and solved again (bloom: everything; burst: only the front opens)
const REL=PULL?null:T.bloom;
const TH=BLOOM?{s:[[T.s[0],0],[T.s[1],90,'io'],[T.bloom[0],90],[T.bloom[1],0,BE]],b:[[T.b[0],0],[T.b[1],90,'io'],[T.bloom[0],90],[T.bloom[1],0,BE]],f:[[T.f[0],0],[T.f[1],90,'io'],[T.bloom[0],90],[T.bloom[1],0,BE]]}
 :BURST?{s:[[T.s[0],0],[T.s[1],90,'io']],b:[[T.b[0],0],[T.b[1],90,'io']],f:[[T.f[0],0],[T.f[1],90,'io'],[T.bloom[0],90],[T.bloom[1],OPENF,'soft']]}
 :{s:[[T.s[0],0],[T.s[1],90,'io']],b:[[T.b[0],0],[T.b[1],90,'io']],f:[[T.f[0],0],[T.f[1],90,'io']]};
const wallAng=t=>{const m=new Map();const s=ev(TH.s,t),b=ev(TH.b,t),f=ev(TH.f,t);m.set(FW,SG.get(FW)*f);m.set(LF,SG.get(LF)*f);m.set(BW,SG.get(BW)*b);m.set(LT,SG.get(LT)*b);for(const w of [...sides,...lidSides])m.set(w,SG.get(w)*s);return m;};
for(const [f,key] of [[FW,'f'],[LF,'f'],[BW,'b'],[LT,'b'],...sides.map(w=>[w,'s']),...lidSides.map(w=>[w,'s'])])f.track=TH[key].map(k=>k[2]?[k[0],SG.get(f)*k[1],k[2]]:[k[0],SG.get(f)*k[1]]);
// ---------- pinched corners ----------
const C45=Math.SQRT1_2;
const min1=(fn)=>{let best=0,bv=1e18;for(let a=-180;a<=180;a+=1){const v=fn(a);if(v<bv){bv=v;best=a;}}let lo=best-1,hi=best+1;for(let i=0;i<40;i++){const m1=lo+(hi-lo)/3,m2=hi-(hi-lo)/3;if(fn(m1)<fn(m2))hi=m2;else lo=m1;}const a=(lo+hi)/2;return [a,fn(a)];};
const solve=(c,t)=>{const ang=wallAng(t);const Ow=wpt(c.wallA,c.O,ang);const eA=unit(sub(wpt(c.wallA,c.PA,ang),Ow)),eB=unit(sub(wpt(c.wallB,c.X,ang),Ow));
  const cc=dot(eA,eB),cr=cross(eA,eB),n=len(cr);if(n<2e-3&&cc>0.5)return null; // both walls up: the ear swings freely, driven explicitly
  const a=C45/(1+cc);const k2=Math.max(0,1-a*a*(2+2*cc));const bv=n>1e-9?mul(unit(cr),Math.sqrt(k2)):[0,0,0];
  const m=unit(sub(wpt(c.floor,cen(c.floor.pts),ang),Ow));const d1=add(mul(add(eA,eB),a),bv),d2=sub(mul(add(eA,eB),a),bv);const d=dot(d1,m)>=dot(d2,m)?d1:d2;
  const tipW=add(Ow,mul(d,h*Math.SQRT2));
  const [al,e1]=min1(x=>{ang.set(c.TA,x);return len(sub(wpt(c.TA,c.tip,ang),tipW));});ang.set(c.TA,al);
  const XB_=wpt(c.wallB,c.X,ang);const [be,e2]=min1(x=>{ang.set(c.TB,x);return len(sub(wpt(c.TB,c.X,ang),XB_));});ang.set(c.TB,be);
  let b2=0,e3=0;if(c.TB2){const X2w=wpt(c.wallB2,c.X2,ang);[b2,e3]=min1(x=>{ang.set(c.TB2,x);return len(sub(wpt(c.TB2,c.X2,ang),X2w));});}
  return {al,be,b2,err:Math.max(e1,e2,e3)};};
const unwrap=(v,p)=>{if(p==null)return v;while(v-p>180)v-=360;while(v-p<-180)v+=360;return v;};
const prune=(tr,tol=0.25)=>{const out=[tr[0]];for(let i=1;i<tr.length-1;i++){const a=out[out.length-1],b=tr[i],c=tr[i+1];const u=(b[0]-a[0])/(c[0]-a[0]);if(Math.abs(a[1]+(c[1]-a[1])*u-b[1])>tol)out.push(b);}out.push(tr[tr.length-1]);return out;};
const DT=0.03,CL=+arg('clamp',177),FLAT=+arg('flat',174);let maxErr=0;
for(const c of corners){const fold=[],bloom=[];
  const run=(t0,t1,arr)=>{let p=arr.length?arr[arr.length-1]:null;const n=Math.round((t1-t0)/DT);for(let i=0;i<=n;i++){const t=+(t0+(t1-t0)*i/n).toFixed(4);const s=solve(c,t);if(!s)continue;maxErr=Math.max(maxErr,s.err);const q=[t,unwrap(s.al,p&&p[1]),unwrap(s.be,p&&p[2]),unwrap(s.b2,p&&p[3])];arr.push(q);p=q;}};
  run(T.s[0],T.f[1],fold);
  const last=fold[fold.length-1];const sA=Math.sign(last[1])||1,sB=Math.sign(last[2])||1,sB2=Math.sign(last[3])||1;
  // closed: the ear is pinched shut and pressed against the inside of its wall; before the bloom it swings back out
  const closed=[T.press[1],sA*FLAT,sB*CL,sB2*CL];
  if(REL)run(REL[0],REL[1],bloom);const first=bloom[0];
  const key=(q,e)=>k=>e?[q[0],+q[k].toFixed(2),e]:[q[0],+q[k].toFixed(2)];
  const mk=k=>{const a=prune(fold.map(q=>[q[0],q[k]])).map((q,i)=>i?[q[0],+q[1].toFixed(2),'lin']:[q[0],+q[1].toFixed(2)]);
    a.push([T.f[1],k===1?+last[1].toFixed(2):(k===2?sB:sB2)*CL,'lin']);a.push([closed[0],closed[k],'io']);let p=closed[k];
    if(REL&&bloom.length){a.push([T.unpress[0],closed[k]]);
    a.push([T.bloom[0],k===1?+last[1].toFixed(2):closed[k],'io']);
    p=a[a.length-1][1];for(const q of prune(bloom.map(q=>[q[0],q[k]]))){const v=unwrap(q[1],p);if(q[0]>T.bloom[0]+1e-6)a.push([q[0],+v.toFixed(2),'lin']);p=v;}
    if(BLOOM){if(a[a.length-1][0]<T.bloom[1]-1e-6)a.push([T.bloom[1],0,'lin']);else a[a.length-1][1]=0;}}
    const o=[];for(const q of a){if(o.length&&Math.abs(o[o.length-1][0]-q[0])<1e-6)o[o.length-1]=q;else o.push(q);}c['end'+k]=p;return o;};
  c.TA.track=mk(1);c.TB.track=mk(2);if(c.TB2)c.TB2.track=mk(3);
  // a front/lid ear ends flat against the inside of the front face and is then pressed to the side wall: it is inside the closed box, but a
  // layer sorted by its centre can still draw over the wall it touches, so it is hidden while enclosed and shown again when the front opens
  // (burst: it fades back in just after the front starts to open, once there is a gap to see it through)
  if(!c.TB2){const win=[+(T.f[1]-0.07).toFixed(3),REL&&bloom.length?+(T.bloom[0]+(BURST?0.1:0)).toFixed(3):null,BURST?0.18:0];c.TA.vis=win;c.TB.vis=win;}}
console.log('corner closure error (px, max over the fold and the bloom):',maxErr.toFixed(2));
console.log('gusset angles at the end of the bloom (should be ~0):',corners.map(c=>[c.end1,c.end2].map(v=>v.toFixed(1)).join('/')).join(' '));console.log('closed-state angles',corners.slice(0,3).map(c=>c.TA.track.find(k=>k[0]===T.press[1])[1]+'/'+c.TB.track.find(k=>k[0]===T.press[1])[1]).join(' '));
// ---------- creases: each line appears when its fold starts; all fade as the sheet lands ----------
const trackAng=t=>{const m=new Map();for(const f of F)if(f.h)m.set(f,ev(f.track,t));return m;};
const nrm=(f,ang)=>{const p=f.pts;return unit(cross(sub(wpt(f,p[1],ang),wpt(f,p[0],ang)),sub(wpt(f,p[2],ang),wpt(f,p[0],ang))));};
const sharedEdges=(f,g)=>{const out=[];for(let i=0;i<f.pts.length;i++){const A=f.pts[i],B=f.pts[(i+1)%f.pts.length];const L=Math.hypot(B[0]-A[0],B[1]-A[1]),ux=(B[0]-A[0])/L,uy=(B[1]-A[1])/L;for(let j=0;j<g.pts.length;j++){const C=g.pts[j],D=g.pts[(j+1)%g.pts.length];const dC=Math.abs((C[0]-A[0])*uy-(C[1]-A[1])*ux),dD=Math.abs((D[0]-A[0])*uy-(D[1]-A[1])*ux);if(dC>0.5||dD>0.5)continue;const s0=(C[0]-A[0])*ux+(C[1]-A[1])*uy,s1=(D[0]-A[0])*ux+(D[1]-A[1])*uy;const lo=Math.max(0,Math.min(s0,s1)),hi=Math.min(L,Math.max(s0,s1));if(hi-lo>2)out.push([[A[0]+ux*lo,A[1]+uy*lo],[A[0]+ux*hi,A[1]+uy*hi]]);}}return out;};
{const times=[];for(let t=T.s[0];t<T.press[1];t+=0.05)times.push(+t.toFixed(3));const norms=times.map(t=>{const a=trackAng(t);return new Map(F.map(f=>[f,nrm(f,a)]));});
 const onB=(A,B)=>(Math.abs(A[0])<1&&Math.abs(B[0])<1)||(Math.abs(A[0]-W)<1&&Math.abs(B[0]-W)<1)||(Math.abs(A[1])<1&&Math.abs(B[1])<1)||(Math.abs(A[1]-H)<1&&Math.abs(B[1]-H)<1);
 for(const f of F){for(let i=0;i<f.pts.length;i++){const A=f.pts[i],B=f.pts[(i+1)%f.pts.length];if(onB(A,B))f.E.push([A,B,0.05]);}
  for(const g of F){if(g===f)continue;const sh=sharedEdges(f,g);if(!sh.length)continue;let ta=null;for(let i=0;i<times.length;i++){if(dot(norms[i].get(f),norms[i].get(g))<0.9995){ta=times[Math.max(0,i-1)];break;}}if(ta==null)continue;for(const [a,b] of sh)f.E.push([a,b,ta]);}}}
// ---------- camera: tumble to a three-quarter view of the box, then turn the sheet over as it blooms ----------
const qFromM=m=>{const tr=m[0][0]+m[1][1]+m[2][2];let w,x,y,z;if(tr>0){const s=Math.sqrt(tr+1)*2;w=s/4;x=(m[2][1]-m[1][2])/s;y=(m[0][2]-m[2][0])/s;z=(m[1][0]-m[0][1])/s;}else if(m[0][0]>m[1][1]&&m[0][0]>m[2][2]){const s=Math.sqrt(1+m[0][0]-m[1][1]-m[2][2])*2;w=(m[2][1]-m[1][2])/s;x=s/4;y=(m[0][1]+m[1][0])/s;z=(m[0][2]+m[2][0])/s;}else if(m[1][1]>m[2][2]){const s=Math.sqrt(1+m[1][1]-m[0][0]-m[2][2])*2;w=(m[0][2]-m[2][0])/s;x=(m[0][1]+m[1][0])/s;y=s/4;z=(m[1][2]+m[2][1])/s;}else{const s=Math.sqrt(1+m[2][2]-m[0][0]-m[1][1])*2;w=(m[1][0]-m[0][1])/s;x=(m[0][2]+m[2][0])/s;y=(m[1][2]+m[2][1])/s;z=s/4;}return [w,x,y,z];};
const mFromQ=q=>{const [w,x,y,z]=q;return [[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];};
const slerp=(a,b,u)=>{let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];if(d<0){b=b.map(v=>-v);d=-d;}if(d>0.9995){const r=a.map((v,i)=>v+(b[i]-v)*u);const l=Math.hypot(...r);return r.map(v=>v/l);}const th=Math.acos(d),s=Math.sin(th);return a.map((v,i)=>(Math.sin((1-u)*th)*v+Math.sin(u*th)*b[i])/s);};
const bz=(c,u)=>{const [x1,y1,x2,y2]=c;let lo=0,hi=1,s=u;for(let i=0;i<30;i++){s=(lo+hi)/2;const x=3*(1-s)*(1-s)*s*x1+3*(1-s)*s*s*x2+s*s*s;if(x<u)lo=s;else hi=s;}return 3*(1-s)*(1-s)*s*y1+3*(1-s)*s*s*y2+s*s*s;};
const R0=[[0,-1,0],[0,0,1],[-1,0,0]]; // box up -> screen up, front wall -> viewer
const view=(tilt,turn)=>mx(mx(Rx(tilt),Ry(turn)),R0);
const TILT=+arg('tilt',BLOOM?-24:-10),TURN=+arg('turn',BLOOM?32:0),SPIN=+arg('spin',BLOOM?-14:0);
const KQ=BLOOM?[[0,qFromM(Rx(0))],[T.s[0],qFromM(Rx(0))],[T.press[0]+0.1,qFromM(view(TILT,TURN))],[T.bloom[0],qFromM(view(TILT,TURN+SPIN))],[T.bloom[1],qFromM(Ry(180))]]
 :[[0,qFromM(Rx(0))],[T.s[0],qFromM(Rx(0))],[T.press[0]+0.1,qFromM(view(TILT,TURN))],[DUR,qFromM(view(TILT,TURN))]];
const KE=[[0,0,1,1],[0,0,1,1],[0.5,0,0.3,1],[0.4,0,0.6,1],[0.6,0,0.3,1]];
// exit moves added on top of the camera: a roll about the box centre and a slide in screen pixels
let ROLL=[[0,0]],OFFX=[[0,0]],OFFY=[[0,0]],EXT=null;
// burst: one move at a time. The box stays still while the front opens and the thumbnails leave, then sinks straight down (no recoil, hop or roll)
if(BURST){const [d0,d1]=T.drop;EXT=[d0,d1];OFFY=[[0,0],[d0,0],[d1,+arg('sink',840),'acc']];}
if(PULL){const g=T.tug,g2=T.go;EXT=[g-0.1,DUR];const hops=[];const HB=0.2;for(let i=0;g2+i*HB<T.gone+0.3;i++)hops.push(+(g2+i*HB).toFixed(3));
  // first tug: a jerk to the right that rocks the box; then it is dragged off in hops, faster each time
  ROLL=[[0,0],[g,0],[g+0.1,7,'out'],[g+0.3,-2,'io'],[g2-0.04,0,'io']].concat(hops.map((t,i)=>[+(t+HB/2).toFixed(3),i%2?4:9,'soft']));
  OFFX=[[0,0],[g,0],[g+0.12,34,'out'],[g2,40,'io']].concat(hops.map((t,i)=>[+(t+HB).toFixed(3),40+Math.round(70*(i+1)+34*(i+1)*(i+1)),'soft']));
  OFFY=[[0,0],[g,0],[g+0.1,-12,'out'],[g+0.24,0,'in'],[g2,0]];for(const t of hops){OFFY.push([+(t+HB*0.5).toFixed(3),-22,'out']);OFFY.push([+(t+HB).toFixed(3),0,'in']);}}
const quatAt=t=>{if(t<=KQ[0][0])return KQ[0][1];for(let i=1;i<KQ.length;i++)if(t<=KQ[i][0]){const u=(t-KQ[i-1][0])/(KQ[i][0]-KQ[i-1][0]);return slerp(KQ[i-1][1],KQ[i][1],bz(KE[i],u));}return KQ[KQ.length-1][1];};
const euler=(m,prev)=>{const b=DEG(Math.asin(Math.max(-1,Math.min(1,m[0][2]))));const a=DEG(Math.atan2(-m[1][2],m[2][2])),c=DEG(Math.atan2(-m[0][1],m[0][0]));const cand=[[a,b,c],[a+180,180-b,c+180]];if(!prev)return cand[0];let best=null,bd=1e18;for(const q of cand){const r=q.map((v,i)=>unwrap(v,prev[i]));const d=Math.abs(r[0]-prev[0])+Math.abs(r[1]-prev[1])+Math.abs(r[2]-prev[2]);if(d<bd){bd=d;best=r;}}return best;};
const OR=[XB,YC];const SCB=+arg('scb',BLOOM?0.86:0.56);
const SC=BLOOM?[[0,1],[T.settle,0.62,'out'],[T.b[0],0.62],[T.press[0],SCB,'io'],[T.bloom[0],SCB],[T.bloom[1],1,'io']]:[[0,1],[T.settle,0.62,'out'],[T.b[0],0.62],[T.press[0],SCB,'io']];
// the point the camera keeps centred: page centre -> box centre -> page centre
const GYV=+arg('gy',BLOOM?474:468);
const FO=BLOOM?[[0,0],[T.s[0],0],[T.f[1],1,'io'],[T.bloom[0],1],[T.bloom[1],0,'io']]:[[0,0],[T.s[0],0],[T.f[1],1,'io']];const GY=BLOOM?[[0,450],[T.s[0],450],[T.f[1],GYV,'io'],[T.bloom[0],GYV],[T.bloom[1],450,'io']]:[[0,450],[T.s[0],450],[T.f[1],GYV,'io']];
const SCRIM=BLOOM?[[0,0],[T.settle,0.72,'out'],[T.bloom[0]+0.1,0.72],[T.bloom[1]-0.1,0,'io']]:BURST?[[0,0],[T.settle,0.72,'out'],[T.untie[0],0.72],[T.bloom[0],0.95,'io'],[T.fly[0]+0.9,0.95],[T.fly[1]+0.12,0,'io']]:[[0,0],[T.settle,0.72,'out'],[T.go+0.25,0.72],[T.gone+0.1,0,'io']];
const cam={name:BLOOM?'Origami 6 · Present':BURST?'Origami 6B · Present (burst)':'Origami 6C · Present (pull toy)',x:0,y:BLOOM?9600:BURST?10800:12000,dur:DUR,lift:0.05,origin:OR,rx:[],ry:[],rz:[],sc:SC,tx:[],ty:[],rot:[[0,0]],scrim:SCRIM};
{let prev=null;const ts=new Set([0,DUR]);for(let t=T.s[0];t<=T.press[0]+0.1+1e-6;t+=0.06)ts.add(+t.toFixed(3)); if(BLOOM){for(let t=T.press[0]+0.1;t<=T.bloom[0]+1e-6;t+=0.3)ts.add(+t.toFixed(3));for(let t=T.bloom[0];t<=T.bloom[1]+1e-6;t+=0.05)ts.add(+t.toFixed(3));ts.add(T.bloom[1]);}
 else{for(let t=T.press[0]+0.1;t<=EXT[0]+1e-6;t+=0.3)ts.add(+t.toFixed(3));for(let t=EXT[0];t<=EXT[1]+1e-6;t+=BURST?0.02:0.04)ts.add(+t.toFixed(3));for(const tr of [ROLL,OFFX,OFFY])for(const k of tr)if(k[0]>=EXT[0]&&k[0]<=DUR)ts.add(k[0]);}
 for(const t of [...ts].sort((a,b)=>a-b)){const M=mx(Rz(ev(ROLL,t)),mFromQ(quatAt(t)));const e=euler(M,prev);prev=e;const k=cam.rx.length?'lin':undefined;const push=(arr,v)=>arr.push(k?[t,+v.toFixed(2),k]:[t,+v.toFixed(2)]);push(cam.rx,e[0]);push(cam.ry,e[1]);push(cam.rz,e[2]);
  const s=ev(SC,t),u=ev(FO,t);const pf=[720+(XB-720)*u,YC,-h*u];const Mm=mx(mx(Rx(e[0]),Ry(e[1])),Rz(e[2]));const q=mv3(Mm,[pf[0]-OR[0],pf[1]-OR[1],pf[2]]);
  push(cam.tx,720-720-s*(q[0]+OR[0]-720)+ev(OFFX,t));push(cam.ty,ev(GY,t)-450-s*(q[1]+OR[1]-450)+ev(OFFY,t));}}
// where a point of the folded sheet lands on screen (perspective 2000 about the frame centre, then the stage scale and slide)
const camAt=(tr,t)=>ev(tr,t);const PERSP=2000;
const screenPt=(f,X,t)=>{const P=wpt(f,X,trackAng(t));const Mm=mx(mx(Rx(camAt(cam.rx,t)),Ry(camAt(cam.ry,t))),Rz(camAt(cam.rz,t)));const v=mv3(Mm,[P[0]-OR[0],P[1]-OR[1],P[2]]);const x=v[0]+OR[0],y=v[1]+OR[1],k=PERSP/(PERSP-v[2]);const s=ev(SC,t);return [720+s*((x-720)*k)+ev(cam.tx,t),450+s*((y-450)*k)+ev(cam.ty,t),k*s];};
// ---------- yarn: four strands climb from under the box to the middle of the lid, tie, untie, slip away ----------
const PINK='#FFB0D2';const CB=[XL,YC];
const strands=[[[FW,[X0,YC],[0,YC]],[LF,[W,YC],[X3,YC]],[LT,[X3,YC],CB]],[[BW,[X1,YC],[X2,YC]],[LT,[X2,YC],CB]]];
for(const k of [0,1]){const ye=k?Y1:Y0,yo=k?H:0;strands.push([[sides[k],[XB,ye],[XB,yo]],[lidSides[k],[XL,yo],[XL,ye]],[LT,[XL,ye],CB]]);}
const yarn=[];for(const st of strands){const L=st.map(s=>Math.hypot(s[2][0]-s[1][0],s[2][1]-s[1][1])),tot=L.reduce((a,b)=>a+b,0);let acc=0;for(let i=0;i<st.length;i++){const u0=acc/tot,u1=(acc+L[i])/tot;acc+=L[i];const r3=v=>+v.toFixed(3);
  yarn.push({f:st[i][0].id,a:st[i][1],b:st[i][2],d:[r3(T.yarn[0]+(T.yarn[1]-T.yarn[0])*u0),r3(T.yarn[0]+(T.yarn[1]-T.yarn[0])*u1)],r:T.retract?[r3(T.retract[0]+(T.retract[1]-T.retract[0])*(1-u1)),r3(T.retract[0]+(T.retract[1]-T.retract[0])*(1-u0))]:null});}}
cam.yarn=yarn;cam.pink=PINK;cam.bow={f:LT.id,c:CB,tie:T.tie,untie:T.untie||null,f2:LF.id,edge:X3,f3:FW.id,edge2:W};
// bow.seq (burst): the tie is three steps one after the other with no overlap: the knot pops, both ears draw on, then both tails; the hold follows
if(T.seq)cam.bow.seq=T.seq;
// bow.pull (burst): the bow comes undone the way a real one does, by one tail being pulled. tug = the slack tail snaps taut and gives a little;
// go = the pull itself: the tail runs out down the front while the ear on the far side of the knot (the same string) shrinks into the knot in step
// and pops through. T.untie is then only the release: the knot lets go and the rest slips away. tail: -1 = the screen-right tail (it does not
// cross the centre strand); the ear that goes is the opposite one.
if(T.pull)cam.bow.pull=Object.assign({tail:-1},T.pull);
// front-on exits see the lid top edge-on, so whatever lies on it is hidden and the knot shows above the front edge at the point that is in
// line with it on screen; bow.lean is how far that point is from the centre strand (sheet px along the edge), so the tails can leave from there
if(!BLOOM){const t=T.tie[1],k=screenPt(LT,CB,t),p0=screenPt(LT,[X3,YC],t),p1=screenPt(LT,[X3,YC+100],t);cam.bow.lean=+(100*(k[0]-p0[0])/(p1[0]-p0[0])).toFixed(1);}
if(BLOOM){cam.back=1;cam.fadeLines=[T.bloom[1]-0.35,T.bloom[1]];cam.shadowOff=[T.bloom[0],T.bloom[1]];}
S.cam=cam;
// shading sample times, then export; thin the shading tracks afterwards
{const ex=[];for(let t=0.45;t<=DUR;t+=0.06)ex.push(+t.toFixed(3));S.extraT=ex;}
const rdp=(a,tol)=>{if(a.length<3)return a;const keep=new Array(a.length).fill(false);keep[0]=keep[a.length-1]=true;const st=[[0,a.length-1]];while(st.length){const [i,j]=st.pop();let m=-1,md=tol;for(let k=i+1;k<j;k++){const u=(a[k][0]-a[i][0])/(a[j][0]-a[i][0]);const d=Math.abs(a[i][1]+(a[j][1]-a[i][1])*u-a[k][1]);if(d>md){md=d;m=k;}}if(m>0){keep[m]=true;st.push([i,m],[m,j]);}}return a.filter((_,i)=>keep[i]);};
console.log('facets',F.length,'| dur',DUR,'| box',(X1-X0)+'x'+(Y1-Y0)+'x'+2*h);
const tex=fs.readFileSync('home.rgb');const out=arg('out','pr');
if(arg('frames','')){arg('frames').split(',').map(Number).forEach((t,i)=>S.render(t,`${out}_${i}.ppm`,{tex,scale:+arg('rs',0.5)}));}
// ---------- exit extras, in screen pixels (flat layers above the stage) ----------
if(BURST){ // thumbnail clusters of the Everything page: [x,y,w,h] in the 1440x900 page image
  const R_=[[360,165,102,62],[464,165,138,84],[322,232,140,58],[686,133,274,66],[742,201,54,64],[906,200,220,66],[233,319,110,115],[512,284,296,210],[861,349,190,73],[886,430,182,84],[190,481,246,74],[569,527,246,74],[1073,556,261,62],[346,597,146,220],[747,646,118,108],[889,646,178,108]];
  const tm=T.bloom[1];const src=screenPt(base,[XB,YC,-h],tm).slice(0,2).map(v=>+v.toFixed(1));
  // they leave nearest-first, so the page fills outward from the box like a ripple; each one flies a straight line on one easing
  const dist=r=>Math.hypot(r[0]+r[2]/2-src[0],r[1]+r[3]/2-src[1]);const dmax=Math.max(...R_.map(dist));const N_=R_.length;const order=R_.map((r,i)=>i).sort((a,b)=>dist(R_[a])-dist(R_[b]));
  cam.tiles=order.map((ri,i)=>{const r=R_[ri];const d=dist(r)/dmax;const t0=+(T.fly[0]+0.6*i/(N_-1)).toFixed(3);const t1=+(t0+0.95+0.28*d).toFixed(3);return {r,t0,t1};});cam.tileS0=0.2;cam.tileFade=0.14;
  cam.src=src;console.log('burst source',src,'last tile lands',Math.max(...cam.tiles.map(q=>q.t1)));
  // OPT-IN, off by default (tried and reverted 2026-11-20, her call: "revert present to seeing everything elements in background"):
  // `--emptybg` hides every Everything element until it flies out of the box. Until the last thumbnail has landed the page behind is then
  // everything-empty.png (the same page with every thumbnail region R_, plus 8px for shadows, replaced by its own dotted paper; nav and
  // star card stay, they are not thrown), which fades to the real page, only adding the thumbnails' soft edges. hash = sha1 of the PNG
  // (it must be uploaded to the Figma file before the build). Without the flag the real page is behind the box, blurred and dimmed.
  if(AR.includes('--emptybg'))cam.bgEmpty={hash:'9499e9d6c6af5a6eed3e538698199f9cad249648',off:[T.fly[1],+(T.fly[1]+0.12).toFixed(3)]};}
if(PULL){ // the lead: a strand from the knot out past the right edge; it rides with the box once the tugging starts
  const pts=[];for(const k of cam.tx)if(k[0]>=T.lead[0]-1e-6){const p=screenPt(LT,[CB[0],CB[1],0],k[0]);pts.push([k[0],+p[0].toFixed(1),+p[1].toFixed(1)]);}
  cam.lead={k:pts,len:1700,sag:22,w:+(13*SCB).toFixed(2),d:T.lead};console.log('lead starts at',pts[0]);}
const EX=S.export();for(const r of EX){r.sf=rdp(r.sf,0.012);r.sb=rdp(r.sb,0.012);const f=F.find(q=>q.id===r.i);r.n=f.name;if(f.vis)r.v=f.vis;}
const OUTJ=BLOOM?'present.json':BURST?'presentB.json':'presentC.json';fs.writeFileSync(OUTJ,JSON.stringify({cam,F:EX}));console.log('json bytes',fs.statSync(OUTJ).size,'| keys per track: rx',cam.rx.length,'gusset',corners[0].TA.track.length,corners[2].TA.track.length);
