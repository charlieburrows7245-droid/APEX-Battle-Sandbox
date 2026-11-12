const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),code=fs.readFileSync(path.join(root,'game.js'),'utf8');
const between=(a,b)=>code.slice(code.indexOf(a),code.indexOf(b,code.indexOf(a)));
const context={assert,console};
vm.runInNewContext(fs.readFileSync(path.join(root,'unit-catalog.js'),'utf8')+'\n'+between('const TYPES=','let units=[],')+`
let units=[],uid=0,nextGroupId=0;const WORLD_WIDTH=108000,WORLD_HEIGHT=108000,GROUP_SIZE=49;
`+between('const DW5_FORMATION_X=','let nextGroupId=')+between('function troopSpacing','function friendlyTeams')+between('function troopGroups','function repairTroopGroups')+between('function add(','const GROUP_SIZE=')+between('function spawn(','function demo')+between('function reservedJoinSlots','function transferTroopToClickedGroup')+between('function updatePendingGroupJoins','function drawOrderMarkers')+between('function groupHealthSummary','function syncGroupHealthCapacity')+`
assert.equal(DW5_MENU_UNITS.length,36);
for(const e of DW5_MENU_UNITS){assert(TYPES[e.type]?.speed>0,e.name);units=[];spawn(e.type,1000,1000,0,1,99);assert.equal(units[0].type,e.type);}
units=[];spawn('tank',1000,1000,0,1,99);const first=units[0];first.x=12000;first.y=10000;
spawn('tank',1000,1000,0,1,99);const incoming=units[1];assert.notEqual(incoming.groupId,first.groupId,'distant troop remains independent');assert.equal(incoming.joinOrder.groupId,first.groupId);
updatePendingGroupJoins();assert.notEqual(incoming.groupId,first.groupId);assert(incoming.target);const arrival={...incoming.target};incoming.x=arrival.x;incoming.y=arrival.y;updatePendingGroupJoins();assert.equal(incoming.groupId,first.groupId,'joins only at formation slot');assert.equal(incoming.groupSlot,1);assert(!incoming.joinOrder);
for(let i=0;i<55;i++)spawn('tank',1000,1000,0,1,99);
for(const group of troopGroups()){assert(group.length+reservedJoinSlots(group[0].groupId).length<=49,'reservations obey cap');const slots=reservedJoinSlots(group[0].groupId);assert.equal(new Set(slots).size,slots.length);}
units=[];spawn('aa',2000,2000,0,100);assert.deepEqual(troopGroups().map(g=>g.length),[49,49,2]);
console.log('PASS: 36 buildable units, separate travelling reinforcements, arrival-only joins, unique reservations, 49-slot cap.');
`,context);
