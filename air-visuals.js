/* Continuous projected circles around fixed formation-slot centres. */
(function(root){
 'use strict';
 const RATE=.48;
 function pose(unit,time,helicopter=unit.type==='heli'){
  const radius=helicopter?24:56,phase=(unit.groupId??unit.id)*1.37+time*RATE;
  const dx=Math.cos(phase)*radius,dy=Math.sin(phase)*radius/3;
  const speed=unit.target?Math.max(0,unit.moveSpeed||0):0,heading=unit.angle||0;
  const vx=Math.cos(heading)*speed-Math.sin(phase)*radius*RATE;
  const vy=Math.sin(heading)*speed+Math.cos(phase)*radius*RATE;
  return{x:unit.x+dx,y:unit.y+dy,dx,dy,heading:Math.atan2(vy,vx),radius};
 }
 function offset(id,time){const p=pose({id,x:0,y:0},time);return{x:p.dx,y:p.dy};}
 function point(unit,time,helicopter){const p=pose(unit,time,helicopter);return{x:p.x,y:p.y};}
 function launchPoint(unit,time,helicopter){const p=point(unit,time,helicopter);return{x:p.x,y:p.y+8};}
 const api=Object.freeze({RATE,pose,offset,point,launchPoint});root.ApexAirVisuals=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
