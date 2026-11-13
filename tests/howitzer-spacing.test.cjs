const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const game=fs.readFileSync(require('node:path').join(__dirname,'..','game.js'),'utf8'),c={};vm.createContext(c);
const start=game.indexOf('const DW5_FORMATION_X='),end=game.indexOf('function friendlyTeams',start);
vm.runInContext('const DW5_MENU_UNITS=[];\n'+game.slice(start,end),c);
assert.equal(c.troopSpacing('unit5'),38);const slots=Array.from({length:49},(_,i)=>c.formationOffset('unit5',i));assert.equal(new Set(slots.map(p=>p.x+','+p.y)).size,49);
assert.equal(Math.max(...slots.map(p=>p.x))-Math.min(...slots.map(p=>p.x)),456);assert.equal(Math.max(...slots.map(p=>p.y))-Math.min(...slots.map(p=>p.y)),152);
assert.equal(c.formationOffset('unit5',1).x,c.troopSpacing('unit5'),'formation and movement/collision share one spacing');
console.log('PASS: unique compact 49-unit Howitzer diamond and consistent spacing across formation/movement calculations.');

function fn(name){const a=game.indexOf('function '+name+'('),b=game.indexOf('{',a);let n=1,i=b+1;for(;n;i++){if(game[i]==='{')n++;if(game[i]==='}')n--;}return game.slice(a,i);}
c.TYPES={unit5:{speed:1}};c.WORLD_WIDTH=108000;c.WORLD_HEIGHT=36000;vm.runInContext(fn('troopGroups')+'\n'+fn('compactIdleHowitzerGroups'),c);
const old=slots.map((p,i)=>({id:i,type:'unit5',groupId:1,groupSlot:i,hp:160,x:10000+p.x*65/38,y:10000+p.y*65/38}));c.compactIdleHowitzerGroups(old);assert.equal(Math.max(...old.map(u=>u.x))-Math.min(...old.map(u=>u.x)),456);assert.equal(old[0].hp,160);assert.equal(old[0].groupId,1);
