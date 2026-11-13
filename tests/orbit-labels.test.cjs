const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),visuals=require('../air-visuals.js');
const source=fs.readFileSync(require('node:path').join(__dirname,'..','game.js'),'utf8');
const start=source.indexOf('function drawTroopGroupLabels('),end=source.indexOf('\n',start),group=[{id:1,groupId:1,type:'jet',team:0,x:1000,y:2000},{id:2,groupId:1,type:'jet',team:0,x:1100,y:2030}],labels=[],outline=[];
let time=0;
const c={Math,PLAYER_TEAM:0,playerName:'Charlie',BASE_PLAYER_NAMES:['Player'],troopGroups:()=>[group],troopVisualPoint:u=>visuals.point(u,time),selected:new Set([1]),shortTroopLabel:()=> 'J-10',troopRelationColor:()=> '#65ff38',ctx:new Proxy({},{get:(_,k)=>(...args)=>{if(k==='fillText')labels.push(args);if(k==='moveTo')outline.push(args);},set:()=>true})};
vm.createContext(c);vm.runInContext(source.slice(start,end),c);
let previous=null;
for(time=0;time<6;time+=.2){labels.length=0;c.drawTroopGroupLabels(()=>true);const p=visuals.pose(group[0],time),owner=labels[0],type=labels[1];assert.equal(owner[0],'CHARLIE');assert.equal(type[0],'2 J-10');assert(Math.abs(owner[1]-(1050+p.dx))<1e-9);assert(Math.abs(type[2]-(2000+p.dy-45))<1e-9);assert.equal(owner[1],type[1]);if(previous)assert.notDeepEqual(owner.slice(1),previous,'labels move around the orbit');previous=owner.slice(1);}
assert(outline.length>1,'selection outline also drawn at visual positions');
console.log('PASS: player name, troop type/count and selection outline track the orbiting formation.');
