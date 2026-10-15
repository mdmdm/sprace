import {initial as initialPlayer, step as terrainStep, selectZone} from './terrain.mjs';
import {initWorld,updateWorld,pickupGoodie,batBounds,hitBat,killSpore} from './world.mjs';
export function initial(level){
 const p=initialPlayer(level.spawn);
 const g={p,original:level,level:structuredClone(level),sounds:[],life:20,ammo:20,score:0,keys:[],bullets:[],shots:[],explosions:[],elapsed:0,invincible:30,
  enemies:level.foreground.objects.filter(o=>o.task==='aWeed').map(o=>({owner:o.index,x:o.x+23,y:o.y+27,left:o.p2+Math.trunc((o.bounds[2]-o.bounds[0])/2),right:o.p1-Math.trunc((o.bounds[2]-o.bounds[0])/2),face:1,frame:0,hp:10,clock:0,fire:0})),message:''};
 initWorld(g);return g;
}
export function overlap(a,b){return a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3];}
export function bounds(asset,x,y,face=1){
 const left=face>0?x+asset.xoffset:x-asset.xoffset-asset.width;
 return [left,y+asset.yoffset,left+asset.width,y+asset.yoffset+asset.height];
}
export function playerBounds(g){const n=g.p.frame+(g.ammo>0?11:0),f=g.p.flight;return f?bounds(g.level.assets[g.level.extra.helium[f.phase==='inflate'?5-Math.max(0,Math.min(5,f.frame)):f.phase==='deflate'?Math.min(5,f.frame):0]],g.p.x,g.p.y):bounds(g.level.assets[g.level.frames[n]],g.p.x,g.p.y,g.p.face);}
function sound(g,id,channel=2){g.sounds.push({id,channel});}
function damage(g,message){if(g.invincible)return;g.p.transition=null;g.p.springBounce=null;g.p.flight=null;if(g.p.iy>=0)g.p.iy=-10;g.life-=g.p.hitGate?.strength??1;g.invincible=8;g.p.ix=-6*g.p.face;g.p.grounded=false;g.p.state='fall';g.message=message;sound(g,120,8);if(g.life<=0){if(g.lifecycle){g.p.dead=true;g.message='Life depleted';return;}const fresh=initial(g.original);Object.assign(g,fresh);g.message='Life depleted — restarted';sound(g,131);}}
export function sendEvent(g,event){
 let count=0;
 for(const o of g.level.foreground.objects){
  if(['aLaserGate','aHorizGate'].includes(o.task)&&o.p1===event&&!o.open&&!o.removing){
   o.removing={started:g.elapsed,cycles:10};count++;
  }
 }
 return count;
}
export function objectVisible(o,time){
 if(o.removing){const age=time-o.removing.started;return age<o.removing.cycles*100&&Math.floor(age/50)%2===1;}
 return !o.open&&!(o.task==='aSwitch'&&o.collected);
}
function finishRemovals(g){
 for(const o of g.level.foreground.objects){
  if(o.removing&&g.elapsed-o.removing.started>=o.removing.cycles*100){
   delete o.removing;
   if(o.task==='aSwitch')continue;
   o.open=true;
   g.message='Gate removed · link '+o.p1;
   const z=g.level.zones.find(z=>z.owner===o.index);
   if(z){if(o.task==='aLaserGate'){z.kind='solid';z.x1=o.bounds[0]+1;z.x2=o.bounds[2]-3;z.y1=o.bounds[3]-3;z.y2=o.bounds[3]+15;z.priority=30;}
    else {z.kind='fall';z.priority=30;}}
  }
 }
}
export function pickup(g,o){
 if(o.collected)return false;
 if(o.task==='aCard'){
  if(g.keys.length>=6)return false;g.keys.push(o.type_value);g.score+=15;o.collected=true;g.message='Key '+o.type_value+' collected';sound(g,124);return true;
 }
 if(o.task==='aLock'){
  const i=g.keys.indexOf(o.type_value);if(i<0)return false;g.keys.splice(i,1);sendEvent(g,o.p1);g.score+=20;o.collected=true;g.message='Scanner '+o.type_value+' opened link '+o.p1;sound(g,128);return true;
 }
 if(o.task==='aSwitch'){const count=sendEvent(g,o.p1);g.score+=20;o.collected=true;o.removing={started:g.elapsed,cycles:6};g.message='Switch activated · link '+o.p1+' · '+count+' gate'+(count===1?'':'s')+' flashing';sound(g,128);return true;}
 if(o.task==='aGoodie')return pickupGoodie(g,o);
 return false;
}
function enemyBounds(g,e){return bounds(g.level.assets[g.level.extra.weed[e.hp>0?e.frame:6]],e.x,e.y,e.face);}
// Player.seq algKick uses the same iGuyHit dispatch as aBullet.
export function hitEnemy(g,e,kill=false){
 if(e.hp<=0)return;
 e.hp=kill?0:e.hp-1;e.hitUntil=g.elapsed+50;sound(g,135,3);
 if(e.hp===0){g.score+=15;sound(g,123,3);if(kill)e.explodedUntil=g.elapsed+1000;
  const r=enemyBounds(g,e);g.level.zones.push({kind:'solid',x1:r[0]+5,y1:r[3]-7,x2:r[2]-7,y2:r[3]+25,priority:30,owner:e.owner});}
}
export function hitTargets(g,bb){
 let hit=false;
 for(const e of g.enemies)if(e.hp>0&&overlap(bb,enemyBounds(g,e))){hitEnemy(g,e);hit=true;}
 for(const e of g.bats)if(!e.dead&&overlap(bb,batBounds(g,e,bounds))){hitBat(g,e);hit=true;}
 for(const s of g.spores)if(!s.dead&&overlap(bb,bounds(g.level.assets[g.level.extra.spore[s.frame]],s.x,s.y,s.face))){killSpore(g,s,true);hit=true;}
 return hit;
}
export function kickHit(g,frame){return hitTargets(g,bounds(g.level.assets[g.level.frames[frame]],g.p.x,g.p.y,g.p.face));}
export function step(g,input){
 g.sounds=[];const p=g.p,wasClimbing=!!p.transition;g.elapsed+=60;finishRemovals(g);if(g.invincible>0)g.invincible--;
 updateWorld(g,input,{selectZone,bounds,overlap,damage,playerBounds,hitEnemy});
 const jumped=terrainStep(p,input,g.level);if(p.event)g.message=p.event;
 if(jumped)sound(g,138);
 if(p.event?.startsWith('Climbed'))sound(g,121);
 if(p.event?.startsWith('Teleported'))sound(g,122);
 if(p.event==='Exit reached')sound(g,157);
 if(p.event==='Deflated')sound(g,142);
 if(p.event==='Spring bounce')sound(g,163,3);
 // Player.seq sDeadZone/sHorDeadZone align against the barrier before iHit.
 if(p.hitGate){
  const gate=p.hitGate;
  damage(g,gate.strength?'Compactor hit':'Laser gate hit');
  if(g.p===p){p.ix=p.x<(gate.x1+gate.x2)/2?-6:6;}
 }
 if(input.shoot&&g.ammo>0&&!p.transition&&!wasClimbing&&!p.flight){
  g.ammo--;sound(g,130);g.bullets.push({x:p.x+p.face*15,y:p.y-(p.frame===7?14:18),face:p.face});
 }
 const pb=playerBounds(g);
 for(const o of g.level.foreground.objects){
  if(!o.collected&&['aGoodie','aCard','aLock','aSwitch'].includes(o.task)&&overlap(pb,o.bounds)&&(o.task==='aLock'||(p.y<o.bounds[3]+(o.task==='aGoodie'?10:20)&&p.x>o.bounds[0]-6&&p.x<o.bounds[2]+6)))pickup(g,o);
 }
 for(const e of g.enemies){
  if(e.hp<=0)continue;
  e.clock+=60;e.fire+=60;
  if(e.clock>=300){e.clock-=300;e.x+=e.face*4;if(e.x<e.left){e.x=e.left;e.face=1;}if(e.x>e.right){e.x=e.right;e.face=-1;}e.frame=(e.frame+1)%4;}
  if(e.fire>=1500){e.fire=0;if(p.y>e.y-35&&p.y<e.y+25&&(p.x-e.x)*e.face>0){const b=enemyBounds(g,e);sound(g,133,3);g.shots.push({x:Math.trunc((b[0]+b[2])/2)+12-(e.face<0?24:0),y:b[3]-10,face:e.face,clock:0});}}
  if(overlap(pb,enemyBounds(g,e)))damage(g,'Mama spore contact');
 }
 for(const b of g.bullets){
  // CENTER 1 positions bullet bitmap around its center.
  const a=g.level.assets[g.level.extra.bullet[0]],bb=[b.x-Math.trunc(a.width/2),b.y-Math.trunc(a.height/2),b.x+Math.ceil(a.width/2),b.y+Math.ceil(a.height/2)];
  b.dead=hitTargets(g,bb);
  const z=selectZone(g.level.zones,b.x,b.y);if(z?.kind==='wall'||(z?.kind==='solid'&&b.y<=(z.y1+z.y2)/2))b.dead=true;
  b.x+=b.face*9;if(b.x<0||b.x>640)b.dead=true;
 }
 if(g.lifecycle)for(const b of g.bullets)if(b.dead&&b.x>=0&&b.x<=640)g.explosions.push({x:b.x-b.face*9,y:b.y,started:g.elapsed});
 g.explosions=g.explosions.filter(e=>g.elapsed-e.started<400);
 g.bullets=g.bullets.filter(b=>!b.dead);
 for(const s of g.shots){s.clock+=60;while(s.clock>=50){s.clock-=50;s.x+=s.face*6;}const a=g.level.assets[g.level.extra.wfire[0]];
  if(overlap(pb,bounds(a,s.x,s.y))) {damage(g,'Mama spore projectile');s.dead=true;}
  if(s.x<0||s.x>640||selectZone(g.level.zones,s.x,s.y)?.kind==='wall')s.dead=true;
 }
 g.shots=g.shots.filter(s=>!s.dead);
 return jumped;
}
