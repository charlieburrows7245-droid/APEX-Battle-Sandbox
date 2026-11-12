/* DW5 5 river tiles, decoded from the supplied awversion=5 client.
   Layout selection is APEX seeded generation; DW5's server generator is private. */
(function(root){
 'use strict';
 const DX=[-30,230,630,1100,1100,1100,870,540,30,-230,-630,-1100,-1100,-1100,-870,-540,-470,1100,470,-1100];
 const DY=[300,300,300,180,-60,-200,-300,-300,-300,-300,-300,-180,60,200,300,300,300,-90,-300,90];
 const LEFT=[0,-600,-490,-169,0,0,0,-267,-350,-550,-711,-964,-1100,-1100,-1100,-1023,-843,-900,0,-370,-1100];
 const TOP=[0,0,0,0,-115,-260,-310,-400,-400,-400,-400,-400,-255,-120,-70,0,0,0,-270,-400,-150];
 function decodeLayout(encoded,startX=10000,startY=0){
  if(typeof encoded!=='string'||!encoded.length||encoded.length>20000||!/^[a-t]+$/.test(encoded))throw Error('Expected DW5 5 letter-coded river data (a–t).');
  if(!Number.isFinite(startX)||!Number.isFinite(startY))throw Error('Invalid river origin.');
  let x=startX,y=startY;
  return Array.from(encoded,ch=>{const type=ch.charCodeAt(0)-97,t=type+1;
   const piece={type,x,y,left:x+LEFT[t]-150,top:y+TOP[t]-50,image:type<16?type%8+1:type%2===0?9:10};
   x+=DX[type];y+=DY[type];return piece;
  });
 }
 function seededLayout(seed,width,height){
  let state=Number(seed)>>>0;state=Math.imul(state^(state>>>16),0x7feb352d);state=Math.imul(state^(state>>>15),0x846ca68b);state=(state^(state>>>16))>>>0;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const entryEdge=0,exitEdge=Math.floor(random()*4); // Always enter from the top.
  const edgePoint=(edge,fraction)=>edge===0?{x:width*fraction,y:-600}:edge===1?{x:width+600,y:height*fraction}:edge===2?{x:width*fraction,y:height+600}:{x:-600,y:height*fraction};
  const entryFraction=.18+.64*random();let exitFraction=.18+.64*random();
  if(entryEdge===exitEdge&&Math.abs(exitFraction-entryFraction)<.3)exitFraction=entryFraction<.5?.82:.18;
  const entry=edgePoint(entryEdge,entryFraction),exit=edgePoint(exitEdge,exitFraction);
  const inward=(point,edge)=>({x:edge===1?width*.7:edge===3?width*.3:point.x,y:edge===0?height*.3:edge===2?height*.7:point.y});
  const c1=inward(entry,entryEdge),c2=inward(exit,exitEdge),phase=random()*Math.PI*2,waypoints=[];
  // Follow a smooth interior bend, rather than visiting a random centre
  // point that could make the river double back across its own channel.
  for(let i=1;i<=24;i++){
   const t=i/24,u=1-t;
   let px=u*u*u*entry.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*exit.x;
   let py=u*u*u*entry.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*exit.y;
   const dx=3*u*u*(c1.x-entry.x)+6*u*t*(c2.x-c1.x)+3*t*t*(exit.x-c2.x);
   const dy=3*u*u*(c1.y-entry.y)+6*u*t*(c2.y-c1.y)+3*t*t*(exit.y-c2.y),length=Math.hypot(dx,dy)||1;
   const ripple=Math.sin(Math.PI*t)*Math.sin(t*Math.PI*6+phase)*Math.min(width,height)*.025;
   px-=dy/length*ripple;py+=dx/length*ripple;waypoints.push({x:px,y:py});
  }
  let x=entry.x,y=entry.y,heading=[0,12,8,4][entryEdge],codes='',targetIndex=0;
  const projectedDistance=(a,b)=>Math.hypot(a.x-b.x,3*(a.y-b.y));
  const outsideExit=()=>exitEdge===0?y<0:exitEdge===1?x>width:exitEdge===2?y>height:x<0;
  for(let k=0;k<Math.ceil((width+height)*4/180)+100;k++){
   const target=waypoints[targetIndex];
   if(projectedDistance({x,y},target)<3500&&targetIndex<waypoints.length-1){targetIndex++;continue;}
   if(targetIndex===waypoints.length-1&&outsideExit()&&k>4)break;
   const desired=Math.atan2((target.y-y)*3,target.x-x);
   let next=heading,best=Infinity;
   for(const turn of [0,-1,1]){const type=(heading+turn+16)%16,angle=Math.atan2(DY[type]*3,DX[type]);
    const error=Math.abs(Math.atan2(Math.sin(angle-desired),Math.cos(angle-desired)));
    if(error<best){best=error;next=type;}
   }
   heading=next;codes+=String.fromCharCode(97+heading);x+=DX[heading];y+=DY[heading];
  }
  return[{encoded:codes,startX:entry.x,startY:entry.y,entryEdge,exitEdge}];
 }

 root.Dw5Rivers=Object.freeze({decodeLayout,seededLayout});
 if(typeof module!=='undefined'&&module.exports)module.exports=root.Dw5Rivers;
})(typeof globalThis!=='undefined'?globalThis:this);
