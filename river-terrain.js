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
  let state=Number(seed)>>>0;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const layouts=[],count=1; // One continuous river per map.
  for(let n=0;n<count;n++){
   const startX=width*((n+.25+.5*random())/count);let x=startX,y=-600,heading=0,codes='';
   for(let k=0;k<Math.ceil(height/140)+40&&y<height+600;k++){
    const previousHeading=heading;
    if(k>2&&random()<.35)heading+=random()<.5?-1:1;
    // Native a/b/c and o/p/a pieces curve gradually; never jump to an
    // unrelated sprite orientation or fabricate junctions between banks.
    heading=Math.max(-2,Math.min(2,heading));
    if(x<1000)heading=Math.min(2,heading+1);if(x>width-1500)heading=Math.max(-2,heading-1);
    heading=Math.max(previousHeading-1,Math.min(previousHeading+1,heading));
    const type=(heading+16)%16;codes+=String.fromCharCode(97+type);x+=DX[type];y+=DY[type];
   }
   layouts.push({encoded:codes,startX,startY:-600});
  }
  return layouts;
 }
 root.Dw5Rivers=Object.freeze({decodeLayout,seededLayout});
 if(typeof module!=='undefined'&&module.exports)module.exports=root.Dw5Rivers;
})(typeof globalThis!=='undefined'?globalThis:this);
