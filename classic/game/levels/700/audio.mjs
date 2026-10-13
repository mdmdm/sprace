// Original numbered WAVs, with one voice per source channel.
export class Sound {
 constructor(context,buffers,onPlay=()=>{}){
  this.context=context;this.buffers=buffers;this.onPlay=onPlay;this.voices=new Map();
  this.master=context.createGain();this.master.gain.value=.45;this.master.connect(context.destination);
  this.musicGain=context.createGain();this.musicGain.gain.value=.35;this.musicGain.connect(this.master);
 }
 play(id,channel,loop=false){
  if(this.context.state!=='running'||!this.buffers[id])return false;
  this.stop(channel);
  const source=this.context.createBufferSource();source.buffer=this.buffers[id];source.loop=loop;
  source.connect(channel===1?this.musicGain:this.master);
  source.onended=()=>{if(this.voices.get(channel)===source)this.voices.delete(channel);};
  this.voices.set(channel,source);source.start();this.onPlay(id,channel);return true;
 }
 stop(channel){const source=this.voices.get(channel);if(source){source.stop();this.voices.delete(channel);}}
 stopEffects(){for(const channel of [...this.voices.keys()])if(channel!==1)this.stop(channel);}
 reset(){for(const channel of [...this.voices.keys()])this.stop(channel);}
 music(enabled,id){if(!enabled)this.stop(1);else if(!this.voices.has(1))this.play(id,1,true);}
}
