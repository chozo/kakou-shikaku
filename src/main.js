import {EDGES,BOXES,createGame,play,scores} from './game.js';
import {chooseDifficultyAI,DIFFICULTIES} from './ai.js';
import {createAudio} from './audio.js';
const audio=createAudio();
const isPromo=new URLSearchParams(location.search).has('promo');
let manual=false,resultElapsed=0,promoEvents=[];
const $=id=>document.getElementById(id);
let settings={difficulty:'beginner',first:'you'};
try{const saved=JSON.parse(localStorage.getItem('kakou-shikaku-settings')||localStorage.getItem('tile-club-settings'));if(saved){if(saved.difficulty==='strong')saved.difficulty='normal';if(Object.hasOwn(DIFFICULTIES,saved.difficulty))settings.difficulty=saved.difficulty;if(['you','ai'].includes(saved.first))settings.first=saved.first;localStorage.setItem('kakou-shikaku-settings',JSON.stringify(settings));}}catch{}
let state=createGame(0,settings.first,settings.difficulty),phase='title',pattern=0,timer=null,sound=true,fresh=[],lastActor=null,history=[];
const pos=e=>({x1:45+e.x*90,y1:45+e.y*90,x2:45+(e.x+(e.vertical?0:1))*90,y2:45+(e.y+(e.vertical?1:0))*90});
function canUndo(){
  const count=scores(state);
  return phase==='playing'&&!state.over&&count.you<5&&count.ai<5&&history.length>0;
}
function render(){
  $('title-screen').hidden=phase!=='title';
  for(const id of ['scoreboard','play-area','game-footer'])$(id).hidden=phase==='title';
  $('menu-top').hidden=phase!=='intro';
  $('cpu-label').textContent=`CPU（${DIFFICULTIES[settings.difficulty]}）`;
  $('order-label').textContent=settings.first==='you'?'あなたが先手':'あなたが後手';
  document.querySelectorAll('#intro input[type=radio]').forEach(input=>{input.checked=input.value===settings[input.name];});
  const count=scores(state),active=phase==='playing'&&state.turn==='you'&&!state.over;
  $('you-score').innerHTML=`${count.you}<span>マス</span>`;$('ai-score').innerHTML=`${count.ai}<span>マス</span>`;
  $('remaining').textContent=`残り ${9-count.you-count.ai} マス`;
  $('turn-dot').style.background=state.turn==='you'?'var(--teal)':'var(--coral)';
  $('status').textContent=phase==='intro'?'線をつなぐ、小さな陣取り':state.over?'9マスを囲み終えました':fresh.length?`${lastActor==='you'?'あなた':'相手'}が${fresh.length}マス獲得、もう一手！`:active?'あなたの番です':'相手が考えています…';
  $('hint').textContent=phase==='intro'?'最後の1本を置いた人の陣地になります。':state.over?'最後の1本で、陣地が変わる。':state.moves===0?(settings.difficulty==='beginner'&&settings.first==='you'?'あと1本で完成する四角を探してみよう。':'まずは点と点の間に線を置いてみよう。'):active?'点と点の間をタップ。3本目の線は慎重に。':'相手が線を置くまで、ちょっとひと休み。';
  $('undo').hidden=phase==='intro';$('undo').disabled=!canUndo();
  $('intro').hidden=phase!=='intro';$('restart').hidden=phase!=='playing';
  const html=[];
  state.boxes.forEach((owner,i)=>{if(!owner)return;const x=45+i%3*90,y=45+Math.floor(i/3)*90;html.push(`<rect class="tile ${owner} ${fresh.includes(i)?'fresh':''}" x="${x+7}" y="${y+7}" width="76" height="76" rx="9" style="transform-origin:${x+45}px ${y+45}px"/><text class="tile-mark ${owner}" x="${x+45}" y="${y+45}">${owner==='you'?'○':'×'}</text>`);});
  EDGES.forEach(e=>{const p=pos(e),owner=state.edges[e.id]??'empty';html.push(`<line class="edge ${owner}" x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}"/>`);if(state.last===e.id)html.push(`<circle class="last-ring" cx="${(p.x1+p.x2)/2}" cy="${(p.y1+p.y2)/2}" r="3"/>`);});
  for(let y=0;y<4;y++)for(let x=0;x<4;x++)html.push(`<circle class="dot" cx="${45+x*90}" cy="${45+y*90}" r="5"/>`);
  if(active) EDGES.filter(e=>state.edges[e.id]===null).forEach(e=>{const p=pos(e),trim=15;html.push(`<rect class="edge-target" data-edge="${e.id}" role="button" tabindex="0" aria-label="${e.vertical?'縦':'横'}の辺、上から${e.y+1}、左から${e.x+1}" x="${p.x1+(e.vertical?-15:trim)}" y="${p.y1+(e.vertical?trim:-15)}" width="${e.vertical?30:60}" height="${e.vertical?60:30}" rx="12"/>`);});
  $('board').innerHTML=html.join('');
}
let aiWorker=null, aiRequest=0;
function cancelAI(){clearTimeout(timer);aiRequest++;aiWorker?.terminate();aiWorker=null;}
function aiTurn(){
  const request=++aiRequest;
  const finish=id=>{
    if(request!==aiRequest)return;
    aiWorker?.terminate();aiWorker=null;
    if(phase==='playing'&&!state.over&&state.turn==='ai'&&!document.hidden&&!$('help-dialog').open&&!$('restart-dialog').open)move(id);
  };
  try{
    aiWorker=new Worker(new URL('./ai-worker.js',import.meta.url),{type:'module'});
    aiWorker.onmessage=event=>{if(event.data.request===request)finish(event.data.id);};
    aiWorker.onerror=event=>{event.preventDefault();finish(chooseDifficultyAI(state,settings.difficulty));};
    aiWorker.postMessage({state,request,difficulty:settings.difficulty});
  }catch{finish(chooseDifficultyAI(state,settings.difficulty));}
}
function scheduleAI(){
  cancelAI();
  if(manual||phase!=='playing'||state.over||state.turn!=='ai'||document.hidden||$('help-dialog').open||$('restart-dialog').open)return;
  timer=setTimeout(aiTurn,450);
}
function move(id){
  if(phase!=='playing')return false;
  const before=state.turn==='you'?structuredClone(state):null;
  const result=play(state,id);if(!result)return false;
  if(before)history.push(before);
  if(manual)promoEvents.push({type:result.captured.length?'capture':'place',...result});
  fresh=result.captured;lastActor=result.actor;audio.effect(fresh.length?'capture':'place',result.actor,fresh.length);render();
  if(state.over){audio.setPlaying(false);cancelAI();resultElapsed=0;if(!manual)timer=setTimeout(showResult,850);}else scheduleAI();
  return true;
}
function undo(){
  if(!canUndo())return false;
  cancelAI();
  state=history.pop();phase='playing';fresh=[];lastActor=null;
  $('result').hidden=true;audio.stopEffects();
  render();$('status').textContent='1手戻しました。あなたの番です';
  $('board').querySelector('[data-edge]')?.focus({preventScroll:true});
  return true;
}
function showResult(){
  cancelAI();
  const first=phase!=='result';phase='result';const s=scores(state);
  audio.setPlaying(false);if(first)audio.effect(s.you>s.ai?'win':'lose');
  $('result-title').textContent=s.you>s.ai?'あなたの勝ち！':'相手の勝ち！';
  $('result-detail').textContent=`あなた ${s.you}マス · 相手 ${s.ai}マス ／ ${s.you*100}点`;
  $('result').hidden=false;$('restart').hidden=true;$('menu').focus();
}
function start(next=pattern){
  audio.unlock();audio.setPlaying(true);audio.effect('start');
  cancelAI();history=[];pattern=next;state=createGame(pattern,settings.first,settings.difficulty);phase='playing';fresh=[];lastActor=null;$('result').hidden=true;render();
  $('board').querySelector('[data-edge]')?.focus({preventScroll:true});
  scheduleAI();
}
function navigate(destination){
  audio.setPlaying(false);audio.stopEffects();cancelAI();history=[];phase=destination;
  state=createGame(pattern,settings.first,settings.difficulty);fresh=[];lastActor=null;
  $('result').hidden=true;render();$(destination==='title'?'open-menu':'start').focus();
}
function home(){navigate('title');}
function menu(){navigate('intro');}
$('board').addEventListener('click',e=>{const target=e.target.closest('[data-edge]');if(target&&state.turn==='you')move(Number(target.dataset.edge));});
$('board').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-edge]')){e.preventDefault();if(state.turn==='you'){move(Number(e.target.dataset.edge));$('board').querySelector('[data-edge]')?.focus({preventScroll:true});}}});
$('intro').addEventListener('change',event=>{
  const input=event.target;if(phase!=='intro'||!['difficulty','first'].includes(input.name))return;
  settings[input.name]=input.value;
  try{localStorage.setItem('kakou-shikaku-settings',JSON.stringify(settings));}catch{}
  state=createGame(pattern,settings.first,settings.difficulty);render();
});
$('undo').onclick=undo;
$('start').onclick=()=>start();
$('open-menu').onclick=menu;$('menu').onclick=menu;$('home').onclick=home;$('menu-top').onclick=home;
$('help').onclick=()=>{cancelAI();$('help-dialog').showModal();};
for(const id of ['close-help','understood'])$(id).onclick=()=>$('help-dialog').close();
$('help-dialog').addEventListener('close',()=>{if(state.over&&phase==='playing')showResult();else scheduleAI();});
$('restart').onclick=()=>{cancelAI();$('restart-dialog').showModal();};
$('cancel-restart').onclick=()=>$('restart-dialog').close();
$('confirm-restart').onclick=()=>{$('restart-dialog').close();start();};
$('restart-dialog').addEventListener('close',()=>{if(state.over&&phase==='playing')showResult();else scheduleAI();});
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'音 ON':'音 OFF';$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'音をオフにする':'音をオンにする');audio.setEnabled(sound);};
document.addEventListener('visibilitychange',()=>{audio.setHidden(document.hidden);if(document.hidden){cancelAI();}else if(state.over&&phase==='playing')showResult();else scheduleAI();});
// Deterministic controls for rule checks and browser QA; no game state is stored on a server.
window.__game={undo,audio:()=>audio.getState(),getState:()=>structuredClone({...state,phase,pattern,canUndo:canUndo(),settings:{...settings}}),start,move:id=>{cancelAI();return move(id);},aiStep:()=>{cancelAI();if(state.turn==='ai')return move(chooseDifficultyAI(state,settings.difficulty,()=>0));},finishAnimations:()=>{if(state.over)showResult();},home,menu};
render();

// Recording controls advance only when the promo renderer asks for a frame.
if(isPromo){
  Object.assign(window.__game,{
    manual(on){manual=on;cancelAI();if(!on)scheduleAI();},
    step(dt){if(manual&&state.over&&phase==='playing'){resultElapsed+=dt;if(resultElapsed>=.85)showResult();}},
    state:window.__game.getState,
    drainEvents(){const events=promoEvents;promoEvents=[];return events;},
  });
  Object.assign(window.__game.audio,{capture:audio.capture,drain:audio.drain,render:audio.render});
}
