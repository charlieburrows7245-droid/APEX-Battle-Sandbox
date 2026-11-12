const assert=require('node:assert/strict'),p=require('../map-projection.js'),rivers=require('../river-terrain.js');
assert.equal(p.WIDTH,108000);assert.equal(p.HEIGHT,36000);assert.equal(p.WIDTH/p.STEP_X,1200);assert.equal(p.HEIGHT/p.STEP_Y,1200);
const old={units:[{id:1,x:9000,y:27000,rallyY:27090,target:{x:9010,y:27120},buildQueue:['tank'],hp:123}],cam:{x:9000,y:27000},zoom:.65};
const next=p.migrateScenario(old);assert.equal(next.units[0].y,9000);assert.equal(next.units[0].target.y,9040);assert.equal(next.units[0].x,9000);assert.equal(next.units[0].hp,123);assert.deepEqual(next.units[0].buildQueue,['tank']);assert.equal(next.cam.y,9000);assert.equal(next.zoom,1);assert.equal(old.units[0].y,27000);assert.deepEqual(p.migrateScenario(next),next,'migration runs once');
for(let seed=0;seed<500;seed++){
 const route=rivers.seededLayout(seed,p.WIDTH,p.HEIGHT)[0],nodes=rivers.decodeLayout(route.encoded,route.startX,route.startY),end=nodes.at(-1);
 assert.equal(route.entryEdge,0);assert(nodes.length<2000);assert(route.bridges>=1);
 assert(route.exitEdge===0?end.y<1250:route.exitEdge===1?end.x>p.WIDTH-1250:route.exitEdge===2?end.y>p.HEIGHT-1250:end.x<1250,'river reaches exit at native projection');
}
console.log('PASS: native dimensions, coordinate bounds, one-time legacy migration, and 500 native-aspect river layouts.');
