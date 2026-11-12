'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),mini=$('mini'),mc=mini.getContext('2d');
let ctx=canvas.getContext('2d',{alpha:false});
const MAP_LIMIT=1200,MAP_STEP_X=90,MAP_STEP_Y=90,WORLD_WIDTH=MAP_LIMIT*MAP_STEP_X,WORLD_HEIGHT=MAP_LIMIT*MAP_STEP_Y;
function mapCoordinates(p){return{x:Math.max(0,Math.min(MAP_LIMIT,Math.floor(p.x/MAP_STEP_X))),y:Math.max(0,Math.min(MAP_LIMIT,Math.floor(p.y/MAP_STEP_Y)))}}
const TYPES={tank:{name:'Type 99',icon:'▰',speed:150,dw5Speed:2,range:165,damage:19,hp:160},aa:{name:'TanSAM',icon:'▤',speed:75,dw5Speed:1,range:240,damage:15,hp:110},heli:{name:'Apache',icon:'✣',speed:112,range:180,damage:16,hp:100},jet:{name:'J-10',icon:'✈',speed:170,range:210,damage:22,hp:100},raptor:{name:'F-22C Raptor',icon:'✈',speed:8*75,range:12*90,damage:50,hp:65000},base:{name:'Military base',icon:'▦',speed:0,range:210,damage:12,hp:1000},airbase:{name:'Airbase',icon:'⊞',speed:0,range:210,damage:12,hp:800}};
let units=[],selected=new Set(),team=0,tool='select',paused=false,speed=1,zoom=.65,cam={x:1200,y:800},W=0,H=0,drag=null,mouse={x:0,y:0},shots=[],uid=0,last=0,statsTimer=0;
const colors=['#65ff38','#ff3535','#00cfff'];
function notice(t){$('notice').textContent=t}
function setTool(t){tool=t;document.querySelectorAll('[data-type]').forEach(b=>b.classList.toggle('active',b.dataset.type===t));$('select').classList.toggle('active',t==='select');canvas.style.cursor=t==='select'?'default':'crosshair'}
for(const [id,t] of Object.entries(TYPES)){if(t.speed&&!['heli','raptor'].includes(id))continue;let b=document.createElement('button');b.dataset.type=id;b.innerHTML=`<span>${t.icon}</span>${id==='heli'?'Apache helicopter':t.name}`;b.onclick=()=>{setTool(id);notice('Click the battlefield to place '+t.name)};$('catalog').append(b)}
function add(type,x,y,side){let t=TYPES[type];units.push({id:++uid,type,x,y,team:side,hp:t.hp,factoryLevel:1,militaryCentralLevel:0,wallLevel:2,defenceGuns:2,angle:side?Math.PI:0,cool:Math.random(),target:null})}

const GROUP_SIZE=49,PLAYER_TEAM=0;
const DW5_FORMATION_X=[0,1,1,-1,-1,0,2,0,-2,2,2,-2,-2,1,1,-1,-1,3,3,-3,-3,0,4,0,-4,-3,3,-3,3,-4,4,-4,4,2,-2,-2,2,5,-5,5,-5,1,-1,-1,1,0,6,0,-6];
const DW5_FORMATION_Y=[0,-1,1,1,-1,-2,0,2,0,-2,2,2,-2,-3,3,-3,3,-1,1,-1,1,-4,0,4,0,-3,3,3,-3,2,2,-2,-2,4,-4,4,-4,1,1,-1,-1,5,-5,5,-5,6,0,-6,0];
let nextGroupId=0;
function troopSpacing(type){return {tank:48,aa:55,heli:60,jet:85,raptor:85}[type]??48;}
function formationOffset(type,index){return{x:DW5_FORMATION_X[index%49]*troopSpacing(type),y:DW5_FORMATION_Y[index%49]*troopSpacing(type)/3};}
function friendlyTeams(a,b){return a===b||(a===0&&b===2)||(a===2&&b===0);}
function troopRelationColor(side){return side===PLAYER_TEAM?'#65ff38':friendlyTeams(side,PLAYER_TEAM)?'#00cfff':'#ff3535';}
function troopGroups(list=units){const groups=new Map();for(const u of list){if(!TYPES[u.type]?.speed)continue;const key=u.groupId??'single-'+u.id;let g=groups.get(key);if(!g){g=[];groups.set(key,g);}g.push(u);}return [...groups.values()];}
function repairTroopGroups(){divisionMotion.clear();nextGroupId=units.reduce((max,u)=>Math.max(max,Number(u.groupId)||0),nextGroupId);const pending=new Map(),remap=new Map();for(const u of units){if(!TYPES[u.type]?.speed)continue;const key=(u.groupId??'legacy')+':'+u.team+':'+u.type;let batch=pending.get(key);if(!batch||batch.count>=49){batch={id:++nextGroupId,count:0,used:new Set()};pending.set(key,batch);if(!remap.has(key))remap.set(key,batch.id);}let slot=u.groupSlot;if(!Number.isInteger(slot)||slot<0||slot>=49||batch.used.has(slot)){slot=0;while(batch.used.has(slot))slot++;}batch.used.add(slot);u.groupId=batch.id;u.groupSlot=slot;batch.count++;}for(const u of units)if(u.joinOrder){const id=remap.get(u.joinOrder.groupId+':'+u.team+':'+u.type);if(id)u.joinOrder.groupId=id;else{delete u.joinOrder;u.target=null;}}}
function expandGroupSelection(){const ids=new Set(units.filter(u=>selected.has(u.id)&&TYPES[u.type].speed).map(u=>u.groupId));for(const u of units)if(TYPES[u.type].speed&&ids.has(u.groupId))selected.add(u.id);}
function drawTroopGroupLabels(visible){ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font='bold 12px Tahoma,Arial,sans-serif';for(const group of troopGroups()){if(!group.some(visible))continue;const x=group.reduce((sum,u)=>sum+u.x,0)/group.length,cy=group.reduce((sum,u)=>sum+u.y,0)/group.length,y=Math.min(...group.map(u=>u.y))-45;if(group.some(u=>selected.has(u.id))){const radius=Math.max(...group.map(u=>Math.abs(u.x-x)+3*Math.abs(u.y-cy)))+36;ctx.strokeStyle='#dde89b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-radius,cy);ctx.lineTo(x,cy-radius/3);ctx.lineTo(x+radius,cy);ctx.lineTo(x,cy+radius/3);ctx.closePath();ctx.stroke();}ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.9)';const first=group[0],owner=(first.playerName??BASE_PLAYER_NAMES[first.team]??'Player').toUpperCase(),label=group.length+' '+TYPES[first.type].name;ctx.strokeText(owner,x,y-12);ctx.strokeText(label,x,y);ctx.fillStyle=troopRelationColor(first.team);ctx.fillText(owner,x,y-12);ctx.fillText(label,x,y);}ctx.restore();}

function spawn(type,x,y,side,count,originBase=null){if(!TYPES[type].speed){for(let i=0;i<count;i++)add(type,x,y,side);return;}let remaining=Math.max(0,Math.trunc(count));while(remaining){let members=originBase===null?null:troopGroups().find(g=>g.length+reservedJoinSlots(g[0].groupId).length<49&&!g[0].joinOrder&&g[0].type===type&&g[0].team===side&&g[0].originBase===originBase);const batch=originBase===null?Math.floor((count-remaining)/49):troopGroups().filter(g=>g[0].type===type&&g[0].team===side&&g[0].originBase===originBase).length,anchorX=x+(members?0:batch*troopSpacing(type)*14),id=members?.[0].groupId??++nextGroupId,amount=Math.min(remaining,49-(members?.length??0)-(members?reservedJoinSlots(members[0].groupId).length:0)),used=new Set([...(members??[]).map(u=>u.groupSlot),...(members?reservedJoinSlots(members[0].groupId):[])]);for(let i=0;i<amount;i++){let slot=0;while(used.has(slot))slot++;used.add(slot);const offset=formationOffset(type,slot),single=count===1;add(type,Math.max(0,Math.min(WORLD_WIDTH,(single?x:anchorX+offset.x))),Math.max(0,Math.min(WORLD_HEIGHT,y+(single?0:offset.y))),side);const u=units[units.length-1];Object.assign(u,{groupId:id,groupSlot:slot,originBase,rallyX:members?.[0].rallyX??anchorX,rallyY:members?.[0].rallyY??y});}remaining-=amount;}}
function demo(){units=[];selected.clear();shots=[];add('airbase',1110,620,0);add('base',2050,1300,1);spawn('heli',850,1030,0,49);spawn('tank',650,1270,0,14);spawn('aa',1430,1110,0,7);spawn('heli',2110,700,1,7);cam={x:1110,y:690};zoom=1.1;notice('Raised airbase demo. Select troops and left-click ground to move. Right-drag to pan.');}
$('blue').onclick=()=>setTeam(0);$('red').onclick=()=>setTeam(1);$('ally').onclick=()=>setTeam(2);function setTeam(t){team=t;$('blue').classList.toggle('active',t===0);$('red').classList.toggle('active',t===1);$('ally').classList.toggle('active',t===2)}
$('select').onclick=()=>setTool('select');function togglePause(){paused=!paused;$('pause').textContent=paused?'▶ Resume':'Ⅱ Pause'}$('pause').onclick=togglePause;$('speed').onchange=e=>speed=+e.target.value;$('reset').onclick=()=>{if(confirm('Replace the current battlefield with the demo?'))demo()};$('clear').onclick=()=>{if(confirm('Clear all troops and bases?')){units=[];selected.clear();notice('Empty battlefield ready. Choose a unit to deploy.')}};
$('save').onclick=()=>{try{localStorage.setItem('apex-sandbox-v1',JSON.stringify({units,cam,zoom,uid}));notice('Scenario saved in this browser.')}catch{notice('Could not save: browser storage is unavailable.')}};
$('load').onclick=()=>{try{let s=JSON.parse(localStorage.getItem('apex-sandbox-v1'));if(!s||!Array.isArray(s.units))return notice('No saved scenario in this browser.');units=s.units;repairTroopGroups();cam=s.cam;zoom=s.zoom;uid=s.uid;selected.clear();shots=[];notice('Saved scenario loaded.')}catch{notice('Could not load the saved scenario.')}};
$('home').onclick=()=>{cam={x:WORLD_WIDTH/2,y:WORLD_HEIGHT/2};zoom=Math.min((W-80)/WORLD_WIDTH,(H-80)/WORLD_HEIGHT)};$('zin').onclick=()=>zoom=Math.min(2,zoom*1.2);$('zout').onclick=()=>zoom=Math.max(.005,zoom/1.2);
function resize(){W=canvas.clientWidth;H=canvas.clientHeight;canvas.width=W*devicePixelRatio;canvas.height=H*devicePixelRatio}new ResizeObserver(resize).observe(canvas);
function world(p){return{x:(p.x-W/2)/zoom+cam.x,y:(p.y-H/2)/zoom+cam.y}}function pos(e){let r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function issueMove(w){expandGroupSelection();const groups=troopGroups(units.filter(u=>selected.has(u.id)));const cols=Math.ceil(Math.sqrt(groups.length));groups.forEach((group,gi)=>{const gap=troopSpacing(group[0].type)*14,cx=w.x+(gi%cols-(cols-1)/2)*gap,cy=w.y+(Math.floor(gi/cols)-(Math.ceil(groups.length/cols)-1)/2)*gap/3;group.forEach(u=>{delete u.joinOrder;u.formationOrder={x:Math.max(0,Math.min(WORLD_WIDTH,cx)),y:Math.max(0,Math.min(WORLD_HEIGHT,cy))};});});const n=groups.reduce((sum,g)=>sum+g.length,0);if(n){notice('Movement order: '+groups.length+' groups · '+n+' troops');addOrderMarker(w.x,w.y,'move');}return n;}
canvas.oncontextmenu=e=>e.preventDefault();canvas.onpointerdown=e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);let p=pos(e),w=world(p);if(e.button===2||e.button===1){drag={kind:'pan',button:e.button,start:p,cam:{...cam}};canvas.style.cursor='grabbing';return}if(e.button!==0)return;if(tool!=='select'){if(w.x<0||w.x>WORLD_WIDTH||w.y<0||w.y>WORLD_HEIGHT)return;spawn(tool,w.x,w.y,team,TYPES[tool].speed?+$('quantity').value:1);notice(TYPES[tool].name+' deployed for '+(['Your','Enemy','Ally'][team])+' force.');return}drag={kind:'select',start:p,end:p,shift:e.shiftKey}};
canvas.onpointermove=e=>{mouse=pos(e);if(!drag)return;if(drag.kind==='pan'){cam.x=Math.max(0,Math.min(WORLD_WIDTH,drag.cam.x-(mouse.x-drag.start.x)/zoom));cam.y=Math.max(0,Math.min(WORLD_HEIGHT,drag.cam.y-(mouse.y-drag.start.y)/zoom))}else drag.end=mouse};
canvas.onpointerup=e=>{if(drag?.kind==='pan'&&drag.button===2&&Math.hypot(drag.start.x-pos(e).x,drag.start.y-pos(e).y)<5)transferTroopToClickedGroup(world(pos(e)));if(drag?.kind==='select'){const a=world(drag.start),b=world(pos(e));if(Math.hypot(drag.start.x-pos(e).x,drag.start.y-pos(e).y)<5){const troop=units.slice().reverse().find(u=>TYPES[u.type].speed&&Math.hypot(u.x-b.x,u.y-b.y)<28);if(troop){if(!drag.shift)selected.clear();selected.add(troop.id);notice(TYPES[troop.type].name+' selected. Left-click ground to move.')}else if(!drag.shift&&issueMove(b)){/* Keep the formation selected after a movement order. */}else{if(!drag.shift)selected.clear();const base=units.find(u=>!TYPES[u.type].speed&&Math.abs(u.x-b.x)<750&&Math.abs(u.y-b.y)<250);if(base)selected.add(base.id)}}else{if(!drag.shift)selected.clear();units.filter(u=>TYPES[u.type].speed&&u.x>=Math.min(a.x,b.x)&&u.x<=Math.max(a.x,b.x)&&u.y>=Math.min(a.y,b.y)&&u.y<=Math.max(a.y,b.y)).forEach(u=>selected.add(u.id))}}expandGroupSelection();drag=null;canvas.style.cursor=tool==='select'?'default':'crosshair'};canvas.onpointercancel=()=>{drag=null;canvas.style.cursor=tool==='select'?'default':'crosshair'};
canvas.onwheel=e=>{e.preventDefault();let p=pos(e),before=world(p);zoom=Math.max(.005,Math.min(2,zoom*Math.exp(-e.deltaY*.001)));let after=world(p);cam.x+=before.x-after.x;cam.y+=before.y-after.y};
window.onkeydown=e=>{if(['INPUT','SELECT'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();togglePause()}if(e.key==='Escape'){setTool('select');selected.clear()}if(e.key==='Delete'){units=units.filter(u=>!selected.has(u.id));selected.clear()}if(e.key.toLowerCase()==='a'){units.filter(u=>u.team===team&&TYPES[u.type].speed).forEach(u=>selected.add(u.id))}};
mini.onclick=e=>{let r=mini.getBoundingClientRect();cam={x:(e.clientX-r.left)/r.width*WORLD_WIDTH,y:(e.clientY-r.top)/r.height*WORLD_HEIGHT}};
const terrain=document.createElement('canvas');terrain.width=terrain.height=256;const tc=terrain.getContext('2d');let seed=42;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}tc.fillStyle='#737b4b';tc.fillRect(0,0,256,256);for(let i=0;i<28000;i++){let n=rand();tc.fillStyle=n>.5?'rgba(36,47,22,.12)':'rgba(204,196,123,.15)';tc.fillRect(rand()*256,rand()*256,1+rand()*3,1+rand()*2)}const grass=ctx.createPattern(terrain,'repeat');
const dwArt={};const groundBlendArt={};let artRevision=0;const baseRenderCache=new WeakMap();
// Feather each ground tile once on load; the cached view composites overlaps.
function blendGroundTile(im){
 const out=document.createElement('canvas');out.width=im.naturalWidth;out.height=im.naturalHeight;const c=out.getContext('2d');c.drawImage(im,0,0);const pixels=c.getImageData(0,0,out.width,out.height),d=pixels.data,w=out.width,h=out.height;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const rippleX=7*Math.sin(y*.037)+4*Math.sin(y*.091),rippleY=5*Math.sin(x*.027)+3*Math.cos(x*.063);
  const edge=Math.min((x-rippleX)/150,(w-1-x+rippleX)/150,(y-rippleY)/55,(h-1-y+rippleY)/55),t=Math.max(0,Math.min(1,edge));d[(y*w+x)*4+3]=Math.round(255*t*t*(3-2*t));
 }c.putImageData(pixels,0,0);return out;
}
function blendTerrain(im){const out=document.createElement('canvas');out.width=im.naturalWidth;out.height=im.naturalHeight;const c=out.getContext('2d');c.drawImage(im,0,0);const pixels=c.getImageData(0,0,out.width,out.height),d=pixels.data,w=out.width,h=out.height;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const ripple=9*Math.sin(x*.029)+5*Math.sin(x*.071+y*.037);const sideRipple=11*Math.sin(y*.047)+5*Math.cos(y*.107);const edge=Math.min((x-sideRipple)/105,(w-1-x+sideRipple)/105,(y-ripple)/65,(h-1-y+ripple)/75);const a=Math.max(0,Math.min(1,edge));d[(y*w+x)*4+3]=Math.round(255*a*a*(3-2*a))}c.putImageData(pixels,0,0);return out}
for(const name of ['boden0.jpg','boden1.jpg','boden2.jpg','boden3.jpg','boden4.jpg','boden5.jpg','boden6.jpg','g0.png','g1.png','g2.png','g3.png','g4.png','g5.png','g6.png','g7.png','g8.png','airbase1.png','airbase2.png','airbase3.png','airbase.jpg','jammerturm.png','radarturm1.png','radarturm2.png','detec1.png','detec2.png','rakerw.png','garage2a.png','berg1.jpg','berg4.jpg','garage1b.png','garage2b.png','berg2.jpg','g9.png','mauer1a.png','mauer1d.png','mauer2a.png','mauer2b.png','mauer1b.png','mauer2d.png','flak.png','icons.jpg','bmischer.png','oelpump.png','kamin.png','berg1b.png','palmen.png','flaggeg.png','flaggeb.png','flagger.png','flagget.png','flagges.png']){const im=new Image();im.onload=()=>{artRevision++;if(/^boden[0-6]\.jpg$/.test(name))groundBlendArt[name]=blendGroundTile(im);if(/^berg[124]\.jpg$/.test(name))dwArt[name]=blendTerrain(im)};im.src='assets/i/'+name;dwArt[name]=im}
function buildingSprite(name,level,x,y,w,h,frames=10){let im=dwArt[name];if(!im?.complete||!im.naturalWidth)return;const fw=im.naturalWidth/frames;ctx.drawImage(im,fw*level,0,fw,im.naturalHeight,x-w/2,y-h/2,w,h)}
// DW5: native terrain is 1500x500; its defence anchor is (1260,400)
// from the image top-left, or (510,150) from the image centre.
// Native DW5 Wj/AC arrays. AC is projected by KE=3; gun order is reversed
// for depth sorting, then the wall foreground is drawn over gun bases.
const DW5_DEFENCE={"x":[[50,-50,90,-64,130,-77,170,-90,210,-102,250,-114,290,-125,330,-136,70,-30,110,-40,150,-49,190,-58,230,-66,270,-74,310,-81,90,-10,130,-16,170,-22,210,-27,250,-32,290,-36,110,10,150,7,190,4,230,2],[-50,50,-90,64,-130,77,-170,90,-210,102,-250,114,-290,125,-330,136,-70,30,-110,40,-150,49,-190,58,-230,66,-270,74,-310,81,-90,10,-130,16,-170,22,-210,27,-250,32,-290,36,-110,-10,-150,-7,-190,-4,-230,-2],[50,-50,90,-90,130,-130,170,-170,210,-210,250,-250,290,-290,330,-330,70,-70,110,-110,150,-150,190,-190,230,-230,270,-270,310,-310,90,-90,130,-130,170,-170,210,-210,250,-250,290,-290,110,-110,150,-150,190,-190,230,-230],[-50,50,-90,64,-130,77,-170,90,-210,102,-250,114,-290,125,-330,136,-70,30,-110,40,-150,49,-190,58,-230,66,-270,74,-310,81,-90,10,-130,16,-170,22,-210,27,-250,32,-290,36,-110,-10,-150,-7,-190,-4,-230,-2]],"y":[[50,-50,64,-90,77,-130,90,-170,102,-210,114,-250,125,-290,136,-330,30,-70,40,-110,49,-150,58,-190,66,-230,74,-270,81,-310,10,-90,16,-130,22,-170,27,-210,32,-250,36,-290,-10,-110,-7,-150,-4,-190,-2,-230],[50,-50,64,-90,77,-130,90,-170,102,-210,114,-250,125,-290,136,-330,30,-70,40,-110,49,-150,58,-190,66,-230,74,-270,81,-310,10,-90,16,-130,22,-170,27,-210,32,-250,36,-290,-10,-110,-7,-150,-4,-190,-2,-230],[120,120,115,115,110,110,105,105,100,100,95,95,90,90,85,85,90,90,85,85,80,80,75,75,70,70,65,65,60,60,60,60,55,55,50,50,45,45,40,40,35,35,30,30,25,25,20,20,15,15],[50,-50,64,-90,77,-130,90,-170,102,-210,114,-250,125,-290,136,-330,30,-70,40,-110,49,-150,58,-190,66,-230,74,-270,81,-310,10,-90,16,-130,22,-170,27,-210,32,-250,36,-290,-10,-110,-7,-150,-4,-190,-2,-230]]};
function baseGunCount(u){return Array.isArray(u.turretHealth)?u.turretHealth.filter(h=>h>0).length:baseGunCapacity(u);}
function upgradeBaseFlak(u){syncBaseDefenceHealth(u);const missing=u.turretHealth.findIndex(h=>h<=0);if(missing>=0){u.turretHealth[missing]=turretMaxHealth(u);syncBaseDefenceHealth(u);return true;}const level=baseGunCapacity(u);if(level>=50)return false;// DW5 upgrade behaviour: move the currently damaged turret's remaining VF
 // to the newly built slot, restoring that original slot to full health.
 const damaged=u.turretHealth.findIndex(h=>h>0&&h<turretMaxHealth(u));
 const inherited=damaged>=0?u.turretHealth[damaged]:turretMaxHealth(u);
 if(damaged>=0)u.turretHealth[damaged]=turretMaxHealth(u);
 u.defenceGuns=level+1;syncBaseDefenceHealth(u);
 u.turretHealth[u.turretHealth.length-1]=inherited;
 u.hp=u.turretHealth.reduce((sum,h)=>sum+h,0);return true;}
// Each defence gun tracks the actual individual selected by combat logic.
// Convert the 3:1 compressed world Y-axis to the same heading space as troops.
function baseTurretFacingFrame(base,index,now,worldX,worldY){
 const idle=idleTurretFrame(base,index,now);
 const guns=idleTurrets.get(base),state=guns[index];
 const target=units.find(u=>u.id===base.baseTargetId&&u.hp>0);
 const active=target&&base.hp>0&&!friendlyTeams(base.team,target.team);
 const desired=active?headingFrame(Math.atan2((target.y-worldY)*3,target.x-worldX)):idle;
 if(!Number.isFinite(state.facing))state.facing=idle;
 const elapsed=Math.min(100,Math.max(0,now-(state.facingAt??now)));
 state.facingAt=now;
 const delta=(desired-state.facing+108)%72-36;
 state.facing=(state.facing+Math.sign(delta)*Math.min(Math.abs(delta),elapsed*(active?0.055:0.025))+72)%72;
 return state.facing;
}
function drawStarterDefences(u,air){ctx.save();const orientation=air?3:1,ax=air?510:450,ay=air?150:130,maxed=true;const gun=dwArt['flak.png'];const health=u.turretHealth??[];if(gun.complete&&gun.naturalWidth){for(let j=health.length-1;j>=0;j--){if(!(health[j]>0))continue;const x=ax+DW5_DEFENCE.x[orientation][j],y=ay+DW5_DEFENCE.y[orientation][j]/3;const frame=baseTurretFacingFrame(u,j,last,x+u.x,y+u.y);drawSmoothTurret(gun,frame,x,y)}}const front=dwArt[maxed?'mauer2b.png':'mauer1a.png'],side=dwArt[maxed?'mauer2d.png':'mauer1d.png'];if(true){if(front.complete&&front.naturalWidth)ctx.drawImage(front,ax-515,ay+(maxed?10:20));if(side.complete&&side.naturalWidth)ctx.drawImage(side,ax+60,ay-(maxed?180:170))}ctx.restore()}
// Native factory stages 0..9 use one sprite; stages 10..19 add a second
// sprite at the offsets used by DW5's base renderer.
const FACTORY_TYPES={concrete:{name:'Concrete factory',resource:'Concrete',sprite:'g0.png',index:1},steel:{name:'Steel mill',resource:'Steel',sprite:'g1.png',index:2},carbon:{name:'Carbon factory',resource:'Carbon',sprite:'g2.png',index:3},fuel:{name:'Oil refinery',resource:'Fuel',sprite:'g3.png',index:4}};
function getFactoryLevel(u,key){return u.maxUpgraded?20:Math.max(1,Math.min(20,u.factoryLevels?.[key]??u.factoryLevel??1));}
function factoryStage(u,key){return getFactoryLevel(u,key)-1;}
function upgradeFactory(u,key){const level=getFactoryLevel(u,key);if(level>=20)return false;u.factoryLevels??={};u.factoryLevels[key]=level+1;return true;}
function factoryPoint(u,key){const air=u.type==='airbase',points=air?{concrete:[-60,23],steel:[75,-15],carbon:[490,-255],fuel:[390,-135]}:{concrete:[148,-4],steel:[-22,-84],carbon:[198,-84],fuel:[-162,26]};const[x,y]=points[key];return{x:u.x+x,y:u.y+y};}
function factoryProductionRemaining(u,now=Date.now()){return u.production?.endsAt?Math.max(0,Math.ceil((u.production.endsAt-now)/1000)):0;}
function startFactoryProduction(u,key,hours,now=Date.now()){if(u.production&&(!u.production.endsAt||factoryProductionRemaining(u,now)>0))return false;const duration=hours*3600;u.production={resource:key,label:FACTORY_TYPES[key].resource,startedAt:now,endsAt:now+duration*1000,duration,titaniumCost:FACTORY_TYPES[key].index*(hours===15?15:1)};return true;}
function factoryUpgradeQuote(u,key){const n=getFactoryLevel(u,key)-1;return{seconds:Math.round(10*2**n)+5,concrete:key==='concrete'?200*Math.round(3**n)+1800:key==='steel'?2000*Math.round(2.5**n):key==='carbon'?10000*Math.round(2.25**n):50000*Math.round(2**n)};}
function nativeFactory(name,level,x,y){const im=dwArt[name];if(!im.complete||!im.naturalWidth)return;const fw=im.naturalWidth/10,h=im.naturalHeight;const draw=(stage,dx,dy)=>ctx.drawImage(im,fw*Math.max(0,Math.min(9,stage)),0,fw,h,x+dx-fw/2,y+dy-h/2,fw,h);if(level>=10){const offsets={'g0.png':[-100,-20],'g1.png':[-75,-25],'g2.png':[-70,-15],'g3.png':[75,-35]};const [dx,dy]=offsets[name];draw(level-10,dx,dy)}draw(level,0,0)}
function nativeBuilding(name,frame,frames,x,y){const im=dwArt[name];if(!im?.complete||!im.naturalWidth)return;const w=im.naturalWidth/frames;ctx.drawImage(im,frame*w,0,w,im.naturalHeight,x-w/2,y-im.naturalHeight/2,w,im.naturalHeight)}
function drawBaseUpgrades(u,air){const up=u.specialUpgrades??{},enabled=k=>u.maxUpgraded||up[k],ex=air?422:348,ey=air?99:76;const picture=(name,x,y)=>{const im=dwArt[name];if(im?.complete&&im.naturalWidth)ctx.drawImage(im,x-im.naturalWidth/2,y-im.naturalHeight/2)};
const commandLevel=u.maxUpgraded?5:Math.max(0,Math.min(5,Number(up.command||0)));if(commandLevel>0&&!u.maxUpgraded)nativeBuilding('g4.png',commandLevel-1,5,air?-160:350,air?-174:-30);
if(!u.maxUpgraded&&(u.militaryCentralLevel??0)>0){const central=u.militaryCentralLevel;nativeBuilding('g5.png',Math.min(4,central-1),5,air?-330:-220,air?-145:-80);if(central>5)nativeBuilding('g7.png',Math.min(4,central-6),5,air?-400:-150,air?-100:-63)}
const groupLevel=u.maxUpgraded?3:Number(up.group||0);if(groupLevel>0)nativeBuilding('g8.png',Math.min(2,groupLevel-1),3,air?300:130,air?-20:130);if(!u.maxUpgraded&&(up.ministry??0)>0)nativeBuilding('g6.png',Math.min(5,up.ministry-1),6,air?240:70,air?-50:100);if(!u.maxUpgraded&&(up.office??0)>0)nativeBuilding('g9.png',Math.min(2,up.office-1),3,air?240:70,air?-10:140);
if(enabled('radar')){picture('radarturm1.png',ex-90,ey-20);}
if(enabled('jammer'))picture('jammerturm.png',ex+(air?95:90),ey+(air?-60:-20));
if(enabled('detector')){picture('detec1.png',ex+30,ey-45);}
}
function paintBase(u){ctx.save();const air=u.type==='airbase',w=1500,h=500;const terrain=dwArt[air?'berg4.jpg':'berg2.jpg'];if((terrain.complete&&terrain.naturalWidth)||terrain instanceof HTMLCanvasElement)ctx.drawImage(terrain,-w/2,-h/2,w,h);
const level=u.maxUpgraded?19:Math.max(0,Math.min(19,(u.factoryLevel??1)-1));if(u.maxUpgraded){if(air){nativeBuilding('g4.png',4,5,-160,-174);nativeBuilding('g5.png',4,5,-330,-145);nativeBuilding('g6.png',5,6,240,-50);nativeBuilding('g7.png',4,5,-400,-100);nativeBuilding('g9.png',2,3,240,-10)}else{nativeBuilding('g4.png',4,5,350,-30);nativeBuilding('g5.png',4,5,-220,-80);nativeBuilding('g6.png',5,6,70,100);nativeBuilding('g7.png',4,5,-150,-63);nativeBuilding('g9.png',2,3,70,140)}}
if(air){const hangar=dwArt['airbase2.png'];if(hangar.complete&&hangar.naturalWidth)ctx.drawImage(hangar,6.5,-366,417,240);
// Positions follow the runway: command buildings behind, factories along the front edge.


nativeFactory('g3.png',factoryStage(u,'fuel'),390,-135);
nativeFactory('g0.png',factoryStage(u,'concrete'),-60,23);
nativeFactory('g2.png',factoryStage(u,'carbon'),490,-255);
nativeFactory('g1.png',factoryStage(u,'steel'),75,-15);const entranceBack=dwArt['airbase.jpg'],entrance=dwArt['airbase3.png'];if(entranceBack.complete&&entranceBack.naturalWidth)ctx.drawImage(entranceBack,342,34);if(entrance.complete&&entrance.naturalWidth)ctx.drawImage(entrance,422-entrance.naturalWidth/2,99-entrance.naturalHeight/2);
}else{const back=dwArt['garage2a.png'];if(back.complete&&back.naturalWidth)ctx.drawImage(back,348-back.naturalWidth/2,76-back.naturalHeight/2);const entry=dwArt['garage2b.png'];if(entry.complete&&entry.naturalWidth)ctx.drawImage(entry,348-entry.naturalWidth/2,76-entry.naturalHeight/2);nativeFactory('g3.png',factoryStage(u,'fuel'),-162,26);nativeFactory('g0.png',factoryStage(u,'concrete'),148,-4);nativeFactory('g2.png',factoryStage(u,'carbon'),198,-84);nativeFactory('g1.png',factoryStage(u,'steel'),-22,-84)}
drawBaseUpgrades(u,air);
ctx.restore()}
// Composite bases once per appearance/animation change, instead of redrawing
// dozens of transparent buildings and defences on every display frame.
function drawFactoryActivity(u){
 ctx.save();ctx.translate(u.x,u.y);const time=Math.floor(last/100),resourcePoint=key=>{const p=factoryPoint(u,key);return{x:p.x-u.x,y:p.y-u.y};};
 const concrete=resourcePoint('concrete');spriteFrame(dwArt['bmischer.png'],(time+25+u.id)%9,concrete.x+30,concrete.y+30,9);
 const fuel=resourcePoint('fuel');spriteFrame(dwArt['oelpump.png'],(time+u.id)%50,fuel.x-80,fuel.y+20,50);
 const steel=resourcePoint('steel'),smoke=(Math.floor(last/50)+u.id)%200;if(smoke<72)spriteFrame(dwArt['kamin.png'],smoke,steel.x-60,steel.y-85,72);
 if(u.production&&FACTORY_TYPES[u.production.resource]){const left=factoryProductionRemaining(u);if(left>0){const p=resourcePoint(u.production.resource);ctx.fillStyle='rgba(0,51,85,.65)';ctx.fillRect(p.x-45,p.y-88,90,18);ctx.fillStyle='white';ctx.font='12px Tahoma';ctx.textAlign='center';ctx.fillText(formatFactoryCountdown(left),p.x,p.y-75);}}
 ctx.restore();
}
function formatFactoryCountdown(seconds){const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),sec=Math.floor(seconds%60);return(h?h+':':'')+(h?String(m).padStart(2,'0'):m)+':'+String(sec).padStart(2,'0');}
function drawRotatingHeads(u){const up=u.specialUpgrades??{},air=u.type==='airbase',ex=air?422:348,ey=air?99:76;ctx.save();ctx.translate(u.x,u.y);if(u.maxUpgraded||up.radar){const im=dwArt['radarturm2.png'];if(im?.complete&&im.naturalWidth){const fw=im.naturalWidth/72,f=Math.floor(last/50)%72;ctx.drawImage(im,fw*f,0,fw,im.naturalHeight,ex-75-fw/2,ey-75-im.naturalHeight/2,fw,im.naturalHeight)}}if(u.maxUpgraded||up.detector){const im=dwArt['detec2.png'];if(im?.complete&&im.naturalWidth){const fw=im.naturalWidth/72,f=Math.floor(last/50)%72;ctx.drawImage(im,fw*f,0,fw,im.naturalHeight,ex+40-fw/2,ey-90-im.naturalHeight/2,fw,im.naturalHeight)}}if(u.maxUpgraded||up.range){const im=dwArt['rakerw.png'];if(im?.complete&&im.naturalWidth){const fw=im.naturalWidth/72,f=Math.floor(last/100)%72;ctx.drawImage(im,fw*f,0,fw,im.naturalHeight,ex+8-fw/2,ey-18-im.naturalHeight/2,fw,im.naturalHeight)}}ctx.restore()}
// Draw a separate VF health bar over the turret currently taking damage.
// DW5 measurement: 62 screen pixels, 3px black stroke, 2px health stroke.
function drawTurretHealthBars(u){
 const health=u.turretHealth??[],orientation=u.type==='airbase'?3:1;
 const ax=u.type==='airbase'?510:450,ay=u.type==='airbase'?150:130;
 const pixel=1/Math.max(.01,zoom),width=62*pixel;
 for(let j=0;j<health.length;j++){
  const hp=health[j];if(!(hp>0&&hp<TURRET_HP))continue;
  const x=u.x+ax+DW5_DEFENCE.x[orientation][j],y=u.y+ay+DW5_DEFENCE.y[orientation][j]/3-28;
  const ratio=Math.max(0,Math.min(1,hp/TURRET_HP));
  ctx.save();ctx.lineCap='butt';ctx.lineWidth=3*pixel;ctx.strokeStyle='#000';
  ctx.beginPath();ctx.moveTo(x-width/2,y);ctx.lineTo(x+width/2,y);ctx.stroke();
  ctx.lineWidth=2*pixel;ctx.strokeStyle='#ff0000';ctx.beginPath();ctx.moveTo(x-width/2,y);ctx.lineTo(x+width/2,y);ctx.stroke();
  ctx.strokeStyle='#00dd00';ctx.beginPath();ctx.moveTo(x-width/2,y);ctx.lineTo(x-width/2+width*ratio,y);ctx.stroke();ctx.restore();
 }
}
function actualBase(u){syncBaseDefenceHealth(u);
 const up=u.specialUpgrades??{};
 const key=JSON.stringify([artRevision,u.type,u.factoryLevel,u.maxUpgraded,u.militaryCentralLevel,u.wallLevel,u.defenceGuns,baseGunCount(u),u.factoryLevels,up]);
 let cached=baseRenderCache.get(u);
 if(!cached||cached.key!==key){
  const surface=cached?.surface??document.createElement('canvas');
  if(!cached){surface.width=1800;surface.height=1000;}
  const main=ctx;ctx=surface.getContext('2d');
  try{ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1800,1000);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.translate(900,500);paintBase(u);}finally{ctx=main;}
  cached={surface,key};baseRenderCache.set(u,cached);
 }
 ctx.drawImage(cached.surface,u.x-900,u.y-500);ctx.save();ctx.translate(u.x,u.y);drawStarterDefences(u,u.type==='airbase');ctx.restore();drawRotatingHeads(u);drawFactoryActivity(u);drawTurretHealthBars(u);
 if(selected.has(u.id)){ctx.save();ctx.translate(u.x,u.y);ctx.strokeStyle='#d8f38e';ctx.lineWidth=2/zoom;ctx.beginPath();ctx.ellipse(0,0,705,225,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#162013';ctx.fillRect(-50,-277,100,4);ctx.fillStyle=colors[u.team];ctx.fillRect(-50,-277,100*u.hp/baseMaxHealth(u),4);ctx.restore();}
}
const nativeTroops={tank:{id:27,raise:-9,pivot:2},aa:{id:43,raise:-13,pivot:12},heli:{id:13,air:true},jet:{id:58,air:true},raptor:{id:58,air:true}};
const troopArt={};for(const def of Object.values(nativeTroops)){for(const layer of ['a','b']){const im=new Image();im.src='assets/gi/panzer'+def.id+layer+'.png';troopArt[def.id+layer]=im}}const apacheRotor=new Image();apacheRotor.src='assets/i/rotor4er.png';
function spriteFrame(im,frame,x,y,count=72){if(!im?.complete||!im.naturalWidth)return;const fw=im.naturalWidth/count;ctx.drawImage(im,fw*frame,0,fw,im.naturalHeight,x-fw/2,y-im.naturalHeight/2,fw,im.naturalHeight)}
// Player labels are drawn separately from cached base artwork, so they remain
// readable at different zoom levels without invalidating factory/base caches.
const BASE_PLAYER_NAMES=['Player','Opponent','Ally'];
function drawBasePlayerName(u){
 // Place the airbase owner above the small main entrance building beside
 // the curved wall, matching the visual anchor in the DW5 reference.
 // APEX's base is assembled differently, so use its entrance anchor.
 const label=(BASE_PLAYER_NAMES[u.team]??'Player').toUpperCase();
 const air=u.type==='airbase';
 const entrance=baseEntrancePoint(u);
 const x=air?entrance.x-20:entrance.x;
 // DW5 places the label across the jammer/entrance area, not high above it.
 // Keep the label attached to the entrance as the camera moves.
 const y=entrance.y-65;
 ctx.save();
 ctx.font='24px Verdana, sans-serif';
 ctx.textAlign='start';
 ctx.textBaseline='alphabetic';
 // Match DW5's three-pass offset text shadow.
 ctx.fillStyle='rgba(0,0,0,.9)';
 ctx.fillText(label,x+1,y+1);
 ctx.fillText(label,x-1,y+1);
 ctx.fillStyle='#fff';
 ctx.fillText(label,x,y);
 // Alliance is optional: do not invent a name for either player.
 if(u.allianceName){
  ctx.font='12px Verdana, sans-serif';
  ctx.fillStyle='rgba(0,0,0,.9)';
  ctx.fillText(u.allianceName,x+1,y+12);
  ctx.fillStyle='#fff';
  ctx.fillText(u.allianceName,x,y+11);
 }
 ctx.restore();
}
const productionIcons=new Map();function productionIcon(id){if(id==null)return null;if(!productionIcons.has(id)){const image=new Image();image.src='assets/menu/units/'+id+'.png';productionIcons.set(id,image);}return productionIcons.get(id);}
function drawBaseProduction(u){
 if(!u.buildQueue?.length)return;
 const queued=u.buildQueue[0],type=typeof queued==='string'?queued:queued.type,entry=typeof queued==='string'?null:queued;
 const air=type==='heli'||type==='jet';
 const x=u.x+(u.type==='airbase'?(air?195:395):350),y=u.y+(u.type==='airbase'?(air?-170:25):12);
 const remaining=Math.max(0,Math.ceil(3-(u.buildTimer??0)));
 ctx.save();ctx.translate(x,y);
 // The complete production card, including troop name and timer, sits over the owner label.
 ctx.fillStyle='rgba(48,80,110,.78)';ctx.fillRect(-55,-111,110,139);
 ctx.strokeStyle='rgba(154,195,227,.5)';ctx.lineWidth=1;ctx.strokeRect(-55.5,-111.5,111,140);
 const troop=nativeTroops[type],body=troop&&troopArt[troop.id+'a'],turret=troop&&troopArt[troop.id+'b'];
 const frame=17,frames=72;
 if(body?.complete&&body.naturalWidth){
  const fw=body.naturalWidth/frames,fh=body.naturalHeight,scale=Math.min(3,92/Math.max(fw,fh));
  const px=-fw*scale/2,py=-74-fh*scale/2;
  ctx.drawImage(body,fw*frame,0,fw,fh,px,py,fw*scale,fh*scale);
  if(!air&&turret?.complete&&turret.naturalWidth){
   const tw=turret.naturalWidth/frames,th=turret.naturalHeight;
   const turretX=-(tw*scale)/2-troop.pivot*scale*.6;
   const turretY=-74-(th*scale)/2+troop.raise*scale;
   ctx.drawImage(turret,tw*frame,0,tw,th,turretX,turretY,tw*scale,th*scale);
  }
 }else{
  const icon=productionIcon(entry?.id);
  if(icon?.complete&&icon.naturalWidth)ctx.drawImage(icon,-43,-88,86,70);
 }
 ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.shadowColor='rgba(0,0,0,.95)';ctx.shadowBlur=3;
 ctx.font='bold 21px Verdana, sans-serif';ctx.fillStyle='#fff';ctx.fillText(String(remaining),0,-7);
 ctx.font='bold 13px Verdana, sans-serif';ctx.fillText(entry?.name??TYPES[type]?.name??type,0,12);
 ctx.shadowBlur=0;ctx.fillStyle='rgba(15,34,48,.8)';ctx.fillRect(-43,19,86,5);
 ctx.fillStyle='#9cd9ff';ctx.fillRect(-43,19,86*Math.min(1,(u.buildTimer??0)/3),5);
 ctx.restore();
}
function drawUnit(u){if(!TYPES[u.type].speed){actualBase(u);drawBaseFlag(u);drawBasePlayerName(u);drawBaseProduction(u);return}const def=nativeTroops[u.type],animation=troopAnimation(u);ctx.save();ctx.translate(u.x,u.y);
if(selected.has(u.id)){if(u.target){ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(u.target.x-u.x,u.target.y-u.y);ctx.stroke();ctx.setLineDash([])}}
if(def.air){ctx.globalAlpha=.35;drawTroopHeading(troopArt[def.id+'b'],animation.body,14,22);ctx.globalAlpha=1}
ctx.save();if(u.type==='heli')ctx.translate(0,Math.sin(animation.time*2.6)*1.2);
drawTroopHeading(troopArt[def.id+'a'],animation.body,0,0);
if(!def.air)drawTroopHeading(troopArt[def.id+'b'],animation.turret,-Math.cos(animation.body)*def.pivot,def.raise-Math.sin(animation.body)*def.pivot/3);
if(u.type==='heli')spriteFrame(apacheRotor,Math.floor(animation.time*1000/35)%18,0,-7,18);
ctx.restore();
ctx.restore()}
// Only show an individual health bar above the troop actually receiving fire.
// Other members retain their normal division-wide health display.
function drawTargetUnitHealth(u){
 if(!TYPES[u.type]?.speed||u.hp<=0||!Number.isFinite(u.lastUnderFireAt)||combatClock-u.lastUnderFireAt>2)return;
 const max=TYPES[u.type].hp,ratio=Math.max(0,Math.min(1,u.hp/max));
 // DW5 canvas measurement: black horizontal stroke 62px x 3px,
 // health stroke 2px. Convert screen pixels to world units so the bar
 // keeps the measured apparent size regardless of sandbox camera zoom.
 const pixel=1/Math.max(.01,zoom),width=62*pixel;
 const x=u.x-width/2,y=u.y-35;
 ctx.save();
 ctx.lineCap='butt';
 ctx.strokeStyle='#000000';ctx.lineWidth=3*pixel;
 ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+width,y);ctx.stroke();
 ctx.lineWidth=2*pixel;
 ctx.strokeStyle='#ff0000';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+width,y);ctx.stroke(); // Lost health
 if(ratio>0){ctx.strokeStyle='#00dd00';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+width*ratio,y);ctx.stroke();} // Remaining health
 ctx.restore();
}
function update(dt){updatePendingGroupJoins();for(const base of [...units]){if(base.buildQueue?.length){base.buildTimer=(base.buildTimer??0)+dt;while(base.buildTimer>=3&&base.buildQueue.length){base.buildTimer-=3;const queued=base.buildQueue.shift(),type=typeof queued==='string'?queued:queued.type;if(!TYPES[type])continue;const air=type==='heli'||type==='jet';const x=base.x+(base.type==='airbase'?(air?200:425):425),y=base.y+(base.type==='airbase'?(air?-210:113):92);const previousCount=units.length;spawn(type,x,y,base.team,1,base.id);const produced=units[previousCount];if(produced){const offset=formationOffset(type,produced.groupSlot),exit=air?{x:produced.rallyX-115+offset.x,y:produced.rallyY+110+offset.y}:{x:produced.rallyX+145+offset.x,y:produced.rallyY+105+offset.y};produced.target={x:Math.max(0,Math.min(WORLD_WIDTH,exit.x)),y:Math.max(0,Math.min(WORLD_HEIGHT,exit.y))};}}if(!base.buildQueue.length)base.buildTimer=0;}}updateDivisionMovement(dt);for(const u of units){const t=TYPES[u.type];if(u.formationOrder&&u.target){const error=Math.hypot(u.target.x-u.x,3*(u.target.y-u.y));const boost=1+Math.min(.55,Math.max(0,(error-troopSpacing(u.type)*.5)/Math.max(1,troopSpacing(u.type)*5)));moveTroopWithDrift(u,{...t,speed:t.speed*boost},dt);}else moveTroopWithDrift(u,t,dt);}updateDivisionCombat(dt);updatePendingGroupJoins();}
// DW5 Xo(): seven position-hashed ground tiles, 850px columns,
// 280px rows, odd rows offset by -400px; even rows are painted first.
function groundVariant(x,y){let g=314159265+x*y;for(let i=0;i<2;i++){g^=g<<13;g^=g<<17;g^=g<<5;}return Math.abs(g)%7;}
// World chunks survive camera motion and zoom. Only newly exposed chunks
// are composited; a bounded LRU prevents the large map consuming unbounded RAM.
const terrainOverview=new Image();terrainOverview.src='assets/i/terrain-overview.jpg';
const groundChunks=new Map();let chunkRevision=-1;const CHUNK_W=1024,CHUNK_H=512,CHUNK_LIMIT=64;
function terrainChunk(cx,cy,factor=1){
 if(chunkRevision!==artRevision){groundChunks.clear();chunkRevision=artRevision;}
 const key=cx+','+cy+','+factor;let out=groundChunks.get(key);
 if(out){groundChunks.delete(key);groundChunks.set(key,out);return out;}
 out=document.createElement('canvas');out.width=CHUNK_W+2;out.height=CHUNK_H+2;const c=out.getContext('2d',{alpha:false}),left=(cx*CHUNK_W-1)*factor,top=(cy*CHUNK_H-1)*factor,right=left+(CHUNK_W+2)*factor,bottom=top+(CHUNK_H+2)*factor;c.scale(1/factor,1/factor);c.translate(-left,-top);
 const base=dwArt['boden0.jpg'];c.fillStyle=base?.complete&&base.naturalWidth?c.createPattern(base,'repeat'):grass;c.fillRect(left,top,(CHUNK_W+2)*factor,(CHUNK_H+2)*factor);
 for(let pass=0;pass<2;pass++)for(let x=Math.floor((left-1200)/850);x<=Math.ceil((right+400)/850);x++)for(let y=Math.floor((top-400)/280);y<=Math.ceil(bottom/280);y++){
  if(((y%2)+2)%2!==pass)continue;const im=groundBlendArt['boden'+groundVariant(x,y)+'.jpg'];if(im)c.drawImage(im,x*850-(pass?400:0),y*280);
 }
 groundChunks.set(key,out);while(groundChunks.size>CHUNK_LIMIT)groundChunks.delete(groundChunks.keys().next().value);return out;
}
function drawTerrainView(){
 ctx.save();ctx.translate(W/2,H/2);ctx.scale(zoom,zoom);ctx.translate(-cam.x,-cam.y);ctx.beginPath();ctx.rect(0,0,WORLD_WIDTH,WORLD_HEIGHT);ctx.clip();
 const left=Math.max(0,cam.x-W/(2*zoom)),right=Math.min(WORLD_WIDTH,cam.x+W/(2*zoom)),top=Math.max(0,cam.y-H/(2*zoom)),bottom=Math.min(WORLD_HEIGHT,cam.y+H/(2*zoom));
 let factor=1;
 while((Math.ceil((right-left)/(CHUNK_W*factor))+2)*(Math.ceil((bottom-top)/(CHUNK_H*factor))+2)>40&&factor<=4)factor*=2;
 if(factor<=4||!terrainOverview.complete||!terrainOverview.naturalWidth){
  factor=Math.min(factor,4);const cw=CHUNK_W*factor,ch=CHUNK_H*factor,x0=Math.floor(left/cw),x1=Math.floor(right/cw),y0=Math.floor(top/ch),y1=Math.floor(bottom/ch);
  // Do not create thousands of fine chunks while the overview image loads.
  if((x1-x0+1)*(y1-y0+1)<=CHUNK_LIMIT)for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const im=terrainChunk(x,y,factor);ctx.drawImage(im,(x*CHUNK_W-1)*factor,(y*CHUNK_H-1)*factor,im.width*factor,im.height*factor);}
 }else if(right>left&&bottom>top){
  const im=terrainOverview;ctx.drawImage(im,left/WORLD_WIDTH*im.naturalWidth,top/WORLD_HEIGHT*im.naturalHeight,(right-left)/WORLD_WIDTH*im.naturalWidth,(bottom-top)/WORLD_HEIGHT*im.naturalHeight,left,top,right-left,bottom-top);
 }
 ctx.restore();
}
let fpsFrames=0,fpsWindow=0,lastMini=0,groundPattern=null;
function frame(now){fpsFrames++;if(now-fpsWindow>=500){$('fps').textContent='FPS '+Math.round(fpsFrames*1000/(now-fpsWindow));fpsFrames=0;fpsWindow=now;}let dt=Math.min(.05,(now-last)/1000||0);last=now;if(!paused)update(dt*speed);ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.fillStyle='#253021';ctx.fillRect(0,0,W,H);drawTerrainView();ctx.save();ctx.translate(W/2,H/2);ctx.scale(zoom,zoom);ctx.translate(-cam.x,-cam.y);ctx.strokeStyle='#dce4b609';ctx.lineWidth=1;for(let x=Math.max(0,Math.floor((cam.x-W/(2*zoom))/900)*900);x<=Math.min(WORLD_WIDTH,cam.x+W/(2*zoom));x+=900){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD_HEIGHT);ctx.stroke()}for(let y=Math.max(0,Math.floor((cam.y-H/(2*zoom))/900)*900);y<=Math.min(WORLD_HEIGHT,cam.y+H/(2*zoom));y+=900){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_WIDTH,y);ctx.stroke()}const visible=u=>Math.abs(u.x-cam.x)<W/(2*zoom)+(TYPES[u.type].speed?80:900)&&Math.abs(u.y-cam.y)<H/(2*zoom)+(TYPES[u.type].speed?80:500);for(const u of units)if(!TYPES[u.type].speed&&visible(u))drawUnit(u);for(const u of units)if(TYPES[u.type].speed&&visible(u))drawUnit(u);for(const u of units)if(TYPES[u.type].speed&&visible(u))drawTargetUnitHealth(u);drawWeaponRanges();drawTroopGroupLabels(visible);drawOrderMarkers();ctx.strokeStyle='#ffe9a1';ctx.lineWidth=2;for(let s of shots){ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.tx,s.ty);ctx.stroke()}ctx.restore();if(drag?.kind==='select'){ctx.fillStyle='#c7e88722';ctx.strokeStyle='#c7e887';let a=drag.start,b=drag.end;ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y)}if(now-lastMini>=100){lastMini=now;mc.fillStyle='#4a5838';mc.fillRect(0,0,mini.width,mini.height);for(let u of units){mc.fillStyle=colors[u.team];mc.fillRect(u.x/WORLD_WIDTH*mini.width,u.y/WORLD_HEIGHT*mini.height,TYPES[u.type].speed?2:5,TYPES[u.type].speed?2:5)}mc.strokeStyle='#e4efc5';mc.strokeRect((cam.x-W/zoom/2)/WORLD_WIDTH*mini.width,(cam.y-H/zoom/2)/WORLD_HEIGHT*mini.height,W/zoom/WORLD_WIDTH*mini.width,H/zoom/WORLD_HEIGHT*mini.height);}if(now-statsTimer>150){for(const u of units)if(u.production?.endsAt&&u.production.endsAt<=Date.now())delete u.production;const coordinate=mapCoordinates(world(mouse));$('coordinates').textContent=coordinate.x+','+coordinate.y;$('status').textContent=`${paused?'PAUSED':'SIMULATION LIVE'}  ·  YOURS ${units.filter(u=>u.team===0).length} / ALLY ${units.filter(u=>u.team===2).length} / ENEMY ${units.filter(u=>u.team===1).length}  ·  ${Math.round(zoom*100)}%`;$('selection').textContent=selected.size?selected.size+' SELECTED · DELETE TO REMOVE':'NO UNITS SELECTED';statsTimer=now}syncBaseMenuPositions();requestAnimationFrame(frame)}resize();demo();requestAnimationFrame(frame);

$('editor-toggle').onclick=()=>{const collapsed=document.body.classList.toggle('editor-hidden');$('editor-toggle').textContent=collapsed?'☰ Sandbox editor':'✕ Close editor';$('editor-toggle').setAttribute('aria-expanded',String(!collapsed))};

$('upgrade-base').onclick=()=>{let bases=units.filter(u=>!TYPES[u.type].speed&&selected.has(u.id));if(!bases.length)bases=units.filter(u=>u.type==='airbase'&&u.team===team).slice(0,1);if(!bases.length)return notice('Place or select a base first.');bases.forEach(u=>{u.factoryLevel=20;u.factoryLevels={};u.maxUpgraded=true;u.militaryCentralLevel=0;u.wallLevel=2;u.defenceGuns=50;syncBaseDefenceHealth(u)});notice('Max upgrade preview: factories, command buildings and defensive wall.');};
$('starter-base').onclick=()=>{let bases=units.filter(u=>!TYPES[u.type].speed&&selected.has(u.id));if(!bases.length)bases=units.filter(u=>u.type==='airbase'&&u.team===team).slice(0,1);bases.forEach(u=>{u.factoryLevel=1;u.factoryLevels={};delete u.production;u.specialUpgrades={};u.maxUpgraded=false;u.militaryCentralLevel=0;u.wallLevel=1;u.defenceGuns=2;resetBaseDefenceHealth(u)});notice('Starting base restored: level 1 factories, sandbags and two guns.');};

for(const name of ['command','group','radar','jammer','detector','range'])$('upgrade-'+name).onclick=()=>{let bases=units.filter(u=>!TYPES[u.type].speed&&selected.has(u.id));if(!bases.length)bases=units.filter(u=>!TYPES[u.type].speed&&u.team===team).slice(0,1);if(!bases.length)return notice('Select or place a base first.');bases.forEach(u=>{u.specialUpgrades??={};u.specialUpgrades[name]=name==='group'?3:name==='command'?5:true});notice(({command:'Maximum base command',group:'Group-limit extension',radar:'Radar tower',jammer:'Jammer tower',detector:'Detector tower',range:'Long range · 20 map units'})[name]+' installed.');};

// Base-attached hover controls. These mutate sandbox state only.
const BASE_UPGRADES={military:{title:'Military central',detail:'Build and upgrade the military central.',max:10},radar:{title:'Radar station',detail:'More sight range (Fog of War).',max:1},jammer:{title:'Jammer tower',detail:'Jamming around this base.',max:1},detector:{title:'Detector tower',detail:'Detects stealthed units.',max:1}};
const HOVER_SECTIONS={military:['military','radar','jammer','detector'],ministry:['ministry','extension','office','group'],command:['command','startProduction','immediate','selfDestruct','halfTimer']};
Object.assign(BASE_UPGRADES,{ministry:{title:'Ministry',detail:'Upgrade the ministry.',max:6},extension:{title:'Base extension',detail:'All factories to maximum build level.',max:1},office:{title:'Military office',detail:'Upgrade the military office.',max:3,requiresCentral:true},group:{title:'Group-limit extension',detail:'Upgrade the group-limit extender.',max:3},command:{title:'Base Command',detail:'Build or upgrade Base Command (free in sandbox).',max:5},startProduction:{title:'Start Production',detail:'Choose resource production for idle bases on this map.',action:true},immediate:{title:'Immediate Resources',detail:'Homebase-only feature (not yet implemented).',action:true},selfDestruct:{title:'Base Self-Destruction',detail:'Available only when owning three bases or fewer (future feature).',action:true},halfTimer:{title:'Production Half Timer',detail:'Halves troop and turret build times for Titanium (future feature).',action:true}});
let hoveredSection='military';let hoveredBaseId=null,hoveredUpgrade='military',hoverHideTimer=null,hoverMenuHeld=false;
const baseHoverMenu=$('base-hover-menu');
function upgradeLevel(u,key){if(u.maxUpgraded)return BASE_UPGRADES[key].max||0;return key==='military'?(u.militaryCentralLevel??0):Number(u.specialUpgrades?.[key]||0)}
function upgradeLock(u,key){return BASE_UPGRADES[key].requiresCentral&&upgradeLevel(u,'military')<10}
function refreshBaseHover(){const u=units.find(u=>u.id===hoveredBaseId);if(!u){baseHoverMenu.hidden=true;return}const info=BASE_UPGRADES[hoveredUpgrade],level=info.action?0:upgradeLevel(u,hoveredUpgrade),locked=upgradeLock(u,hoveredUpgrade);$('base-hover-title').textContent=info.title;$('base-hover-detail').textContent=locked?'Requires maximum military centrals.':!info.action&&level>=info.max?'Maximum level reached':info.detail;$('base-hover-state').textContent=info.action?(hoveredUpgrade==='startProduction'?'Click to open': 'Planned feature'):locked?'Locked · Military 10 required':'Level '+level+' / '+info.max+(level<info.max?' · Click to upgrade (free)':'');for(const b of baseHoverMenu.querySelectorAll('[data-base-upgrade]')){const k=b.dataset.baseUpgrade,entry=BASE_UPGRADES[k],maxed=!entry.action&&upgradeLevel(u,k)>=entry.max;b.hidden=!HOVER_SECTIONS[hoveredSection].includes(k);b.classList.toggle('maxed',maxed);if(k==='command'){const img=b.querySelector('img');if(img){const n=Math.max(1,Math.min(5,upgradeLevel(u,'command')));const path='assets/menu/command-level-'+n+'.png';if(img.getAttribute('src')!==path)img.src=path}}b.setAttribute('aria-disabled',String(maxed||upgradeLock(u,k)))}}
function baseSectionPoint(u,section){return section==='military'?{x:u.x+(u.type==='airbase'?-330:-220),y:u.y+(u.type==='airbase'?-145:-80)}:section==='command'?{x:u.x+(u.type==='airbase'?-160:350),y:u.y+(u.type==='airbase'?-174:-30)}:{x:u.x+(u.type==='airbase'?240:70),y:u.y+(u.type==='airbase'?-50:100)}}
// Native menu origin: projected building hotspot - half actual menu width;
// the title block is above a grid centred on the hotspot (DW5 LP/yyspace).
function clampMenuOrigin(anchor,menu,grid,offset={x:0,y:0}){
 const rect=menu.getBoundingClientRect(),rows=grid.getBoundingClientRect();
 const width=rect.width,height=rect.height,header=rows.top-rect.top;
 return{left:Math.max(8,Math.min(Math.max(8,W-width-8),anchor.x+offset.x-width/2)),
 top:Math.max(8,Math.min(Math.max(8,H-height-8),anchor.y+offset.y-header-rows.height/2))};
}
function projectBasePoint(p){return{x:W/2+(p.x-cam.x)*zoom,y:H/2+(p.y-cam.y)*zoom};}
function positionBaseHover(u){const anchor=projectBasePoint(baseSectionPoint(u,hoveredSection)),position=clampMenuOrigin(anchor,baseHoverMenu,$('base-hover-icons'));baseHoverMenu.style.left=position.left+'px';baseHoverMenu.style.top=position.top+'px';}
function stopMenuAnimations(){for(const img of baseHoverMenu.querySelectorAll('img[data-animation]'))img.src=img.dataset.still;}
function scheduleHideBaseHover(){clearTimeout(hoverHideTimer);if(!hoverMenuHeld){stopMenuAnimations();baseHoverMenu.hidden=true;hoveredBaseId=null}}
const priorPointerMove=canvas.onpointermove;canvas.onpointermove=e=>{priorPointerMove(e);if(drag||tool!=='select'){hoverMenuHeld=false;scheduleHideBaseHover();return}const w=world(pos(e));let match=null;for(const u of units.slice().reverse()){if(TYPES[u.type].speed)continue;for(const section of ['military','ministry','command']){const p=baseSectionPoint(u,section);if(Math.abs(w.x-p.x)<(section==='command'?35:48)&&Math.abs(w.y-p.y)<(section==='command'?30:32)){match={u,section};break}}if(match)break}if(match){if(hoveredSection!==match.section){hoveredSection=match.section;hoveredUpgrade=HOVER_SECTIONS[hoveredSection][0]}hoveredBaseId=match.u.id;baseHoverMenu.hidden=false;refreshBaseHover();positionBaseHover(match.u)}else scheduleHideBaseHover()};
canvas.addEventListener('pointerleave',e=>{if(e.relatedTarget&&baseHoverMenu.contains(e.relatedTarget)){hoverMenuHeld=true;return}hoverMenuHeld=false;scheduleHideBaseHover()});baseHoverMenu.onpointerenter=()=>{hoverMenuHeld=true;clearTimeout(hoverHideTimer)};baseHoverMenu.onpointerleave=()=>{hoverMenuHeld=false;scheduleHideBaseHover()};
for(const img of baseHoverMenu.querySelectorAll('img[data-animation]'))img.dataset.still=img.getAttribute('src');
for(const b of baseHoverMenu.querySelectorAll('[data-base-upgrade]')){const key=b.dataset.baseUpgrade;b.onpointerenter=()=>{stopMenuAnimations();const img=b.querySelector('img[data-animation]');if(img)img.src=img.dataset.animation;hoveredUpgrade=key;refreshBaseHover()};b.onpointerleave=()=>{const img=b.querySelector('img[data-animation]');if(img)img.src=img.dataset.still;};b.onclick=e=>{e.stopPropagation();const u=units.find(u=>u.id===hoveredBaseId);if(!u)return;const level=upgradeLevel(u,key),info=BASE_UPGRADES[key];if(info.action){if(key==='startProduction')openProductionMenu();else notice(info.detail);return}if(level>=info.max||upgradeLock(u,key))return;if(key==='military')u.militaryCentralLevel=level+1;else{u.specialUpgrades??={};u.specialUpgrades[key]=level+1;if(key==='extension'){u.factoryLevel=20;u.factoryLevels={}}}notice(info.title+' upgraded to level '+upgradeLevel(u,key)+'.');refreshBaseHover()}}

// Base Command production controls: one sandbox battlefield is the current map.
// These choices are stored on each base and never overwrite active production.
const productionPanel=$('production-panel');
const productionOptions={concrete:['Concrete',15],steel:['Steel',30],carbon:['Carbon',45],fuel:['Fuel',60],cs:['Concrete / Steel',null],sc:['Steel / Carbon',null],scf:['Steel / Carbon / Fuel',null],all:['Concrete / Steel / Carbon / Fuel',null]};
function friendlyBases(){return units.filter(u=>!TYPES[u.type].speed&&u.team===team)}
function idleBases(){return friendlyBases().filter(u=>!u.production)}
function refreshProductionPanel(){const n=idleBases().length;$('production-idle').textContent=n+' '+(n===1?'base is':'bases are')+' currently not producing';$('production-active').textContent=friendlyBases().length-n+' producing';}
function openProductionMenu(){refreshProductionPanel();productionPanel.hidden=false;hoverMenuHeld=false;scheduleHideBaseHover()}
$('production-close').onclick=()=>productionPanel.hidden=true;
for(const b of productionPanel.querySelectorAll('[data-produce]'))b.onclick=()=>{const key=b.dataset.produce,option=productionOptions[key],bases=idleBases();if(!bases.length){notice('No idle bases on this map.');return}for(const u of bases)u.production={resource:key,label:option[0],startedAt:Date.now(),endsAt:Date.now()+15*3600*1000,duration:15*3600,titaniumCost:option[1]};notice('Started '+option[0]+' on '+bases.length+' idle '+(bases.length===1?'base':'bases')+' (sandbox: no Titanium deducted).');refreshProductionPanel()};
$('production-cancel').onclick=()=>{const bases=friendlyBases().filter(u=>u.production);for(const u of bases)delete u.production;notice('Cancelled production on '+bases.length+' bases on this map.');refreshProductionPanel()};
for(const b of productionPanel.querySelectorAll('[data-highlight]'))b.onclick=()=>{for(const el of productionPanel.querySelectorAll('[data-highlight]'))el.classList.toggle('active',el===b);notice('Map highlight: '+b.textContent.trim()+' (visual highlighting planned).')};

// Main-base unit menu. Uses the same camera/world projection as DW5-style building anchors.
// The available buttons correspond to the four implemented sandbox unit types.
const baseUnitMenu=$('base-unit-menu');let baseUnitId=null,baseUnitKind='ground';
function stopBaseUnitAnimations(){for(const im of baseUnitMenu.querySelectorAll('img[data-animation]'))if(im.getAttribute('src')!==im.dataset.still)im.src=im.dataset.still;}
function closeBaseUnitMenu(){stopBaseUnitAnimations();baseUnitMenu.hidden=true;baseUnitId=null;baseUnitKind='ground'}
// For orientation 3 (airbase) and 1 (military), the actual entrance
// coincides with DW5 FD/KG[orientation][1]. FQbx/FQby are screen offsets.
function baseEntrancePoint(u){return{x:u.x+(u.type==='airbase'?422:348),y:u.y+(u.type==='airbase'?99:76)};}
function placeBaseUnitMenu(u){
 const aircraft=baseUnitKind==='aircraft',point=aircraft?{x:u.x+215,y:u.y-246}:baseEntrancePoint(u),anchor=projectBasePoint(point),offset=aircraft?{x:0,y:0}:u.type==='airbase'?{x:10,y:130}:{x:50,y:140};
 const position=clampMenuOrigin(anchor,baseUnitMenu,$('base-unit-grid'),offset);
 baseUnitMenu.style.left=position.left+'px';baseUnitMenu.style.top=position.top+'px';
}
function describeBaseUnit(entry){
 $('base-unit-title').textContent=entry.name;$('base-unit-description').textContent=entry.description||'';$('base-unit-detail').textContent=entry.detail||'';
 const seconds=entry.seconds||0,minutes=Math.floor(seconds/60),remainder=seconds%60;$('base-unit-time').textContent=seconds?(minutes?minutes+'min'+(remainder?' '+remainder+'sec':''):seconds+'sec'):'';$('base-unit-cost').textContent=entry.steel?'Steel '+entry.steel.toLocaleString('en-US'):'';$('base-unit-carbon').textContent=entry.carbon?'Carbon '+entry.carbon.toLocaleString('en-US'):'';
}
function refreshBaseUnitMenu(u){
 const grid=$('base-unit-grid');grid.replaceChildren();
 const actions=[{key:'flak',name:'Flak upgrade',image:'flak-upgrade',max:50,animated:true},{key:'wall',name:'Wall upgrade',image:'base-defence',max:2,animated:true},{key:'range',name:'Long range',image:'range-upgrade',max:1,animated:true},{key:'queue',name:'Queue timer',image:'queue-timer',animated:true}];
 if(baseUnitKind!=='aircraft')for(const action of actions){
  const level=action.key==='flak'?baseGunCount(u):action.key==='wall'?(u.wallLevel??1):action.key==='range'?Number(Boolean(u.maxUpgraded||u.specialUpgrades?.range)):(u.buildQueue?.length??0),maxed=action.max!==undefined&&level>=action.max,b=document.createElement('button');b.className='base-unit-upgrade';b.setAttribute('aria-label',action.key==='flak'?'Flak upgrade to level '+Math.min(50,level+1):action.name);b.setAttribute('aria-disabled',String(maxed));
  const im=document.createElement('img');im.src='assets/menu/'+action.image+'.png';im.alt='';if(action.animated){im.dataset.still=im.getAttribute('src');im.dataset.animation='assets/menu/'+action.image+'.webp';}b.append(im);if(maxed)b.classList.add('maxed');
  if(action.key==='queue'){const ns='http://www.w3.org/2000/svg',count=document.createElementNS(ns,'svg'),label=document.createElementNS(ns,'text');count.classList.add('queue-count');count.setAttribute('viewBox','0 0 60 40');count.setAttribute('aria-hidden','true');label.setAttribute('x','30');label.setAttribute('y','28');label.setAttribute('text-anchor','middle');label.setAttribute('font-family','Tahoma, sans-serif');label.setAttribute('font-size','21.333333');label.setAttribute('fill','white');label.textContent=String(level);count.append(label);b.append(count);} 
  b.onpointerenter=()=>{stopBaseUnitAnimations();if(im.dataset.animation)im.src=im.dataset.animation;describeBaseUnit({name:action.key==='flak'&&!maxed?'Flak upgrade to level '+(level+1):action.name,description:action.key==='queue'?'Troop production queue':maxed?'Maximum level reached':action.key==='flak'?'Adds one defensive gun':action.key==='range'?'20 map units':'Wall: 10× turret health',detail:action.key==='queue'?level+' units queued · 3 seconds each':action.key==='flak'?level+' defensive guns':action.key==='wall'?'Wall level '+level:''});};
  b.onpointerleave=()=>{if(im.dataset.still)im.src=im.dataset.still;};
  b.onclick=()=>{if(action.key==='queue'){notice(level?level+' units queued; each takes 3 seconds.':'Queue empty.');return;}if(maxed)return;if(action.key==='flak')upgradeBaseFlak(u);else if(action.key==='wall')u.wallLevel=level+1;else{u.specialUpgrades??={};u.specialUpgrades.range=true;}refreshBaseUnitMenu(u);placeBaseUnitMenu(u);};grid.append(b);
 }
 const entries=DW5_MENU_UNITS.filter(entry=>baseUnitKind==='aircraft'?entry.aircraftMenu:!entry.air);
 for(const entry of entries){
  const b=document.createElement('button');b.className='base-unit-vehicle';b.setAttribute('aria-label',entry.name);b.setAttribute('aria-disabled',String(!entry.type));b.title=entry.type?entry.name:entry.name+' · unit preview';
  const im=document.createElement('img');im.src='assets/menu/units/'+entry.id+'.png';im.dataset.still=im.getAttribute('src');im.dataset.animation='assets/menu/units/'+entry.id+'.webp';im.alt='';b.append(im);b.onpointerenter=()=>{stopBaseUnitAnimations();im.src=im.dataset.animation;describeBaseUnit(entry);};b.onpointerleave=()=>im.src=im.dataset.still;
  b.onclick=()=>{if(!entry.type){notice(entry.name+' is a catalogue preview; its gameplay has not been added yet.');return;}u.buildQueue??=[];u.buildQueue.push({type:entry.type,name:entry.name,id:entry.id});notice(TYPES[entry.type].name+' queued at '+TYPES[u.type].name+' (3 seconds).');refreshBaseUnitMenu(u);};grid.append(b);
 }
 while(grid.children.length%4){const empty=document.createElement('div');empty.className='base-unit-empty';empty.setAttribute('aria-hidden','true');grid.append(empty);}
 if(entries.length)describeBaseUnit(entries[0]);
}
function openBaseUnitMenu(u,kind='ground'){baseUnitId=u.id;baseUnitKind=kind;baseUnitMenu.dataset.kind=kind;baseUnitMenu.hidden=false;refreshBaseUnitMenu(u);placeBaseUnitMenu(u);baseUnitMenu.setAttribute('aria-label',(u.type==='airbase'?'Airbase':'Military base')+' production menu');scheduleHideBaseHover();}
$('base-unit-close').onclick=closeBaseUnitMenu;
// Main-base hover uses the entrance hotspot; other building zones stay independent.
const baseUnitPriorMove=canvas.onpointermove;
canvas.onpointermove=e=>{baseUnitPriorMove(e);if(drag||tool!=='select'){closeBaseUnitMenu();return;}const p=world(pos(e));let found=null,kind='ground';for(const u of units.slice().reverse()){if(TYPES[u.type].speed)continue;const anchor=baseEntrancePoint(u);if(Math.abs(p.x-anchor.x)<55&&Math.abs(p.y-anchor.y)<48){found=u;break;}if(u.type==='airbase'&&Math.abs(p.x-u.x-215)<100&&Math.abs(p.y-u.y+246)<48){found=u;kind='aircraft';break;}}if(found){if(baseUnitId!==found.id||baseUnitKind!==kind)openBaseUnitMenu(found,kind);else placeBaseUnitMenu(found)}else if(!baseUnitMenu.matches(':hover'))closeBaseUnitMenu()};
baseUnitMenu.addEventListener('pointerleave',()=>closeBaseUnitMenu());

function syncBaseMenuPositions(){
 if(!baseHoverMenu.hidden){const u=units.find(u=>u.id===hoveredBaseId);if(u)positionBaseHover(u);else scheduleHideBaseHover();}
 if(!baseUnitMenu.hidden){const u=units.find(u=>u.id===baseUnitId);if(u)placeBaseUnitMenu(u);else closeBaseUnitMenu();}syncFactoryHover();
}
const menuPriorPointerDown=canvas.onpointerdown;canvas.onpointerdown=e=>{if(e.button===1||e.button===2){hoverMenuHeld=false;scheduleHideBaseHover();closeBaseUnitMenu();}menuPriorPointerDown(e);};

// Native factory choices: upgrade, one hour, fifteen hours; refinery conversion.
const factoryHoverMenu=$('factory-hover-menu'),factoryGrid=$('factory-hover-icons');
let factoryHoverId=null,factoryHoverKey=null,factoryHoverAction='upgrade',factoryRefreshAt=0;
function stopFactoryAnimations(){for(const im of factoryGrid.querySelectorAll('img[data-animation]'))im.src=im.dataset.still;}
function closeFactoryHover(){stopFactoryAnimations();factoryHoverMenu.hidden=true;factoryHoverId=null;factoryHoverKey=null;}
function describeFactoryHover(){const u=units.find(u=>u.id===factoryHoverId);if(!u)return;const key=factoryHoverKey,info=FACTORY_TYPES[key],level=getFactoryLevel(u,key),left=factoryProductionRemaining(u),action=factoryHoverAction;
 $('factory-hover-title').textContent=info.name;
 $('factory-hover-detail').textContent=action==='upgrade'?(level>=20?'Maximum level reached':'Upgrade to level '+(level+1)):action==='convert'?'Convert Fuel into Titanium':action==='cancel'?'Cancel production':(action==='hour'?'1 Hour':'15 Hours')+' production';
 $('factory-hover-state').textContent=left?u.production.label+' · '+formatFactoryCountdown(left):action==='convert'?'Preview · unlimited sandbox resources':'Level '+level+' / 20 · free sandbox';
 const quote=factoryUpgradeQuote(u,key);$('factory-hover-cost').textContent=action==='upgrade'?(level<20?'Concrete '+quote.concrete.toLocaleString('en-US'):''):action==='cancel'?'Click to cancel':action==='convert'?'Conversion gameplay coming later':'Titanium '+info.index*(action==='hour'?1:15);
 for(const b of factoryGrid.children){if(b.dataset.slot==='fifteen'){b.dataset.action=left?'cancel':'fifteen';b.classList.toggle('factory-cancel',!!left);b.setAttribute('aria-label',left?'Cancel base production':info.resource+' 15 hours production');}const blocked=b.dataset.action==='upgrade'?level>=20:b.dataset.action==='convert'?true:b.dataset.action==='cancel'?false:!!left;b.setAttribute('aria-disabled',String(blocked));b.classList.toggle('maxed',b.dataset.action==='upgrade'&&level>=20);}
}
function placeFactoryHover(u){const origin=clampMenuOrigin(projectBasePoint(factoryPoint(u,factoryHoverKey)),factoryHoverMenu,factoryGrid);factoryHoverMenu.style.left=origin.left+'px';factoryHoverMenu.style.top=origin.top+'px';}
function openFactoryHover(u,key){factoryHoverId=u.id;factoryHoverKey=key;factoryHoverAction='upgrade';factoryGrid.replaceChildren();factoryHoverMenu.style.width=(key==='fuel'?240:180)+'px';
 for(const action of ['upgrade','hour','fifteen',...(key==='fuel'?['convert']:[])]){const b=document.createElement('button');b.dataset.action=action;b.dataset.slot=action;b.setAttribute('aria-label',action==='upgrade'?'Upgrade '+FACTORY_TYPES[key].name:action==='convert'?'Convert fuel into Titanium':FACTORY_TYPES[key].resource+' '+(action==='hour'?'1 hour':'15 hours')+' production');const im=document.createElement('img');const stem=key+'-'+(action==='upgrade'?'upgrade':'produce');im.src=action==='convert'?'assets/menu/factories/fuel-conversion.png':key==='steel'?'assets/menu/factories/new-'+(action==='upgrade'?'upgrade':action==='hour'?'hour':'fifteen')+'.png':action==='upgrade'?factoryLevelOneIcon(key):'assets/menu/factories/'+key+'-produce.png';im.dataset.still=im.src;im.alt='';if(key!=='steel'&&action!=='convert'){im.onload=()=>{if(im.src.startsWith('data:'))return;const cropped=fitFactoryMenuIcon(im);if(cropped){im.src=cropped;im.dataset.still=cropped;}};}b.append(im);if(key!=='steel'&&['hour','fifteen'].includes(action)){const duration=document.createElement('span');duration.className='factory-hours-label';duration.textContent=action==='hour'?'1h':'15h';b.append(duration);}b.onpointerenter=()=>{stopFactoryAnimations();factoryHoverAction=b.dataset.action;if(im.dataset.animation)im.src=im.dataset.animation;describeFactoryHover();};b.onpointerleave=()=>im.src=im.dataset.still;b.onclick=()=>{const action=b.dataset.action;if(action==='cancel'){requestCancelBaseProduction(u);return;}if(action==='upgrade'){if(upgradeFactory(u,key))notice(FACTORY_TYPES[key].name+' upgraded to level '+getFactoryLevel(u,key)+'.');}else if(action==='convert')notice('Fuel conversion is a preview in this unlimited-resource sandbox.');else if(startFactoryProduction(u,key,action==='hour'?1:15))notice(FACTORY_TYPES[key].resource+' production started. No Titanium deducted.');else notice('This base is already producing resources.');describeFactoryHover();};factoryGrid.append(b);}
 factoryHoverMenu.hidden=false;describeFactoryHover();placeFactoryHover(u);
}
function syncFactoryHover(){if(factoryHoverMenu.hidden)return;const u=units.find(u=>u.id===factoryHoverId);if(!u||drag||tool!=='select'){closeFactoryHover();return;}placeFactoryHover(u);if(last-factoryRefreshAt>250){describeFactoryHover();factoryRefreshAt=last;}}
const factoryPriorMove=canvas.onpointermove;
canvas.onpointermove=e=>{factoryPriorMove(e);if(drag||tool!=='select'){closeFactoryHover();return;}const p=world(pos(e));let found=null;for(const u of units.slice().reverse()){if(TYPES[u.type].speed)continue;for(const key of Object.keys(FACTORY_TYPES)){const a=factoryPoint(u,key);if(factorySpriteContains(u,key,p)){found={u,key};break;}}if(found)break;}if(found){hoverMenuHeld=false;scheduleHideBaseHover();closeBaseUnitMenu();if(factoryHoverId!==found.u.id||factoryHoverKey!==found.key)openFactoryHover(found.u,found.key);}else closeFactoryHover();};
canvas.addEventListener('pointerleave',e=>{if(!e.relatedTarget||!factoryHoverMenu.contains(e.relatedTarget))closeFactoryHover();});
factoryHoverMenu.addEventListener('pointerleave',closeFactoryHover);
canvas.addEventListener('pointerdown',e=>{if(e.button===1||e.button===2)closeFactoryHover();});

const factoryHitCache=new Map();
function factorySpriteContains(u,key,p){const im=dwArt[FACTORY_TYPES[key].sprite];if(!im?.complete||!im.naturalWidth)return false;const stage=Math.min(9,factoryStage(u,key)),w=im.naturalWidth/10,h=im.naturalHeight,cacheKey=key+stage;let data=factoryHitCache.get(cacheKey);if(!data){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,stage*w,0,w,h,0,0,w,h);data=g.getImageData(0,0,w,h).data;factoryHitCache.set(cacheKey,data);}const a=factoryPoint(u,key),offsets={concrete:[-100,-20],steel:[-75,-25],carbon:[-70,-15],fuel:[75,-35]},points=[a];if(factoryStage(u,key)>=10){const [x,y]=offsets[key];points.push({x:a.x+x,y:a.y+y});}return points.some(o=>{const x=Math.floor(p.x-o.x+w/2),y=Math.floor(p.y-o.y+h/2);return x>=0&&x<w&&y>=0&&y<h&&data[(y*w+x)*4+3]>180;});}

// DW5 idle rule: 1% per 50 ms tick, target shift -10..+10 of 72 headings.
// Keep animation state outside saved base data and outside the static base cache.
const idleTurrets=new WeakMap();
function advanceIdleTurret(state,now,random=Math.random){const elapsed=Math.min(500,Math.max(0,now-(state.updatedAt??state.tick)));state.updatedAt=now;const steps=Math.min(10,Math.max(0,Math.floor((now-state.tick)/50)));if(steps){state.tick=now-(now-state.tick)%50;for(let n=0;n<steps;n++)if(random()<.01)state.target=(state.target-10+20*random()+72)%72;}const delta=(state.target-state.angle+108)%72-36;state.angle=(state.angle+Math.sign(delta)*Math.min(10*elapsed/1000,Math.abs(delta))+72)%72;return state.angle;}
// Blend neighbouring native headings so five-degree sprite steps do not snap.
function drawSmoothTurret(im,heading,x,y){const w=im.naturalWidth/72,h=im.naturalHeight,frame=Math.floor(heading)%72,mix=heading-Math.floor(heading);ctx.drawImage(im,frame*w,0,w,h,x-w/2,y-h/2,w,h);if(mix>.001){ctx.save();ctx.globalAlpha*=mix;ctx.drawImage(im,((frame+1)%72)*w,0,w,h,x-w/2,y-h/2,w,h);ctx.restore();}}
function idleTurretFrame(u,index,now){let guns=idleTurrets.get(u);if(!guns){guns=[];idleTurrets.set(u,guns);}let state=guns[index];if(!state){const angle=index%2?10:22;state= guns[index]={angle,target:angle,tick:now};}return advanceIdleTurret(state,now);}


// Confirm cancellation of this exact job; never cancel a replacement timer.
function cancelBaseProduction(u,expected){if(!u||u.production!==expected||!expected)return false;delete u.production;return true;}
const cancelProductionDialog=document.createElement('dialog');
cancelProductionDialog.id='cancel-production-dialog';
cancelProductionDialog.setAttribute('aria-labelledby','cancel-production-question');
cancelProductionDialog.innerHTML='<div id="cancel-production-question">Really cancel?</div><div class="cancel-production-actions"><button type="button" data-answer="yes">YES</button><button type="button" data-answer="no" autofocus>NO</button></div>';
document.body.append(cancelProductionDialog);
let pendingProductionCancel=null;
function requestCancelBaseProduction(u){if(!u.production)return;pendingProductionCancel={id:u.id,job:u.production};hoverMenuHeld=false;scheduleHideBaseHover();closeBaseUnitMenu();closeFactoryHover();cancelProductionDialog.showModal();}
function finishProductionCancellation(confirmed){const pending=pendingProductionCancel;pendingProductionCancel=null;cancelProductionDialog.close();if(confirmed&&pending){const u=units.find(u=>u.id===pending.id);if(cancelBaseProduction(u,pending.job)){notice('Base production cancelled.');refreshProductionPanel();}}}
cancelProductionDialog.querySelector('[data-answer="yes"]').onclick=()=>finishProductionCancellation(true);
cancelProductionDialog.querySelector('[data-answer="no"]').onclick=()=>finishProductionCancellation(false);
cancelProductionDialog.addEventListener('cancel',()=>{pendingProductionCancel=null;});


const factoryLevelOneIcons=new Map();
function factoryLevelOneIcon(key){if(factoryLevelOneIcons.has(key))return factoryLevelOneIcons.get(key);const im=dwArt[FACTORY_TYPES[key].sprite];if(!im?.complete||!im.naturalWidth)return 'assets/menu/factories/'+key+'-upgrade.png';const w=im.naturalWidth/10,h=im.naturalHeight,c=document.createElement('canvas');c.width=120;c.height=72;const g=c.getContext('2d'),scale=Math.min(116/w,68/h);g.drawImage(im,0,0,w,h,(120-w*scale)/2,(72-h*scale)/2,w*scale,h*scale);const icon=fitFactoryMenuIcon(c)||c.toDataURL();factoryLevelOneIcons.set(key,icon);return icon;}

function fitFactoryMenuIcon(im){const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;if(!w||!h)return null;const source=document.createElement('canvas');source.width=w;source.height=h;const g=source.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}if(x1<0)return null;const sw=x1-x0+1,sh=y1-y0+1,out=document.createElement('canvas');out.width=120;out.height=72;const scale=Math.min(116/sw,68/sh);out.getContext('2d').drawImage(source,x0,y0,sw,sh,(120-sw*scale)/2,(72-sh*scale)/2,sw*scale,sh*scale);return out.toDataURL();}


// Separate hull/turret angles, using DW5's idle target rule (2%/50ms, +/-5 headings).
const troopAnimationStates=new WeakMap();
function turnToward(angle,target,step){const d=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));return angle+Math.sign(d)*Math.min(Math.abs(d),step);}
function advanceTroopAnimation(state,u,dt,random=Math.random){dt=Math.min(.1,Math.max(0,dt));state.time+=dt;const moving=!!u.target,oldBody=state.body;const attacking=Number.isFinite(u.aimAngle)&&last<(u.aimUntil??0);const air=!!nativeTroops[u.type].air;
// Aircraft have no independent turret: visually face their current enemy while firing.
// Ground vehicles keep their moving hull direction and turn only the weapon layer.
const bodyGoal=air&&attacking?u.aimAngle:u.angle;
state.body=air&&attacking?turnToward(state.body,bodyGoal,dt*3):moving?u.angle:turnToward(state.body,bodyGoal,dt*3);
state.idleAim+=Math.atan2(Math.sin(state.body-oldBody),Math.cos(state.body-oldBody));state.idleClock+=dt;while(state.idleClock>=.05){state.idleClock-=.05;if(!air&&random()<.02)state.idleAim=state.body+(random()-.5)*Math.PI*5/18;}
const goal=attacking?u.aimAngle:air?state.body:state.idleAim;
state.turret=turnToward(state.turret,goal,dt*(attacking?3:1.5));state.moving=moving;return state;}
function troopAnimation(u){let state=troopAnimationStates.get(u);if(!state){state={body:u.angle,turret:u.angle,idleAim:u.angle,idleClock:0,time:u.id*.137,updatedAt:last,moving:!!u.target};troopAnimationStates.set(u,state);}const dt=paused?0:Math.min(.1,Math.max(0,(last-state.updatedAt)/1000))*speed;state.updatedAt=last;return advanceTroopAnimation(state,u,dt);}
function headingFrame(angle){return ((17+angle*36/Math.PI)%72+72)%72;}
function drawTroopHeading(im,angle,x,y){if(im?.complete&&im.naturalWidth)drawSmoothTurret(im,headingFrame(angle),x,y);}


// Right-click transfers one troop; a right drag continues to pan the battlefield.
const orderMarkers=[];
function addOrderMarker(x,y,kind){orderMarkers.push({x,y,kind,started:last});if(orderMarkers.length>24)orderMarkers.shift();}
function reservedJoinSlots(groupId){return units.filter(u=>u.joinOrder?.groupId===groupId).map(u=>u.joinOrder.slot);}
function transferTroopToClickedGroup(p){const hit=units.slice().reverse().find(u=>TYPES[u.type].speed&&Math.hypot(u.x-p.x,u.y-p.y)<28);if(!hit||hit.joinOrder)return false;const destination=units.filter(u=>TYPES[u.type].speed&&u.groupId===hit.groupId),source=units.find(u=>selected.has(u.id)&&!u.joinOrder&&u.type===hit.type&&u.team===hit.team&&u.team===PLAYER_TEAM&&u.groupId!==hit.groupId);if(!source)return false;const reserved=reservedJoinSlots(hit.groupId);if(destination.length+reserved.length>=GROUP_SIZE){notice('That group has 49 troops or reserved arrival slots.');return false;}const used=new Set([...destination.map(u=>u.groupSlot),...reserved]);let slot=0;while(used.has(slot))slot++;const sourceMembers=units.filter(u=>u.groupId===source.groupId&&u.type===source.type&&u.team===source.team);const sourceCapacity=Math.max(1,groupHealthSummary(sourceMembers).capacity-1);for(const member of sourceMembers)member.groupHealthCapacity=sourceCapacity;selected.delete(source.id);source.groupId=++nextGroupId;source.groupSlot=0;delete source.formationOrder;source.groupHealthCapacity=1;source.originBase=null;source.joinOrder={groupId:hit.groupId,slot};updatePendingGroupJoins();addOrderMarker(hit.x,hit.y,'transfer');notice('One '+TYPES[source.type].name+' is moving to the other group.');return true;}
function updatePendingGroupJoins(){for(const u of units){if(!u.joinOrder)continue;const order=u.joinOrder,members=units.filter(v=>v.groupId===order.groupId&&v.type===u.type&&v.team===u.team&&v.hp>0);if(!members.length||members.length>=GROUP_SIZE||members.some(v=>v.groupSlot===order.slot)){delete u.joinOrder;u.target=null;continue;}const anchor=members.reduce((p,v)=>{const o=formationOffset(v.type,v.groupSlot);p.x+=v.x-o.x;p.y+=v.y-o.y;return p;},{x:0,y:0});anchor.x/=members.length;anchor.y/=members.length;const offset=formationOffset(u.type,order.slot),target={x:Math.max(0,Math.min(WORLD_WIDTH,anchor.x+offset.x)),y:Math.max(0,Math.min(WORLD_HEIGHT,anchor.y+offset.y))};if(Math.hypot(u.x-target.x,(u.y-target.y)*3)<=.75){u.x=target.x;u.y=target.y;u.groupId=order.groupId;u.groupSlot=order.slot;u.groupHealthCapacity=groupHealthSummary(members).capacity;u.originBase=members[0].originBase;u.rallyX=members[0].rallyX;u.rallyY=members[0].rallyY;u.angle=members[0].angle;u.travelAngle=u.angle;u.moveSpeed=0;u.target=null;delete u.joinOrder;}else u.target=target;}}
function drawOrderMarkers(){ctx.save();for(let i=orderMarkers.length-1;i>=0;i--){const m=orderMarkers[i],frame=Math.floor((last-m.started)*60/1000)+1;if(frame>10){orderMarkers.splice(i,1);continue;}ctx.globalAlpha=.5;ctx.strokeStyle=m.kind==='transfer'?'#00ffff':'#ffffff';ctx.lineWidth=5/zoom;ctx.beginPath();ctx.ellipse(m.x,m.y,frame*3/zoom,frame/zoom,0,0,Math.PI*2);ctx.stroke();}ctx.restore();}
document.addEventListener('contextmenu',e=>{if(e.target.closest?.('#field,aside,dialog'))e.preventDefault();});
document.addEventListener('dragstart',e=>{if(e.target.tagName==='IMG')e.preventDefault();});


// Carry momentum through a turn; travel direction can lead the hull slightly.
// Timed DW5 99G straight run: about 1,065 screen/world px in 7 s at 1:1 zoom.
// Calibrated visual speed, not a claim about DW5's private server formula.
// TanSAM keeps the published 1:2 speed ratio. Aircraft retain their existing speeds.
// One moving anchor per division. Members steer to its rotating slots rather
// than travelling independently to a static end-of-map offset.
const divisionMotion=new Map();
function formationSlotAt(type,slot,heading){
 // Fixed world-space slot layout: turning the hull must never rotate its
 // destination around the anchor or cause a helicopter orbit feedback loop.
 return formationOffset(type,slot);
}
function updateDivisionMovement(dt){
 const active=new Set();
 for(const members of troopGroups()){
  const order=members.find(u=>u.formationOrder)?.formationOrder;
  if(!order)continue;
  const id=members[0].groupId;active.add(id);
  const type=members[0].type;
  let motion=divisionMotion.get(id);
  if(!motion){
   const heading=Number.isFinite(members[0].angle)?members[0].angle:0;
   const anchors=members.map(u=>{const p=formationSlotAt(type,u.groupSlot,heading);return{x:u.x-p.x,y:u.y-p.y};});
   const mid=values=>{const sorted=values.sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]};
   motion={x:mid(anchors.map(p=>p.x)),y:mid(anchors.map(p=>p.y)),angle:heading,travelAngle:heading,moveSpeed:0,target:null};
   divisionMotion.set(id,motion);
  }
  motion.target={x:order.x,y:order.y};
  moveTroopWithDrift(motion,TYPES[type],dt);
  const heading=motion.angle;
  let settled=!motion.target;
  for(const u of members){
   u.formationOrder={x:order.x,y:order.y};
   const offset=formationSlotAt(type,u.groupSlot,heading);
   const x=Math.max(0,Math.min(WORLD_WIDTH,motion.x+offset.x)),y=Math.max(0,Math.min(WORLD_HEIGHT,motion.y+offset.y));
   const d=Math.hypot(u.x-x,3*(u.y-y));
   if(d>1.5)settled=false;
   u.target={x,y};
  }
  if(settled){for(const u of members){delete u.formationOrder;u.target=null;u.moveSpeed=0;}divisionMotion.delete(id);}
 }
 for(const id of divisionMotion.keys())if(!active.has(id))divisionMotion.delete(id);
}
// Solid base footprints for ground vehicles. The rendered terrain is wider
// than the actual structures; use the central compound/wall footprint only.
function groundBaseObstacles(){return units.filter(b=>b.hp>0&&!TYPES[b.type].speed).map(b=>({x:b.x,y:b.y,rx:b.type==='airbase'?590:570,ry:b.type==='airbase'?205:190}));}
function segmentHitsBase(a,b,o){
 const dx=b.x-a.x,dy=b.y-a.y,px=a.x-o.x,py=a.y-o.y;
 const A=dx*dx/(o.rx*o.rx)+dy*dy/(o.ry*o.ry);
 if(A<1e-9)return false;
 const B=2*(px*dx/(o.rx*o.rx)+py*dy/(o.ry*o.ry));
 const C=px*px/(o.rx*o.rx)+py*py/(o.ry*o.ry)-1;
 if(C<0)return true;
 const disc=B*B-4*A*C;if(disc<=0)return false;
 const root=(-B-Math.sqrt(disc))/(2*A);return root>=0&&root<=1;
}
function groundMoveGoal(u,destination,obstacles){
 // A persistent detour avoids alternating sides on consecutive frames.
 const previous=u.baseDetour;
 if(previous&&Math.hypot(previous.destination.x-destination.x,previous.destination.y-destination.y)<2){
  if(Math.hypot(u.x-previous.waypoint.x,(u.y-previous.waypoint.y)*3)>15)return previous.waypoint;
  u.baseDetour=null;
 }
 for(const b of obstacles){
  const dx=u.x-b.x,dy=u.y-b.y;
  // If already within a compound (e.g. old saved scenario), allow moving out.
  if(dx*dx/(b.rx*b.rx)+dy*dy/(b.ry*b.ry)<1)continue;
  if(!segmentHitsBase(u,destination,b))continue;
  const candidates=[
   {x:b.x-b.rx-32,y:b.y-b.ry-32},{x:b.x+b.rx+32,y:b.y-b.ry-32},
   {x:b.x-b.rx-32,y:b.y+b.ry+32},{x:b.x+b.rx+32,y:b.y+b.ry+32}
  ];
  // Choose the nearest visible corner. Subsequent steps route along the edge.
  const valid=candidates.filter(p=>!segmentHitsBase(u,p,b));
  const options=valid.length?valid:candidates;
  const waypoint=options.reduce((best,p)=>!best||Math.hypot(u.x-p.x,(u.y-p.y)*3)+Math.hypot(p.x-destination.x,(p.y-destination.y)*3)<Math.hypot(u.x-best.x,(u.y-best.y)*3)+Math.hypot(best.x-destination.x,(best.y-destination.y)*3)?p:best,null);
  u.baseDetour={destination:{...destination},waypoint};return waypoint;
 }
 u.baseDetour=null;return destination;
}
function keepGroundOutsideBases(u,oldX,oldY,obstacles){
 for(const b of obstacles){
  const dx=u.x-b.x,dy=u.y-b.y,n=dx*dx/(b.rx*b.rx)+dy*dy/(b.ry*b.ry);
  if(n>=1)continue;
  const oldDx=oldX-b.x,oldDy=oldY-b.y;
  if(oldDx*oldDx/(b.rx*b.rx)+oldDy*oldDy/(b.ry*b.ry)<1)continue;
  // Clamp at the wall, preventing high-speed tunnelling through the compound.
  let lo=0,hi=1;for(let i=0;i<14;i++){const m=(lo+hi)/2,x=oldX+(u.x-oldX)*m-b.x,y=oldY+(u.y-oldY)*m-b.y;if(x*x/(b.rx*b.rx)+y*y/(b.ry*b.ry)>=1)lo=m;else hi=m;}
  u.x=oldX+(u.x-oldX)*lo;u.y=oldY+(u.y-oldY)*lo;u.moveSpeed=0;
 }
}
function moveTroopWithDrift(u,t,dt){
 if(!u.target||!t.speed){u.moveSpeed=0;u.baseDetour=null;return;}
 const obstacles=(u.type==='heli'||u.type==='jet'||u.type==='raptor')?[]:groundBaseObstacles();
 // Fixed maximum step keeps steering and braking consistent across frame rates.
 for(let remaining=dt;remaining>0&&u.target;){
  const h=Math.min(remaining,1/120);remaining-=h;
  const goalPoint=obstacles.length?groundMoveGoal(u,u.target,obstacles):u.target;
  const dx=goalPoint.x-u.x,dy=(goalPoint.y-u.y)*3,d=Math.hypot(dx,dy);
  if(d<=.75){if(goalPoint!==u.target){u.baseDetour=null;continue;}u.x=u.target.x;u.y=u.target.y;u.target=null;u.moveSpeed=0;break;}
  const goal=Math.atan2(dy,dx),acceleration=t.speed*3;
  u.angle=turnToward(u.angle,goal,h*3);
  const error=Math.abs(Math.atan2(Math.sin(goal-u.angle),Math.cos(goal-u.angle)));
  const turnSpeed=.45+.55*Math.cos(error/2)**2;
  const desired=Math.min(t.speed*turnSpeed,Math.sqrt(2*acceleration*d),d*4);
  const current=u.moveSpeed??0;
  u.moveSpeed=current+Math.sign(desired-current)*Math.min(Math.abs(desired-current),acceleration*h);
  // Retain rolling turns, but converge on the final slot instead of circling it.
  const steering=3.8+12*Math.max(0,1-d/(t.speed*.5));
  u.travelAngle=turnToward(u.travelAngle??u.angle,goal,h*steering);
  const step=Math.min(u.moveSpeed*h,d);
  const oldX=u.x,oldY=u.y;
  u.x+=Math.cos(u.travelAngle)*step;u.y+=Math.sin(u.travelAngle)*step/3;
  if(obstacles.length)keepGroundOutsideBases(u,oldX,oldY,obstacles);
 }
}


function baseFlagAsset(u){return u.team===PLAYER_TEAM?'flaggeg.png':friendlyTeams(u.team,PLAYER_TEAM)?'flaggeb.png':'flagger.png';}
function drawBaseFlag(u){const entrance=baseEntrancePoint(u),air=u.type==='airbase',x=entrance.x+(air?6:20),y=entrance.y+(air?7:10),frame=Math.floor(last/100)%34,pole=dwArt['flagget.png'];if(pole?.complete&&pole.naturalWidth)ctx.drawImage(pole,x-15,y-15);spriteFrame(dwArt['flagges.png'],frame,x-20,y+60,34);spriteFrame(dwArt[baseFlagAsset(u)],frame,x,y,34);}

// DW5 help.deltawars.com/?a=units: range, normal/special firepower and armour.
// Native JZ animates every member of the engaged group; Rx pools weapon sounds.
// Server damage is not public: this sandbox resolves firepower/armour as percent
// health per existing 0.8s volley, preserving health bars and saved scenarios.
const BASE_WEAPON_RANGE_MAP=Object.freeze({normal:12,longRange:20});
const COMBAT_STATS={
 tank:{range:8,firepower:1000,armor:107,sound:'cannon'},
 aa:{range:10,firepower:40,armor:75,special:1000,sound:'rak'},
 heli:{range:10,firepower:100,armor:30,special:2500,sound:'rak'},
 jet:{range:12,firepower:1000,armor:3000,sound:'cannon'},
 raptor:{range:12,sight:21,firepower:50,armor:15000,special:1250,sound:'cannon'}
};
let showWeaponRanges=true,combatClock=0;
const combatCooldowns=new Map(),combatFiredAt=new WeakMap();
// Track casualty limits by attacking division and defending division, not globally.
const attackerCasualtyTimes=new Map();
function combatDistance(a,b){return Math.hypot(b.x-a.x,(b.y-a.y)*3);}
function combatGroups(){
 for(const u of units)if(!TYPES[u.type].speed)syncBaseDefenceHealth(u);
 const out=troopGroups(units.filter(u=>u.hp>0)).map(members=>{
  const first=members[0];let x=0,y=0;
  for(const u of members){const o=formationOffset(u.type,u.groupSlot??0);x+=u.x-o.x;y+=u.y-o.y;}
  return{key:'g'+(first.groupId??first.id),members,type:first.type,team:first.team,x:x/members.length,y:y/members.length};
 });
 for(const u of units)if(u.hp>0&&!TYPES[u.type].speed){const p=baseEntrancePoint(u);out.push({key:'b'+u.id,members:[u],type:u.type,team:u.team,x:p.x,y:p.y});}
 return out;
}
function weaponRange(group,target=null){
 const stat=COMBAT_STATS[group.type],first=group.members[0];
 let radius=stat?stat.range*90:TYPES[group.type].range;
 // Provisional gameplay distances approved by the owner; not exact DW5 measurements.
 if(!stat)return 90*BASE_WEAPON_RANGE_MAP[(first.maxUpgraded||first.specialUpgrades?.range)?'longRange':'normal'];
 let multiplier=1;
 if(group.type==='aa'&&target?.type==='heli')multiplier=3;
 const firing=target?.firing;
 if(firing&&['tank','aa','heli'].includes(group.type))multiplier=Math.max(multiplier,2);
 if(firing&&['jet','raptor'].includes(group.type)&&['heli','jet','raptor'].includes(target?.type))multiplier=3;
 return radius*multiplier;
}
function shotDamage(attacker,target){
 const stat=COMBAT_STATS[attacker.type];if(!stat){
  if(!TYPES[attacker.type].speed&&COMBAT_STATS[target.type])return 75000/COMBAT_STATS[target.type].armor;
  return TYPES[attacker.type].damage;
 }
 let firepower=stat.firepower;
 if(attacker.type==='aa'&&target.type==='heli')firepower=stat.special;
 if(attacker.type==='heli'&&!['heli','jet','raptor'].includes(target.type))firepower=stat.special;
 if(attacker.type==='raptor'&&['heli','jet','raptor'].includes(target.type))firepower=stat.special;
 // Troop armour uses DW5 stats; base damage normalization remains a sandbox rule.
 if(!TYPES[target.type].speed){
  // DW5 Wall test: 47 MRHs produced 353 VF/tick, 49 more produced 367.
  // 1500 MRH firepower / (20 * 10 wall armour) = 7.5 VF per MRH.
  // Other unit-vs-base modifiers remain provisional until measured.
  return firepower/(20*BASE_WALL_ARMOR);
 }
 const armour=COMBAT_STATS[target.type]?.armor??100;
 return firepower/armour*TYPES[target.type].hp/100;
}
// A base locks onto the first individual troop entering its firing radius.
// When that troop dies, acquire another eligible troop at random.
function baseTargetUnit(base,groups){
 const owner=base.members[0],radius=weaponRange(base);
 const longRange=!!(owner.maxUpgraded||owner.specialUpgrades?.range);
 const frontY=owner.y+(owner.type==='airbase'?99:76);
 // A division has one invisible targeting centre. Individual members at the
 // perimeter do not independently enable/disable the whole division's fire.
 const eligible=groups.filter(g=>TYPES[g.type].speed&&!friendlyTeams(base.team,g.team)&&g.members.some(u=>u.hp>0))
  .filter(g=>(longRange||g.y>=frontY)&&Math.hypot(g.x-base.x,(g.y-base.y)*3)<=radius);
 if(!eligible.length){owner.baseTargetId=null;owner.baseTargetGroupId=null;return null;}
 // Keep the same division locked while its centre remains in range.
 const locked=eligible.find(g=>g.members.some(u=>u.groupId===owner.baseTargetGroupId));
 const chosen=locked??eligible.reduce((best,g)=>!best||Math.hypot(g.x-base.x,(g.y-base.y)*3)<Math.hypot(best.x-base.x,(best.y-base.y)*3)?g:best,null);
 const alive=chosen.members.filter(u=>u.hp>0);
 // Formation slots are assigned as units are added (0, 1, 2 ...).
 // The newest/highest slot is on the outer edge: destroy that slot first,
 // then work backwards through the formation, one casualty at a time.
 // Keep visual turret aim, tracers and actual damage on the same individual.
 const target=alive.reduce((best,u)=>!best||(u.groupSlot??0)>(best.groupSlot??0)?u:best,null);
 owner.baseTargetId=target.id;owner.baseTargetGroupId=target.groupId;
 return target;
}
// Match applyGroupDamage: incoming fire hits the last surviving turret slot.
function targetedTurretPoint(base){
 const health=base.turretHealth??[];
 let slot=health.length-1;
 while(slot>=0&&!(health[slot]>0))slot--;
 if(slot<0)return{x:base.x,y:base.y};
 const air=base.type==='airbase',orientation=air?3:1;
 return{x:base.x+(air?510:450)+DW5_DEFENCE.x[orientation][slot],
  y:base.y+(air?150:130)+DW5_DEFENCE.y[orientation][slot]/3};
}
function updateDivisionCombat(dt){
 combatClock+=dt;for(const u of units)u.casualtyCooldown=Math.max(0,(Number(u.casualtyCooldown)||0)-dt);shots.forEach(s=>s.life-=dt);shots=shots.filter(s=>s.life>0);
 const groups=combatGroups(),damage=[],liveKeys=new Set();
 for(const g of groups){syncGroupHealthCapacity(g);g.firing=g.members.some(u=>combatClock-(combatFiredAt.get(u)??-Infinity)<1);}
 for(const g of groups){
  liveKeys.add(g.key);const cooldown=Math.max(0,(combatCooldowns.get(g.key)??0)-dt);combatCooldowns.set(g.key,cooldown);
  if(!(COMBAT_STATS[g.type]?.firepower??TYPES[g.type].damage))continue;
  const baseVictim=!TYPES[g.type].speed?baseTargetUnit(g,groups):null;
  let target=baseVictim?groups.find(other=>other.members.includes(baseVictim)):null,best=Infinity,priority=-1;
  for(const other of groups){
   if(friendlyTeams(g.team,other.team))continue;
   if(baseVictim)continue; // Keep all base turrets focused on the locked troop.
   const d=combatDistance(g,other);if(d>weaponRange(g,other))continue;
   const p=g.type==='aa'&&other.type==='heli'?1:0;
   if(p>priority||(p===priority&&d<best)){target=other;best=d;priority=p;}
  }
  if(!target)continue;
  for(const u of g.members){u.aimAngle=Math.atan2((target.y-u.y)*3,target.x-u.x);u.aimUntil=last+1000;}
  if(cooldown>0)continue;
  combatCooldowns.set(g.key,CASUALTY_INTERVAL); // One volley per simulation second, aligned with casualty eligibility.
  const victim=baseVictim??target.members.reduce((a,b)=>(b.groupSlot??0)>(a.groupSlot??0)?b:a);
  const shooters=TYPES[g.type].speed?g.members:Array.from({length:baseGunCount(g.members[0])},()=>g.members[0]);
  for(const u of shooters){
   const amount=shotDamage(u,victim);
   damage.push({target,attacker:g.key,amount,victimId:baseVictim?.id});combatFiredAt.set(u,combatClock);
   const kind=COMBAT_STATS[u.type]?.sound??'mg';
   // Base turrets contribute to one focused volley, not separate visible
   // shots scattered across the formation.
   if(TYPES[g.type].speed){const impact=TYPES[victim.type].speed?{x:victim.x,y:victim.y}:targetedTurretPoint(victim);shots.push({x:u.x,y:u.y,tx:impact.x,ty:impact.y,life:.18,total:.18,kind});}
   u.aimAngle=Math.atan2((victim.y-u.y)*3,victim.x-u.x);
  }
  if(!TYPES[g.type].speed){
   const base=g.members[0],air=base.type==='airbase',orientation=air?3:1;
   const ax=air?510:450,ay=air?150:130;
   // One firing tracer per surviving turret, originating from its real sprite
   // position. Every turret focuses on the same locked individual troop.
   for(let j=0;j<(base.turretHealth?.length??0);j++){
    if(!(base.turretHealth[j]>0))continue;
    shots.push({x:base.x+ax+DW5_DEFENCE.x[orientation][j],
     y:base.y+ay+DW5_DEFENCE.y[orientation][j]/3,
     tx:victim.x,ty:victim.y,life:.18,total:.18,kind:'mg'});
   }
  }
  queueCombatSound(COMBAT_STATS[g.type]?.sound??'mg',g.x,g.y);
 }
 // Resolve together so array order never denies a division its return volley.
 // Each attacking division has its own casualty allowance against a target.
 // Aggregate its shooters into one volley, then resolve each attacking division
 // independently. Two lethal divisions can therefore kill two defenders.
 const volleys=new Map();
 for(const hit of damage){const key=hit.attacker+'>'+hit.target.key;const prev=volleys.get(key);if(prev)prev.amount+=hit.amount;else volleys.set(key,{...hit});}
 for(const hit of volleys.values()){
  if(hit.victimId!=null&&TYPES[hit.target.type].speed){
   const victim=hit.target.members.find(u=>u.id===hit.victimId&&u.hp>0);
   if(!victim)continue;
   victim.lastUnderFireAt=combatClock;
   const key=hit.attacker+'>'+hit.target.key;
   const previous=attackerCasualtyTimes.get(key);
   const canKill=previous===undefined||combatClock-previous>=CASUALTY_INTERVAL-1e-8;
   if(!canKill)continue;
   // DW5 base firepower is in VF; troops in this sandbox use 100 HP
   // for Apache, so translate the VF hit proportionally (65000 VF/unit).
   const scaled=hit.amount*TYPES[victim.type].hp/TURRET_HP;
   victim.hp=Math.max(0,victim.hp-scaled);
   if(victim.hp===0){attackerCasualtyTimes.set(key,combatClock);queueCombatSound('explo',victim.x,victim.y);}
  }else applyAttackerVolley(hit.target,hit.amount,hit.attacker);
 }
 for(const u of units)if(u.hp<=0){selected.delete(u.id);}
 units=units.filter(u=>u.hp>0);
 for(const key of combatCooldowns.keys())if(!liveKeys.has(key))combatCooldowns.delete(key);
 for(const key of attackerCasualtyTimes.keys()){const [attacker,defender]=key.split('>');if(!liveKeys.has(attacker)||!liveKeys.has(defender))attackerCasualtyTimes.delete(key);}
 flushCombatSounds();
}
function drawWeaponRanges(){
 if(!showWeaponRanges)return;ctx.save();ctx.lineWidth=1.5/zoom;ctx.font=12/zoom+'px Tahoma,Arial';
 for(const g of combatGroups()){
  if(!g.members.some(u=>selected.has(u.id)))continue;
  const r=weaponRange(g);if(!r)continue;
  ctx.strokeStyle=troopRelationColor(g.team);ctx.globalAlpha=.45;ctx.setLineDash([7/zoom,5/zoom]);ctx.beginPath();ctx.ellipse(g.x,g.y,r,r/3,0,0,2*Math.PI);ctx.stroke();
  ctx.globalAlpha=.9;ctx.fillStyle=troopRelationColor(g.team);ctx.fillText('Weapon range '+(COMBAT_STATS[g.type]?.range??(r/90).toFixed(1)),g.x+8/zoom,g.y-r/3-6/zoom);
  if(g.type==='aa'){ctx.strokeStyle='#83dfff';ctx.setLineDash([3/zoom,7/zoom]);ctx.globalAlpha=.4;ctx.beginPath();ctx.ellipse(g.x,g.y,r*3,r,0,0,2*Math.PI);ctx.stroke();ctx.globalAlpha=.9;ctx.fillStyle='#83dfff';ctx.fillText('Helicopters: 3× range',g.x+8/zoom,g.y-r-6/zoom);}
 }
 ctx.restore();
}
// Native Rx reuses HTMLAudio voices and coalesces same-kind fire requests.
const combatAudio={enabled:false,pools:new Map(),pending:new Map(),lastPlayed:new Map()};
function queueCombatSound(kind,x,y){
 if(!combatAudio.enabled)return;
 const distance=Math.abs((x-cam.x)*zoom)+Math.abs((y-cam.y)*zoom);
 if(distance>=2000)return;
 const volume=distance>1500?.01:distance>1000?.03:distance>500?.05:.1;
 combatAudio.pending.set(kind,Math.max(volume,combatAudio.pending.get(kind)??0));
}
function flushCombatSounds(){
 if(!combatAudio.enabled){combatAudio.pending.clear();return;}
 for(const [kind,volume]of combatAudio.pending){
  if(last-(combatAudio.lastPlayed.get(kind)??-Infinity)<80)continue;
  let pool=combatAudio.pools.get(kind);if(!pool){pool=Array.from({length:4},()=>{const a=new Audio('assets/audio/'+kind+'.mp3');a.preload='auto';return a;});combatAudio.pools.set(kind,pool);}
  const voice=pool.find(a=>a.paused||a.ended);if(!voice)continue;
  voice.volume=volume;voice.currentTime=0;const play=voice.play();if(play?.catch)play.catch(()=>{});combatAudio.lastPlayed.set(kind,last);
 }
 combatAudio.pending.clear();
}
$('combat-sound').onclick=()=>{
 combatAudio.enabled=!combatAudio.enabled;$('combat-sound').textContent='Sound: '+(combatAudio.enabled?'On':'Off');$('combat-sound').setAttribute('aria-pressed',String(combatAudio.enabled));
 if(combatAudio.enabled){queueCombatSound('cannon',cam.x,cam.y);flushCombatSounds();}
 else{for(const pool of combatAudio.pools.values())for(const voice of pool)voice.pause();combatAudio.pending.clear();}
};
$('combat-ranges').onclick=()=>{showWeaponRanges=!showWeaponRanges;$('combat-ranges').textContent='Ranges: '+(showWeaponRanges?'On':'Off');$('combat-ranges').setAttribute('aria-pressed',String(showWeaponRanges));};

// Native DW5 client observed 65000 VF per turret and Wall x10 armour.
// The one-second casualty interval is a conservative sandbox policy.
const TURRET_HP=65000,CASUALTY_INTERVAL=1,BASE_WALL_ARMOR=10;
function baseGunCapacity(u){return u.maxUpgraded?50:Math.max(2,Math.min(50,Math.trunc(u.defenceGuns??2)));}
function turretMaxHealth(u){return TURRET_HP;} // Wall is armour, not additional turret HP.
function syncBaseDefenceHealth(u){
 const count=baseGunCapacity(u),maximum=turretMaxHealth(u);
 if(!Array.isArray(u.turretHealth)){
  // Migrate old aggregate damage without repairing an already damaged base.
  let remaining=count*maximum*Math.max(0,Math.min(1,(u.hp??TYPES[u.type].hp)/TYPES[u.type].hp));
  u.turretHealth=Array.from({length:count},()=>{const h=Math.min(maximum,remaining);remaining-=h;return h;});
 }else{
  const previous=u.turretHealthMax??maximum;
  // Preserve remaining VF; walls affect damage, not health.
  u.turretHealth=u.turretHealth.slice(0,count).map(h=>Math.max(0,Math.min(maximum,(Number(h)||0)/previous*maximum)));
  while(u.turretHealth.length<count)u.turretHealth.push(maximum);
 }
 u.turretHealthMax=maximum;u.hp=u.turretHealth.reduce((n,h)=>n+h,0);
 return u.hp;
}
function baseMaxHealth(u){return baseGunCapacity(u)*turretMaxHealth(u);}
function resetBaseDefenceHealth(u){delete u.turretHealth;delete u.turretHealthMax;u.hp=TYPES[u.type].hp;u.casualtyCooldown=0;syncBaseDefenceHealth(u);}
function groupHealthSummary(members){
 const capacity=Math.max(members.length,...members.map(u=>Math.max(1,Math.min(49,Number(u.groupHealthCapacity)||1))));
 return{health:members.reduce((n,u)=>n+Math.max(0,u.hp),0),maximum:capacity*TYPES[members[0].type].hp,capacity};
}
function syncGroupHealthCapacity(group){
 if(!TYPES[group.type].speed)return;
 const capacity=groupHealthSummary(group.members).capacity;
 for(const u of group.members)u.groupHealthCapacity=capacity;
}
function applyGroupDamage(group,amount){
 if(!(amount>0)||group.members.some(u=>(u.casualtyCooldown??0)>1e-8))return;
 const base=!TYPES[group.type].speed;
 const victim=base?group.members[0]:group.members.reduce((last,u)=>(u.groupSlot??0)>(last.groupSlot??0)||((u.groupSlot??0)===(last.groupSlot??0)&&u.id>last.id)?u:last);
 let died=false;
 if(base){
  syncBaseDefenceHealth(victim);let slot=victim.turretHealth.length-1;while(slot>=0&&victim.turretHealth[slot]<=0)slot--;
  if(slot<0)return;victim.turretHealth[slot]=Math.max(0,victim.turretHealth[slot]-amount);died=victim.turretHealth[slot]===0;
  victim.hp=victim.turretHealth.reduce((n,h)=>n+h,0);
 }else{victim.hp=Math.max(0,victim.hp-amount);died=victim.hp===0;}
 // Keep the one-casualty-per-second sandbox safety rule; separate DW5 attacks
 // may hit the next turret within the same server update, but exact timing is unverified.
 // Discard overkill and all incoming damage during this simulation-time lock.
 // No damage debt is saved up to kill more members after firing has stopped.
 if(died){for(const u of group.members)u.casualtyCooldown=CASUALTY_INTERVAL;queueCombatSound('explo',victim.x,victim.y);}
}
function applyAttackerVolley(group,amount,attackerKey){
 if(!(amount>0))return;
 if(!TYPES[group.type].speed){applyGroupDamage(group,amount);return;}
 const key=attackerKey+'>'+group.key;
 const previous=attackerCasualtyTimes.get(key);
 // One lethal casualty per attacking division per second; nonlethal damage
 // still accumulates on the current defender between attacks.
 const canKill=previous===undefined||combatClock-previous>=CASUALTY_INTERVAL-1e-8;
 const victim=group.members.filter(u=>u.hp>0).reduce((a,b)=>
  !a||(b.groupSlot??0)>(a.groupSlot??0)?b:a,null);
 if(!victim)return;
 victim.lastUnderFireAt=combatClock;
 // Do not leave a defender at 0.000001 HP while this attacker is
 // casualty-locked. That caused the visible 4301/4900 and 3601/4900
 // Apache divisions: one Apache appeared as 1 HP instead of dying.
 if(!canKill)return;
 // Correct near-lethal rounding for Apache-vs-Apache volleys: 99 damage
 // against a full 100 HP Apache should finish the unit, not leave 1 HP.
 const lethalTolerance=group.type==='heli'&&attackerKey.startsWith('g')?1:0;
 victim.hp=Math.max(0,victim.hp-amount);
 if(victim.hp>0&&victim.hp<=lethalTolerance&&amount>=victim.hp)victim.hp=0;
 if(victim.hp===0){attackerCasualtyTimes.set(key,combatClock);queueCombatSound('explo',victim.x,victim.y);}
}
function drawGroupHealth(members,x,y){
 const h=groupHealthSummary(members);ctx.save();ctx.fillStyle='#152014';ctx.fillRect(x-42,y+6,84,4);ctx.fillStyle=troopRelationColor(members[0].team);ctx.fillRect(x-42,y+6,84*Math.max(0,Math.min(1,h.health/h.maximum)),4);
 ctx.font='10px Tahoma,Arial,sans-serif';ctx.lineWidth=2;const text=Math.ceil(h.health)+' / '+Math.ceil(h.maximum)+' HP';ctx.strokeStyle='#000';ctx.strokeText(text,x,y+22);ctx.fillStyle=troopRelationColor(members[0].team);ctx.fillText(text,x,y+22);ctx.restore();
}
