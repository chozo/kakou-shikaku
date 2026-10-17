import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,play,scores,chooseAI} from '../src/game.js';
import {analyze,chooseStrongAI} from '../src/ai.js';

// Independent oracle uses the normal game rules and explicit owners, not bit masks.
function brute(s,actor){
  if(s.over){const n=scores(s);return n[actor]-n[actor==='you'?'ai':'you'];}
  const values=s.edges.flatMap((owner,id)=>{
    if(owner!==null)return [];
    const next=structuredClone(s);play(next,id);return [brute(next,actor)];
  });
  return s.turn===actor?Math.max(...values):Math.min(...values);
}
test('exact AI matches independent endgame search including extra turns',()=>{
  let seed=7;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
  for(let run=0;run<20;run++){
    const s=createGame(run%4);
    while(s.edges.filter(v=>v===null).length>6){const free=s.edges.flatMap((v,i)=>v===null?[i]:[]);play(s,free[Math.floor(random()*free.length)]);}
    const before=JSON.stringify(s),actor=s.turn,n=scores(s),other=actor==='you'?'ai':'you';
    const expected=brute(s,actor);
    const result=analyze(s);assert.equal(n[actor]-n[other]+result.value,expected);
    for(const id of result.moves){const next=structuredClone(s);play(next,id);assert.equal(brute(next,actor),expected);}
    assert.equal(JSON.stringify(s),before);
  }
});
test('strong CPU never gives up its optimal guaranteed result against old heuristic',()=>{
  for(let pattern=0;pattern<4;pattern++){
    const s=createGame(pattern,'ai','expert');const guaranteed=analyze(s).value;
    while(!s.over)play(s,s.turn==='ai'?chooseStrongAI(s,()=>0):chooseAI(s,()=>0));
    const n=scores(s);assert.ok(n.ai-n.you>=guaranteed);
    assert.equal(chooseStrongAI(s),null);
  }
});

test('difficulty dispatch and either opening player preserve legal play',async()=>{
  const {chooseDifficultyAI}=await import('../src/ai.js');
  for(const first of ['you','ai'])for(const difficulty of ['beginner','normal','expert']){
    const s=createGame(0,first,difficulty);assert.equal(s.turn,first);
    while(!s.over){
      const id=chooseDifficultyAI(s,difficulty,()=>0);
      assert.equal(s.edges[id],null);
      if(difficulty==='expert'||(difficulty==='normal'&&s.edges.filter(e=>e===null).length<=6))assert.ok(analyze(s).moves.includes(id));
      assert.ok(play(s,id));
    }
    assert.equal(chooseDifficultyAI(s,difficulty),null);
  }
});

test('beginner has both basic-rule and random exploratory moves',async()=>{
  const {chooseDifficultyAI}=await import('../src/ai.js');
  const s=createGame(0,'you','beginner');s.turn='ai';
  assert.equal(chooseDifficultyAI(s,'beginner',()=>0),15);
  const id=chooseDifficultyAI(s,'beginner',()=>.99);assert.notEqual(id,15);assert.equal(play(s,id).captured.length,0);
});
test('normal and expert openings have only a one-tile first-player advantage',()=>{
  for(const difficulty of ['normal','expert'])for(let pattern=0;pattern<4;pattern++)assert.equal(analyze(createGame(pattern,'you',difficulty)).value,1);
});
