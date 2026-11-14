// APEX Battle Sandbox: optional, client-side fog of war.
// Vision comes from friendly bases and unit sight statistics; terrain remains
// explored after a friendly observer leaves. This is an APEX approximation,
// not a claim that DW5's private visibility server uses the same algorithm.
const ApexFog=(()=>{
 const CELL_X=180,CELL_Y=60,FOG_TICK_MS=180;
 let columns=0,rows=0,worldWidth=0,worldHeight=0;
 let visible=new Uint8Array(0),explored=new Uint8Array(0);
 let surface=null,context=null,pixels=null,lastTick=0,dirty=true;
 let enabled=true;
 try{enabled=localStorage.getItem('apex-fog-enabled')!=='off';}catch{}
 function configure(w,h){
  const cols=Math.ceil(w/CELL_X),rs=Math.ceil(h/CELL_Y);
  if(cols===columns&&rs===rows&&surface)return;
  columns=cols;rows=rs;worldWidth=w;worldHeight=h;
  visible=new Uint8Array(columns*rows);explored=new Uint8Array(columns*rows);
  surface=document.createElement('canvas');surface.width=columns;surface.height=rows;
  context=surface.getContext('2d',{alpha:true});pixels=context.createImageData(columns,rows);

  dirty=true;
 }
 function reset(){visible.fill(0);explored.fill(0);dirty=true;lastTick=0;}
 function setEnabled(value){
  enabled=!!value;dirty=true;lastTick=0;
  try{localStorage.setItem('apex-fog-enabled',enabled?'on':'off');}catch{}
 }
 function isEnabled(){return enabled;}
 function isVisiblePoint(x,y){
  if(!enabled)return true;
  if(!Number.isFinite(x)||!Number.isFinite(y)||!columns)return false;
  const col=Math.floor(x/CELL_X),row=Math.floor(y/CELL_Y);
  return col>=0&&row>=0&&col<columns&&row<rows&&visible[row*columns+col]===1;
 }
 function canSeeUnit(u){
  return !enabled||u.team===0||u.team===2||isVisiblePoint(u.x,u.y);
 }
 function markVision(x,y,radius){
  if(!(radius>0)||!Number.isFinite(x)||!Number.isFinite(y))return;
  // The world renders Y at one third of X scale (DW5-like 90 x 30).
  const minX=Math.max(0,Math.floor((x-radius)/CELL_X)),maxX=Math.min(columns-1,Math.ceil((x+radius)/CELL_X));
  const minY=Math.max(0,Math.floor((y-radius/3)/CELL_Y)),maxY=Math.min(rows-1,Math.ceil((y+radius/3)/CELL_Y));
  const radiusSq=radius*radius;
  for(let j=minY;j<=maxY;j++){
   const dy=((j+.5)*CELL_Y-y)*3,dySq=dy*dy;
   if(dySq>radiusSq)continue;
   for(let i=minX;i<=maxX;i++){
    const dx=(i+.5)*CELL_X-x;
    if(dx*dx+dySq<=radiusSq){
     const index=j*columns+i;visible[index]=1;explored[index]=1;
    }
   }
  }
 }
 function update(now,units,types,catalog,w,h,force=false){
  if(!enabled)return;
  configure(w,h);
  if(!force&&!dirty&&now-lastTick<FOG_TICK_MS)return;
  lastTick=now;dirty=false;visible.fill(0);
  for(const u of units){
   if(u.hp<=0||(u.team!==0&&u.team!==2))continue;
   const isBase=!types[u.type]?.speed;
   const sight=isBase?17:catalog.find(entry=>entry.type===u.type)?.combat?.sight;
   let radius=(Number.isFinite(sight)&&sight>0?sight:(isBase?17:9))*90;
   if(isBase&&(u.specialUpgrades?.radar||u.specialUpgrades?.detector))radius=Math.max(radius,29*90);
   if(isBase&&u.type==='airbase')radius=Math.max(radius,19*90);
   markVision(u.x,u.y,radius);
  }
  const data=pixels.data,edgeCells=3;
  // Keep the fog fully opaque/clear through the body of each region. Only
  // feather the outer edge of current vision, rather than blurring the whole map.
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const index=row*columns+col,j=index*4,seen=visible[index]===1,visited=explored[index]===1;
   const baseAlpha=seen?0:visited?150:225;
   let alpha=baseAlpha;
   if(!seen){
    let nearest=edgeCells+1;
    for(let dy=-edgeCells;dy<=edgeCells;dy++){
     const yy=row+dy;if(yy<0||yy>=rows)continue;
     for(let dx=-edgeCells;dx<=edgeCells;dx++){
      const xx=col+dx;if(xx<0||xx>=columns)continue;
      if(visible[yy*columns+xx]!==1)continue;
      const distance=Math.hypot(dx,dy);
      if(distance<nearest)nearest=distance;
     }
    }
    if(nearest<=edgeCells){
     const t=Math.max(0,Math.min(1,nearest/edgeCells));
     const smooth=t*t*(3-2*t);
     alpha=Math.round(baseAlpha*smooth);
    }
   }
   data[j]=13;data[j+1]=15;data[j+2]=12;data[j+3]=alpha;
  }
  context.putImageData(pixels,0,0);
 }
 function draw(ctx){
  if(enabled&&surface){ctx.imageSmoothingEnabled=true;ctx.drawImage(surface,0,0,worldWidth,worldHeight);}
 }
 function drawMinimap(ctx,w,h){
  if(enabled&&surface){ctx.imageSmoothingEnabled=true;ctx.drawImage(surface,0,0,w,h);}
 }
 function exportExplored(){
  if(!columns)return null;
  const bits=new Uint8Array(Math.ceil(explored.length/8));
  for(let i=0;i<explored.length;i++)if(explored[i])bits[i>>3]|=1<<(i&7);
  let binary='';const chunk=8192;
  for(let i=0;i<bits.length;i+=chunk)binary+=String.fromCharCode(...bits.subarray(i,i+chunk));
  return{columns,rows,bits:btoa(binary)};
 }
 function importExplored(saved,w,h){
  configure(w,h);
  if(!saved||saved.columns!==columns||saved.rows!==rows||typeof saved.bits!=='string')return false;
  try{
   const raw=atob(saved.bits);
   if(raw.length!==Math.ceil(explored.length/8))return false;
   explored.fill(0);
   for(let i=0;i<explored.length;i++)explored[i]=(raw.charCodeAt(i>>3)>>(i&7))&1;
   dirty=true;lastTick=0;return true;
  }catch{return false;}
 }
 return{configure,reset,setEnabled,isEnabled,isVisiblePoint,canSeeUnit,update,draw,drawMinimap,exportExplored,importExplored};
})();
