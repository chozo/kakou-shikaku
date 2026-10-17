export const EDGES = [
  ...Array.from({length:16}, (_, i) => ({id:i, x:i%4, y:Math.floor(i/4), vertical:true})).filter(e=>e.y<3),
  ...Array.from({length:12}, (_, i) => ({id:12+i, x:i%3, y:Math.floor(i/3), vertical:false})),
];
export const BOXES = Array.from({length:9}, (_,i)=>{
  const x=i%3,y=Math.floor(i/3);
  return [y*4+x,y*4+x+1,12+y*3+x,12+(y+1)*3+x];
});
// Four opening variants per setting. Only beginner + human-first offers a box.
export const PATTERNS = [
  [0,1,12,14,20], [2,3,14,12,18], [8,9,21,13,17], [10,11,23,12,19],
];
export const OPENINGS={
  beginnerSecond:[[0,12,14,20,22],[3,12,14,18,22],[8,13,15,21,23],[11,13,17,21,23]],
  normal:[[2,12,19,22,23],[2,6,7,8,12],[4,5,8,14,20],[9,12,13,16,23]],
  expert:[[2,4,5,14,16],[6,7,18,19,21],[1,2,3,15,18],[6,7,9,10,11]],
};
export function openingPatterns(difficulty='beginner',first='you'){
  return difficulty==='beginner'?(first==='you'?PATTERNS:OPENINGS.beginnerSecond):(OPENINGS[difficulty]||OPENINGS.normal);
}
export function createGame(pattern=0,first='you',difficulty='beginner') {
  const edges=Array(24).fill(null),patterns=openingPatterns(difficulty,first);
  patterns[pattern%patterns.length].forEach(i=>edges[i]='neutral');
  return {edges,boxes:Array(9).fill(null),turn:first==='ai'?'ai':'you',last:null,over:false,moves:0};
}
export function scores(state){return {you:state.boxes.filter(x=>x==='you').length,ai:state.boxes.filter(x=>x==='ai').length};}
export function play(state,id){
  if(state.over||!Number.isInteger(id)||id<0||id>=24||state.edges[id]!==null) return null;
  const actor=state.turn;
  state.edges[id]=actor;state.last=id;state.moves++;
  const captured=[];
  BOXES.forEach((edges,i)=>{if(state.boxes[i]===null&&edges.every(e=>state.edges[e]!==null)){state.boxes[i]=actor;captured.push(i);}});
  state.over=state.boxes.every(x=>x!==null);
  if(!captured.length)state.turn=actor==='you'?'ai':'you';
  return {actor,captured,over:state.over};
}
function clone(s){return {...s,edges:[...s.edges],boxes:[...s.boxes]};}
function available(s){return s.edges.flatMap((v,i)=>v===null?[i]:[]);}
function countCaptures(s,id){return BOXES.filter((b,i)=>s.boxes[i]===null&&b.includes(id)&&b.every(e=>e===id||s.edges[e]!==null)).length;}
// A light heuristic: take boxes, avoid giving a third side, then give away the smallest chain.
export function chooseAI(state,random=Math.random){
  const free=available(state);if(!free.length||state.over)return null;
  const captures=free.map(id=>({id,count:countCaptures(state,id)}));
  const bestCapture=Math.max(...captures.map(x=>x.count));
  let choices;
  if(bestCapture>0) choices=captures.filter(x=>x.count===bestCapture).map(x=>x.id);
  else {
    const rated=free.map(id=>{
      const s=clone(state);play(s,id);let given=0;
      for(let step=0;step<24;step++){
        const next=available(s).sort((a,b)=>countCaptures(s,b)-countCaptures(s,a))[0];
        if(next===undefined||countCaptures(s,next)===0)break;
        given+=play(s,next).captured.length;
      }
      return {id,given};
    });
    const min=Math.min(...rated.map(x=>x.given));choices=rated.filter(x=>x.given===min).map(x=>x.id);
  }
  return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
}
