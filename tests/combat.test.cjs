const fs=require('fs'),vm=require('vm');const game=fs.readFileSync(require('path').join(__dirname,'..','game.js'),'utf8');const moduleCode=game.slice(game.indexOf('// DW5 help.deltawars.com/'));const declarations=['const TYPES='+game.match(/const TYPES=([^\n]+);/)[1]+';',...['DW5_FORMATION_X','DW5_FORMATION_Y'].map(n=>'const '+n+'='+game.match(new RegExp('const '+n+'=([^\\n]+);'))[1]+';'),...['troopSpacing','formationOffset','friendlyTeams','troopGroups','baseGunCount','upgradeBaseFlak','repairTroopGroups'].map(n=>game.match(new RegExp('function '+n+'[^\\n]+'))[0])].join('\n');const tests=`
const assert=require('assert');
let seq=0;function unit(type,x,y,side=0,groupId=1,slot=0){return{id:++seq,type,x,y,team:side,groupId,groupSlot:slot,hp:TYPES[type].hp,angle:0};}
function reset(list){units=list;shots=[];combatCooldowns.clear();attackerCasualtyTimes.clear();combatClock=0;}
function group(type,x,y,side,id,count){return Array.from({length:count},(_,i)=>{const o=formationOffset(type,i);return unit(type,x+o.x,y+o.y,side,id,i);});}
reset([...group('tank',0,0,0,1,49),...group('tank',700,0,1,2,49)]);updateDivisionCombat(.01);assert.equal(shots.length,98,'every member of both divisions fires');assert(shots.some(s=>s.x<0),'rear members fire too');assert.equal(units.length,96);const firstHp=units.reduce((n,u)=>n+u.hp,0);updateDivisionCombat(.2);assert.equal(units.reduce((n,u)=>n+u.hp,0),firstHp,'cooldown');
const aa={type:'aa',members:[unit('aa',0,0)]};assert.equal(weaponRange(aa),900);assert.equal(weaponRange(aa,{type:'heli',members:[]}),2700);assert.equal(weaponRange(aa,{type:'jet',members:[]}),900);assert.equal(weaponRange(aa,{type:'heli',members:[],firing:true}),2700);assert.equal(weaponRange(aa,{type:'tank',members:[],firing:true}),1800);
reset([unit('aa',0,0,0,1),unit('heli',2600,0,1,2)]);updateDivisionCombat(.01);assert.equal(shots.length,1);assert.equal(shots[0].kind,'rak');assert(units.find(u=>u.type==='heli').hp<100);
reset([unit('aa',0,0,0,1),unit('heli',2800,0,1,2)]);updateDivisionCombat(.01);assert.equal(shots.length,0,'helicopter beyond 3x');
reset([unit('aa',0,0,0,1),unit('heli',0,880,1,2)]);updateDivisionCombat(.01);assert.equal(shots.length,1,'3:1 range projection');
reset([unit('tank',0,0,0,1),unit('tank',0,245,1,2)]);updateDivisionCombat(.01);assert.equal(shots.length,0,'vertical distance scaled');
reset([unit('tank',0,0,0,1),unit('tank',300,0,2,2)]);updateDivisionCombat(.01);assert.equal(shots.length,0,'allies protected');
assert(Math.abs(shotDamage(unit('aa',0,0),unit('heli',0,0))-1000/30)<1e-8);assert(Math.abs(shotDamage(unit('heli',0,0),unit('tank',0,0))-2500/107*1.6)<1e-8);
assert.equal(shotDamage(unit('heli',0,0),unit('base',0,0)),12.5,'Wall armour reduces unit firepower');
reset([unit('tank',0,0,0,1),unit('tank',10,0,1,2)]);for(const u of units)u.hp=1;updateDivisionCombat(.01);assert.equal(shots.length,2);assert.equal(units.length,0,'simultaneous lethal return volleys');

reset(group('tank',0,0,0,1,49));let targetGroup=combatGroups()[0];syncGroupHealthCapacity(targetGroup);
applyGroupDamage(targetGroup,20);assert.equal(units[48].hp,140);assert.equal(units[0].hp,160);
assert.equal(groupHealthSummary(units).health,49*160-20);
applyGroupDamage(targetGroup,1e9);assert.equal(units.filter(u=>u.hp>0).length,48);
applyGroupDamage(targetGroup,1e9);assert.equal(units.filter(u=>u.hp>0).length,48,'same tick casualty lock');
updateDivisionCombat(.99);targetGroup=combatGroups()[0];applyGroupDamage(targetGroup,1e9);assert.equal(units.length,48);assert.equal(units.filter(u=>u.hp>0).length,48,'lock lasts full second');
const saved=JSON.parse(JSON.stringify(units));reset(saved);repairTroopGroups();targetGroup=combatGroups()[0];applyGroupDamage(targetGroup,1e9);assert.equal(units.filter(u=>u.hp>0).length,48,'save reload retains lock');
updateDivisionCombat(.02);targetGroup=combatGroups()[0];applyGroupDamage(targetGroup,1e9);assert.equal(units.filter(u=>u.hp>0).length,47,'next last slot dies after interval');
assert.equal(groupHealthSummary(units.filter(u=>u.hp>0)).maximum,49*160,'capacity survives casualties');
reset(group('tank',0,0,0,1,49));for(let second=0;second<10;second++){updateDivisionCombat(1);targetGroup=combatGroups()[0];applyGroupDamage(targetGroup,1e9);}assert.equal(units.filter(u=>u.hp>0).length,39,'ten seconds: at most ten casualties');
reset([...group('tank',0,0,0,1,49),...group('tank',700,0,1,2,49),...group('tank',710,0,1,3,49)]);updateDivisionCombat(.01);assert.equal(units.filter(u=>u.team===0).length,47,'two lethal attacking divisions can each kill one defender');
reset(group('tank',0,0,0,1,49));targetGroup=combatGroups()[0];
applyAttackerVolley(targetGroup,1e9,'gA');applyAttackerVolley(targetGroup,1e9,'gB');
assert.equal(units.filter(u=>u.hp>0).length,47,'two attackers may cause two casualties in one tick');
applyAttackerVolley(targetGroup,1e9,'gA');applyAttackerVolley(targetGroup,1e9,'gB');
assert.equal(units.filter(u=>u.hp>0).length,47,'each attacker has its own one-second limit');
combatClock+=1;applyAttackerVolley(targetGroup,1e9,'gA');
assert.equal(units.filter(u=>u.hp>0).length,46,'attacker can kill again after a second');
reset(group('tank',0,0,0,1,49));targetGroup=combatGroups()[0];syncGroupHealthCapacity(targetGroup);applyGroupDamage(targetGroup,1e9);updateDivisionCombat(10);assert.equal(units.length,48,'no delayed damage debt');
const base=unit('base',0,0);base.defenceGuns=2;base.wallLevel=1;syncBaseDefenceHealth(base);
assert.equal(base.hp,130000);assert.equal(baseMaxHealth(base),130000);assert.equal(baseGunCount(base),2);
let bg={type:'base',members:[base]};assert.equal(weaponRange(bg),210);base.specialUpgrades={range:true};assert.equal(weaponRange(bg),420);
applyGroupDamage(bg,100);assert.deepEqual(base.turretHealth,[65000,64900]);assert.equal(base.hp,129900);
base.wallLevel=2;syncBaseDefenceHealth(base);assert.deepEqual(base.turretHealth,[65000,64900]);assert.equal(baseMaxHealth(base),130000);
const baseSaved=JSON.parse(JSON.stringify(base));syncBaseDefenceHealth(baseSaved);assert.equal(baseSaved.hp,129900,'load preserves wall and damage');
base.wallLevel=1;syncBaseDefenceHealth(base);assert.equal(base.hp,129900,'wall selection does not alter HP');
applyGroupDamage(bg,1e9);assert.equal(baseGunCount(base),1);assert.equal(base.hp,65000);applyGroupDamage(bg,1e9);assert.equal(baseGunCount(base),1,'turret casualty limit');
assert(upgradeBaseFlak(base));assert.equal(base.hp,130000,'rebuild destroyed gun');assert.equal(baseGunCount(base),2);
base.maxUpgraded=true;base.wallLevel=2;syncBaseDefenceHealth(base);assert.equal(baseGunCount(base),50);assert.equal(baseMaxHealth(base),3250000);
base.maxUpgraded=false;base.wallLevel=1;base.defenceGuns=2;resetBaseDefenceHealth(base);assert.deepEqual(base.turretHealth,[65000,65000]);assert.equal(base.hp,130000);
const legacy=unit('base',0,0);legacy.hp=250;legacy.defenceGuns=2;syncBaseDefenceHealth(legacy);assert.deepEqual(legacy.turretHealth,[32500,0],'old save migrates without healing');
console.log('PASS: reverse-slot damage, summed health, one casualty/sec, discarded overkill, persisted cooldown, turret pools, wall x10, range x2, rebuild and legacy-save migration.');

console.log('PASS: 49-member volleys, cooldown, 3x helicopter range, firing bonuses, projected distances, allies, damage stats, simultaneous combat.');
`;
vm.runInNewContext('const require=__require;let units=[],shots=[],selected=new Set(),last=100,nextGroupId=0;const $=()=>({setAttribute(){}});const baseEntrancePoint=u=>u;\n'+declarations+'\n'+moduleCode+'\n'+tests,{__require:require,console});
