// FOLDABLE bear: every fold is physically possible (tear check must pass).
// doors -> spine -> rear legs (door ends) -> neck crimp (inside) -> front legs (door corners at the crimp edges)
// -> jaw + rump corner tucks -> head lowers (inside crimp) -> ear crimp (outside) -> nose, feet
const {makeSim,R,DEG,cen,rotPt,reflPt,area}=require('./fold2.cjs');const fs=require('fs');
const S=makeSim();const fn0='bF';
const A=process.argv.slice(2);const arg=(k,d)=>{const i=A.indexOf('--'+k);return i<0?d:A[i+1];};
const near=f=>f.wall==='near',far=f=>f.wall==='far';
const LEGS=['legBN','legBF','legFN','legFF'];const isLeg=f=>LEGS.some(t=>f.tags.has(t));
const s=150,YB=900-s,DT=YB-s,XA=+arg('xa',560),WB=+arg('wb',290),XB=XA-WB,FX=1440-2*WB; // FX = front edge of the head after the neck crimp
const T={door:[.45,.8],spine:[.85,1.2],legB:[1.25,1.55],neck:[1.6,2.0],legF:[2.05,2.35],jaw:[2.4,2.66],tilt:[2.7,3.0],ear:[3.04,3.32],tip:[3.36,3.56]};
const tt=k=>({t0:T[k][0],t1:T[k][1]});
S.fold({name:'door top',p:[0,s],q:[1440,s],m:[700,10],place:'behind',dir:-1,...tt('door'),tag:'door'});
S.fold({name:'door bottom',p:[0,YB],q:[1440,YB],m:[700,890],place:'behind',dir:-1,...tt('door'),tag:'door'});
S.fold({name:'spine',p:[0,450],q:[1440,450],m:[700,100],place:'spine',dir:-1,...tt('spine')});
// rear legs: the rear end of each door flips out below the belly
const aBN=XA/2,aBF=+arg('abf',320),aFN=XA/2,aFF=WB;
S.fold({name:'legBN',p:[0,YB],q:[aBN,DT],m:[3,DT+5],sel:f=>near(f)&&f.tags.has('door'),place:'inside',dir:-1,...tt('legB'),tag:'legBN'});
S.fold({name:'legBF',p:[0,YB],q:[aBF,DT],m:[3,DT+5],sel:f=>far(f)&&f.tags.has('door'),place:'inside',dir:-1,...tt('legB'),tag:'legBF'});
// neck crimp: the front of the strip tucks back inside the body, then comes forward again as neck + head
{const m0=[1400,500];
 S.fold({name:'neckA',p:[XA,450],q:[XA,900],m:m0,sel:f=>!isLeg(f),place:'inside',dir:-1,...tt('neck'),tag:'neckA'});
 S.fold({name:'neckB',p:[XB,450],q:[XB,900],m:reflPt([XA,450],[XA,900],m0),sel:f=>f.tags.has('neckA')&&!isLeg(f),place:'inside',dir:-1,crimp:true,...tt('neck'),tag:'head'});}
const isBand=f=>f.tags.has('neckA')&&!f.tags.has('head'),isHead=f=>f.tags.has('head');
// front legs. near: corner of the door at the front body edge, reverse-folded between body door and tucked door.
// far: corner of the door at the back edge of the tuck, reverse-folded around the outside of the tucked layers.
const ins=(res,ref,items,before)=>{const i=res.indexOf(ref);if(i<0){console.warn('!! ref not found');return;}res.splice(before?i:i+1,0,...items);};
const packA=(order,moved)=>{const res=order.filter(f=>!moved.has(f));const mv=order.filter(f=>moved.has(f));
  const bodyDoor=res.find(f=>near(f)&&f.tags.has('door')&&!f.tags.has('neckA')&&!isLeg(f));
  ins(res,bodyDoor,[...mv.filter(f=>f.tags.has('neckA')),...mv.filter(f=>!f.tags.has('neckA'))],true);return res;};
const packB=(order,moved)=>{const res=order.filter(f=>!moved.has(f));const mv=order.filter(f=>moved.has(f));
  const bandDoor=res.find(f=>far(f)&&f.tags.has('door')&&isBand(f)&&!isLeg(f)),headDoor=res.find(f=>far(f)&&f.tags.has('door')&&isHead(f)&&!isLeg(f));
  ins(res,bandDoor,mv.filter(isBand),true);ins(res,headDoor,mv.filter(isHead),false);return res;};
S.fold({name:'legFN',p:[XA,YB],q:[XA-aFN,DT],m:[XA-3,DT+5],sel:f=>near(f)&&f.tags.has('door')&&!isHead(f)&&!isLeg(f),place:packA,dir:-1,...tt('legF'),tag:'legFN'});
S.fold({name:'legFF',p:[XB,YB],q:[XB+aFF,DT],m:[XB+3,DT+5],sel:f=>far(f)&&f.tags.has('door')&&f.tags.has('neckA')&&!isLeg(f),place:packB,dir:-1,...tt('legF'),tag:'legFF'});
// jaw: bottom-front corner of the head strip tucks up inside; rump: top-rear corner tucks in
const JY=+arg('jy',545),J0=[XA+ +arg('j0',20),YB],J1=[FX,JY];
S.fold({name:'jaw',p:J0,q:J1,m:[FX-4,YB-4],sel:f=>isHead(f)&&!isLeg(f),place:'inside',dir:-1,...tt('jaw'),tag:'jaw'});
S.fold({name:'rump',p:[125,450],q:[0,572],m:[3,453],sel:f=>!isLeg(f)&&!f.tags.has('door'),place:'inside',dir:-1,...tt('jaw'),tag:'rump'});
// head lowers: inside crimp pivoting on the back line
const Pn=[XA+ +arg('pn',25),450],a1=+arg('a1',75),TILT1=+arg('t1',32);
{const dp=ang=>[Pn[0]+Math.cos(R(ang))*400,Pn[1]+Math.sin(R(ang))*400];const A2=dp(a1),B2=dp(a1+TILT1/2),m0=[FX-20,460];
 S.fold({name:'tiltA',p:Pn,q:A2,m:m0,sel:f=>isHead(f)&&!isLeg(f),place:'inside',dir:-1,...tt('tilt'),tag:'tiltA'});
 S.fold({name:'tiltB',p:Pn,q:B2,m:reflPt(Pn,A2,m0),sel:f=>f.tags.has('tiltA'),place:'inside',dir:-1,crimp:true,...tt('tilt'),tag:'face'});}
const f1=x=>rotPt(Pn,TILT1,x);const face=f=>f.tags.has('face');
// ear: outside crimp on the head, two creases that meet above it; lifts the crown above the back line and drops the snout further
const EAR=+arg('ear',0);const thA=+arg('tha',10),thB=+arg('thb',4),XS=Pn[0]+ +arg('xs',72),EW=+arg('ew',55),TILT2=EAR?2*(thA-thB):0;
const As=[XS,450],Ab=[XS-300*Math.tan(R(thA)),YB],Bs=[XS+EW,450],Bb=[XS+EW-300*Math.tan(R(thB)),YB];
const uu=EW/(Math.tan(R(thA))-Math.tan(R(thB)));const V=[XS+Math.tan(R(thA))*uu,450-uu];
if(EAR){const m0=[FX-20,460];const p=f1(As),q=f1(Ab);
 S.fold({name:'earA',p,q,m:f1(m0),sel:f=>face(f)&&!isLeg(f),place:'outside',dir:1,...tt('ear'),tag:'earA'});
 S.fold({name:'earB',p:reflPt(p,q,f1(Bs)),q:reflPt(p,q,f1(Bb)),m:reflPt(p,q,f1(m0)),sel:f=>f.tags.has('earA'),place:'outside',dir:1,crimp:true,...tt('ear'),tag:'snout'});}
const fF=x=>f1(rotPt(V,TILT2,x));const snout=f=>f.tags.has(EAR?'snout':'face');
// nose: top-front corner reverse-folds in; feet: leg tips fold up on a common ground line
S.fold({name:'nose',p:fF([FX- +arg('nx',80),450]),q:fF([FX,450+ +arg('ny',55)]),m:fF([FX-3,453]),sel:f=>snout(f)&&!f.tags.has('jaw')&&!f.tags.has('door'),place:'inside',dir:-1,...tt('tip'),tag:'nose'});
const YG=YB+ +arg('yg',75);
for(const tg of LEGS)S.fold({name:tg+' foot',p:[0,YG],q:[1440,YG],m:[300,YG+200],sel:f=>f.tags.has(tg),place:tg.endsWith('N')?'inside':'outside',dir:-1,...tt('tip')});
const bad=S.check();
// camera: straight-on while folding; then a rigid paper-toy hop to the right, rocking on its feet
const T0=3.72,HB=0.21,NH=10,TA0=+arg('ta0',10),TA1=+arg('ta1',17),HOP=+arg('hop',24);const tilt=i=>(i%2?1:-1)*(TA0+(TA1-TA0)*i/NH);const hops=[];for(let i=0;i<=NH;i++)hops.push(+(T0+i*HB).toFixed(3));
const SC=0.56,CX=400,CY=620;const tx0=Math.round(-SC*(CX-720)),ty0=Math.round(-SC*(CY-450));
const cam={name:'Origami 2B · Bear (truly foldable)',x:0,y:4700,dur:+(hops[NH]+0.15).toFixed(2),lift:0.05,origin:[CX,YG],rx:[[0,0]],ry:[[0,0]],
 rz:[[0,0],[T0-0.12,0]].concat(hops.map((t,i)=>[t,+tilt(i).toFixed(1),'soft'])),
 sc:[[0,1],[0.45,0.62,'out'],[2.0,0.62],[2.6,SC]],
 tx:[[0,0],[1.2,0],[2.6,tx0],[T0,tx0]].concat(hops.slice(1).map((t,i)=>[t,tx0+Math.round(26*(i+1)+11.5*(i+1)*(i+1)),'soft'])),
 ty:[[0,0],[0.45,-10,'out'],[1.2,-10],[2.6,ty0],[T0,ty0]].concat(hops.slice(1).map((t,i)=>[t,ty0+(i%2?-3:-HOP),'soft'])),
 rot:[[0,0]],scrim:[[0,0],[0.45,0.72,'out'],[T0+0.7,0.72],[T0+1.9,0,'io']]};
S.finish(cam);
console.log('facets',S.facets.filter(f=>area(f.pts)>4).length,'| problems',bad,'| dur',cam.dur);
if(arg('audit',''))console.log('AUDIT',JSON.stringify(S.audit(T.tip[1]+0.05)));
const tex=fs.readFileSync('home.rgb');
if(arg('frames','')){arg('frames').split(',').map(Number).forEach((t,i)=>S.render(t,`bF_${i}.ppm`,{tex,scale:0.5}));}
{const pc={...cam,sc:[[0,1.25]],tx:[[0,400]],ty:[[0,-230]],rz:[[0,0]]};S.cam=pc;S.render(T.tip[1]+0.05,'bF_big.ppm',{tex,scale:1});S.render(T.tip[1]+0.05,(arg('out','bF')+'_sil.ppm'),{scale:0.5});S.cam=cam;}
if(arg('dance','')){arg('dance').split(',').map(Number).forEach((t,i)=>S.render(t,`${arg('out',fn0)}_d${i}.ppm`,{tex,scale:0.5}));}
fs.writeFileSync('bearF.json',JSON.stringify({cam,F:S.export()}));console.log('json bytes',fs.statSync('bearF.json').size);
