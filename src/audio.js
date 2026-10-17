// Original, quiet marimba-like loop. All sounds are synthesized locally.
const BEAT = 60 / 92;
const CHORDS = [[48,52,55,59],[45,48,52,55],[53,57,60,64],[43,47,50,57]];
const MELODY = [
  [76,null,79,74,72,null,67,71], [72,null,76,79,76,null,72,null],
  [77,null,76,72,69,null,72,76], [74,null,71,67,69,null,71,null],
  [79,null,76,74,72,null,71,67], [76,null,79,84,79,null,76,null],
  [77,null,81,79,77,null,76,72], [74,null,71,69,67,null,71,null],
];
function effectSequence(name,actor='you',count=1){
  const shift=actor==='ai'?-5:0;
  const notes=name==='win'?[72,76,79,84]:name==='lose'?[71,67,64]:name==='start'?[67,72,76]:name==='capture'?(count>1?[72,76,79,84]:[72,76,79]):[actor==='you'?76:69];
  return notes.map((n,i)=>[n+(name==='capture'?shift:0),i*(name==='win'||name==='lose'?.14:.075),name==='place'?.09:.32,name==='place'?.1:.14]);
}
function renderEffect(ctx,name,args,when){
  for(const [midi,delay,duration,volume] of effectSequence(name,...args)){
    const oscillator=ctx.createOscillator(),gain=ctx.createGain(),t=when+delay;
    oscillator.type='sine';oscillator.frequency.value=440*2**((midi-69)/12);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume*.55,t+.012);gain.gain.exponentialRampToValueAtTime(.000055,t+duration);
    oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(t);oscillator.stop(t+duration+.025);
  }
}
export function createAudio() {
  let capturing=false,effectQueue=[];
  let context, master, enabled=true, playing=false, hidden=false, interval=null, step=0, next=0;
  const voices=new Set();
  const frequency=midi=>440*2**((midi-69)/12);
  function tone(midi,time,duration,volume,type='sine',bus='effect') {
    if(!context||!enabled||hidden||context.state!=='running')return;
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type=type;oscillator.frequency.value=frequency(midi);
    gain.gain.setValueAtTime(0,time);
    gain.gain.linearRampToValueAtTime(volume,time+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    oscillator.connect(gain);gain.connect(master);
    const voice={oscillator,gain,bus};voices.add(voice);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();voices.delete(voice);};
    oscillator.start(time);oscillator.stop(time+duration+.025);
  }
  function stop(bus) {
    if(!context)return;
    const t=context.currentTime;
    for(const voice of voices){
      if(bus&&voice.bus!==bus)continue;
      voice.gain.gain.cancelScheduledValues(t);
      voice.gain.gain.setTargetAtTime(0,t,.012);
      try{voice.oscillator.stop(t+.06);}catch{/* Already ended. */}
    }
  }
  function schedule() {
    if(!context||context.state!=='running'||!playing||!enabled||hidden)return;
    // A delayed tab must never schedule a burst of old notes.
    if(next<context.currentTime)next=context.currentTime+.04;
    while(next<context.currentTime+.15){
      const bar=Math.floor(step/8)%8,slot=step%8,chord=CHORDS[bar%4];
      const note=MELODY[bar][slot];
      if(note!==null){tone(note,next,.38,.065,'sine','music');tone(note+12,next,.12,.009,'sine','music');}
      if(slot===0||slot===4)tone(chord[slot===0?0:2],next,.65,.06,'sine','music');
      if(slot===2||slot===6)chord.slice(1).forEach(n=>tone(n+12,next,.3,.018,'triangle','music'));
      step=(step+1)%64;next+=BEAT/2;
    }
  }
  function sync() {
    clearInterval(interval);interval=null;
    if(!context||context.state!=='running'||!enabled||hidden||!playing){stop('music');return;}
    next=context.currentTime+.06;schedule();interval=setInterval(schedule,50);
  }
  function unlock() {
    if(capturing||!enabled||hidden)return;
    try {
      if(!context){
        const AudioContext=window.AudioContext||window.webkitAudioContext;
        if(!AudioContext)return;
        context=new AudioContext();master=context.createGain();master.gain.value=.55;master.connect(context.destination);
      }
      if(context.state!=='running')context.resume().then(sync).catch(()=>{});
    }catch{/* Audio must never prevent a game from starting. */}
  }
  function effect(name,actor='you',count=1) {
    if(capturing){effectQueue.push({name,args:[actor,count]});return;}
    if(!context||context.state!=='running'||!enabled||hidden)return;
    effectSequence(name,actor,count).forEach(([note,delay,duration,volume])=>tone(note,context.currentTime+delay,duration,volume,'sine'));
  }

  return {
    unlock,effect,
    capture(on){capturing=on;effectQueue=[];if(on){stop();clearInterval(interval);interval=null;}},
    drain(){const queue=effectQueue;effectQueue=[];return queue;},
    render:renderEffect,
    stopEffects(){stop('effect');},
    setPlaying(value){playing=value;stop('music');if(value)step=0;sync();},
    setEnabled(value){enabled=value;if(!value)stop();else unlock();sync();},
    setHidden(value){hidden=value;if(value){stop();clearInterval(interval);interval=null;}else{unlock();sync();}},
    getState:()=>({enabled,playing,hidden,state:context?.state??'uninitialized',musicScheduled:interval!==null,voices:voices.size}),
  };
}
