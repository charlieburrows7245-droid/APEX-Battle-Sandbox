const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const rivers=require('../river-terrain.js');
const captured='bbbbbbbbbbbbapononmlklklmtmnopabcdedcbcbaqabcdcbcbcdcderedcdefedcbcdcbaaqababcdedefgfedeerefefedcbababcdeeredcbapononopopaaaaaaaqapaponmnmnmnmnmnmtmnopapapababcderefefededcdefeerefgfedcbabaqabcdcdcdedederedcdddddddddddddddd';
const pieces=rivers.decodeLayout(captured,22327);
assert.equal(pieces.length,captured.length);assert.deepEqual(pieces[0],{type:1,x:22327,y:0,left:21687,top:-50,image:2});assert.equal(pieces[1].x,22557);assert.equal(pieces[1].y,300);
assert.throws(()=>rivers.decodeLayout('base64+/='));assert.throws(()=>rivers.decodeLayout(''));assert.throws(()=>rivers.decodeLayout('abc',NaN));
const first=rivers.seededLayout(1415,108000,108000),again=rivers.seededLayout(1415,108000,108000);assert.deepEqual(first,again);for(let seed=0;seed<100;seed++)assert.equal(rivers.seededLayout(seed,108000,108000).length,1,'one river per map');assert.notDeepEqual(first,rivers.seededLayout(1416,108000,108000));
for(let seed=1;seed<=500;seed++)for(const route of rivers.seededLayout(seed,108000,108000)){
 const nodes=rivers.decodeLayout(route.encoded,route.startX,route.startY);assert(nodes.length<2000,'no waypoint orbit loop');const end=nodes.at(-1);assert(route.exitEdge===0?end.y<1250:route.exitEdge===1?end.x>106750:route.exitEdge===2?end.y>106750:end.x<1250,'river reaches selected exit');
 for(let i=1;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],turn=Math.min((b.type-a.type+16)%16,(a.type-b.type+16)%16);assert(turn<=1,'adjacent native orientations only');assert(Number.isFinite(b.left+b.top));}
}
const edgePairs=new Set(Array.from({length:100},(_,seed)=>{const r=rivers.seededLayout(seed*1234567,108000,108000)[0];return r.entryEdge+','+r.exitEdge;}));assert(edgePairs.size>=12,'varied entry and exit edges');assert([...edgePairs].some(p=>p[0]===p[2]),'same-edge U-shaped rivers');
console.log('PASS: captured de4 coordinates, letter format validation, native tile offsets, connected seeded layouts, map crossings and seed persistence.');
