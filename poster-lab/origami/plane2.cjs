const {makeSim,R,cen}=require('./fold2.cjs');const fs=require('fs');
const S=makeSim();const cy=f=>cen(f.pts)[1];
S.fold({name:'corner T',p:[990,0],q:[1440,450],m:[1440,0],place:'behind',dir:-1,t0:.45,t1:.85});
S.fold({name:'corner B',p:[990,900],q:[1440,450],m:[1440,900],place:'behind',dir:-1,t0:.45,t1:.85});
const xa=1440-450/Math.tan(R(22.5));
S.fold({name:'edge T',p:[xa,0],q:[1440,450],m:[700,2],place:'behind',dir:-1,t0:.9,t1:1.3});
S.fold({name:'edge B',p:[xa,900],q:[1440,450],m:[700,898],place:'behind',dir:-1,t0:.9,t1:1.3});
S.fold({name:'half',p:[0,450],q:[1440,450],m:[500,800],place:'front',dir:1,t0:1.35,t1:1.8});
S.fold({name:'wing near',p:[0,375],q:[1440,450],m:[100,100],sel:f=>cy(f)>450,ang:84,dir:1,t0:1.85,t1:2.35});
S.fold({name:'wing far',p:[0,375],q:[1440,450],m:[100,100],sel:f=>cy(f)<450,ang:84,dir:-1,t0:1.85,t1:2.35});
const cam={dur:4.0,lift:0.05,origin:[820,440],
 rx:[[0,0],[1.75,0],[2.4,-58]],ry:[[0,0],[1.75,0],[2.4,22]],rz:[[0,0],[1.8,0],[2.4,-10],[3.8,-22,'in']],
 sc:[[0,1],[0.45,0.62,'out'],[1.8,0.62],[2.4,0.5],[2.6,0.52],[3.8,0.1,'acc']],tx:[[0,0],[1.8,0],[2.4,70],[2.6,40],[3.8,1150,'acc']],ty:[[0,0],[0.45,-10,'out'],[1.8,-10],[2.4,-120],[2.6,-105],[3.8,-760,'acc']],rot:[[0,0]]};
S.check(false);S.finish(cam);
console.log('facets',S.facets.length,'steps',S.steps.map(s=>s.name+':'+s.n+' zTop'+s.zTop).join(' | '));
const tex=fs.readFileSync('home.rgb');
const times=(process.argv[2]||'0,0.65,1.1,1.6,1.8,2.1,2.4,3.0').split(',').map(Number);
times.forEach((t,i)=>S.render(t,`p2_${i}.ppm`,{tex,scale:0.4}));
fs.writeFileSync('plane2.json',JSON.stringify({cam,F:S.export()}));
console.log('json bytes',fs.statSync('plane2.json').size, 'n',times.length);
