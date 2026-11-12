/* DW5's client receives base records and 600 Pi cliff bytes from its server.
 * These seeded placement rules are APEX's implementation, not recovered server code.
 * Captured map mix: 4 orientation-3 airbases, 20 orientation-2 helicopter bases.
 */
(function(root){
 'use strict';
 function generate(seed,width=108000,height=108000,river=[]){
  let state=(Number(seed)^0xa531e92d)>>>0;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const cliffs=[],bases=[];
  // Native Pi convention: byte-valued horizontal positions, one row per
  // two map units, cycling through hinder0..4. Avoid painting over water.
  const nearWater=(x,y,rx,ry)=>river.some(p=>Math.abs(p.x-x)<rx&&Math.abs(p.y-y)<ry);
  for(let row=0;row<600;row++){
   const y=(row+.5)*height/600;let x;
   for(let tries=0;tries<256;tries++){x=Math.floor(random()*241)*width/240;if(!nearWater(x,y,1600,600))break;}
   cliffs.push({x,y,variant:row%5});
  }
  for(let index=0;index<500;index++){
   let point=null;
   for(let attempt=0;attempt<100000;attempt++){
    const x=1200+random()*(width-2400),y=900+random()*(height-1800);
    if(nearWater(x,y,2000,1000))continue;
    if(cliffs.some(c=>Math.abs(c.x-x)<1450&&Math.abs(c.y-y)<600))continue;
    if(bases.some(b=>Math.abs(b.x-x)<2200&&Math.abs(b.y-y)<950))continue;
    point={x,y};break;
   }
   if(!point)throw Error('Unable to place all 500 bases without terrain overlap.');
   bases.push({...point,index,type:index>=496?'airbase':index>=476?'helibase':'base'});
  }
  return{cliffs,bases};
 }
 root.Dw5World=Object.freeze({generate});
 if(typeof module!=='undefined'&&module.exports)module.exports=root.Dw5World;
})(typeof globalThis!=='undefined'?globalThis:this);
