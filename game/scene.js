import {drawOrder} from './drawing.mjs';
import {newGame,advance,restart,playerVisual,doorOffset,readSave,ORDER,TRAINING,nextLevel} from './flow.mjs';
import {objectVisible} from './interactions.mjs';
import {Sound} from './audio.mjs';
import {drawHud} from './hud.mjs';
import {ITEM_NAMES,batVisual,blastVisuals} from './world.mjs';
const $=id=>document.getElementById(id),canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
let campaign,g,level,images={},soundEngine,running=false,loading=false,last=0,acc=0,loadVersion=0;
const keys=new Set(),edges=new Set();ctx.imageSmoothingEnabled=false;
const STORAGE='space-race-flow-v1',SETTINGS='space-race-audio-v1';
function storageGet(key){try{return localStorage.getItem(key);}catch{return null;}}
function storageSet(key,value){try{localStorage.setItem(key,value);}catch{}}
let saved=readSave(storageGet(STORAGE));
try{const s=JSON.parse(storageGet(SETTINGS));if(s&&typeof s.sound==='boolean'&&typeof s.music==='boolean'){$('sound').checked=s.sound;$('music').checked=s.music;}}catch{}
function checkpoint(){if(!g)return;saved={version:1,level:g.number,score:g.startScore};storageSet(STORAGE,JSON.stringify(saved));$('continue').hidden=false;}
function audioSettings(){
 storageSet(SETTINGS,JSON.stringify({sound:$('sound').checked,music:$('music').checked}));
 if(!soundEngine)return;soundEngine.master.gain.value=$('sound').checked?.45:0;
 if(running&&$('sound').checked){soundEngine.context.resume().then(()=>soundEngine.music(running&&$('music').checked&&$('sound').checked,level.audio_music)).catch(()=>{$('audio-status').textContent='Audio blocked — toggle Sound to retry';});}
 else{soundEngine.stopEffects();soundEngine.music(false);soundEngine.context.suspend();}
 $('audio-status').textContent=$('sound').checked?'Original audio ready':'Sound muted';
}
function setRunning(value){running=value;acc=0;keys.clear();edges.clear();$('pause').textContent=value?'Pause':'Resume';audioSettings();if(value)canvas.focus({preventScroll:true});draw();}
function loadImage(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Missing artwork'));im.src=url;});}
async function choose(number,carry={}){
 const version=++loadVersion;loading=true;setRunning(false);soundEngine?.reset();$('status').textContent='Loading level…';$('menu').hidden=true;$('result').hidden=true;
 try{
  const item=campaign.levels.find(l=>l.number===number),base=`levels/${number}/`;
  const response=await fetch(item.file,{cache:'no-store'});if(!response.ok)throw Error('Level data unavailable');const nextLevel=await response.json(),nextImages={};
  await Promise.all(Object.entries(nextLevel.assets).map(async([name,a])=>{nextImages[name]=await loadImage(base+a.file);}));
  let nextSound;
  try{
   const context=soundEngine?.context??new AudioContext(),buffers={};
   await Promise.all(Object.entries(nextLevel.audio).map(async([id,a])=>{const r=await fetch(base+a.file);if(!r.ok)throw Error('Missing WAV');buffers[id]=await context.decodeAudioData(await r.arrayBuffer());}));
   nextSound=new Sound(context,buffers,(id)=>{canvas.dataset.lastSound=id;});
  }catch{$('audio-status').textContent='Audio unavailable — game can still play';}
  if(version!==loadVersion)return;
  level=nextLevel;images=nextImages;soundEngine=nextSound;g=newGame(level,number,carry);loading=false;
  $('title').textContent=item.title;$('lesson').hidden=!level.training;if(level.training){$('lesson-heading').textContent=level.training.heading;$('lesson-text').textContent=level.training.text;}$('pause').disabled=false;$('retry').disabled=false;checkpoint();setRunning(true);
 }catch(e){if(version!==loadVersion)return;loading=false;$('status').textContent=e.message;$('menu').hidden=false;}
}
function menu(){++loadVersion;loading=false;setRunning(false);$('menu').hidden=false;$('lesson').hidden=true;$('result').hidden=true;$('pause').disabled=true;$('retry').disabled=true;}
function result(){
 setRunning(false);$('result').hidden=false;$('pause').disabled=true;$('retry').disabled=true;
 const finished=g.phase==='complete',next=nextLevel(g.number);
 $('result-title').textContent=finished?(next===undefined?(TRAINING.includes(g.number)?'Training Ground completed!':ORDER.includes(g.number)?'Numbered level set completed!':'Alternate level complete!'):'Level complete!'):'Game over';
 $('result-text').textContent=`Score ${g.score}. ${finished?(TRAINING.includes(g.number)&&next===undefined?'The induction voyage is complete. Choose a recovered deck from Levels.':'The exit animation is complete.'):'All attempts used. Start a new game or choose another level.'}`;
 $('next').hidden=!finished||next===undefined;$('next').textContent=next===undefined?'Next level':'Next: '+campaign.levels.find(l=>l.number===next).title;
 $('again').textContent=finished?'Play again':'New game';
 if(finished){saved={version:1,level:next??g.number,score:g.score,completed:next===undefined};$('continue').hidden=!!saved.completed;storageSet(STORAGE,JSON.stringify(saved));}
}
function retry(){if(!g||loading||['gameover','complete','dying','exiting'].includes(g.phase))return;restart(g,true);if(g.phase==='gameover')result();else{soundEngine?.reset();setRunning(true);}}
function bitmap(name,x,y,face=1){const a=level.assets[name];ctx.save();ctx.translate(x,y);if(face<0)ctx.scale(-1,1);ctx.drawImage(images[name],a.xoffset,a.yoffset);ctx.restore();}
function object(o){
 if(['aWeed','aBat'].includes(o.task)||!objectVisible(o,g.elapsed+(running?acc:0)))return;
 if(o.collected&&o.task!=='aSwitch'){if(o.task==='aLock')bitmap(level.extra.lock[o.type_value*2-1],o.x,o.y);return;}
 if(o.task==='aTeleport'&&g.p.transition?.kind==='teleport'&&[g.p.transition.source,g.p.transition.destination].includes(o.index)){
  const base=Number(o.image.split('.')[1]||0),f=[0,1,2,3,2,1][Math.floor(g.elapsed/60)%6];bitmap(level.extra.teleport[base+f],o.x,o.y);return;
 }
 if(o.task==='aPlatform'){const e=g.platforms.find(e=>e.owner===o.index);bitmap(o.asset,e?.x??o.x,e?.y??o.y);return;}
 if(o.task==='aSpring'){const s=g.p.springBounce;bitmap(level.extra.spring[s?.owner===o.index?[1,2,3,0][s.phase]:0],o.x,o.y);return;}
 if(o.destroying){const frame=Math.min(5,Math.floor((g.elapsed-o.destroying.started)/150));bitmap(o.task==='aWall2'?level.extra.wallexpl[frame]:level.extra.floor[8+frame],o.x+(o.task==='aWall2'?[-3,-8,-20,-28,-36,-39][frame]:0),o.y+(o.task==='aWall2'?1:0));return;}
 if(o.destroyed){bitmap(o.task==='aWall2'?level.extra.wall2[0]:level.extra.floor[0],o.x,o.y);return;}
 bitmap(o.asset,o.x,o.y);
 if(o.task==='aConveier'){
  for(const m of g.machinery.filter(m=>m.owner===o.index)){bitmap(level.extra.compactor[0],m.x,m.y);if(m.trash)bitmap(level.extra.trash_piece[m.trash.frame],m.trash.x,m.trash.y);}
  const a=level.assets[level.extra.conveier[0]];
  ctx.save();ctx.beginPath();ctx.rect(o.x+15,o.y+91,293,3);ctx.clip();bitmap(level.extra.conveier[0],o.x-15+Math.floor(g.elapsed/100)%10*3,o.y+91);ctx.restore();
 }
 if(o.task==='aLaserPit')bitmap(level.zap[Math.floor(g.elapsed/200)%4],o.x+13,o.y+39);
}
function draw(){
 if(!g||!level)return;ctx.fillStyle='black';ctx.fillRect(0,0,640,480);
 if(level.architecture){
  for(const r of level.architecture.rooms){
   const a=level.assets[r.asset];ctx.save();ctx.beginPath();ctx.rect(r.x1,r.y1,r.x2-r.x1,r.y2-r.y1);ctx.clip();
   for(let y=r.y1;y<r.y2;y+=a.height)for(let x=r.x1;x<r.x2;x+=a.width)bitmap(r.asset,x,y);ctx.restore();
  }
  const name=level.background_frames[1],a=level.assets[name];
  for(const f of level.architecture.floors){ctx.save();ctx.beginPath();ctx.rect(f.x1,f.y-1,f.x2-f.x1,13);ctx.clip();
   for(let x=f.x1;x<f.x2;x+=a.width){ctx.save();ctx.translate(x,f.y-1);if(Math.floor(x/a.width)%2){ctx.translate(a.width,0);ctx.scale(-1,1);}ctx.drawImage(images[name],0,0);ctx.restore();}ctx.restore();
  }
  for(const w of level.architecture.walls??[]){
   const a=level.assets[w.asset],top=w.draw_y1??w.y1,bottom=w.draw_y2??w.y2;
   ctx.save();ctx.beginPath();ctx.rect(w.x1,top,w.x2-w.x1,bottom-top);ctx.clip();
   // One intact wall column, fitted to the authored width; no partial repeat
   // of its left edge in the last two pixels of an ASCII cell.
   for(let y=top;y<bottom;y+=a.height)ctx.drawImage(images[w.asset],w.x1,y,w.x2-w.x1,a.height);
   ctx.restore();
  }
  ctx.font='10px Arial';ctx.fillStyle='#94a6b4';for(const label of level.architecture.labels)ctx.fillText(label.text,label.x,label.y);
  const hudName=level.background_frames[0],hudTile=level.assets[hudName];
  for(let x=0;x<640;x+=hudTile.width)ctx.drawImage(images[hudName],x,426);
 }else{
 for(let row=0;row<8;row++){
  const name=level.background_frames[row===7?0:1],a=level.assets[name];
  for(let x=0;x<640;x+=a.width){ctx.save();ctx.translate(x,48+row*54);if(Math.floor(x/a.width)%2){ctx.translate(a.width,0);ctx.scale(-1,1);}ctx.drawImage(images[name],0,0);ctx.restore();}
 }
 ctx.drawImage(canvas,0,65,640,30,0,0,640,30);ctx.drawImage(canvas,0,65,640,30,0,19,640,30);
 }
 for(const o of level.background.objects.slice().reverse().sort((a,b)=>a.layer_value-b.layer_value))object(o);
 const fg=g.level.foreground.objects.slice().reverse().sort((a,b)=>a.layer_value-b.layer_value);
 // aHorizGate IMMED horizgate is captured into backbmp beneath its active sprite.
 // Preserve that open slot after CLEAR/QUIT, and draw it below the player.
 for(const o of fg.filter(o=>o.task==='aHorizGate'))bitmap(level.extra.horizgate[0],o.x,o.y);
 for(const {kind,item:e} of drawOrder(g)){
  if(kind==='object')object(e);
  else if(kind==='doorPanel'){
   const name=level.extra.enddoor[e.frame],a=level.assets[name],sign=e.frame===1?-1:1;
   ctx.save();ctx.beginPath();ctx.rect(e.x+a.xoffset,e.y+a.yoffset,a.width,a.height);ctx.clip();
   // Keep the original lintel and jambs; slide panels across the aperture.
   const door=g.level.foreground.objects.find(o=>o.index===e.owner);ctx.beginPath();ctx.rect(door.x+8,door.y+14,34,27);ctx.clip();bitmap(name,e.x+sign*doorOffset(g,e.owner),e.y);ctx.restore();
  }
  else if(kind==='player'){const v=playerVisual(g);if(v)bitmap(v.name,g.p.x,g.p.y,v.face);}
  else if(kind==='weed')bitmap(level.extra.weed[e.hp>0?(e.hitUntil>g.elapsed?5:e.frame):e.explodedUntil>g.elapsed?7:6],e.x,e.y,e.face);
  else if(kind==='bat'){const v=batVisual(g,e);bitmap(v.name,v.x,v.y,v.face);}
  else if(kind==='spore')bitmap(level.extra.spore[e.frame],e.x,e.y,e.dead?1:e.face);
  else if(kind==='compactedTrash')bitmap(level.extra.trash_piece[e.frame],e.x,e.y);
  else if(kind==='bomb'){bitmap(level.extra.goodie[e.frame],e.x,e.y);ctx.fillStyle='white';ctx.font='12px monospace';ctx.fillText(Math.max(0,6-Math.floor((g.elapsed-e.started)/600)),e.x,e.y-8);}
  else if(kind==='blast')for(const v of blastVisuals(g,e))bitmap(level.extra.explosion[v.frame],v.x,v.y);
  else if(kind==='shot')bitmap(level.extra.wfire[0],e.x,e.y);
  else {const name=level.extra.bullet[kind==='bullet'?0:g.elapsed-e.started<200?1:2],a=level.assets[name];ctx.drawImage(images[name],e.x-Math.trunc(a.width/2),e.y-Math.trunc(a.height/2));}
 }
 if($('zones').checked)for(const z of g.level.zones){ctx.strokeStyle=['gate','hgate','dead'].includes(z.kind)?'#ff5555':'#66bbff';ctx.strokeRect(z.x1,z.y1,z.x2-z.x1,z.y2-z.y1);}
 drawHud(ctx,g,level,images);
 if(!running&&g.phase==='playing'){
  ctx.fillStyle='#080f18dd';ctx.fillRect(170,190,300,60);ctx.fillStyle='white';ctx.font='18px system-ui';ctx.textAlign='center';ctx.fillText('Paused',320,227);ctx.textAlign='left';
 }
 $('health').value=g.life;$('health-value').textContent=g.life+'/20';$('ammo').value=g.ammo;$('ammo-value').textContent=g.ammo+'/20';$('lives').textContent=g.lives;$('keys').textContent=g.keys.join(', ')||'none';$('score').textContent=g.score;
 $('inventory').textContent=g.inventory.length?g.inventory.map((id,i)=>(i===g.selection?'▸ ':'')+ITEM_NAMES[id]).join(' · '):'empty';
 const gates=fg.filter(o=>['aLaserGate','aHorizGate'].includes(o.task));
 $('status').textContent=`${g.phase==='playing'?(running?'Playing':'Paused'):g.phase==='dying'?'Captain down…':g.phase==='exiting'?'Leaving level…':g.phase} · Gates ${gates.filter(o=>o.open).length}/${gates.length}${g.message?' · '+g.message:''}`;
 Object.assign(canvas.dataset,{x:g.p.x,y:g.p.y,phase:g.phase,level:g.number,health:g.life,lives:g.lives,score:g.score});
}
function tick(time){
 if(!last)last=time;const elapsed=Math.min(180,time-last);last=time;
 if(running&&g&&!loading){acc+=elapsed;while(acc>=60){
  advance(g,{left:keys.has('ArrowLeft'),right:keys.has('ArrowRight'),down:keys.has('ArrowDown'),up:edges.has('ArrowUp'),downPressed:edges.has('ArrowDown'),jump:edges.has('Space'),shoot:edges.has('KeyF')||edges.has('ControlLeft')||edges.has('ControlRight'),select:edges.has('ShiftLeft')||edges.has('ShiftRight'),use:edges.has('Enter')});edges.clear();acc-=60;
  if(soundEngine&&$('sound').checked)for(const e of g.sounds)soundEngine.play(e.id,e.channel);
  if(g.flowEvent==='retry'){soundEngine?.stopEffects();audioSettings();}
  if(['gameover','complete'].includes(g.phase)){result();break;}
 }draw();}requestAnimationFrame(tick);
}
canvas.addEventListener('keydown',e=>{
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyF','ControlLeft','ControlRight','KeyP','KeyR','ShiftLeft','ShiftRight','Enter'].includes(e.code))e.preventDefault();
 if(e.repeat||!$('menu').hidden||!$('result').hidden)return;if(e.code==='KeyP'&&g&&g.phase!=='complete'&&g.phase!=='gameover'){setRunning(!running);return;}if(e.code==='KeyR'){retry();return;}
 keys.add(e.code);if(running)edges.add(e.code);
});
canvas.addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('blur',e=>{if(running&&e.relatedTarget!==$('pause'))setRunning(false);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setRunning(false);});
$('pause').onclick=()=>setRunning(!running);$('retry').onclick=retry;$('menu-button').onclick=menu;
$('sound').onchange=audioSettings;$('music').onchange=audioSettings;$('zones').onchange=draw;
$('new').onclick=()=>choose(Number($('level').value));$('continue').onclick=()=>{if(saved)choose(saved.level,{score:saved.score});};
$('again').onclick=()=>choose(g.number);$('next').onclick=()=>{const n=nextLevel(g.number);if(n!==undefined)choose(n,{lives:g.lives,score:g.score});};
$('level').onchange=()=>{const n=Number($('level').value);$('level-note').textContent=campaign.levels.find(l=>l.number===n)?.briefing??(n===3?'Conundrum: three-way teleporters cycle through all endpoints. Full puzzle route remains under review.':n===5?'Original hint: Press ENTER right away! Collect helium and use it to rise.':n===7?'Collect hydrogen or nitrogen, then use a bomb to destroy breakable scenery.':'');};
try{const r=await fetch('campaign.json',{cache:'no-store'});if(!r.ok)throw Error('Level list unavailable');campaign=await r.json();const groups={};for(const l of campaign.levels){const group=l.category==='training'?'Training Ground — new practice decks':l.number<12?'Recovered decks':'Recovered alternates';if(!groups[group]){groups[group]=document.createElement('optgroup');groups[group].label=group;$('level').append(groups[group]);}const option=document.createElement('option');option.value=l.number;option.textContent=(TRAINING.includes(l.number)?(TRAINING.indexOf(l.number)+1)+'. ':l.number<12?(l.number+1)+'. ':'')+l.title;groups[group].append(option);}$('level').onchange();$('new').disabled=false;$('new').textContent='Play';$('continue').hidden=!saved||!!saved.completed;requestAnimationFrame(tick);}catch(e){$('status').textContent=e.message;}
