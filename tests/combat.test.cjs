const fs=require('fs'),vm=require('vm');const game=fs.readFileSync(require('path').join(__dirname,'..','game.js'),'utf8');const moduleCode=game.slice(game.indexOf('// DW5 help.deltawars.com/'));const declarations=['const TYPES='+game.match(/const TYPES=([^\n]+);/)[1]+';',...['DW5_FORMATION_X','DW5_FORMATION_Y'].map(n=>'const '+n+'='+game.match(new RegExp('const '+n+'=([^\\n]+);'))[1]+';'),...['troopSpacing','formationOffset','friendlyTeams','troopGroups'].map(n=>game.match(new RegExp('function '+n+'[^\\n]+'))[0])].join('\n');const tests=`
const assert=require('assert');
let seq=0;function unit(type,x,y,side=0,groupId=1,slot=0){return{id:++seq,type,x,y,team:side,groupId,groupSlot:slot,hp:TYPES[type].hp,angle:0};}
function reset(list){units=list;shots=[];combatCooldowns.clear();combatClock=0;}
function group(type,x,y,side,id,count){return Array.from({length:count},(_,i)=>{const o=formationOffset(type,i);return unit(type,x+o.x,y+o.y,side,id,i);});}
reset([...group('tank',0,0,0,1,49),...group('tank',700,0,1,2,49)]);updateDivisionCombat(.01);assert.equal(shots.length,98,'every member of both divisions fires');assert(shots.some(s=>s.x<0),'rear members fire too');assert.equal(units.length,90);const firstHp=units.reduce((n,u)=>n+u.hp,0);updateDivisionCombat(.2);assert.equal(units.reduce((n,u)=>n+u.hp,0),firstHp,'cooldown');
const aa={type:'aa',members:[unit('aa',0,0)]};assert.equal(weaponRange(aa),900);assert.equal(weaponRange(aa,{type:'heli',members:[]}),2700);assert.equal(weaponRange(aa,{type:'jet',members:[]}),900);assert.equal(weaponRange(aa,{type:'heli',members:[],firing:true}),2700);assert.equal(weaponRange(aa,{type:'tank',members:[],firing:true}),1800);
reset([unit('aa',0,0,0,1),unit('heli',2600,0,1,2)]);updateDivisionCombat(.01);assert.equal(shots.length,1);assert.equal(shots[0].kind,'rak');assert(units.find(u=>u.type==='heli').hp<100);
reset([unit('aa',0,0,0,1),unit('heli',2800,0,1,2)]);updateDivisionCombat(.01);assert.equal(shots.length,0,'helicopter beyond 3x');
reset([unit('aa',0,0,0,1),unit('heli',0,880,1,2)]);updateDivisionCombat(.01);assert.equal(shots.length,1,'3:1 range projection');
reset([unit('tank',0,0,0,1),unit('tank',0,245,1,2)]);updateDivisionCombat(.01);assert.equal(shots.length,0,'vertical distance scaled');
reset([unit('tank',0,0,0,1),unit('tank',300,0,2,2)]);updateDivisionCombat(.01);assert.equal(shots.length,0,'allies protected');
assert(Math.abs(shotDamage(unit('aa',0,0),unit('heli',0,0))-1000/30)<1e-8);assert(Math.abs(shotDamage(unit('heli',0,0),unit('tank',0,0))-2500/107*1.6)<1e-8);
reset([unit('tank',0,0,0,1),unit('tank',10,0,1,2)]);for(const u of units)u.hp=1;updateDivisionCombat(.01);assert.equal(shots.length,2);assert.equal(units.length,0,'simultaneous lethal return volleys');
console.log('PASS: 49-member volleys, cooldown, 3x helicopter range, firing bonuses, projected distances, allies, damage stats, simultaneous combat.');
`;
vm.runInNewContext('const require=__require;let units=[],shots=[],selected=new Set(),last=100;const $=()=>({setAttribute(){}});const baseEntrancePoint=u=>u;\n'+declarations+'\n'+moduleCode+'\n'+tests,{__require:require,console});
