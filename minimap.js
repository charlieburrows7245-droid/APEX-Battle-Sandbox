/* Render only terrain routes, crossings and static bases on the overview. */
(function(root){
 'use strict';
 function draw(c,width,height,worldWidth,worldHeight,bases,rivers,highways=[],colors=[]){
  const sx=width/worldWidth,sy=height/worldHeight;
  c.save();c.fillStyle='#000';c.fillRect(0,0,width,height);
  c.strokeStyle='#927649';c.lineWidth=2;
  for(const road of highways){c.beginPath();c.moveTo(road.x1*sx,road.y1*sy);c.lineTo(road.x2*sx,road.y2*sy);c.stroke();}
  const dx=[-30,230,630,1100,1100,1100,870,540,30,-230,-630,-1100,-1100,-1100,-870,-540,-470,1100,470,-1100],dy=[300,300,300,180,-60,-200,-300,-300,-300,-300,-300,-180,60,200,300,300,-90,-300,90];
  c.strokeStyle='#668d9e';c.lineWidth=1.5;
  for(const p of rivers){c.beginPath();c.moveTo(p.x*sx,p.y*sy);c.lineTo((p.x+dx[p.type])*sx,(p.y+dy[p.type])*sy);c.stroke();}
  c.strokeStyle='#e2c186';c.lineWidth=2;
  for(const p of rivers){if(p.type<16)continue;const x=(p.left+750)*sx,y=(p.top+250)*sy,horizontal=p.image===9;c.beginPath();c.moveTo(x-(horizontal?3:0),y-(horizontal?0:3));c.lineTo(x+(horizontal?3:0),y+(horizontal?0:3));c.stroke();}
  // Paint special bases last so their identifying strokes remain readable.
  const allowed=new Set(['base','airbase','helibase']);
  for(const b of bases.filter(b=>allowed.has(b.type)&&b.hp>0).sort((a,b)=>(a.type==='base'?0:1)-(b.type==='base'?0:1))){
   const x=Math.round(b.x*sx),y=Math.round(b.y*sy),air=b.type==='airbase',heli=b.type==='helibase';
   c.fillStyle=air?'#56a9ff':heli?'#6ee9cf':colors[b.team]||'#c2bd9f';c.fillRect(x-1,y-1,3,3);
   if(air||heli){c.strokeStyle=c.fillStyle;c.lineWidth=1;c.beginPath();c.moveTo(x-(air?4:0),y-(heli?4:0));c.lineTo(x+(air?4:0),y+(heli?4:0));c.stroke();}
  }
  c.restore();
 }
 root.ApexMinimap=Object.freeze({draw});
 if(typeof module!=='undefined'&&module.exports)module.exports=root.ApexMinimap;
})(typeof globalThis!=='undefined'?globalThis:this);
