const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),visuals=require('../air-visuals.js');
const game=fs.readFileSync(require('node:path').join(__dirname,'..','game.js'),'utf8');
function fn(name){const start=game.indexOf('function '+name+'('),open=game.indexOf('{',start);let n=1,i=open+1;for(;n;i++){if(game[i]==='{')n++;if(game[i]==='}')n--;}return game.slice(start,i);}
const c={Math:Object.assign(Object.create(Math),{random:()=>0}),last:100,nativeTroops:{heli:{air:true},jet:{air:true},unit44:{air:true},tank:{air:false}},COMBAT_STATS:{heli:{categories:['helicopter','air']},jet:{categories:['aircraft','air']},unit44:{categories:['aircraft','air']}},divisionMotion:new Map(),troopMissileSchedules:new WeakMap(),TYPES:{tank:{speed:1}},shots:[],combatClock:5,ApexAirVisuals:visuals};vm.createContext(c);
vm.runInContext(['turnToward','troopVisualPoint','airFlightPose','advanceTroopAnimation','animateTroopMissiles'].map(fn).join('\n'),c);
for(const type of ['heli','jet','unit44']){
 const unit={id:1,type,x:100,y:200,hp:100,angle:0,aimAngle:Math.PI,aimUntil:1000},state={body:0,turret:0,idleAim:0,idleClock:0,time:0};
 for(let i=0;i<100;i++)c.advanceTroopAnimation(state,unit,.05,()=>0);
 const comparison={body:0,turret:0,idleAim:0,idleClock:0,time:0};for(let i=0;i<100;i++)c.advanceTroopAnimation(comparison,{...unit,aimAngle:undefined,aimUntil:0},.05,()=>0);assert.equal(state.body,comparison.body,'air heading is independent of attack target');assert.notEqual(state.body,0,'aircraft face their circular flight direction');assert.equal(unit.x,100);assert.equal(unit.y,200);
 c.animateTroopMissiles({type,members:[unit]},{type:'tank',x:500,y:300,hp:1},1);
 const shot=c.shots.at(-1),origin=visuals.launchPoint(unit,5);assert.equal(shot.x,origin.x);assert.equal(shot.y,origin.y);assert(shot.y>visuals.point(unit,5).y);assert.equal(shot.tx,500);
}
for(const type of ['heli','jet']){
 const u={id:49,type,x:1000,y:2000},radius=type==='heli'?24:72,start=visuals.pose(u,0),period=2*Math.PI/start.rate;
 for(let i=0;i<1000;i++){const p=visuals.pose(u,i/10);assert(Math.abs(Math.hypot(p.dx,p.dy*3)-radius)<1e-9,'constant-radius projected circle');assert(Math.abs(p.dx*Math.cos(p.heading)+p.dy*3*Math.sin(p.heading))<1e-8,'heading tangent to circle');const next=visuals.point(u,i/10+.01);assert(Math.hypot(next.x-p.x,next.y-p.y)>0,'always moving');assert.equal(u.x,1000);assert.equal(u.y,2000);}
 const end=visuals.pose(u,period);assert(Math.hypot(start.x-end.x,start.y-end.y)<1e-8,'full circle returns to start');
}
const ground={type:'tank',x:0,y:0,angle:0,aimAngle:Math.PI/2,aimUntil:1000},state={body:0,turret:0,idleAim:0,idleClock:0,time:0};c.advanceTroopAnimation(state,ground,.1,()=>0);assert.equal(state.body,0);assert(state.turret>0,'ground turret still aims independently');
console.log('PASS: continuous fixed-centre circles and tangent headings, unchanged simulation position, attack-independent air headings and missiles, ground aiming retained.');

const leader={id:1,groupId:10,groupSlot:0,type:'jet',x:100,y:100};
for(let time=0;time<10;time+=.1){const a=visuals.pose(leader,time);for(let slot=1;slot<49;slot++){const unit={...leader,id:slot+1,groupSlot:slot,x:100+slot*10,y:100+slot*3},b=visuals.pose(unit,time);assert.equal(a.heading,b.heading,'division turns together');assert.equal(a.dx,b.dx);assert.equal(a.dy,b.dy);assert(Math.abs((b.x-a.x)-(unit.x-leader.x))<1e-9,'relative formation spacing preserved');assert(Math.abs((b.y-a.y)-(unit.y-leader.y))<1e-9);}}
const other=visuals.pose({...leader,groupId:11},1),a=visuals.pose(leader,1);assert.notEqual(other.heading,a.heading,'separate divisions have separate orbits');

c.divisionMotion.set(7,{travelAngle:.7,angle:.7,moveSpeed:90,target:{x:500,y:500}});const p1=c.airFlightPose({id:1,groupId:7,type:'jet',x:0,y:0,angle:0,moveSpeed:20,target:{x:1,y:2}}),p2=c.airFlightPose({id:2,groupId:7,type:'jet',x:10,y:20,angle:2,moveSpeed:150,target:{x:5,y:8}});assert.equal(p1.heading,p2.heading,'moving division uses shared anchor velocity');
