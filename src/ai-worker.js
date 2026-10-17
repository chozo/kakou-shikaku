import {chooseDifficultyAI} from './ai.js';
self.onmessage=({data:{state,request,difficulty}})=>{
  self.postMessage({id:chooseDifficultyAI(state,difficulty),request});
};
