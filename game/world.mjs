// Additional archived object tasks. Fixed-step translation; random task scheduling
// is deterministic here so routes and failures can be reproduced.
export const ITEM_NAMES={1:'Oxygen',2:'Carbon dioxide',3:'Hydrogen',4:'Helium',5:'Nitrogen',6:'Jet pack',7:'Soda',8:'Shoes'};
export function initWorld(g){
 g.inventory=[];g.selection=0;g.bombs=[];g.blasts=[];g.spores=[];g.random=0x53524143;g.machinery=[];g.compactedTrash=[];
 for(const o of g.level.foreground.objects.filter(o=>o.task==='aConveier')){
  for(const offset of [99,145,189]){
   const z=g.level.zones.find(z=>z.owner===o.index&&z.compactor_offset===offset);
   g.machinery.push({owner:o.index,offset,x:o.x+offset,y:o.y+55,baseY:o.y+55,phase:'rise',frame:0,clock:0,next:500+rand(g,3501),trash:null,zone:z});
  }
 }
 g.bats=g.level.foreground.objects.filter(o=>o.task==='aBat').map(o=>({owner:o.index,x:o.x,y:o.y,homeY:o.y,left:o.p2,right:o.p1,face:1,frame:0,clock:0,restUntil:0,dead:false}));
 g.platforms=g.level.foreground.objects.filter(o=>o.task==='aPlatform').map(o=>({owner:o.index,x:o.x,y:o.y,dx:o.type_value===0?2:0,dy:o.type_value===1?2:0,clock:0}));
 g.towers=g.level.foreground.objects.filter(o=>o.task==='aTower').map(o=>({owner:o.index,clock:0}));
}
function rand(g,n){g.random=(Math.imul(g.random,1664525)+1013904223)>>>0;return g.random%n;}
function owner(g,id){return g.level.foreground.objects.find(o=>o.index===id);}
function sound(g,id,channel=2){g.sounds.push({id,channel});}
export function batVisual(g,e){
 return {name:g.level.extra.bat[e.dead||e.restUntil>g.elapsed?3:e.frame],x:e.x,y:e.homeY+(e.dead||e.restUntil>g.elapsed?23:-5),face:e.face};
}
export function batBounds(g,e,bounds){const v=batVisual(g,e);return bounds(g.level.assets[v.name],v.x,v.y,v.face);}
export function hitBat(g,e,kill=false){
 if(e.dead)return;e.dead=kill;e.restUntil=kill?Infinity:g.elapsed+15000;sound(g,154,3);g.score+=kill?7:4;
 // A resting bat is a temporary platform; explosion-killed bats do not create one.
 g.level.zones=g.level.zones.filter(z=>!(z.owner===e.owner&&z.batRest));
 if(!kill){const a=g.level.assets[g.level.extra.bat[3]],l=e.x+a.xoffset,t=e.homeY+22+a.yoffset;
 g.level.zones.push({kind:'platform',x1:l+10,y1:t+4,x2:l+a.width-10,y2:t+a.height+10,priority:30,owner:e.owner,batRest:true});}
}
export function pickupGoodie(g,o){
 const kind=o.type_value%10,amount=o.p1<0?1:o.p1;
 if(kind===1){if(g.ammo>=20)return false;g.ammo=Math.min(20,g.ammo+amount);}
 else if(kind===2){if(g.life>=20)return false;g.life=Math.min(20,g.life+amount);}
 else if(kind===3){if(g.lifecycle){if(g.lives<6)g.lives=Math.min(6,g.lives+amount);else if(g.life<20)g.life=20;else g.score+=500;}else g.score+=500;}
 else if(kind===0){if(g.inventory.length>=6)return false;g.inventory.push(Math.trunc(o.type_value/10));}
 else return false;
 o.collected=true;g.score++;g.message=kind===0?ITEM_NAMES[Math.trunc(o.type_value/10)]+' collected':kind===1?'Ammo replenished':kind===2?'Health restored':'Extra attempts collected';
 sound(g,kind===2?167:kind===3?169:o.type_value===30?168:o.type_value===10?171:o.type_value===50?172:124,kind===1?2:7);return true;
}
export function useItem(g){
 if(!g.inventory.length||g.p.transition)return false;
 const id=g.inventory[g.selection];
 // Only translated usable items are consumed.
 if(![1,3,4,5].includes(id)){g.message='This device is not translated yet';return false;}
 g.inventory.splice(g.selection,1);g.selection%=g.inventory.length||1;sound(g,129);
 if(id===1){g.life=20;g.message='Oxygen restored health';}
 else if(id===4){if(!g.p.flight){g.p.flight={phase:'inflate',frame:-1};g.p.iy=0;g.p.dx=0;g.p.grounded=false;sound(g,141);}g.message='Helium · Space to deflate';}
 else{g.bombs.push({x:g.p.x-8,y:g.p.y-28,frame:id===3?7:9,started:g.elapsed,range:id===3?6:20});g.message=(id===3?'Hydrogen':'Nitrogen')+' countdown';}
 return true;
}
// Objects.seq aTrashSource / aTrashCompactor. Seeded delays replace RANDOM.
export function updateMachinery(g){
 for(const m of g.machinery){
  const o=owner(g,m.owner);m.clock+=60;
  while(m.clock>=100){m.clock-=100;
   if(m.phase==='rise'){m.y=m.baseY-m.frame*2;if(++m.frame===16){m.phase='wait';m.frame=0;}}
   else if(m.phase==='press'){m.y+=4;if(++m.frame===8){m.phase='rise';m.frame=0;}}
   if(m.zone)m.zone.y2=m.y+50; // y1 stays fixed in the source.
  }
  if(!m.trash&&g.elapsed>=m.next){
   // USETASK cInSeq.sEjectTrash serializes ejection globally.
   if(g.machinery.some(n=>n.trash&&!['out','suck'].includes(n.trash.phase))){m.next=g.elapsed+200;continue;}
   m.trash={x:o.x+45,y:o.y+50,frame:rand(g,4)*2,phase:'drop'};
  }
  const t=m.trash;if(!t)continue;
  if(t.phase==='drop'){t.y=Math.min(o.y+92,t.y+4.8);if(t.y===o.y+92)t.phase='belt';}
  else if(t.phase==='belt'){t.x=Math.min(m.x-15,t.x+1.8);if(t.x===m.x-15){m.phase='press';m.frame=0;m.y=m.baseY-32;t.phase='through';if(g.p.y>o.bounds[3]&&g.p.y<o.bounds[1]+40)sound(g,136,6);}}
  else if(t.phase==='through'){t.x=Math.min(m.x+5,t.x+1.8);if(t.x===m.x+5){t.frame++;t.phase='out';g.compactedTrash.push({...t,owner:m.owner});m.trash=null;m.next=g.elapsed+500+rand(g,3501);}}

 }
 for(const t of g.compactedTrash){
  const o=owner(g,t.owner);
  if(t.phase==='out'){t.x=Math.min(o.x+266,t.x+1.8);if(t.x===o.x+266){t.phase='suck';if(g.p.y>o.bounds[3]&&g.p.y<o.bounds[1]+40)sound(g,137,9);}}
  else {t.y=Math.max(o.y+52,t.y-4.8);if(t.y===o.y+52)t.dead=true;}
 }
 g.compactedTrash=g.compactedTrash.filter(t=>!t.dead);
}
// Each wave checks two points ahead for sVerSolidZone before painting.
export function blastVisuals(g,b){
 const age=g.elapsed-b.started,visuals=[];
 if(age<300)visuals.push({frame:age<100?0:age<200?1:0,x:b.x,y:b.y});
 for(const w of b.waves??[])if(age>=200&&!w.done)visuals.push({frame:w.base+w.frame,x:w.x,y:b.y});
 return visuals;
}
function updateBlast(g,b,api){
 const {selectZone}=api;
 if(!b.waves)b.waves=[-1,1].map(face=>({face,base:face<0?2:9,x:b.x,step:0,frame:0,clock:-200,tail:0,done:false}));
 for(const w of b.waves){
  if(w.done)continue;w.clock+=60;
  while(w.clock>=100&&!w.done){w.clock-=100;
   if(w.tail){w.frame=3+w.tail;if(++w.tail>3)w.done=true;continue;}
   const nextX=b.x+w.face*w.step*6,x=nextX+w.face*15;
   const blocked=nextX<0||nextX>640||[b.y,b.y-30].some(y=>selectZone(g.level.zones,x,y)?.kind==='wall');
   if(blocked||w.step>=b.range){w.tail=1;w.frame=4;continue;}
   w.frame=w.step===0?0:1+(w.step-1)%3;w.step++;w.x=b.x+w.face*(w.step-1)*6;
  }
 }
}
export function updateWorld(g,input,api){
 const {selectZone,bounds,overlap,damage,playerBounds}=api,p=g.p;
 if(input.select&&g.inventory.length)g.selection=(g.selection+1)%g.inventory.length;
 if(input.use)useItem(g);
 updateMachinery(g);
 for(const e of g.platforms){
  const o=owner(g,e.owner),z=g.level.zones.find(z=>z.owner===e.owner),rider=selectZone(g.level.zones,p.x,p.y)?.owner===e.owner&&p.grounded;
  e.clock+=60;let dx=0,dy=0;
  while(e.clock>=50){e.clock-=50;dx+=e.dx;dy+=e.dy;e.x+=e.dx;e.y+=e.dy;
   if(e.dx&&(e.x<o.p2||e.x>o.p1-(o.bounds[2]-o.bounds[0])))e.dx=-e.dx;
   if(e.dy&&(e.y<o.p1||e.y>o.p2-(o.bounds[3]-o.bounds[1])))e.dy=-e.dy;
  }
  const ox=e.x-o.x,oy=e.y-o.y;z.x1=o.bounds[0]+ox-2;z.x2=o.bounds[2]+ox+2;z.y1=o.bounds[1]+oy;z.y2=o.bounds[3]+oy+8;
  if(rider&&!input.jump){p.x+=dx;p.y+=dy;}
 }
 const belt=selectZone(g.level.zones,p.x,p.y),beltOwner=belt&&owner(g,belt.owner);
 if(beltOwner?.task==='aConveier'&&belt.kind==='platform'&&p.grounded)p.x+=1.8; // source 3px/100ms
 for(const e of g.bats){
  if(e.dead)continue;
  if(e.restUntil>g.elapsed)continue;
  if(e.restUntil){e.restUntil=0;g.level.zones=g.level.zones.filter(z=>!(z.owner===e.owner&&z.batRest));}
  e.clock+=60;
  while(e.clock>=100){e.clock-=100;const o=owner(g,e.owner),half=Math.trunc((o.bounds[2]-o.bounds[0])/2);
   const l=e.left+half,r=e.right-half;e.face=p.x<e.x?-1:1;e.x+=e.face*2;
   e.x=Math.max(l,Math.min(r,e.x));e.frame=[1,2,3,4,5,4,3,2][Math.floor(g.elapsed/100)%8];
  }
  if(overlap(playerBounds(g),batBounds(g,e,bounds)))damage(g,'Bat contact');
 }
 for(const t of g.towers){
  t.clock+=60;while(t.clock>=1000){t.clock-=1000;const o=owner(g,t.owner);
   for(const face of [-1,1])if(rand(g,11)===0&&g.spores.length<40){const [l,top,r,b]=o.bounds;g.spores.push({x:face<0?l-(o.type_value?10:20):r+(o.type_value?10:20),y:b-(o.type_value?53:0),face,frame:0,age:0,clock:0,fall:false});}
  }
 }
 for(const s of g.spores){s.clock+=60;while(s.clock>=160){s.clock-=160;s.age++;
   if(s.age<4){s.frame=s.age;continue;}
   s.x+=s.fall?0:s.face*2;s.y+=s.fall?5:0;s.frame=s.fall?2:4+s.age%4;
   const a=g.level.assets[g.level.extra.spore[s.frame]],bb=bounds(a,s.x,s.y,s.face),z=selectZone(g.level.zones,s.face>0?bb[2]-5:bb[0]+5,bb[3]+(s.fall?2:4));
   if(z&&['solid','platform','ladderUp','ladderDown','teleport'].includes(z.kind)){s.y+=z.y1-bb[3];s.fall=false;}
   else if(!z||z.kind==='fall')s.fall=true;else if(['dead','gate','hgate'].includes(z.kind))s.dead=true;else s.face=-s.face;
  }
  if(overlap(playerBounds(g),bounds(g.level.assets[g.level.extra.spore[s.frame]],s.x,s.y,s.face)))damage(g,'Spore contact');
  if(s.age>104||s.x<0||s.x>640||s.y>480)s.dead=true;
 }
 g.spores=g.spores.filter(s=>!s.dead);
 for(const b of g.bombs){
  const a=g.level.assets[g.level.extra.goodie[b.frame]],bb=bounds(a,b.x,b.y),z=selectZone(g.level.zones,b.x+8,bb[3]);
  if(z?.kind==='wall'){const x=b.x+8;b.x=(x-z.x1>z.x2-x?z.x2:z.x1);}
  else if(z&&['solid','platform','ladderUp','ladderDown','teleport','exit'].includes(z.kind)){
   b.y+=z.y1-bb[3];if(b.zone===z)b.x=z.x1+b.offset-8;else{b.zone=z;b.offset=b.x+8-z.x1;}
  }else if(!z||!['dead','gate','hgate'].includes(z.kind)){b.y+=2;b.zone=null;}
  if(g.elapsed-b.started>=3600){b.dead=true;g.blasts.push({x:b.x+3,y:b.y+30,started:g.elapsed,range:b.range});sound(g,b.range>10?126:125,4);}
 }
 g.bombs=g.bombs.filter(b=>!b.dead);
 for(const blast of g.blasts){
  updateBlast(g,blast,api);
  for(const v of blastVisuals(g,blast).filter(v=>v.frame>=2)){
  const area=bounds(g.level.assets[g.level.extra.explosion[v.frame]],v.x,v.y);
  for(const o of g.level.foreground.objects)if(['aWall2','aFloor'].includes(o.task)&&!o.destroying&&!o.destroyed&&overlap(area,o.bounds)){o.destroying={started:g.elapsed};sound(g,147,5);}
  for(const e of g.bats)if(!e.dead&&overlap(area,batBounds(g,e,bounds)))hitBat(g,e,true);
  for(const e of g.enemies)if(e.hp>0&&overlap(area,bounds(g.level.assets[g.level.extra.weed[e.frame]],e.x,e.y,e.face))){api.hitEnemy(g,e,true);}
  for(const s of g.spores)if(overlap(area,bounds(g.level.assets[g.level.extra.spore[s.frame]],s.x,s.y,s.face)))s.dead=true;
  if(overlap(area,playerBounds(g)))p.dead=true;
  }
 }
 g.blasts=g.blasts.filter(b=>g.elapsed-b.started<300||b.waves.some(w=>!w.done));
 for(const o of g.level.foreground.objects)if(o.destroying){const age=g.elapsed-o.destroying.started;
  if(age>=(o.task==='aWall2'?450:0))for(const z of g.level.zones.filter(z=>z.owner===o.index)){if(o.task==='aFloor'){z.kind='fall';z.priority=30;}else z.kind=null;}
  if(age>=900){delete o.destroying;o.destroyed=true;}
 }
}
