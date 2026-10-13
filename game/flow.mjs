import {initial as initialLevel,step as playStep,kickHit} from './interactions.mjs';
export const ORDER=[0,1,2,3,4,5,6,7,8,9,10,11];
export function newGame(level,number=0,carry={}){
 const g=initialLevel(level);g.lifecycle=true;g.level.gameFlow=true;
 return Object.assign(g,{number,phase:'playing',phaseTime:0,lives:carry.lives??5,score:carry.score??0,startScore:carry.score??0,flowEvent:null,kick:null,exitOwner:null});
}
export function restart(g,loseLife=false){
 const lives=g.lives-(loseLife?1:0);
 if(lives<=0){g.life=0;g.lives=0;g.phase='gameover';g.flowEvent='gameover';return;}
 Object.assign(g,newGame(g.original,g.number,{lives,score:g.startScore}));g.flowEvent='retry';
}
function die(g){g.life=0;g.phase='dying';g.phaseTime=0;g.p.transition=null;g.bullets=[];g.shots=[];g.sounds=[{id:131,channel:2}];g.message='Captain Stubble lost an attempt';}
export function advance(g,input={}){
 g.flowEvent=null;
 if(['gameover','complete'].includes(g.phase)){g.sounds=[];return;}
 if(g.phase==='dying'){
  g.sounds=[];g.phaseTime+=60;
  if(g.phaseTime>=480)restart(g,true);
  return;
 }
 if(g.phase==='exiting'){
  g.sounds=[];g.phaseTime+=60;
  if(g.phaseTime>=2100){g.phase='complete';g.flowEvent='complete';}
  return;
 }
 const ammoBefore=g.ammo;
 let kickSecond=false;
 if(g.kick){if(input.left||input.right||input.jump||input.down)g.kick=null;else if(g.kick.frame===22){g.kick.frame=23;kickSecond=true;}}
 playStep(g,input);
 if(input.shoot&&ammoBefore===0&&g.phase==='playing'&&!g.p.transition&&!g.p.flight&&!g.kick){g.kick={frame:22};g.sounds.push({id:149,channel:8});kickHit(g,22);}
 if(kickSecond){kickHit(g,23);g.sounds.push({id:149,channel:8});}
 if(g.invincible===8)g.kick=null;
 if(g.p.dead||g.life<=0){die(g);return;}
 if(g.p.complete){
  g.p.complete=false;g.phase='exiting';g.phaseTime=0;g.score+=50;g.p.transition=null;
  const z=g.level.zones.find(z=>z.kind==='exit'&&g.p.x>=z.x1&&g.p.x<=z.x2&&g.p.y>=z.y1&&g.p.y<=z.y2);
  g.exitOwner=z?.owner;g.p.x=(z?.x1??g.p.x)+14;g.p.y=(z?.y1??g.p.y)-24;
  g.message='Exit reached';
 }
}
export function playerVisual(g){
 if(g.phase==='dying')return {name:g.level.extra.die[Math.min(7,Math.floor(g.phaseTime/60))],face:1};
 if(g.phase==='exiting')return {name:g.level.extra.ending[Math.min(9,Math.floor(g.phaseTime/200))],face:1};
 if(['gameover','complete'].includes(g.phase))return null;
 if(g.p.transition)return {name:g.level.beam[g.p.transition.frame],face:1};
 if(g.p.flight){const f=g.p.flight;return {name:g.level.extra.helium[f.phase==='inflate'?5-Math.min(5,f.frame):f.phase==='deflate'?Math.min(5,f.frame):0],face:1};}
 if(g.invincible%2===1)return null;
 if(g.kick)return {name:g.level.frames[g.kick.frame],face:g.p.face};
 return {name:g.level.frames[g.p.frame+(g.ammo>0?11:0)],face:g.p.face};
}
export function doorOffset(g,owner){return g.exitOwner===owner?Math.min(30,Math.floor(g.phaseTime/50)):0;}
export function readSave(raw){
 try{const s=JSON.parse(raw);if(s.version===1&&[...ORDER,700,706].includes(s.level)&&Number.isInteger(s.score)&&s.score>=0&&s.score<1000000)return s;}catch{}
 return null;
}
