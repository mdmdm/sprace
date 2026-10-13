import {initial,step} from './physics.mjs';
import {Sound} from './audio.mjs';
import {objectVisible} from './interactions.mjs';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
const start=document.querySelector('#start'),status=document.querySelector('#status'),restart=document.querySelector('#restart');
let level,images={},g,p,running=false,ready=false,last=0,acc=0,edges=new Set(),keys=new Set(),message='',effect=0;
ctx.imageSmoothingEnabled=false;
let soundEngine,audioError='',audioPlays=0;
const soundToggle=document.querySelector('#sound'),musicToggle=document.querySelector('#music'),audioStatus=document.querySelector('#audio-status');
function audioSettings(){
 if(!soundEngine)return;
 soundEngine.master.gain.value=soundToggle.checked?.45:0;
 if(!soundToggle.checked)soundEngine.stopEffects();
 if(running&&soundToggle.checked){soundEngine.context.resume().then(()=>{soundEngine.music(running&&soundToggle.checked&&musicToggle.checked,level.audio_music);audioStatus.textContent=soundToggle.checked?'Original audio enabled':'Sound muted';}).catch(()=>{audioStatus.textContent='Audio blocked — toggle Sound to retry';});}
 else{if(!p?.complete||!soundToggle.checked)soundEngine.context.suspend();audioStatus.textContent=soundToggle.checked?'Original audio ready · starts with play':'Sound muted';}
 soundEngine.music(running&&soundToggle.checked&&musicToggle.checked,level.audio_music);
}
for(const control of [soundToggle,musicToggle])control.onchange=audioSettings;
function setRunning(value){running=value;keys.clear();edges.clear();acc=0;start.textContent=value?'Pause':p.ticks?'Resume':'Start';if(value)canvas.focus();if(!value&&!p.complete)soundEngine?.stopEffects();audioSettings();draw();}
function reset(){soundEngine?.reset();audioSettings();g=initial(level);p=g.p;message='';effect=0;keys.clear();edges.clear();acc=0;if(!running)start.textContent='Start';draw();}
start.onclick=()=>setRunning(!running);restart.onclick=()=>{reset();canvas.focus();};
for(const id of ['zones'])document.querySelector('#'+id).onchange=()=>draw();
canvas.addEventListener('keydown',e=>{
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyP','KeyR','KeyF','ControlLeft','ControlRight'].includes(e.code))e.preventDefault();
 if(e.code==='KeyP'&&!e.repeat){setRunning(!running);return;}
 if(e.code==='KeyR'&&!e.repeat){reset();return;}
 if(!e.repeat&&running)edges.add(e.code);keys.add(e.code);
});
canvas.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')e.preventDefault();});
canvas.addEventListener('blur',e=>{keys.clear();edges.clear();if(running&&e.relatedTarget!==start)setRunning(false);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setRunning(false);});
function bitmap(name,x,y,face=1){const bm=level.assets[name];ctx.save();ctx.translate(x,y);if(face<0)ctx.scale(-1,1);ctx.drawImage(images[name],bm.xoffset,bm.yoffset);ctx.restore();}
function baseRows(){
 ctx.fillStyle='black';ctx.fillRect(0,0,640,480);
 for(let row=0;row<8;row++){
   const name=level.background_frames[row===7?0:1],bm=level.assets[name],im=images[name];
   for(let x=0;x<640;x+=bm.width){ctx.save();ctx.translate(x,48+row*54);if(Math.floor(x/bm.width)%2){ctx.translate(bm.width,0);ctx.scale(-1,1);}ctx.drawImage(im,0,0);ctx.restore();}
 }
 // STARTUP captures generic y65..95 and places the strip at y0 and y19.
 ctx.drawImage(canvas,0,65,640,30,0,0,640,30);ctx.drawImage(canvas,0,65,640,30,0,19,640,30);
}
function object(o,time){
 if(o.task==='aWeed')return;
 if(!objectVisible(o,g.elapsed+(running?acc:0)))return;
 if(o.collected&&o.task!=='aSwitch'){if(o.task==='aLock')bitmap(level.extra.lock[Math.min(11,o.type_value*2-1)],o.x,o.y);return;}
 bitmap(o.asset,o.x,o.y);
 if(o.task==='aLaserPit')bitmap(level.zap[Math.floor(time/200)%4],o.x+13,o.y+39);
}
function draw(time=0){
 if(!ready)return;
 baseRows();
 for(const o of level.background.objects.slice().reverse().sort((a,b)=>a.layer_value-b.layer_value))object(o,time);
 const fg=g.level.foreground.objects.slice().reverse().sort((a,b)=>a.layer_value-b.layer_value);
 // aHorizGate IMMED horizgate is captured into backbmp beneath its active sprite.
 // Preserve that open slot after CLEAR/QUIT, and draw it below the player.
 for(const o of fg.filter(o=>o.task==='aHorizGate'))bitmap(level.extra.horizgate[0],o.x,o.y);
 for(const o of fg.filter(o=>o.layer_value<110))object(o,time);
 if(p.transition)bitmap(level.beam[p.transition.frame],p.x,p.y);
 else if(effect>0)bitmap(level.beam[Math.floor(effect)%8],p.x,p.y);
 else bitmap(level.frames[p.frame+(g.ammo>0?11:0)],p.x,p.y,p.face);
 for(const e of g.enemies)bitmap(level.extra.weed[e.hp>0?e.frame:6],e.x,e.y,e.face);
 for(const b of g.bullets){const a=level.assets[level.extra.bullet[0]];ctx.drawImage(images[level.extra.bullet[0]],b.x-Math.trunc(a.width/2),b.y-Math.trunc(a.height/2));}
 for(const s of g.shots)bitmap(level.extra.wfire[0],s.x,s.y);
 for(const o of fg.filter(o=>o.layer_value>=110))object(o,time);
 if(document.querySelector('#zones').checked){
  for(const z of g.level.zones){ctx.strokeStyle=z.kind==='wall'?'#ffbf55':z.kind==='dead'?'#ff5555':z.kind==='fall'?'#cc77ff':z.kind.startsWith('ladder')?'#66ffbb':'#66bbff';ctx.lineWidth=1;ctx.strokeRect(z.x1,z.y1,z.x2-z.x1,z.y2-z.y1);}
 }
 if(!running){ctx.fillStyle='#080f18dd';ctx.fillRect(160,188,320,65);ctx.fillStyle='#e6edf3';ctx.font='18px system-ui';ctx.textAlign='center';ctx.fillText(p.complete?'Exit reached':p.ticks?'Paused':level.title,320,215);ctx.font='12px system-ui';ctx.fillText(p.complete?'Restart to explore again':p.ticks?'Resume to keep exploring':'Start to explore the recovered level',320,239);ctx.textAlign='left';}
 const gates=g.level.foreground.objects.filter(o=>['aLaserGate','aHorizGate'].includes(o.task));
 status.textContent=`${running?'Playing':'Paused'} · Life ${g.life}/20 · Ammo ${g.ammo}/20 · Keys ${g.keys.join(', ')||'none'} · Score ${g.score} · Gates opened ${gates.filter(o=>o.open).length}/${gates.length}${g.message?' · '+g.message:''}`;
 canvas.dataset.openGates=gates.filter(o=>o.open).map(o=>o.index).join(',');
 canvas.dataset.x=p.x;canvas.dataset.y=p.y;canvas.dataset.zone=p.zone||'spawn';canvas.dataset.ticks=p.ticks;
}
function tick(time){
 if(!last)last=time;const elapsed=Math.min(time-last,180);last=time;
 if(running){acc+=elapsed;while(acc>=60){
  step(g,{left:keys.has('ArrowLeft'),right:keys.has('ArrowRight'),down:keys.has('ArrowDown'),jump:edges.has('Space'),up:edges.has('ArrowUp'),downPressed:edges.has('ArrowDown'),shoot:edges.has('KeyF')||edges.has('ControlLeft')||edges.has('ControlRight')});p=g.p;edges.clear();
  if(soundToggle.checked&&soundEngine)for(const event of g.sounds)soundEngine.play(event.id,event.channel);
  if(p.event){message=p.event;effect=/Teleported/.test(p.event)?6:0;}
  if(effect>0)effect--;
  if(p.complete){setRunning(false);break;}acc-=60;
 }draw(time);}requestAnimationFrame(tick);
}
function load(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error(src));im.src=src;});}
try{
 const response=await fetch('level.json');if(!response.ok)throw Error('Level data unavailable');level=await response.json();
 await Promise.all(Object.entries(level.assets).map(async([name,bm])=>{images[name]=await load(bm.file);}));
 try{
  const context=new AudioContext(),buffers={};
  await Promise.all(Object.entries(level.audio).map(async([id,item])=>{const r=await fetch(item.file);if(!r.ok)throw Error('Missing WAV '+id);buffers[id]=await context.decodeAudioData(await r.arrayBuffer());}));
  soundEngine=new Sound(context,buffers,(id,channel)=>{audioPlays++;audioStatus.dataset.plays=audioPlays;audioStatus.dataset.lastSound=id;audioStatus.textContent='Original audio enabled';});
  audioStatus.textContent='Original audio ready · starts with play';
 }catch(e){audioError=e.message;audioStatus.textContent='Audio unavailable: '+audioError;soundToggle.checked=false;soundToggle.disabled=true;musicToggle.disabled=true;}
 ready=true;g=initial(level);p=g.p;start.disabled=false;restart.disabled=false;start.textContent='Start';draw();requestAnimationFrame(tick);
}catch(e){status.textContent='Level failed to load: '+e.message;start.textContent='Load failed';}
