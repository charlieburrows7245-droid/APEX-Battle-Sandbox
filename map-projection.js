/* DW5 awversion=5: Vg=90, KE=3, Wi=Vg/KE. */
(function(root){
 'use strict';
 const LIMIT=1200,STEP_X=90,STEP_Y=30,WIDTH=LIMIT*STEP_X,HEIGHT=LIMIT*STEP_Y,VERSION=2;
 function migrateScenario(saved){
  if(saved.mapProjectionVersion>=VERSION)return saved;
  // Legacy scenarios stored projected Y in a world three times too tall.
  // Convert positions and nested movement targets together, retaining IDs,
  // ownership, health, upgrade state and queue state.
  const copy=JSON.parse(JSON.stringify(saved));
  const visit=value=>{if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(['y','rallyY','lastY','oldY'].includes(key)&&Number.isFinite(value[key]))value[key]/=3;else if(typeof value[key]==='object')visit(value[key]);}};
  visit(copy);if(copy.zoom===.65)copy.zoom=1;copy.mapProjectionVersion=VERSION;return copy;
 }
 const api=Object.freeze({LIMIT,STEP_X,STEP_Y,WIDTH,HEIGHT,VERSION,migrateScenario});root.Dw5Projection=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
