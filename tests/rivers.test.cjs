const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const rivers=require('../river-terrain.js');
const captured='bbbbbbbbbbbbapononmlklklmtmnopabcdedcbcbaqabcdcbcbcdcderedcdefedcbcdcbaaqababcdedefgfedeerefefedcbababcdeeredcbapononopopaaaaaaaqapaponmnmnmnmnmnmtmnopapapababcderefefededcdefeerefgfedcbabaqabcdcdcdedederedcdddddddddddddddd';
const pieces=rivers.decodeLayout(captured,22327);
assert.equal(pieces.length,captured.length);assert.deepEqual(pieces[0],{type:1,x:22327,y:0,left:21687,top:-50,image:2});assert.equal(pieces[1].x,22557);assert.equal(pieces[1].y,300);
assert.throws(()=>rivers.decodeLayout('base64+/='));assert.throws(()=>rivers.decodeLayout(''));assert.throws(()=>rivers.decodeLayout('abc',NaN));
const first=rivers.seededLayout(1415,108000,108000),again=rivers.seededLayout(1415,108000,108000);assert.deepEqual(first,again);assert.notDeepEqual(first,rivers.seededLayout(1416,108000,108000));
for(let seed=1;seed<=30;seed++)for(const route of rivers.seededLayout(seed,108000,108000)){
 const nodes=rivers.decodeLayout(route.encoded,route.startX,route.startY);assert(nodes.at(-1).y>=108000,'river exits map');
 for(let i=1;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],turn=Math.min((b.type-a.type+16)%16,(a.type-b.type+16)%16);assert(turn<=1,'adjacent native orientations only');assert(Number.isFinite(b.left+b.top));}
}
console.log('PASS: captured de4 coordinates, letter format validation, native tile offsets, connected seeded layouts, map crossings and seed persistence.');
