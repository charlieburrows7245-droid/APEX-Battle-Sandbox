/* Terrain, team-coloured bases/troops and the current camera viewport. */
(function(root){
 'use strict';
 function draw(c,width,height,worldWidth,worldHeight,bases,rivers,highways=[],colors=[],camera=null){
  const sx=width/worldWidth,sy=height/worldHeight;
  c.save();c.clearRect(0,0,width,height);c.fillStyle='#000';c.fillRect(0,0,width,height);c.beginPath();c.rect(0,0,width,height);c.clip();
  const teamColor=team=>team===0?'#65ff38':team===1?'#ff3535':team===2?'#3d8dff':'#3c60bd';
  c.strokeStyle='#927649';c.lineWidth=2;
  for(const road of highways){c.beginPath();c.moveTo(road.x1*sx,road.y1*sy);c.lineTo(road.x2*sx,road.y2*sy);c.stroke();}
  const dx=[-30,230,630,1100,1100,1100,870,540,30,-230,-630,-1100,-1100,-1100,-870,-540,-470,1100,470,-1100],dy=[300,300,300,180,-60,-200,-300,-300,-300,-300,-300,-180,60,200,300,300,-90,-300,90];
  c.strokeStyle='#639cb0';c.lineWidth=1.6;c.lineCap='round';c.lineJoin='round';
  for(const p of rivers){c.beginPath();c.moveTo(p.x*sx,p.y*sy);c.lineTo((p.x+dx[p.type])*sx,(p.y+dy[p.type])*sy);c.stroke();}
  c.strokeStyle='#e2c186';c.lineWidth=2;
  for(const p of rivers){if(p.type<16)continue;const x=(p.x+dx[p.type]/2)*sx,y=(p.y+dy[p.type]/2)*sy,horizontal=p.image===9;c.beginPath();c.moveTo(x-(horizontal?3:0),y-(horizontal?0:3));c.lineTo(x+(horizontal?3:0),y+(horizontal?0:3));c.stroke();}
  // Paint special bases last so their identifying strokes remain readable.
  const allowed=new Set(['base','airbase','helibase']);
  for(const b of bases.filter(b=>allowed.has(b.type)&&b.hp>0).sort((a,b)=>(a.type==='base'?0:1)-(b.type==='base'?0:1))){
   const x=Math.round(b.x*sx),y=Math.round(b.y*sy),air=b.type==='airbase',heli=b.type==='helibase';
   c.fillStyle=teamColor(b.team);c.fillRect(x-1,y-1,3,3);
   if(air||heli){c.strokeStyle=c.fillStyle;c.lineWidth=1;c.beginPath();c.moveTo(x-(air?4:0),y-(heli?4:0));c.lineTo(x+(air?4:0),y+(heli?4:0));c.stroke();}
  }
  for(const u of bases){if(allowed.has(u.type)||!(u.hp>0))continue;c.fillStyle=teamColor(u.team);c.beginPath();c.arc(u.x*sx,u.y*sy,1.1,0,Math.PI*2);c.fill();}
  if(camera&&Number.isFinite(camera.x+camera.y+camera.width+camera.height)){
   const clamp=(n,max)=>Math.max(0,Math.min(max,n)),x=clamp(camera.x*sx,width),y=clamp(camera.y*sy,height);
   c.strokeStyle='#b8a45e';c.lineWidth=1;c.globalAlpha=.65;c.lineCap='butt';
   c.beginPath();c.moveTo(x,0);c.lineTo(x,height);c.moveTo(0,y);c.lineTo(width,y);c.stroke();
   const left=clamp((camera.x-camera.width/2)*sx,width),right=clamp((camera.x+camera.width/2)*sx,width),top=clamp((camera.y-camera.height/2)*sy,height),bottom=clamp((camera.y+camera.height/2)*sy,height);
   c.globalAlpha=.95;c.strokeRect(left,top,Math.max(1,right-left),Math.max(1,bottom-top));
  }
  c.restore();
 }
 root.ApexMinimap=Object.freeze({draw});
 if(typeof module!=='undefined'&&module.exports)module.exports=root.ApexMinimap;
})(typeof globalThis!=='undefined'?globalThis:this);
