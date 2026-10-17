import test from 'node:test';
import assert from 'node:assert/strict';
import {EDGES,BOXES,PATTERNS,createGame,play,scores,chooseAI} from '../src/game.js';
test('24 distinct edges and nine valid squares',()=>{assert.equal(new Set(EDGES.map(e=>e.id)).size,24);assert.equal(BOXES.length,9);for(const b of BOXES)assert.equal(b.length,4);});
test('all opening patterns offer a capture without a completed square',()=>{
  PATTERNS.forEach((_,i)=>{const s=createGame(i);assert.ok(BOXES.every(b=>!b.every(e=>s.edges[e])));assert.ok(BOXES.some(b=>b.filter(e=>s.edges[e]).length===3));});
});
test('capturing retains turn; noncapturing passes turn; illegal moves change nothing',()=>{
  const s=createGame();assert.deepEqual(play(s,15).captured,[0]);assert.equal(s.turn,'you');assert.equal(scores(s).you,1);
  const snapshot=JSON.stringify(s);assert.equal(play(s,15),null);assert.equal(play(s,-1),null);assert.equal(JSON.stringify(s),snapshot);
  play(s,3);assert.equal(s.turn,'ai');
});
test('a shared last edge captures both squares',()=>{
  const s=createGame();s.edges.fill(null);[0,2,12,13,15,16].forEach(e=>s.edges[e]='neutral');
  assert.deepEqual(play(s,1).captured,[0,1]);assert.equal(scores(s).you,2);assert.equal(s.turn,'you');
});
test('AI takes a box and avoids a giveaway when a safe move exists',()=>{
  const s=createGame();s.turn='ai';assert.equal(chooseAI(s,()=>0),15);play(s,15);
  const id=chooseAI(s,()=>0);play(s,id);assert.ok(BOXES.every((b,i)=>s.boxes[i]||b.filter(e=>s.edges[e]!==null).length!==3));
});
test('200 complete games preserve ownership and terminate without extra moves',()=>{
  let seed=4321;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
  for(let game=0;game<200;game++){
    const s=createGame(game%4);
    for(let step=0;!s.over&&step<24;step++){
      const free=s.edges.flatMap((v,i)=>v===null?[i]:[]);
      const id=s.turn==='ai'?chooseAI(s,random):free[Math.floor(random()*free.length)];
      assert.ok(play(s,id));
      BOXES.forEach((b,i)=>assert.equal(s.boxes[i]!==null,b.every(e=>s.edges[e]!==null)));
    }
    assert.equal(s.over,true);assert.equal(s.moves,19);assert.equal(scores(s).you+scores(s).ai,9);assert.equal(play(s,0),null);
  }
});

test('only beginner human-first has an immediate one-tile capture in all 24 openings',()=>{
  for(const difficulty of ['beginner','normal','expert'])for(const first of ['you','ai'])for(let pattern=0;pattern<4;pattern++){
    const s=createGame(pattern,first,difficulty);
    assert.equal(s.edges.filter(e=>e!==null).length,5);
    assert.ok(BOXES.every(b=>!b.every(e=>s.edges[e]!==null)));
    const gains=s.edges.flatMap((e,id)=>e===null?[play(structuredClone(s),id).captured.length]:[]);
    const tutorial=difficulty==='beginner'&&first==='you';
    assert.equal(Math.max(...gains),tutorial?1:0);
    assert.equal(gains.filter(n=>n>0).length,tutorial?1:0);
  }
});
