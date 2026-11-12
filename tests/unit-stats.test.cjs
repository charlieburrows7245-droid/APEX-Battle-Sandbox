const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),game=fs.readFileSync(path.join(root,'game.js'),'utf8');
const between=(a,b)=>game.slice(game.indexOf(a),game.indexOf(b,game.indexOf(a)));
vm.runInNewContext(fs.readFileSync(path.join(root,'unit-catalog.js'),'utf8')+'\n'+between('const TYPES=','let units=[],')+between('const COMBAT_STATS=','let showWeaponRanges=')+between('function unitHasCategory','// A base locks')+`
const BASE_WALL_ARMOR=10,BASE_WEAPON_RANGE_MAP={normal:12,longRange:20};
const byId=id=>DW5_MENU_UNITS.find(e=>e.id===id),type=id=>byId(id).type;
assert.equal(COMBAT_STATS[type(5)].firepower,150);assert.equal(COMBAT_STATS[type(5)].special,3750);assert.equal(COMBAT_STATS[type(5)].armor,150);
assert.equal(COMBAT_STATS[type(31)].firepower,160);assert.equal(COMBAT_STATS[type(31)].special,4000);assert.equal(COMBAT_STATS[type(31)].armor,75);
assert.equal(effectiveFirepower(type(5),'base'),3750);assert.equal(effectiveFirepower(type(5),'tank'),150);assert.equal(effectiveFirepower(type(5),'heli'),20);
assert.equal(effectiveFirepower('heli','tank'),2500);assert.equal(effectiveFirepower('heli','base'),100,'Apache ground bonus excludes base defence');
assert.equal(effectiveFirepower(type(38),'jet'),3000);assert.equal(effectiveFirepower(type(38),'heli'),120,'Pantsir bonus is aircraft only');
assert.equal(effectiveFirepower('aa','heli'),1000);assert.equal(effectiveFirepower('aa','jet'),40);
assert.equal(effectiveFirepower('raptor','heli'),1250);assert.equal(effectiveFirepower('raptor','tank'),50);
assert.equal(effectiveFirepower(type(20),type(1)),2500);assert.equal(effectiveFirepower(type(20),type(3)),100);
assert.equal(effectiveFirepower(type(32),type(5)),4000);assert.equal(effectiveFirepower(type(32),type(10)),4000);assert.equal(effectiveFirepower(type(32),'tank'),1000);
assert.equal(effectiveFirepower(type(21),'heli'),0);assert.equal(effectiveFirepower(type(28),'tank'),20,'detector is armed');
assert.equal(targetPriority(type(5),'base'),1);assert.equal(targetPriority(type(5),'tank'),0);
const g=id=>({type:type(id),members:[{}]});assert.equal(weaponRange(g(22),{type:'base',firing:true}),2160);assert.equal(weaponRange(g(22),{type:'tank',firing:true}),720);
assert.equal(weaponRange(g(32),g(5)),1620);assert.equal(weaponRange(g(32)),810);
assert.equal(weaponRange(g(6),{type:'tank',moving:true}),1800);assert.equal(weaponRange(g(38),{type:'jet'}),2700);
for(const e of DW5_MENU_UNITS){for(const field of ['firepower','armor','range','speed'])assert(Number.isFinite(e.combat[field]),e.name+' '+field);assert(e.combat.armor>0);assert(e.combat.categories.length);}
for(const [id,raise,pivot,x] of [[5,-20,6,2],[22,-19,10,1],[31,-18,6,0]]){const r=byId(id).render;assert.equal(r.raise,raise);assert.equal(r.pivot,pivot);assert.equal(r.shiftX,x);}
assert.equal(shotDamage({type:type(5)},{type:'base'}),3750/200);assert(shotDamage({type:type(5)},{type:'tank'})<shotDamage({type:type(11)},{type:'tank'}));
console.log('PASS: published stats, normal/special/MG damage, overlapping target classes, specialist priority, conditional ranges, howitzer pivots.');
`,{assert,console});
