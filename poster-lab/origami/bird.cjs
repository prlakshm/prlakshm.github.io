// BIRD (instructables.com/Origami-Paper-Bird): square -> diagonal -> two wing flaps -> fold in half -> neck up -> beak.
// Then the wings spread, the bird turns to a three-quarter view and flies off to the right:
// wings beating, on a swooping wave path, banking nose-down on the dips and nose-up on the climbs.
const {makeSim,R,DEG,cen,rotPt,reflPt,area}=require('./fold2.cjs');const fs=require('fs');
const S=makeSim();
const Ar=process.argv.slice(2);const arg=(k,d)=>{const i=Ar.indexOf('--'+k);return i<0?d:Ar[i+1];};
// timing (2026-11-20, her note 'bird is too long ... do some folds simultaneously'): the two wing flaps fold together, the body starts folding in half
// while they land, and the wings start to spread while the beak is still folding. `--pace slow` is the old one-fold-at-a-time table.
const T=arg('pace','fast')==='slow'?{strip:[.45,.78],diag:[.84,1.24],w1:[1.3,1.62],w2:[1.66,1.98],half:[2.04,2.42],neck:[2.48,2.84],beak:[2.9,3.16],spread:[3.24,3.74]}
 :{strip:[.40,.64],diag:[.67,.97],w1:[1.00,1.27],w2:[1.03,1.30],half:[1.24,1.56],neck:[1.59,1.87],beak:[1.89,2.10],spread:[1.93,2.37]};
const HOLD=+arg('hold',arg('pace','fast')==='slow'?0.3:0.16);
const tt=k=>({t0:T[k][0],t1:T[k][1]});
const X0=270,X1=1170;
// 0 the page is wider than a square: both side strips fold behind
S.fold({name:'stripL',p:[X0,0],q:[X0,900],m:[10,450],place:'behind',dir:-1,...tt('strip'),tag:'strip'});
S.fold({name:'stripR',p:[X1,0],q:[X1,900],m:[1430,450],place:'behind',dir:-1,...tt('strip'),tag:'strip'});
// once they are behind the square they are never seen again: retire them so later folds do not have to carry them
const strips=S.facets.filter(f=>f.tags.has('strip'));for(const f of strips){f.hideAt=+(T.diag[0]-0.02).toFixed(3);S.facets.splice(S.facets.indexOf(f),1);const o=S.order;o.splice(o.indexOf(f),1);}
// 1 fold the square diagonally in half (upper-left half goes behind): triangle with the long folded edge from (270,900) to (1170,0)
S.fold({name:'diagonal',p:[X0,900],q:[X1,0],m:[X0+20,20],place:'behind',dir:-1,...tt('diag'),tag:'back'});
const A=[X1,900],M=[720,450],h=Math.hypot(A[0]-M[0],A[1]-M[1]);
const PHI=+arg('phi',27);const u=[0.7071,-0.7071];
const Q1=[M[0]+h*Math.tan(R(PHI))*u[0],M[1]+h*Math.tan(R(PHI))*u[1]],Q2=[M[0]-h*Math.tan(R(PHI))*u[0],M[1]-h*Math.tan(R(PHI))*u[1]];
// 2 wings: each acute corner folds over the front along a line from the apex
S.fold({name:'wing near',p:A,q:Q2,m:[X0+30,880],place:'front',dir:1,...tt('w1'),tag:'wingN'});
S.fold({name:'wing far',p:A,q:Q1,m:[X1-20,30],place:'front',dir:1,...tt('w2'),tag:'wingF'});
// 3 fold in half along the middle crease, wings outside
S.fold({name:'half',p:A,q:M,m:[1100,300],place:'spine',dir:-1,...tt('half')});
// keel frame: x runs back along the near wing crease from the apex, y is "up" (towards the ridge)
const kx=[(Q2[0]-A[0])/Math.hypot(Q2[0]-A[0],Q2[1]-A[1]),(Q2[1]-A[1])/Math.hypot(Q2[0]-A[0],Q2[1]-A[1])];let ky=[-kx[1],kx[0]];if((M[0]-A[0])*ky[0]+(M[1]-A[1])*ky[1]<0)ky=[-ky[0],-ky[1]];
const K=(x,y)=>[A[0]+x*kx[0]+y*ky[0],A[1]+x*kx[1]+y*ky[1]];const dirK=a=>[Math.cos(R(a)),Math.sin(R(a))];
// 4 neck: outside reverse fold, the front of the body turns up around the outside
const KQ=+arg('kq',0.57)*h,AL=+arg('alpha',131);const Nq=K(KQ,0);const dn=dirK(AL);const Nm=K(KQ+dn[0]*300,dn[1]*300);
const isWing=f=>f.tags.has('wingN')||f.tags.has('wingF');
{const mv=S.fold({name:'neck',p:Nq,q:Nm,m:K(40,8),place:'outside',dir:1,...tt('neck'),tag:'neck'});
 // the wing flap's tip belongs with the neck: hang it off the body's neck piece (across the wing crease) instead of off the wing
 for(const g of mv){if(!isWing(g))continue;const F=g.parent;if(!F||!isWing(F)||mv.has(F))continue;
   const b=[...mv].find(x=>!isWing(x)&&x.wall===g.wall&&x.tags.has('back')===g.tags.has('back'));if(!b){console.warn('!! no body neck piece for',g.id);continue;}
   g.parent=b;g.h={a:F.h.a.slice(),b:F.h.b.slice(),th:F.h.th};g.track=F.track.map(k=>k.slice());}}
const rN=x=>reflPt(Nq,Nm,x);const A2=rN(A);
// 5 beak: the tip of the neck reverse-folds forward
const BL=+arg('beak',0.3),GA=+arg('gamma',131);const Br=[Nq[0]+(A2[0]-Nq[0])*(1-BL),Nq[1]+(A2[1]-Nq[1])*(1-BL)];const dg=dirK(GA);const Bf=[Br[0]+dg[0]*200*kx[0]+dg[1]*200*ky[0],Br[1]+dg[0]*200*kx[1]+dg[1]*200*ky[1]];
S.fold({name:'beak',p:Br,q:Bf,m:[A2[0]+(Br[0]-A2[0])*0.15+kx[0]*-3,A2[1]+(Br[1]-A2[1])*0.15+kx[1]*-3],sel:f=>f.tags.has('neck'),place:'outside',dir:1,...tt('beak'),tag:'beak'});
const bad=S.check();
// 6 wings spread (rigid lift about the wing creases; real paper flexes a little at the neck)
const SP=+arg('spread',30);const wingRoots=[];
for(const f of S.facets){if(isWing(f)&&!f.tags.has('neck')&&f.h&&isWing(f)&&f.track.length){const v=f.track[f.track.length-1][1];if(Math.abs(Math.abs(v)-180)<1){f.track.push([T.spread[0],v]);f.track.push([T.spread[1],v*(180-SP)/180,'out']);wingRoots.push([f,v]);}}}
// bring the retired strips back for the export
for(const f of strips){const pad=a=>{const l=a.length?a[a.length-1]:0;while(a.length<S.steps.length)a.push(l);};while(f.hist.length<S.steps.length)f.hist.push(0);pad(f.zw);pad(f.oo);pad(f.kk);pad(f.cv);S.facets.push(f);}
// camera: straight-on while folding (only an in-plane roll to level the bird), then a three-quarter turn, then swivel right and out
const ROLL=-DEG(Math.atan2(-kx[1],-kx[0]));// angle that makes the keel horizontal with the head on the right
const SC=+arg('sc',0.58),O=K(0.62*h,0.2*h);const tx0=Math.round(-SC*(O[0]-720)),ty0=Math.round(40-SC*(O[1]-450));
const tH=+(T.spread[1]+HOLD).toFixed(3),FLY=+arg('fly',2.5),tE=tH+FLY;
// 7 flight (gentle, 2026-11-19: her note 'way too much'): wings beat slowly through a small arc (quick-ish downstroke, slower upstroke) from just before take-off until it is gone
// lift angles are measured from 'folded flat against the body' (0); 90 = wing level, more = below level
const RAISE=+arg('raise',58),DROP=+arg('drop',94),tD=+arg('td',0.26),tU=+arg('tu',0.34);const flapT=[];
{const keys=[[tH-0.14,SP],[tH,RAISE,'soft']];let t=tH,down=true;while(t<tE){t=+(t+(down?tD:tU)).toFixed(3);keys.push([t,down?DROP:RAISE,down?'io':'soft']);down=!down;}
 for(const [f,v] of wingRoots)for(const k of keys.slice(1)){f.track.push([k[0],+(v*(180-k[1])/180).toFixed(1),k[2]]);}
 for(const k of keys)flapT.push(k[0]);}
// the path: a shallow dip first, then two soft climbing waves; [seconds after take-off, px below(+)/above(-) the start height]
const AMP=+arg('amp',1);const WAVE=[[0.45,36],[1.0,-40],[1.5,4],[2.0,-64]].map(k=>[+(tH+k[0]*FLY/2).toFixed(3),Math.round(k[1]*AMP)]);
const BANK=+arg('bank',5);const bank=[];{let pt=tH,py=0;for(const [t,y] of WAVE){bank.push([+((pt+t)/2).toFixed(3),y>py?BANK*0.8:-BANK]);pt=t;py=y;}}
const cam={name:'Origami 5 · Bird',x:0,y:6000,dur:+(tE+0.15).toFixed(2),lift:0.05,origin:O.map(v=>Math.round(v)),
 rz:[[0,0],[T.half[0],0],[T.neck[1],ROLL],[tH,ROLL]].concat(bank.map(k=>[k[0],+(ROLL+k[1]).toFixed(1),'io'])),
 ry:[[0,0],[T.spread[0],0],[T.spread[1],-(+arg('yaw',36)),'out'],[tH,-(+arg('yaw',36))],[tE,+arg('yawEnd',6),'soft']],
 rx:[[0,0],[T.spread[0],0],[T.spread[1],-(+arg('pitch',15)),'out'],[tH,-(+arg('pitch',15))],[tE,-6,'soft']],
 sc:[[0,1],[0.45,0.62,'out'],[T.w2[1],0.62],[T.neck[1],SC]],
 tx:[[0,0],[T.w2[1],0],[T.neck[1],tx0],[tH,tx0],[tE,tx0+ +arg('dx',1180),'glide']],
 ty:[[0,0],[0.45,-10,'out'],[T.w2[1],-10],[T.neck[1],ty0],[tH,ty0]].concat(WAVE.map(k=>[k[0],ty0+k[1],'io'])),
 rot:[[0,0]],scrim:[[0,0],[0.45,0.72,'out'],[tH+0.3,0.72],[tE-0.1,0,'io']]};
S.extraT=flapT;S.finish(cam);
console.log('facets',S.facets.filter(f=>area(f.pts)>4).length,'| problems',bad,'| dur',cam.dur,'| roll',ROLL.toFixed(1),'| origin',cam.origin.join(','));
if(arg('audit',''))console.log('AUDIT',JSON.stringify(S.audit(T.beak[1]+0.03)));
const tex=fs.readFileSync('home.rgb');const out=arg('out','bd');
if(arg('frames','')){arg('frames').split(',').map(Number).forEach((t,i)=>S.render(t,`${out}_${i}.ppm`,{tex,scale:0.5}));}
if(arg('sil','')){arg('sil').split(',').map(Number).forEach((t,i)=>S.render(t,`${out}_s${i}.ppm`,{scale:1}));}
if(arg('strip','')){const n=+arg('strip');for(let i=0;i<n;i++)S.render(tH-0.1+(tE-tH+0.1)*i/(n-1),`${out}_f${i}.ppm`,{tex,scale:0.5});console.log('strip from',(tH-0.1).toFixed(2),'to',tE.toFixed(2));}
if(arg('big','')){arg('big').split(',').map(Number).forEach((t,i)=>S.render(t,`${out}_b${i}.ppm`,{tex,scale:1}));}
fs.writeFileSync('bird.json',JSON.stringify({cam,F:S.export()}));console.log('json bytes',fs.statSync('bird.json').size);
