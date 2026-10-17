import {createGame,play,scores,chooseAI} from '../src/game.js';
import {chooseDifficultyAI} from '../src/ai.js';
// Reproducible bot comparison; these are not estimates of human win rates.
for(const difficulty of ['beginner','normal','expert'])for(const first of ['you','ai']){
  let wins=0,seed=4321;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
  for(let game=0;game<100;game++){
    const s=createGame(game%4,first,difficulty);
    while(!s.over)play(s,s.turn==='ai'?chooseDifficultyAI(s,difficulty,random):chooseAI(s,random));
    if(scores(s).you>=5)wins++;
  }
  console.log(`${difficulty}, human side ${first==='you'?'first':'second'}: basic-rule bot won ${wins}/100`);
}
