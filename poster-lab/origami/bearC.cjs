// INTRICATE bear (C): bear A plus the visible folds of the Montroll diagram (haunch, shoulder, face crimp, bigger ear, feet).
// REFERENCE-LOOK bear: follows the look of the Montroll diagram (long tapered legs in two pairs, ear, lowered head).
// The leg swing-out and the ear flip are choreography: they would tear real paper (the tear check reports them).
const {makeSim,R,DEG,cen,rotPt,reflPt,area}=require('./fold2.cjs');const fs=require('fs');
const S=makeSim();const fn0='bC';
const A=process.argv.slice(2);const arg=(k,d)=>{const i=A.indexOf('--'+k);return i<0?d:A[i+1];};
// stayPre: a part that stays put while its parent turns must aim at where it sat before the fold (else the front hem flaps go round a full
// 360 through the legs during the leg swing and the foot fold). ZE: layers 0.25px apart instead of 2 - at 2 the stack was 168px deep, and
// under the stage's 2000px perspective the near front leg hung 40px below the back feet and its folds strayed sideways mid-fold.
// --persp 2000 previews with that perspective (the offline renderer is otherwise orthographic and hides both problems).
S.stayPre=!+arg('nostaypre',0);if(+arg('persp',0))S.persp=+arg('persp');S.ZE=+arg('ze',0.25);
const near=f=>f.wall==='near',far=f=>f.wall==='far';
const LEGS=['legFN','legFF','legBN','legBF'];const isLeg=f=>LEGS.some(t=>f.tags.has(t));
const RX=500,YB=730,SH=900-YB,LEG=+arg('leg',140),YG=YB+LEG;
const SHO=+arg('sho',6),Sp=[+arg('sx',880),450];
// ground line per leg. The shoulder crimp (last fold) turns the whole front by SHO about Sp, so the front feet fold on the line that
// LANDS on the ground after that turn; --gfn/--gff lift a front foot a little more to cancel what is left of the perspective.
const GLIFT={legFN:+arg('gfn',3),legFF:+arg('gff',1)};
const gnd=tg=>{if(tg[3]!=='F'||!SHO||!+arg('gfix',1))return x=>x;const l=GLIFT[tg]||0;return x=>rotPt(Sp,-SHO,[x[0],x[1]-l]);};
// timeline: folds that do not depend on each other run together (legs + rear, both leg edges + neck + haunch, feet + jaw, ...); ears are quick
const T={hem:[.45,.72],spine:[.74,1.04],tuck:[1.06,1.3],fhem:[1.06,1.3],legs:[1.32,1.6],rear:[1.36,1.66],thinA:[1.62,1.84],thinB:[1.66,1.88],hflap:[1.68,1.9],neck:[1.62,1.9],hock:[1.9,2.1],feet:[2.0,2.2],toe:[2.2,2.38],jaw:[1.92,2.12],neck2:[2.12,2.34],rump:[2.12,2.34],tail:[2.24,2.42],earP:[2.22,2.38],face:[2.38,2.56],ear:[2.38,2.54],tip:[2.4,2.54],sho:[2.4,2.62]};
// The small head folds (ear pleat, ear, face, nose) barely move the picture, so with the shoulder fold waiting for them the bear looked at rest
// for ~0.5s before the head and front turned into the body. They now ride with the toes / second neck fold, and the shoulder fold starts with
// the ear flip (the head folds are carried by it; no piece is driven by two folds at once). Old timing: --T 'tail:2.36-2.54,earP:2.34-2.5,face:2.5-2.68,ear:2.5-2.66,tip:2.54-2.68,sho:2.7-2.92'
// --T 'sho:2.44-2.66,ear:2.38-2.54' overrides single entries of the timeline (timing trials)
if(arg('T',''))for(const kv of arg('T').split(',')){const [k,v]=kv.split(':');if(!T[k])throw new Error('no fold '+k);T[k]=v.split('-').map(Number);}
const tt=k=>({t0:T[k][0],t1:T[k][1]});
// 0 rear hem: the left end folds behind so the rear leg strips are short
const RH=+arg('rh',340);S.fold({name:'hem',p:[RH,0],q:[RH,900],m:[10,450],place:'behind',dir:-1,...tt('hem'),tag:'hem'});
// 1 spine
S.fold({name:'spine',p:[0,450],q:[1440,450],m:[700,100],place:'spine',dir:-1,...tt('spine')});
// 3 belly strip tucks up inside
S.fold({name:'tuck',p:[0,YB],q:[1440,YB],m:[700,800],place:'inside',dir:-1,...tt('tuck'),tag:'strip'});
const strip=f=>f.tags.has('strip')&&!isLeg(f)&&!f.tags.has('hem');
const X0={legBN:RX,legBF:RX+ +arg('dbf',50),legFF:RX+ +arg('dff',300),legFN:RX+ +arg('dfn',370)};
// 3b front hem: the front end of each tucked strip folds back on itself as the strip tucks, so the front leg strips are exactly as long as
// the rear ones (the rear hem already shortens those). Without it the front legs swing down 400px long and only shorten at the foot fold.
if(+arg('fhem',1))for(const [fr,bk,ws] of [['legFN','legBN',near],['legFF','legBF',far]]){const XH=X0[fr]+SH+(X0[bk]-RH);const nr=ws===near;
 // the flap lies on the strip's underside (between the strip and its own wall), so the leg still shows the page once it swings down
 const place=(ord,mv)=>{const rest=ord.filter(f=>!mv.has(f)),m2=ord.filter(f=>mv.has(f)).reverse();const ix=rest.map((f,i)=>f.tags.has('strip')&&ws(f)?i:-1).filter(i=>i>=0);rest.splice(nr?Math.max(...ix)+1:Math.min(...ix),0,...m2);return rest;};
 S.fold({name:'front hem '+fr,p:[XH,0],q:[XH,900],m:[1436,YB-80],sel:f=>strip(f)&&ws(f),place,dir:nr?1:-1,...tt('fhem'),tag:'fhem'});}
// 4 legs swing down out of the tucked strip: front pair under the chest, rear pair under the rump
const leg=(name,wallSel)=>{const front=name[3]==='F';const x=front?X0[name]+SH:X0[name];S.fold({name,p:[x,YB],q:front?[x-SH,YB-SH]:[x+SH,YB-SH],m:front?[1420,YB-100]:[20,YB-100],sel:f=>strip(f)&&wallSel(f),place:'inside',dir:-1,...tt('legs'),tag:name});};
leg('legFN',near);leg('legFF',far);leg('legBN',near);leg('legBF',far);
// 5 the rear third of the body tucks forward inside
const HA=+arg('ha',0),HBk=+arg('hb',0),HOUT=+arg('hout',1);const hq=[RX+HA+(-HBk-HA)*(450/280),900];
S.fold({name:'rear',p:[RX+HA,450],q:hq,m:[100,500],sel:f=>!isLeg(f),place:HOUT?'outside':'inside',dir:HOUT?1:-1,...tt('rear'),tag:'rump'});
// haunch flap: the top-front corner of the wrapped rear panel folds down over it (a diagonal across the hindquarter)
const PW=RX-RH,HF1=+arg('hf1',30),HF2=+arg('hf2',170);
if(HOUT&&HF2)S.fold({name:'haunch flap',p:[RX+HF1,450],q:[RX+PW+ +arg('hf3',0),450+HF2],m:[RX+PW-4,454],sel:f=>f.tags.has('rump')&&!isLeg(f),place:'outside',dir:1,...tt('hflap'),tag:'hflap'});
// 5b legs taper: rear edge folds in, then front edge
const pl=tg=>tg.endsWith('N')?'inside':'outside';
const TW=+arg('tw',84),BW=+arg('bw',58);const o1=(SH-TW)-10,o2=o1+(TW-BW)/2;
for(const tg of LEGS){const x0=X0[tg];const sel=f=>f.tags.has(tg);
  S.fold({name:tg+' thin rear',p:[x0+o1,YB],q:[x0+o2,YG],m:[x0+2,YB+LEG*0.6],sel,place:pl(tg),dir:-1,...tt('thinA')});
  S.fold({name:tg+' thin front',p:[x0+o1+TW,YB],q:[x0+o2+BW,YG],m:[x0+SH-2,YB+LEG*0.6],sel,place:pl(tg),dir:-1,...tt('thinB')});}
// The folds below are written in the order they START (neck, hock, jaw, feet, neck 2 + rump, toes, ear pleat, tail, ear, face, nose, shoulder).
// Layer heights are stored per fold and played back per fold, so a fold written early but played late leaves a layer at a stale height for a
// moment (the neck pleat used to flash through the chest at 1.9s because the hock, written before it, had not yet lifted the body wall).
// 6 neck crimp: head tilts down about N
const N=[RX+540,450],NECK=+arg('neck',11),NECK2=+arg('neck2',6);
{const a=+arg('na',92),b=a+NECK/2;const dp=ang=>[N[0]+Math.cos(R(ang))*300,N[1]+Math.sin(R(ang))*300];const A2=dp(a),B2=dp(b),m0=[1420,470];
 S.fold({name:'neckA',p:N,q:A2,m:m0,sel:f=>!isLeg(f),place:'inside',dir:-1,...tt('neck'),tag:'neckA'});
 S.fold({name:'neckB',p:N,q:B2,m:reflPt(N,A2,m0),sel:f=>f.tags.has('neckA')&&!isLeg(f),place:'inside',dir:-1,crimp:true,...tt('neck'),tag:'head'});}
let hd=x=>rotPt(N,NECK,x);let head=f=>f.tags.has('head');
// 5c hock: the lower hind leg crimps forward about a point on its rear edge (bent ankle)
const HOCK=+arg('hock',14),HKY=+arg('hky',0.5),HKA=+arg('hka',10);const kr={};
for(const tg of LEGS){kr[tg]=x=>x;if(!HOCK||tg[3]!=='B')continue;const x0=X0[tg];const K=[x0+o1+(o2-o1)*HKY,YB+LEG*HKY];
  const dp=ang=>[K[0]+Math.cos(R(ang))*200,K[1]+Math.sin(R(ang))*200];const A2=dp(HKA),B2=dp(HKA-HOCK/2),m0=[K[0]+20,YG+10];
  S.fold({name:tg+' hockA',p:K,q:A2,m:m0,sel:f=>f.tags.has(tg),place:pl(tg),dir:-1,...tt('hock'),tag:'hk'+tg});
  S.fold({name:tg+' hockB',p:K,q:B2,m:reflPt(K,A2,m0),sel:f=>f.tags.has('hk'+tg),place:pl(tg),dir:-1,crimp:true,...tt('hock'),tag:'low'+tg});
  kr[tg]=x=>rotPt(K,-HOCK,x);}
// 8 jaw: the whole lower front of the head tucks inside (before the second neck crimp, so nothing hangs below the chest)
const J1=[1440,+arg('jy',600)],J0=[+arg('jx',1060),YB];
S.fold({name:'jaw',p:hd(J1),q:hd(J0),m:hd([1436,YB-4]),sel:head,place:'inside',dir:-1,...tt('jaw'),tag:'jaw'});
for(const tg of LEGS){const G=gnd(tg);S.fold({name:tg+' foot',p:G([0,YG]),q:G([1440,YG]),m:G([700,YG+400]),sel:f=>f.tags.has(tg),place:pl(tg),dir:-1,...tt('feet')});}
if(NECK2){const a=+arg('na2',66),b=a+NECK2/2;const dp=ang=>hd([N[0]+Math.cos(R(ang))*300,N[1]+Math.sin(R(ang))*300]);const A2=dp(a),B2=dp(b),m0=hd([1420,470]);const h1=head;
 S.fold({name:'neck2A',p:N,q:A2,m:m0,sel:f=>h1(f)&&!isLeg(f),place:'inside',dir:-1,...tt('neck2'),tag:'n2A'});
 S.fold({name:'neck2B',p:N,q:B2,m:reflPt(N,A2,m0),sel:f=>f.tags.has('n2A')&&!isLeg(f),place:'inside',dir:-1,crimp:true,...tt('neck2'),tag:'head2'});
 hd=x=>rotPt(N,NECK+NECK2,x);head=f=>f.tags.has('head2');}
// 7 rump: top rear corner reverse-folds in
if(!+arg('norump',0))S.fold({name:'rump slope',p:[RX+ +arg('rx',90),450],q:[RX,450+ +arg('ry',90)],m:[RX+3,453],sel:f=>!isLeg(f)&&!head(f),place:'inside',dir:-1,...tt('rump'),tag:'rump2'});
const FH=+arg('fh',46),FWt=+arg('fwt',40);
if(FH)for(const tg of LEGS){const xr=X0[tg]+o2;const nr=tg.endsWith('N');const g=kr[tg],gx=g([xr,YG])[0]+(g([xr,YG])[1]<YG?(YG-g([xr,YG])[1])*0.3:0);
 let p=g([xr-(o2-o1)*FH/LEG,YG-FH]),q=[gx+FWt,YG],m=[gx+3,YG-3];
 if(tg[3]==='F'){ // front paw: same corner, measured from where the leg's rear edge meets this leg's own (tilted) ground line
  const G=gnd(tg),a=G([0,YG]),b=G([1440,YG]),E1=[X0[tg]+o1,YB],E2=[xr,YG];const gd=[(b[0]-a[0])/1440,(b[1]-a[1])/1440],ed=[(E1[0]-E2[0])/LEG,(E1[1]-E2[1])/LEG];
  const den=ed[0]*gd[1]-ed[1]*gd[0];const s=((a[0]-E2[0])*gd[1]-(a[1]-E2[1])*gd[0])/den;const C=[E2[0]+ed[0]*s,E2[1]+ed[1]*s];const up=[gd[1],-gd[0]];
  p=[C[0]+ed[0]*FH,C[1]+ed[1]*FH];q=[C[0]+gd[0]*FWt,C[1]+gd[1]*FWt];m=[C[0]+gd[0]*3+up[0]*3,C[1]+gd[1]*3+up[1]*3];}
 S.fold({name:tg+' toe',p,q,m,sel:f=>f.tags.has(tg),place:nr?'front':'behind',dir:nr?1:-1,...tt('toe')});}
// 9 ear pleat across the head (slanted parallel crimp) -> forehead step + hidden strip for the ear
const EA=55,EW=+arg('ew',26),C1p=[N[0]+42,450];const ed=[Math.cos(R(EA)),Math.sin(R(EA))];const C1q=[C1p[0]+ed[0]*340,C1p[1]+ed[1]*340];const nb=[-ed[1],ed[0]];
const C2p=[C1p[0]+nb[0]*EW,C1p[1]+nb[1]*EW],C2q=[C1q[0]+nb[0]*EW,C1q[1]+nb[1]*EW];
{const m0=[1420,470];
 S.fold({name:'earA',p:hd(C1p),q:hd(C1q),m:hd(m0),sel:head,place:'inside',dir:-1,...tt('earP'),tag:'earA'});
 S.fold({name:'earB',p:hd(C2p),q:hd(C2q),m:hd(reflPt(C1p,C1q,m0)),sel:f=>f.tags.has('earA'),place:'inside',dir:-1,crimp:true,...tt('earP'),tag:'face'});}
const sh=[nb[0]*2*EW,nb[1]*2*EW];const fc=x=>hd([x[0]+sh[0],x[1]+sh[1]]);const face=f=>f.tags.has('face');
// 7b tail: part of the tucked rump corner folds back out past the slope
const TAIL=+arg('tail',1);
if(TAIL&&!+arg('norump',0)){const p=[RX+ +arg('rx',90),450],q=[RX,450+ +arg('ry',90)];const tip=reflPt(p,q,[RX,450]);const L=Math.hypot(q[0]-p[0],q[1]-p[1]);let n=[-(q[1]-p[1])/L,(q[0]-p[0])/L];if((tip[0]-p[0])*n[0]+(tip[1]-p[1])*n[1]<0)n=[-n[0],-n[1]];
 const tsl=+arg('tsl',0);const p2=[p[0]+n[0]*TAIL+(q[0]-p[0])/L*tsl,p[1]+n[1]*TAIL+(q[1]-p[1])/L*tsl];const q2=rotPt(p2,+arg('tang',-16),[q[0]+n[0]*TAIL,q[1]+n[1]*TAIL]);
 S.fold({name:'tail',p:p2,q:q2,m:tip,sel:f=>f.tags.has('rump2')&&(+arg('tall',0)||!f.tags.has('rump')&&!f.tags.has('hem')),place:'inside',dir:1,...tt('tail'),tag:'tail'});}
// 10 ear: part of the hidden pleat strip flips up through the pleat
{const band=f=>f.tags.has('earA')&&!f.tags.has('face')&&!f.tags.has('jaw');const jd=[J0[0]-J1[0],J0[1]-J1[1]];const Ls=((J1[0]-C1p[0])*jd[1]-(J1[1]-C1p[1])*jd[0])/(ed[0]*jd[1]-ed[1]*jd[0]);const he=+arg('he',46),dE=(Ls-he)/2;console.log('pleat length',Ls.toFixed(0));
 const e0=[C1p[0]+ed[0]*dE,C1p[1]+ed[1]*dE],e1=[e0[0]+nb[0]*100,e0[1]+nb[1]*100],mm=[C1p[0]+ed[0]*(Ls-20)+nb[0]*EW/2,C1p[1]+ed[1]*(Ls-20)+nb[1]*EW/2];
 S.fold({name:'ear',p:hd(e0),q:hd(e1),m:hd(mm),sel:band,place:'inside',dir:1,...tt('ear'),tag:'ear'});}
// 10b face crimp: the muzzle steps down out of the forehead (two creases meeting above the head)
const FACE=+arg('face',1),thA=+arg('fta',6),thB=+arg('ftb',2),XF=1440- +arg('fx',120),FW2=+arg('fw',14),TILT3=FACE?2*(thA-thB):0;
const Fs=[XF,450],Fb=[XF-300*Math.tan(R(thA)),750],Gs=[XF+FW2,450],Gb=[XF+FW2-300*Math.tan(R(thB)),750];
const uu=FW2/(Math.tan(R(thA))-Math.tan(R(thB)));const Vf=[XF+Math.tan(R(thA))*uu,450-uu];
if(FACE){const m0=[1436,470];const p=fc(Fs),q=fc(Fb);
 S.fold({name:'faceA',p,q,m:fc(m0),sel:f=>face(f)&&!isLeg(f),place:'inside',dir:-1,...tt('face'),tag:'faceA'});
 S.fold({name:'faceB',p:reflPt(p,q,fc(Gs)),q:reflPt(p,q,fc(Gb)),m:reflPt(p,q,fc(m0)),sel:f=>f.tags.has('faceA'),place:'inside',dir:-1,crimp:true,...tt('face'),tag:'snout'});}
const fS=x=>fc(rotPt(Vf,TILT3,x));const snout=f=>f.tags.has(FACE?'snout':'face');
// 11 nose: top front corner tucks in; feet: leg ends fold up on the ground line, then the heel corner folds forward into a paw
S.fold({name:'nose',p:fS([1440- +arg('nx',50),450]),q:fS([1440,450+ +arg('ny',50)]),m:fS([1438,452]),sel:snout,place:'inside',dir:-1,...tt('tip'),tag:'nose'});
// 12 shoulder: outside crimp from the back line to behind the front legs; the whole front overlaps the body as a shoulder panel
if(SHO){const SAn=+arg('sa',104);const dp=ang=>[Sp[0]+Math.cos(R(ang))*420,Sp[1]+Math.sin(R(ang))*420];const A2=dp(SAn),B2=dp(SAn+SHO/2),m0=[1100,700];
 S.fold({name:'shoulderA',p:Sp,q:A2,m:m0,place:'outside',dir:1,...tt('sho'),tag:'shA'});
 S.fold({name:'shoulderB',p:Sp,q:B2,m:reflPt(Sp,A2,m0),sel:f=>f.tags.has('shA'),place:'outside',dir:1,crimp:true,...tt('sho'),tag:'shoulder'});}
// gait: diagonal pairs swing; the body rocks on its feet and walks off to the right
const T0=+(T.sho[1]+0.18).toFixed(2),HB=0.2,NH=11,TA0=+arg('ta0',9),TA1=+arg('ta1',15),HOP=+arg('hop',20);const tilt=i=>(i%2?1:-1)*(TA0+(TA1-TA0)*i/NH);const hops=[];for(let i=0;i<=NH;i++)hops.push(+(T0+i*HB).toFixed(3));
const sgn=f=>Math.sign(f.parent.A[0]*f.parent.A[3]-f.parent.A[1]*f.parent.A[2]);const AMP=+arg('amp',10);
for(const [tg,amp] of [['legFN',AMP],['legBF',AMP],['legFF',-AMP],['legBN',-AMP]]){const f=S.tagged(tg).reduce((a,b)=>S.depth(a)<=S.depth(b)?a:b);const s=sgn(f);f.sw=[[T0-0.15,0]].concat(hops.map((t,i)=>[t,(i%2?-amp:amp)*s]));}
const SC=0.56,CX=900,CY=650,CM0=+arg('cm0',1.35),CM1=+arg('cm1',2.2);const tx0=Math.round(-SC*(CX-720)),ty0=Math.round(-SC*(CY-450));
const cam={name:'Origami 2C · Bear (intricate)',x:0,y:8400,dur:+(hops[NH]+0.25).toFixed(2),lift:0.05,origin:[CX,YG],rx:[[0,0]],ry:[[0,0]],
 rz:[[0,0],[T0-0.12,0]].concat(hops.map((t,i)=>[t,+tilt(i).toFixed(1),'soft'])),
 sc:[[0,1],[0.45,0.62,'out'],[CM0,0.62],[CM1,SC]],
 tx:[[0,0],[CM0,0],[CM1,tx0],[T0,tx0]].concat(hops.slice(1).map((t,i)=>[t,tx0+Math.round(22*(i+1)+7.2*(i+1)*(i+1)),'soft'])),
 ty:[[0,0],[0.45,-10,'out'],[1.06,-10],[CM1,ty0],[T0,ty0]].concat(hops.slice(1).map((t,i)=>[t,ty0+(i%2?-3:-HOP),'soft'])),
 rot:[[0,0]],scrim:[[0,0],[0.45,0.72,'out'],[T0+1.1,0.72],[T0+2.3,0,'io']]}; // scrim held 0.4s longer (was T0+0.7 .. T0+1.9) so the page stays washed until the bear is off
S.toneK=+arg('tk',0.08);S.toneCap=+arg('tc',0.26);S.finish(cam);
for(const f of S.tagged('tail'))f.tone=f.tone.map(v=>Math.min(v,0.05)); // the tail is mostly tucked, but its visible tip must not go grey
console.log('facets',S.facets.filter(f=>area(f.pts)>4).length,'| dur',cam.dur);
if(arg('audit',''))console.log('AUDIT',JSON.stringify(S.audit(T.sho[1]+0.05)));
const tex=fs.readFileSync('home.rgb');const out=arg('out','bC');
if(arg('frames','')){arg('frames').split(',').map(Number).forEach((t,i)=>S.render(t,`${out}_${i}.ppm`,{tex,scale:0.5}));}
if(arg('head','')){const pc={...cam,sc:[[0,2.6]],tx:[[0,-1350]],ty:[[0,-420]],rz:[[0,0]]};S.cam=pc;S.render(T.ear[1]+0.05,out+'_head.ppm',{tex,scale:0.75});S.cam=cam;}
{const pc={...cam,sc:[[0,1.25]],tx:[[0,-225]],ty:[[0,-250]],rz:[[0,0]]};S.cam=pc;const tE=T.sho[1]+0.05;S.render(tE,out+'_big.ppm',{tex,scale:1});S.render(tE,out+'_sil.ppm',{scale:0.5});
 if(arg('gait','')){S.render(T0+HB,out+'_g1.ppm',{scale:0.5});S.render(T0+2*HB,out+'_g2.ppm',{scale:0.5});}S.cam=cam;}
// --zoom t1,t2,.. --zc cx,cy,scale : close-ups of one area (sheet coords) with the camera held still, for checking silhouettes
if(arg('zoom','')){const [zx,zy,zs]=arg('zc','940,800,3').split(',').map(Number);const pc={...cam,sc:[[0,zs]],tx:[[0,-(zx-720)*zs]],ty:[[0,-(zy-450)*zs]],rz:[[0,0]]};S.cam=pc;if(+arg('ztrue',0)){S.cam=cam;S.zoomF=[zx,zy,zs];}arg('zoom').split(',').map(Number).forEach((t,i)=>{S.render(t,`${out}_z${i}.ppm`,{tex,scale:+arg('zr',0.5)});if(+arg('zsil',0))S.render(t,`${out}_zs${i}.ppm`,{scale:+arg('zr',0.5)});});S.cam=cam;}
if(arg('dance','')){arg('dance').split(',').map(Number).forEach((t,i)=>S.render(t,`${arg('out',fn0)}_d${i}.ppm`,{tex,scale:0.5}));}
fs.writeFileSync('bearC.json',JSON.stringify({cam,F:S.export()}));console.log('json bytes',fs.statSync('bearC.json').size);
// --dbg t0,t1 --dtag legFF : which pieces of a leg stray from their path during a fold window
if(arg('dbg','')){const [ta,tb]=arg('dbg').split(',').map(Number);const tg=arg('dtag','legFF');const cam0={...cam,sc:[[0,1]],tx:[[0,0]],ty:[[0,0]],rz:[[0,0]]};S.cam=cam0;
 const fsx=S.facets.filter(f=>area(f.pts)>4&&f.tags.has(tg));const rows=[];
 for(const f of fsx){const c=cen(f.pts);let mxd=0,at=0,pos=null;const end=S.xf(tb)(f).fn(c[0],c[1]);const st=S.xf(ta)(f).fn(c[0],c[1]);for(let i=0;i<=20;i++){const t=ta+(tb-ta)*i/20;const p=S.xf(t)(f).fn(c[0],c[1]);const u=i/20;const lin=[st[0]+(end[0]-st[0])*u,st[1]+(end[1]-st[1])*u];const d=Math.hypot(p[0]-lin[0],p[1]-lin[1],p[2]);if(d>mxd){mxd=d;at=t;pos=p;}}
  rows.push({id:f.id,par:f.parent&&f.parent.id,depth:S.depth(f),tags:[...f.tags].join('+'),area:Math.round(area(f.pts)),st:st.map(Math.round),end:end.map(Math.round),dev:Math.round(mxd),at:+at.toFixed(2),pos:pos&&pos.map(Math.round),tr:JSON.stringify(f.track.filter(k=>k[0]>=ta-0.01&&k[0]<=tb+0.01))});}
 rows.sort((a,b)=>b.dev-a.dev);for(const r of rows)console.log(JSON.stringify(r));S.cam=cam;}
// --zstat t : layer height range per leg / wall;  --feet t1,t2 : where each foot bottoms out (add --persp 2000 for what Figma shows)
if(arg('zstat','')){const t=+arg('zstat');const grp={};for(const f of S.facets){if(area(f.pts)<4)continue;const k=LEGS.find(tg=>f.tags.has(tg))||('body-'+f.wall);const z=S.offsetAt(f,t);const sg=Math.sign(f.A[0]*f.A[3]-f.A[1]*f.A[2]);const zw=z*sg;(grp[k]=grp[k]||[]).push(zw);}
 for(const k in grp){const v=grp[k];console.log('Z',k,'n',v.length,'min',Math.min(...v),'max',Math.max(...v));}console.log('steps zTop',S.steps[S.steps.length-1].zTop);}
if(arg('feet','')){for(const t of arg('feet').split(',').map(Number)){const cam0={...cam,sc:[[0,1]],tx:[[0,0]],ty:[[0,0]],rz:[[0,0]]};S.cam=cam0;const xf=S.xf(t);const o=[];for(const tg of LEGS){let my=-1e9,mx=0,mnx=1e9,mxx=-1e9;for(const f of S.tagged(tg)){if(area(f.pts)<4)continue;const fn=xf(f).fn;for(const p of f.pts){const q=fn(p[0],p[1]);if(q[1]>my){my=q[1];mx=q[0];}if(q[1]>YB+20){mnx=Math.min(mnx,q[0]);mxx=Math.max(mxx,q[0]);}}}o.push(tg+' bottom y '+my.toFixed(1)+' @x '+mx.toFixed(0)+' | x '+mnx.toFixed(0)+'..'+mxx.toFixed(0));}console.log('FEET t='+t+'\n  '+o.join('\n  '));S.cam=cam;}}
// --pick t,x,y : which pieces cover sheet-space point (x,y) at time t, front to back (camera held at identity)
if(arg('pick','')){const [t,X,Y]=arg('pick').split(',').map(Number);const cam0={...cam,sc:[[0,1]],tx:[[0,0]],ty:[[0,0]],rz:[[0,0]]};S.cam=cam0;const xf=S.xf(t);const hits=[];
 for(const f of S.facets){if(area(f.pts)<4)continue;const {fn,nz}=xf(f);const P=f.pts.map(p=>fn(p[0],p[1]));let sg=0,ins=true;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];const c=(b[0]-a[0])*(Y-a[1])-(b[1]-a[1])*(X-a[0]);if(Math.abs(c)<1e-9)continue;if(!sg)sg=Math.sign(c);else if(Math.sign(c)!==sg){ins=false;break;}}
  if(ins){const z=P.reduce((s,p)=>s+p[2],0)/P.length;hits.push({id:f.id,z:+z.toFixed(2),nz:+nz.toFixed(2),o:+S.offsetAt(f,t).toFixed(2),wall:f.wall,tags:[...f.tags].join('+'),tr:JSON.stringify(f.track.slice(-3))});}}
 hits.sort((a,b)=>b.z-a.z);for(const h of hits.slice(0,8))console.log(JSON.stringify(h));S.cam=cam;}
