const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'..','game.js'),'utf8');
function fn(name){const start=source.indexOf('function '+name+'('),open=source.indexOf('{',start);let n=1,i=open+1;for(;n;i++){if(source[i]==='{')n++;if(source[i]==='}')n--;}return source.slice(start,i);}
const draws=[],factories=[],guns=[],art={};for(const name of ['hangar1a.png','hangar1b.png','mauer2a.png','mauer2b.png','mauer2d.png','flak.png'])art[name]={name,complete:true,naturalWidth:174,naturalHeight:161};
const c={Math,Object,dwArt:art,last:0,ctx:{save(){},restore(){},drawImage(...args){draws.push(args);}},nativeFactory:(...args)=>factories.push(args),factoryStage:()=>0,nativeBuilding(){},baseGunCapacity:()=>2,baseTurretFacingFrame:()=>0,drawSmoothTurret:(im,frame,x,y)=>guns.push({x,y})};vm.createContext(c);
const defence=source.match(/const DW5_DEFENCE=([^\n]+);/)[0];
vm.runInContext(defence+'\n'+['baseDefenceLayout','helibaseFactoryOffsets','drawHelibase','drawStarterDefences','baseEntrancePoint','factoryPoint'].map(fn).join('\n'),c);
const u={type:'helibase',x:1000,y:2000,turretHealth:[65000,65000]};c.drawHelibase(u);c.drawStarterDefences(u,false);
assert.equal(draws[0][0].name,'hangar1a.png');assert.equal(draws[0][1]+87,4);assert.equal(draws[0][2]+80.5,76);
assert.deepEqual(factories.map(x=>[x[0],x[2],x[3]]),[['g0.png',210,50],['g1.png',310,-30],['g2.png',-25,-45],['g3.png',-285,-20]]);
assert.equal(guns.length,2);assert.equal((guns[0].x+guns[1].x)/2,15);assert.equal(guns[0].y,guns[1].y);
assert.deepEqual(draws.slice(-2).map(a=>[a[0].name,a[1],a[2]]),[['mauer2a.png',-510,130],['mauer2b.png',65,130]]);
assert.equal(c.baseEntrancePoint(u).x,1004);assert.equal(c.baseEntrancePoint(u).y,2076);
for(const [key,x,y] of [['concrete',210,50],['steel',310,-30],['carbon',-25,-45],['fuel',-285,-20]]){assert.equal(c.factoryPoint(u,key).x,1000+x);assert.equal(c.factoryPoint(u,key).y,2000+y);}
console.log('PASS: native helibase hangar/factory placement, symmetric turrets, paired front walls and matching menu anchors.');
