// REFERENCE-LOOK bear: follows the look of the Montroll diagram (long tapered legs in two pairs, ear, lowered head).
// The leg swing-out and the ear flip are choreography: they would tear real paper (the tear check reports them).
const {makeSim,R,DEG,cen,rotPt,reflPt,area}=require('./fold2.cjs');const fs=require('fs');
const S=makeSim();const fn0='bR';
const A=process.argv.slice(2);const arg=(k,d)=>{const i=A.indexOf('--'+k);return i<0?d:A[i+1];};
const near=f=>f.wall==='near',far=f=>f.wall==='far';
const LEGS=['legFN','legFF','legBN','legBF'];const isLeg=f=>LEGS.some(t=>f.tags.has(t));
const RX=500,YB=730,SH=900-YB,LEG=+arg('leg',140),YG=YB+LEG;
const T={hem:[.45,.75],spine:[.8,1.15],tuck:[1.2,1.45],legs:[1.5,1.85],rear:[1.9,2.22],thinA:[1.9,2.1],thinB:[2.12,2.32],neck:[2.27,2.62],rump:[2.67,2.93],jaw:[2.67,2.93],earP:[2.98,3.26],ear:[3.3,3.56],tip:[3.32,3.52],feet:[2.36,2.6]};
const tt=k=>({t0:T[k][0],t1:T[k][1]});
// 0 rear hem: the left end folds behind so the rear leg strips are short
const RH=+arg('rh',240);S.fold({name:'hem',p:[RH,0],q:[RH,900],m:[10,450],place:'behind',dir:-1,...tt('hem'),tag:'hem'});
// 1 spine
S.fold({name:'spine',p:[0,450],q:[1440,450],m:[700,100],place:'spine',dir:-1,...tt('spine')});
// 3 belly strip tucks up inside
S.fold({name:'tuck',p:[0,YB],q:[1440,YB],m:[700,800],place:'inside',dir:-1,...tt('tuck'),tag:'strip'});
// 4 legs swing down out of the tucked strip: front pair under the chest, rear pair under the rump
const strip=f=>f.tags.has('strip')&&!isLeg(f)&&!f.tags.has('hem');
const X0={legBN:RX,legBF:RX+ +arg('dbf',50),legFF:RX+ +arg('dff',300),legFN:RX+ +arg('dfn',370)};
const leg=(name,wallSel)=>{const front=name[3]==='F';const x=front?X0[name]+SH:X0[name];S.fold({name,p:[x,YB],q:front?[x-SH,YB-SH]:[x+SH,YB-SH],m:front?[1420,YB-100]:[20,YB-100],sel:f=>strip(f)&&wallSel(f),place:'inside',dir:-1,...tt('legs'),tag:name});};
leg('legFN',near);leg('legFF',far);leg('legBN',near);leg('legBF',far);
// 5 the rear third of the body tucks forward inside
S.fold({name:'rear',p:[RX,450],q:[RX,900],m:[100,500],sel:f=>!isLeg(f),place:'inside',dir:-1,...tt('rear'),tag:'rump'});
// 5b legs taper: rear edge folds in, then front edge
const pl=tg=>tg.endsWith('N')?'inside':'outside';
const TW=+arg('tw',106),BW=+arg('bw',78);const o1=(SH-TW)-10,o2=o1+(TW-BW)/2;
for(const tg of LEGS){const x0=X0[tg];const sel=f=>f.tags.has(tg);
  S.fold({name:tg+' thin rear',p:[x0+o1,YB],q:[x0+o2,YG],m:[x0+2,YB+LEG*0.6],sel,place:pl(tg),dir:-1,...tt('thinA')});
  S.fold({name:tg+' thin front',p:[x0+o1+TW,YB],q:[x0+o2+BW,YG],m:[x0+SH-2,YB+LEG*0.6],sel,place:pl(tg),dir:-1,...tt('thinB')});}
// 6 neck crimp: head tilts down about N
const N=[RX+540,450],NECK=+arg('neck',30);
{const a=+arg('na',92),b=a+NECK/2;const dp=ang=>[N[0]+Math.cos(R(ang))*300,N[1]+Math.sin(R(ang))*300];const A2=dp(a),B2=dp(b),m0=[1420,470];
 S.fold({name:'neckA',p:N,q:A2,m:m0,sel:f=>!isLeg(f),place:'inside',dir:-1,...tt('neck'),tag:'neckA'});
 S.fold({name:'neckB',p:N,q:B2,m:reflPt(N,A2,m0),sel:f=>f.tags.has('neckA')&&!isLeg(f),place:'inside',dir:-1,crimp:true,...tt('neck'),tag:'head'});}
const hd=x=>rotPt(N,NECK,x);const head=f=>f.tags.has('head');
// 7 rump: top rear corner reverse-folds in
S.fold({name:'rump slope',p:[RX+ +arg('rx',130),450],q:[RX,450+ +arg('ry',125)],m:[RX+3,453],sel:f=>!isLeg(f)&&!head(f),place:'inside',dir:-1,...tt('rump'),tag:'rump2'});
// 8 jaw: lower front corner of the head tucks inside
const J1=[1440,+arg('jy',560)],J0=[+arg('jx',1120),YB];
S.fold({name:'jaw',p:hd(J1),q:hd(J0),m:hd([1436,YB-4]),sel:head,place:'inside',dir:-1,...tt('jaw'),tag:'jaw'});
// 9 ear pleat across the head (slanted parallel crimp) -> forehead step + hidden strip for the ear
const EA=55,EW=+arg('ew',30),C1p=[N[0]+42,450];const ed=[Math.cos(R(EA)),Math.sin(R(EA))];const C1q=[C1p[0]+ed[0]*340,C1p[1]+ed[1]*340];const nb=[-ed[1],ed[0]];
const C2p=[C1p[0]+nb[0]*EW,C1p[1]+nb[1]*EW],C2q=[C1q[0]+nb[0]*EW,C1q[1]+nb[1]*EW];
{const m0=[1420,470];
 S.fold({name:'earA',p:hd(C1p),q:hd(C1q),m:hd(m0),sel:head,place:'inside',dir:-1,...tt('earP'),tag:'earA'});
 S.fold({name:'earB',p:hd(C2p),q:hd(C2q),m:hd(reflPt(C1p,C1q,m0)),sel:f=>f.tags.has('earA'),place:'inside',dir:-1,crimp:true,...tt('earP'),tag:'face'});}
const sh=[nb[0]*2*EW,nb[1]*2*EW];const fc=x=>hd([x[0]+sh[0],x[1]+sh[1]]);const face=f=>f.tags.has('face');
// 10 ear: part of the hidden pleat strip flips up through the pleat
{const band=f=>f.tags.has('earA')&&!f.tags.has('face')&&!f.tags.has('jaw');const jd=[J0[0]-J1[0],J0[1]-J1[1]];const Ls=((J1[0]-C1p[0])*jd[1]-(J1[1]-C1p[1])*jd[0])/(ed[0]*jd[1]-ed[1]*jd[0]);const he=+arg('he',42),dE=(Ls-he)/2;console.log('pleat length',Ls.toFixed(0));
 const e0=[C1p[0]+ed[0]*dE,C1p[1]+ed[1]*dE],e1=[e0[0]+nb[0]*100,e0[1]+nb[1]*100],mm=[C1p[0]+ed[0]*(Ls-20)+nb[0]*EW/2,C1p[1]+ed[1]*(Ls-20)+nb[1]*EW/2];
 S.fold({name:'ear',p:hd(e0),q:hd(e1),m:hd(mm),sel:band,place:'inside',dir:1,...tt('ear'),tag:'ear'});}
// 11 nose: top front corner tucks in; feet: leg ends fold up on the ground line
S.fold({name:'nose',p:fc([1440- +arg('nx',50),450]),q:fc([1440,450+ +arg('ny',50)]),m:fc([1438,452]),sel:face,place:'inside',dir:-1,...tt('tip'),tag:'nose'});
for(const tg of LEGS)S.fold({name:tg+' foot',p:[0,YG],q:[1440,YG],m:[700,YG+400],sel:f=>f.tags.has(tg),place:pl(tg),dir:-1,...tt('feet')});
// gait: diagonal pairs swing; the body rocks on its feet and walks off to the right
const T0=3.76,HB=0.2,NH=11,TA0=+arg('ta0',9),TA1=+arg('ta1',15),HOP=+arg('hop',20);const tilt=i=>(i%2?1:-1)*(TA0+(TA1-TA0)*i/NH);const hops=[];for(let i=0;i<=NH;i++)hops.push(+(T0+i*HB).toFixed(3));
const sgn=f=>Math.sign(f.parent.A[0]*f.parent.A[3]-f.parent.A[1]*f.parent.A[2]);const AMP=+arg('amp',10);
for(const [tg,amp] of [['legFN',AMP],['legBF',AMP],['legFF',-AMP],['legBN',-AMP]]){const f=S.tagged(tg).reduce((a,b)=>S.depth(a)<=S.depth(b)?a:b);const s=sgn(f);f.sw=[[T0-0.15,0]].concat(hops.map((t,i)=>[t,(i%2?-amp:amp)*s]));}
const SC=0.56,CX=900,CY=650;const tx0=Math.round(-SC*(CX-720)),ty0=Math.round(-SC*(CY-450));
const cam={name:'Origami 2A · Bear (reference look)',x:0,y:3500,dur:+(hops[NH]+0.15).toFixed(2),lift:0.05,origin:[CX,YG],rx:[[0,0]],ry:[[0,0]],
 rz:[[0,0],[T0-0.12,0]].concat(hops.map((t,i)=>[t,+tilt(i).toFixed(1),'soft'])),
 sc:[[0,1],[0.45,0.62,'out'],[1.6,0.62],[2.5,SC]],
 tx:[[0,0],[1.6,0],[2.5,tx0],[T0,tx0]].concat(hops.slice(1).map((t,i)=>[t,tx0+Math.round(22*(i+1)+7.2*(i+1)*(i+1)),'soft'])),
 ty:[[0,0],[0.45,-10,'out'],[1.2,-10],[2.5,ty0],[T0,ty0]].concat(hops.slice(1).map((t,i)=>[t,ty0+(i%2?-3:-HOP),'soft'])),
 rot:[[0,0]],scrim:[[0,0],[0.45,0.72,'out'],[T0+0.7,0.72],[T0+1.9,0,'io']]};
S.finish(cam);
console.log('facets',S.facets.filter(f=>area(f.pts)>4).length,'| dur',cam.dur);
if(arg('audit',''))console.log('AUDIT',JSON.stringify(S.audit(T.ear[1]+0.05)));
const tex=fs.readFileSync('home.rgb');const out=arg('out','bR');
if(arg('frames','')){arg('frames').split(',').map(Number).forEach((t,i)=>S.render(t,`${out}_${i}.ppm`,{tex,scale:0.5}));}
{const pc={...cam,sc:[[0,1.25]],tx:[[0,-225]],ty:[[0,-250]],rz:[[0,0]]};S.cam=pc;const tE=T.tip[1]+0.05;S.render(tE,out+'_big.ppm',{tex,scale:1});S.render(tE,out+'_sil.ppm',{scale:0.5});
 if(arg('gait','')){S.render(T0+HB,out+'_g1.ppm',{scale:0.5});S.render(T0+2*HB,out+'_g2.ppm',{scale:0.5});}S.cam=cam;}
if(arg('dance','')){arg('dance').split(',').map(Number).forEach((t,i)=>S.render(t,`${arg('out',fn0)}_d${i}.ppm`,{tex,scale:0.5}));}
fs.writeFileSync('bearR.json',JSON.stringify({cam,F:S.export()}));console.log('json bytes',fs.statSync('bearR.json').size);
