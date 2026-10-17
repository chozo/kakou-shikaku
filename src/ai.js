import {BOXES,chooseAI} from './game.js';

// Exact minimax over the remaining edges. Values are future score differences
// for the player whose turn it is; a capture keeps that player on turn.
export function analyze(state,maxDepth=24) {
  const free=state.edges.flatMap((owner,id)=>owner===null?[id]:[]);
  if(state.over||!free.length)return {value:0,moves:[]};
  const bits=new Map(free.map((id,i)=>[id,1<<i]));
  const requirements=BOXES.map(box=>box.reduce((mask,id)=>mask|(bits.get(id)||0),0));
  const adjacent=free.map(id=>BOXES.flatMap((box,i)=>box.includes(id)?[requirements[i]]:[]));
  const full=(1<<free.length)-1;
  const memo=new Int8Array(full+1).fill(127);memo[full]=0;
  function evaluate(mask,i,depth){
    const next=mask|(1<<i);
    let gain=0;
    for(const required of adjacent[i])if((next&required)===required)gain++;
    return gain?gain+solve(next,depth-1):-solve(next,depth-1);
  }
  function solve(mask,depth){
    if(depth===0)return 0;
    if(memo[mask]!==127)return memo[mask];
    let best=-10;
    for(let remaining=full^mask;remaining;remaining&=remaining-1){
      const bit=remaining&-remaining,i=31-Math.clz32(bit);
      best=Math.max(best,evaluate(mask,i,depth));
    }
    memo[mask]=best;return best;
  }
  const value=solve(0,maxDepth);
  const moves=free.filter((_,i)=>evaluate(0,i,maxDepth)===value);
  return {value,moves};
}
export function chooseStrongAI(state,random=Math.random){
  const {moves}=analyze(state);
  return moves.length?moves[Math.min(moves.length-1,Math.floor(random()*moves.length))]:null;
}

export const DIFFICULTIES={beginner:'はじめて',normal:'ふつう',expert:'げきつよ'};
export function chooseDifficultyAI(state,difficulty='normal',random=Math.random){
  if(state.over)return null;
  if(difficulty==='beginner'){
    const free=state.edges.flatMap((edge,id)=>edge===null?[id]:[]);
    if(!free.length)return null;
    // Mostly exploratory moves, occasionally using the basic capture/safety rule.
    if(random()<.25)return chooseAI(state,random);
    return free[Math.min(free.length-1,Math.floor(random()*free.length))];
  }
  if(difficulty==='expert')return chooseStrongAI(state,random);
  const remaining=state.edges.filter(edge=>edge===null).length;
  const {moves}=analyze(state,remaining<=6?24:3);
  if(!moves.length)return null;
  const practical=chooseAI(state,random);
  return moves.includes(practical)?practical:moves[Math.min(moves.length-1,Math.floor(random()*moves.length))];
}
