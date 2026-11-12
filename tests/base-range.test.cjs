const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const game=fs.readFileSync(process.env.APEX_RANGE_GAME||path.join(__dirname,'..','game.js'),'utf8');
function source(name){const start=game.indexOf('function '+name+'(');assert(start>=0,name+' exists');const end=game.indexOf('\n}',start);assert(end>=0,name+' closing brace');return game.slice(start,end+2);}
const c={Math,Object,TYPES:{base:{speed:0,range:210},airbase:{speed:0,range:210},tank:{speed:150},aa:{speed:75},heli:{speed:112},raptor:{speed:600}},COMBAT_STATS:{tank:{range:8},aa:{range:10},heli:{range:10},raptor:{range:12}},friendlyTeams:(a,b)=>a===b||a===0&&b===2||a===2&&b===0};
vm.createContext(c);const config=game.match(/const BASE_WEAPON_RANGE_MAP=[^\n]+/);assert(config);vm.runInContext(config[0]+'\n'+source('weaponRange')+'\n'+source('baseTargetUnit'),c);
function base(type='base',up=false){return{type,team:0,x:0,y:76,members:[{type,x:0,y:0,specialUpgrades:{range:up}}]};}
function troop(x,y,slot=0,team=1){const u={id:10+slot,type:'tank',x,y,hp:160,team,groupSlot:slot,groupId:99};return{type:'tank',team,x,y,members:[u]};}
for(const type of ['base','airbase']){
 const b=base(type);if(type==='airbase')b.y=99;
 assert.equal(c.weaponRange(b),1080,'12 map-unit normal range');b.members[0].specialUpgrades.range=true;assert.equal(c.weaponRange(b),1800,'20 map-unit upgraded range');
 for(const p of [[1800,0],[0,600],[1080,480]]){const t=troop(p[0],b.y+p[1]);assert(c.baseTargetUnit(b,[b,t]),'upgraded boundary is inclusive');}
 assert.equal(c.baseTargetUnit(b,[b,troop(1800.01,b.y)]),null,'outside upgraded horizontal range');assert.equal(c.baseTargetUnit(b,[b,troop(0,b.y+600.01)]),null,'outside upgraded vertical range');
 b.members[0].specialUpgrades.range=false;assert(c.baseTargetUnit(b,[b,troop(1080,b.y)]));assert.equal(c.baseTargetUnit(b,[b,troop(1080.01,b.y)]),null);
 assert.equal(c.baseTargetUnit(b,[b,troop(0,b.y-1)]),null,'normal front restriction preserved');b.members[0].specialUpgrades.range=true;assert(c.baseTargetUnit(b,[b,troop(0,b.y-450)]),'upgraded rear coverage preserved');
 b.members[0].specialUpgrades.range=false;b.members[0].maxUpgraded=true;assert.equal(c.weaponRange(b),1800,'max-upgrade preview');
 assert.equal(c.baseTargetUnit(b,[b,troop(1,b.y,0,2)]),null,'allies remain excluded');
}
const aa={type:'aa',members:[{}]};assert.equal(c.weaponRange(aa),900);assert.equal(c.weaponRange(aa,{type:'heli'}),2700);assert.equal(c.weaponRange({type:'tank',members:[{}]}),720);
console.log('PASS: 12/20 ranges, both base types, inclusive projected boundaries, outside rejection, front/rear rules, max upgrade, allies, troop ranges unchanged.');
