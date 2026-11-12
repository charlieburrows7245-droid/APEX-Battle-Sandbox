const assert=require('node:assert/strict'),world=require('../world-terrain.js'),rivers=require('../river-terrain.js');
for(let seed=0;seed<50;seed++){
 const route=rivers.seededLayout(seed,108000,108000)[0],river=rivers.decodeLayout(route.encoded,route.startX,route.startY),map=world.generate(seed,108000,108000,river);
 assert.equal(map.bases.length,500);assert.equal(map.bases.filter(b=>b.type==='airbase').length,4);assert.equal(map.bases.filter(b=>b.type==='helibase').length,20);assert.equal(map.bases.filter(b=>b.type==='base').length,476);assert.equal(map.cliffs.length,600);
 for(const b of map.bases){assert(b.x>=1200&&b.x<=106800&&b.y>=900&&b.y<=107100);assert(!map.cliffs.some(c=>Math.abs(c.x-b.x)<1450&&Math.abs(c.y-b.y)<600),'base avoids cliffs');assert(!river.some(p=>Math.abs(p.x-b.x)<2000&&Math.abs(p.y-b.y)<1000),'base avoids river');assert(!map.bases.some(c=>b.index!==c.index&&Math.abs(c.x-b.x)<2200&&Math.abs(c.y-b.y)<950),'base footprints separated');}
 assert.deepEqual(map,world.generate(seed,108000,108000,river));
}
console.log('PASS: 50 seeds, exact 500-base mix, deterministic cliff rows, no base overlaps with cliffs, rivers or other bases.');
