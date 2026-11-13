const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),visuals=require('../air-visuals.js');
const game=fs.readFileSync(require('node:path').join(__dirname,'..','game.js'),'utf8');
function fn(name){const start=game.indexOf('function '+name+'('),open=game.indexOf('{',start);let n=1,i=open+1;for(;n;i++){if(game[i]==='{')n++;if(game[i]==='}')n--;}return game.slice(start,i);}
const c={Math:Object.assign(Object.create(Math),{random:()=>0}),last:100,nativeTroops:{heli:{air:true},jet:{air:true},unit44:{air:true},tank:{air:false}},divisionMotion:new Map(),troopMissileSchedules:new WeakMap(),TYPES:{tank:{speed:1}},shots:[],combatClock:5,ApexAirVisuals:visuals};vm.createContext(c);
vm.runInContext(['turnToward','advanceTroopAnimation','animateTroopMissiles'].map(fn).join('\n'),c);
for(const type of ['heli','jet','unit44']){
 const unit={id:1,type,x:100,y:200,hp:100,angle:0,aimAngle:Math.PI,aimUntil:1000},state={body:0,turret:0,idleAim:0,idleClock:0,time:0};
 for(let i=0;i<100;i++)c.advanceTroopAnimation(state,unit,.05,()=>0);
 assert.equal(state.body,0,'air body does not turn to its firing target');assert.equal(state.turret,0);assert.equal(unit.x,100);assert.equal(unit.y,200);
 c.animateTroopMissiles({type,members:[unit]},{type:'tank',x:500,y:300,hp:1},1);
 const shot=c.shots.at(-1),origin=visuals.launchPoint(unit,5);assert.equal(shot.x,origin.x);assert.equal(shot.y,origin.y);assert(shot.y>visuals.point(unit,5).y);assert.equal(shot.tx,500);
}
for(let i=0;i<10000;i++){const u={id:49,x:1000,y:2000},p=visuals.point(u,i/10);assert(Math.abs(p.x-u.x)<=4);assert(Math.abs(p.y-u.y)<=1.8);assert.equal(u.x,1000);assert.equal(u.y,2000);}
const ground={type:'tank',x:0,y:0,angle:0,aimAngle:Math.PI/2,aimUntil:1000},state={body:0,turret:0,idleAim:0,idleClock:0,time:0};c.advanceTroopAnimation(state,ground,.1,()=>0);assert.equal(state.body,0);assert(state.turret>0,'ground turret still aims independently');
console.log('PASS: bounded fixed-point hover, unchanged simulation position, independent air headings and missiles, ground aiming retained.');
