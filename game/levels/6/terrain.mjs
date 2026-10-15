export function initial(spawn={x:80,y:420}) {
  return {x:spawn.x,y:spawn.y,face:1,state:'stay',grounded:false,dx:0,ix:0,iy:0,frame:1,counter:-1,ticks:0,landings:0};
}
export function step(p, input, level) {
  p.event='';p.hitGate=null;
  if(p.springBounce){
    const s=p.springBounce,o=level.foreground.objects.find(o=>o.index===s.owner);
    s.phase++;
    const frame=[1,2,3,0][s.phase];
    // Compiled aSpring aligns after1/2/3; frame0 does not realign feet.
    if(s.phase<3)p.y=o.y+level.assets[level.extra.spring[frame]].yoffset;
    const supported=['solid','platform','ladderUp','ladderDown','teleport','exit','spring'].includes(p.zone);
    let jumped=false;
    if(input.jump&&supported){
      if(input.left)p.face=-1;if(input.right)p.face=1;
      p.ix=(10+p.dx-Math.trunc(p.dx/2))*p.face;p.dx=0;p.iy=-10;p.state='fall';p.frame=5;jumped=true;
    }else if(input.down){p.state='duck';p.frame=7;}
    else if(input.left||input.right){p.face=input.left?-1:1;if(supported)p.state='walk';}
    else if(p.state==='walk')p.state=supported?'stay':'fall';
    if(p.state==='walk'){p.dx=5;p.ix=0;p.counter=(p.counter+1)%5;p.frame=p.counter;}
    else if(p.state==='stay'){p.dx=0;p.ix=0;p.iy=0;p.frame=1;p.counter=-1;}
    else{if(p.zone==='fall'){if(p.ix>p.face)p.ix--;if(p.ix<p.face)p.ix++;if(p.iy<8)p.iy+=4;}p.dx=0;}
    p.x+=p.face*p.dx+p.ix;
    if(p.x<0)p.x=640;else if(p.x>640)p.x=0;
    const zone=selectZone(level.zones,p.x,p.y);
    // Native ZONES ignores type0, not type-1. The activated spring keeps
    // its zone index during compression, so iTestZones retains gPrevZone.
    if(zone?.owner!==s.owner){p.zone=zone?.kind??'fall';if(p.zone==='fall')p.state='fall';}
    if(s.phase===3){
      p.iy=-s.power;p.grounded=false;p.state='fall';
      if(p.shoeJump){p.iy=s.walking?-8:-22;if(!s.walking)p.ix=10*p.face;}
      p.dx=0;p.springBounce=null;
    }
    p.ticks++;return jumped;
  }
  if(p.transition){
    const t=p.transition;
    if(t.kind==='teleport'){
      if(t.phase<11){t.phase++;t.frame=t.phase<6?t.phase:11-t.phase;if(t.phase===6){p.x=t.targetX;p.y=t.targetY;}p.ticks++;return false;}
      p.transition=null;input={};
    }else{
    if(t.phase<5){t.phase++;t.frame=t.direction==='up'?t.phase+1:6-t.phase;p.ticks++;return false;}
    p.y=t.targetY;p.transition=null;input={};
    }
  }
  let oldX=p.x;
  if(p.flight&&!p.transition){
    const f=p.flight,oldY=p.y;
    if(f.phase==='inflate'){
      // algInflate calls sInertialMovement; helium does not reset momentum.
      if(!p.grounded){p.ix+=Math.trunc(p.dx/2)*p.face;if(p.ix>p.face)p.ix--;if(p.ix<p.face)p.ix++;if(p.iy<8)p.iy+=4;}
      p.dx=0;if(++f.frame>=5){f.phase='float';f.frame=0;}
    }
    else if(f.phase==='deflate'){if(++f.frame>=6){p.flight=null;p.state='fall';p.frame=6;return false;}}
    else if(input.jump){f.phase='deflate';f.frame=0;p.event='Deflated';}
    else{p.ix=Math.max(-5,Math.min(5,p.ix+(input.right?2:0)-(input.left?2:0)));p.ix-=Math.sign(p.ix);if(p.iy>-2)p.iy--;}
    p.x+=p.ix;p.y+=p.iy;if(p.x<0)p.x=640;else if(p.x>640)p.x=0;p.y=Math.max(10,Math.min(440,p.y));
    const z=selectZone(level.zones,p.x,p.y);
    if(z?.kind==='dead')p.dead=true;
    else if(z?.kind==='exit'){p.complete=true;p.event='Exit reached';}
    else if(z?.kind==='wall'||z?.kind==='gate'){
      // Player.seq sVerSolidZone / jWallDone restores BOTH previous coordinates.
      p.x=oldX<=z.x1?z.x1-1:oldX>=z.x2?z.x2+1:oldX<(z.x1+z.x2)/2?z.x1-1:z.x2+1;
      p.y=oldY;p.ix=p.x<z.x1?-1:1;p.iy=2;if(z.kind==='gate')p.hitGate=z;
    }
    else if(z&&['solid','platform','ladderUp','ladderDown','teleport','hgate'].includes(z.kind)){p.y=oldY>(z.y1+z.y2)/2?z.y2+1:z.y1-1;p.iy=0;if(z.kind==='hgate')p.hitGate=z;}
    p.grounded=false;p.ticks++;return false;
  }
  const current=selectZone(level.zones,p.x,p.y);
  p.event='';
  p.hitGate=null;
  if(input.up || input.downPressed){
    if((current?.kind==='ladderUp'&&input.up)||(current?.kind==='ladderDown'&&input.downPressed)){
      const direction=current.kind==='ladderUp'?'up':'down',targetY=p.y+(direction==='up'?-54:54);
      p.x=Math.trunc((current.x1+current.x2)/2);if(direction==='down')p.y=targetY;
      p.iy=0;p.ix=0;p.dx=0;p.state='stay';
      p.transition={direction,targetY,phase:0,frame:direction==='up'?1:6};
      p.event=direction==='up'?'Climbed up':'Climbed down';p.ticks++;return false;
    }
    else if(current?.kind==='teleport' && input.up){
      const source=level.foreground.objects.find(o=>o.index===current.owner);
      // The original broadcasts to every matching task; its scheduler winner is
      // unverified. A fixed first/last winner traps three-way links in two nodes.
      // Browser repair: cycle in saved-index order, preserving ordinary pairs.
      const endpoints=level.foreground.objects.filter(o=>o.task==='aTeleport'&&o.p1===source.p1).sort((a,b)=>a.index-b.index);
      const destination=endpoints.length>1?endpoints[(endpoints.findIndex(o=>o.index===source.index)+1)%endpoints.length]:null;
      if(destination){const [l,t,r,b]=destination.bounds;
        if(level.gameFlow){p.transition={kind:'teleport',phase:0,frame:0,targetX:Math.trunc((l+r)/2),targetY:b-5,source:source.index,destination:destination.index};p.ix=0;p.iy=0;p.dx=0;p.state='stay';p.event='Teleported · link '+source.p1;p.ticks++;return false;}
        p.x=Math.trunc((l+r)/2);p.y=b-5;p.ix=0;p.iy=0;p.state='stay';p.event='Teleported · link '+source.p1;}
      else p.event='No matching teleporter · link '+source.p1;
    }
  }
  let oldY=p.y;
  // sJump/sGoLeft/sGoRight read gPrevZone, including the last underside handler.
  const supported=p.grounded||['solid','platform','ladderUp','ladderDown','teleport','exit','spring'].includes(p.zone);
  let jumped=false;
  // KEYBOARD.SEQ priority: space press, down, left, right, release.
  if (input.jump) {
    if(input.left) p.face=-1;
    if(input.right) p.face=1;
    if(supported) {
      p.ix=(10+p.dx-Math.trunc(p.dx/2))*p.face;
      // Owner-requested browser assistance: a stationary jump from a laser
      // pit's cyan approach rim gets the ordinary running jump's X range.
      if(p.dx===0&&p.grounded&&onLaserRim(p,level))p.ix=13*p.face;
      p.iy=-10;p.dx=0;p.grounded=false;p.state='fall';p.frame=5;jumped=true;
    }
  } else if(input.down) {p.state='duck';p.counter=-1;}
  else if(input.left || input.right) {
    p.face=input.left?-1:1;
    if(supported) p.state='walk';
  } else if(['walk','duck'].includes(p.state)) p.state=p.grounded?'stay':'fall';
  p.counter++;
  if(p.counter >= (p.state==='walk'?5:1)) p.counter=0;
  if(!jumped) {
    if(p.state==='walk') {
      p.dx=5;p.ix=0;p.frame=p.counter;
    } else if(p.state==='stay' && p.grounded) {
      p.dx=0;p.ix=0;p.iy=0;p.frame=1;p.counter=-1;
    } else {
      // sInertialMovement runs only after gPrevZone becomes sFallZone.
      // Undefined is the existing fixture/startup fallback; initial task timing is unverified.
      if(!p.grounded&&(p.zone??'fall')==='fall') {
        p.ix+=Math.trunc(p.dx/2)*p.face;
        if(p.ix>p.face) p.ix--;
        if(p.ix<p.face) p.ix++;
        if(p.iy<8) p.iy+=4;
      }
      p.dx=0;
      if(p.state==='duck') p.frame=7;
      else if(p.iy>0) p.frame=6;
    }
  }
  p.x+=p.face*p.dx+p.ix;
  p.y+=p.iy;
  // Player.seq's 640-pixel horizontal wrap.
  if(p.x<0){p.x=640;oldX=p.x;}
  else if(p.y<10){p.y=10;oldY=p.y;}
  else if(p.x>640){p.x=0;oldX=p.x;}
  else if(p.y>440){p.y=440;oldY=p.y;}
  const zone=selectZone(level.zones,p.x,p.y);
  p.zone=zone?.kind || 'fall';
  if(zone?.kind==='dead') {if(level.gameFlow){p.dead=true;p.event='Laser pit';}else{const ticks=p.ticks;Object.assign(p,initial(level.spawn),{ticks,event:'Laser pit — restarted'});}}
  else if(zone?.kind==='exit') {p.event='Exit reached';p.complete=true;}
  else if(zone?.kind==='spring'){
    const o=level.foreground.objects.find(o=>o.index===zone.owner);
    p.springBounce={owner:o.index,phase:0,power:Math.min(55,o.p1+15),walking:p.dx!==0};
    p.y=o.y+level.assets[level.extra.spring[1]].yoffset;
    p.dx=0;p.ix=0;p.iy=0;p.grounded=false;p.state='stay';p.frame=1;p.event='Spring bounce';
  }
  else if(zone?.kind==='wall' || zone?.kind==='gate') {
    p.x=oldX<=zone.x1?zone.x1-1:oldX>=zone.x2?zone.x2+1:oldX<(zone.x1+zone.x2)/2?zone.x1-1:zone.x2+1;
    p.y=oldY;p.ix=p.x<zone.x1?-1:1;p.iy=2;p.dx=0;p.grounded=false;p.state='fall';
    if(zone.kind==='gate')p.hitGate=zone;
  } else if(zone && ['solid','platform','ladderUp','ladderDown','teleport','hgate'].includes(zone.kind)) {
    // sHorSolidZone cancels horizontal momentum before aligning either edge.
    // sPlatform deliberately keeps horizontal displacement.
    if(zone.kind!=='platform')p.x-=p.ix;
    if(zone.kind!=='platform'&&oldY>(zone.y1+zone.y2)/2){p.y=zone.y2+1;p.grounded=false;p.state='fall';p.iy=0;}
    else {
      // iTestZones calls the landing handler on zone entry only. Reapplying
      // its gdX=0 while walking on the same floor loses algJump's run bonus.
      const continuingWalk=p.grounded&&current===zone&&p.state==='walk';
      if(!p.grounded)p.landings++;p.y=zone.y1;p.grounded=true;if(p.state!=='walk')p.state='stay';p.ix=0;p.iy=0;
      if(!continuingWalk)p.dx=0;
    }
    if(zone.kind==='hgate'){p.iy=0;p.dx=0;p.ix=0;p.hitGate=zone;}
  } else {p.grounded=false;p.state='fall';}
  p.ticks++;
  return jumped;
}

function onLaserRim(p,level){
  return level.foreground.objects.some(o=>{
    if(o.task!=='aLaserPit')return false;
    const [l,t,r]=o.bounds;
    if(Math.abs(p.y-(t+2))>3)return false;
    return p.face===1?p.x>=l&&p.x<l+15:p.x>r-15&&p.x<=r;
  });
}

// Selected mxsprace.dll: inclusive edges, enabled kind, greatest priority; first wins ties.
export function selectZone(zones,x,y) {
  let best=null,priority=-1;
  for(const zone of zones) {
    if(zone.kind && x>=zone.x1 && x<=zone.x2 && y>=zone.y1 && y<=zone.y2 && zone.priority>priority){best=zone;priority=zone.priority;}
  }
  return best;
}
