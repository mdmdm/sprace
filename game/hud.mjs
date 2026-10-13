// Non-LOST HUD from PANELS.SEQ, LEVELS.SEQ and US/messages.seq.
// g.lives counts the current attempt; source gLives counts remaining retries.
export function hudState(g){
 const cap=(n,max)=>Math.max(0,Math.min(max,Math.trunc(n)));
 return {healthWidth:cap(g.life,20)*4,ammoWidth:cap(g.ammo,20)*4,
  retries:cap(g.lives-1,5),score:String(cap(g.score,999999)).padStart(6,'0'),
  keys:g.keys.slice(0,6).map((id,i)=>({id,x:265+i%3*30,y:452+Math.trunc(i/3)*15})),
  items:g.inventory.slice(0,6).map((id,i)=>({id,x:365+i*22,y:450})),
  selection:{x:360+cap(g.selection,5)*22,y:449}};
}
export function drawHud(ctx,g,level,images){
 const h=hudState(g);
 function bitmap(name,x,y,half=false,offset){
  const a=level.assets[name];if(!a||!images[name])return;
  const scale=half?.5:1,ox=offset?.[0]??Math.trunc(a.xoffset*scale),oy=offset?.[1]??Math.trunc(a.yoffset*scale);
  ctx.drawImage(images[name],x+ox,y+oy,Math.floor(a.width*scale),Math.floor(a.height*scale));
 }
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.textAlign='left';ctx.textBaseline='top';
 // Positive GDI font heights describe the cell, including internal leading.
 // 13px Arial glyphs approximate the source16px cell; score uses a20px cell.
 ctx.font='500 13px Arial, Helvetica, sans-serif';
 for(const [text,x] of [['Health Shakes',85],['Weed Killer',179],['Card-Keys',265],['Inventory',365],['Score',500]]){
  ctx.fillStyle='black';ctx.fillRect(x,433,Math.ceil(ctx.measureText(text).width),16);
  ctx.fillStyle='#00ffff';ctx.fillText(text,x,434);
 }
 for(const [x,width,frame] of [[85,h.healthWidth,1],[175,h.ammoWidth,0]]){
  bitmap(level.extra.meter[2],x,457);
  ctx.save();ctx.beginPath();ctx.rect(x,457,width,10);ctx.clip();bitmap(level.extra.meter[frame],x,457);ctx.restore();
 }
 for(let i=0;i<h.retries;i++)bitmap(level.beam[1],10+i*15,471);
 for(const k of h.keys)bitmap(k.id===7?level.extra.mister[0]:level.extra.card[k.id-1],k.x,k.y,k.id===7);
 for(const item of h.items)bitmap(level.extra.inventory[item.id-1],item.x,item.y,item.id===8,item.id===8?[-4,6]:undefined);
 bitmap(level.extra.selection[0],h.selection.x,h.selection.y);
 ctx.fillStyle='black';ctx.fillRect(500,450,74,20);ctx.fillStyle='white';
 ctx.font='600 16px "Courier New", Courier, monospace';ctx.fillText(h.score,500,451);
 ctx.restore();
}
