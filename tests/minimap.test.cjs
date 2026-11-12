const assert=require('node:assert/strict'),{draw}=require('../minimap.js');
const calls=[],c=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:(o,key,value)=>{calls.push([key,value]);return true;}});
draw(c,300,300,1200,1200,[{type:'base',x:100,y:100,hp:1},{type:'airbase',x:400,y:400,hp:1},{type:'helibase',x:800,y:800,hp:1},{type:'tank',x:200,y:200,hp:1}],[],[{x1:0,y1:600,x2:1200,y2:600}]);
assert(calls.some(x=>x[0]==='fillStyle'&&x[1]==='#000'));
assert.equal(calls.filter(x=>x[0]==='fillRect').length,4,'background and three bases, no troop marker');
assert(calls.some(x=>x[0]==='moveTo'&&x[1]===96&&x[2]===100));assert(calls.some(x=>x[0]==='lineTo'&&x[1]===104&&x[2]===100),'horizontal airbase');
assert(calls.some(x=>x[0]==='moveTo'&&x[1]===200&&x[2]===196));assert(calls.some(x=>x[0]==='lineTo'&&x[1]===200&&x[2]===204),'vertical helicopter base');
assert(calls.some(x=>x[0]==='lineTo'&&x[1]===300&&x[2]===150),'highway segment');
console.log('PASS: black background, static-only markers, airbase/helibase orientation and highway routes.');
