// Numeric layers from SHARE/layers.seq and explicit task LAYER instructions.
// Passive porter/pit art stays behind Stubble; exit panels cover the frame opening.
// Equal-layer order is stable browser order, not a reproduction of task insertion.
export function drawOrder(g){
 const entries=[];
 const add=(kind,items,layer)=>{for(const item of items)entries.push({kind,item,layer:typeof layer==='function'?layer(item):layer});};
 add('doorPanel',g.level.foreground.objects.filter(o=>o.task==='aEndDoor').flatMap(o=>[1,2].map(frame=>({owner:o.index,x:o.x+(frame===1?8:26),y:o.y,frame}))),91);
 add('object',g.level.foreground.objects.slice().reverse(),o=>o.destroying?120:['aTeleport','aLaserPit','aEndDoor'].includes(o.task)?90:o.layer_value);
 add('bomb',g.bombs,100);add('bullet',g.bullets,101);add('bulletExplosion',g.explosions,101);
 add('player',[g.p],110);add('spore',g.spores,114);add('weed',g.enemies,115);add('bat',g.bats,115);add('shot',g.shots,116);
 add('compactedTrash',g.compactedTrash,120);add('blast',g.blasts,120);
 return entries.sort((a,b)=>a.layer-b.layer);
}
