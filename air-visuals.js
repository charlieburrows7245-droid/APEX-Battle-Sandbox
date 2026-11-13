/* Continuous projected circles around fixed formation-slot centres. */
(function(root){
 'use strict';
 const RATE=2.2,HELICOPTER_RATE=1.1;
 function pose(unit,time,helicopter=unit.type==='heli'){
  const radius=helicopter?24:72,rate=helicopter?HELICOPTER_RATE:RATE;
  // Independent phases reproduce the scattered turning aircraft in the reference.
  const phase=(unit.groupId??0)*.37+(unit.groupSlot??unit.id)*2.399963229728653+time*rate;
  const dx=Math.cos(phase)*radius,dy=Math.sin(phase)*radius/3;
  const speed=unit.target?Math.max(0,unit.moveSpeed||0):0,heading=unit.angle||0;
  const vx=Math.cos(heading)*speed-Math.sin(phase)*radius*rate;
  const vy=Math.sin(heading)*speed+Math.cos(phase)*radius*rate;
  return{x:unit.x+dx,y:unit.y+dy,dx,dy,heading:Math.atan2(vy,vx),radius,rate};
 }
 function offset(id,time){const p=pose({id,x:0,y:0},time);return{x:p.dx,y:p.dy};}
 function point(unit,time,helicopter){const p=pose(unit,time,helicopter);return{x:p.x,y:p.y};}
 function launchPoint(unit,time,helicopter){const p=point(unit,time,helicopter);return{x:p.x,y:p.y+8};}
 const api=Object.freeze({RATE,HELICOPTER_RATE,pose,offset,point,launchPoint});root.ApexAirVisuals=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
