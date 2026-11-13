/* Bounded visual drift around a fixed simulation position. */
(function(root){
 'use strict';
 function offset(id,time,moving=false){const scale=moving?.35:1,phase=Number(id)*1.37;return{x:Math.sin(time*.85+phase)*4*scale,y:Math.sin(time*.63+phase*.71)*1.8*scale};}
 function point(unit,time){const d=offset(unit.id,time,!!unit.target);return{x:unit.x+d.x,y:unit.y+d.y};}
 function launchPoint(unit,time){const p=point(unit,time);return{x:p.x,y:p.y+8};}
 const api=Object.freeze({offset,point,launchPoint});root.ApexAirVisuals=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
