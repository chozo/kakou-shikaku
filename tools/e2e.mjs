import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('artifacts',{recursive:true});
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5173');
 assert.equal((await page.evaluate(()=>window.__game.getState())).phase,'title');
 assert.equal(await page.locator('#play-area').isVisible(),false);
 for(const [width,height] of [[360,640],[390,844],[1280,800]]){
   await page.setViewportSize({width,height});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`artifacts/title-${width}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 await page.click('#open-menu');
 await page.click('#menu-top');
 assert.equal(await page.locator('#title-screen').isVisible(),true);
 await page.click('#open-menu');
 await page.click('#start');
 await page.waitForFunction(()=>window.__game.audio().musicScheduled);
 await page.click('#sound');
 assert.equal(await page.evaluate(()=>window.__game.audio().musicScheduled),false);
 await page.click('#sound');
 await page.waitForFunction(()=>window.__game.audio().musicScheduled);
 await page.locator('[data-edge="15"]').click();
 assert.equal((await page.evaluate(()=>window.__game.getState())).boxes[0],'you');
 assert.match(await page.textContent('#status'),/もう一手/);
 await page.locator('[data-edge="3"]').click();
 await page.waitForFunction(()=>window.__game.getState().turn==='you');
 await page.click('#help');assert.equal(await page.locator('#help-dialog').evaluate(d=>d.open),true);
 await page.click('#understood');
 await page.screenshot({path:'artifacts/playing.png'});
 // Complete every opening through real board interactions; AI animation delays are skipped only here.
 const outcomes=new Set();
 for(let run=0;run<13;run++){
   await page.evaluate(p=>window.__game.start(p),run%4);
   for(let turn=0;turn<24;turn++){
     const s=await page.evaluate(()=>window.__game.getState());if(s.over)break;
     if(s.turn==='ai')await page.evaluate(()=>window.__game.aiStep());
     else{
       const free=s.edges.flatMap((v,i)=>v===null?[i]:[]);
       const id=run===12?await page.evaluate(async()=>{const {chooseStrongAI}=await import(new URL('src/ai.js',location.href));return chooseStrongAI(window.__game.getState(),()=>0);}):free[(run*7+turn*3)%free.length];
       await page.locator(`[data-edge="${id}"]`).click();
     }
   }
   const end=await page.evaluate(()=>window.__game.getState());assert.equal(end.over,true);assert.equal(await page.evaluate(()=>window.__game.audio().musicScheduled),false);assert.equal(end.boxes.filter(Boolean).length,9);
   await page.evaluate(()=>window.__game.finishAnimations());
   outcomes.add(await page.textContent('#result-title'));
   assert.equal(await page.locator('#result').isVisible(),true);
   assert.equal(await page.locator('#result button').count(),2);
   if(run===0){
     await page.click('#home');
     assert.equal((await page.evaluate(()=>window.__game.getState())).phase,'title');
     assert.equal(await page.locator('#title-screen').isVisible(),true);
     assert.equal(await page.evaluate(()=>window.__game.audio().musicScheduled),false);
     assert.equal(await page.locator('#open-menu').evaluate(el=>el===document.activeElement),true);
     await page.click('#open-menu');
     assert.equal((await page.evaluate(()=>window.__game.getState())).phase,'intro');
   }
 }
 assert.ok(outcomes.has('あなたの勝ち！'));
 assert.ok(outcomes.has('相手の勝ち！'));
 await page.screenshot({path:'artifacts/result.png'});
 await page.click('#menu');await page.click('#start');assert.equal((await page.evaluate(()=>window.__game.getState())).moves,0);
 await page.click('#restart');await page.click('#cancel-restart');assert.equal(await page.locator('#restart-dialog').evaluate(d=>d.open),false);
 await page.click('#restart');await page.click('#confirm-restart');assert.equal((await page.evaluate(()=>window.__game.getState())).moves,0);
 await page.evaluate(()=>window.__game.menu());await page.click('#start');
 for(const [width,height] of [[360,640],[390,844],[1280,800]]){
   await page.setViewportSize({width,height});
   const layout=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,vw:innerWidth,vh:innerHeight}));
   assert.ok(layout.w<=layout.vw,JSON.stringify(layout));assert.ok(layout.h<=layout.vh,JSON.stringify(layout));
   await page.screenshot({path:`artifacts/board-${width}.png`});
 }
 // All three difficulties and both opening players, including non-capturing CPU openings.
 for(const difficulty of ['beginner','normal','expert'])for(const first of ['you','ai'])for(let opening=0;opening<4;opening++){
   await page.evaluate(()=>window.__game.menu());
   await page.locator(`input[name="difficulty"][value="${difficulty}"] + span`).click();
   await page.locator(`input[name="first"][value="${first}"] + span`).click();
   await page.click('#start');
   if(opening)await page.evaluate(p=>window.__game.start(p),opening);
   assert.equal((await page.evaluate(()=>window.__game.getState())).turn,first);
   if(first==='ai'){
     assert.equal(await page.locator('[data-edge]').count(),0);
     await page.waitForFunction(()=>window.__game.getState().turn==='you');
     assert.ok((await page.evaluate(()=>window.__game.getState())).boxes.every(owner=>owner===null));
   }
   for(let turn=0;turn<24;turn++){
     const s=await page.evaluate(()=>window.__game.getState());if(s.over)break;
     if(s.turn==='ai')await page.evaluate(()=>window.__game.aiStep());
     else await page.locator(`[data-edge="${s.edges.indexOf(null)}"]`).click();
   }
   assert.equal((await page.evaluate(()=>window.__game.getState())).over,true);
   await page.evaluate(()=>window.__game.finishAnimations());
   await page.click('#menu');await page.click('#start');
   assert.deepEqual((await page.evaluate(()=>window.__game.getState())).settings,{difficulty,first});
   await page.evaluate(()=>window.__game.menu());
 }
 await page.reload();
 assert.deepEqual((await page.evaluate(()=>window.__game.getState())).settings,{difficulty:'expert',first:'ai'});
 // Rename migration keeps the previously saved difficulty and opening player.
 await page.evaluate(()=>{localStorage.removeItem('kakou-shikaku-settings');localStorage.setItem('tile-club-settings',JSON.stringify({difficulty:'beginner',first:'you'}));});
 await page.reload();
 assert.deepEqual((await page.evaluate(()=>window.__game.getState())).settings,{difficulty:'beginner',first:'you'});
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kakou-shikaku-settings'))),{difficulty:'beginner',first:'you'});
 assert.equal(await page.title(),'囲う□（かこうしかく）');
 await page.click('#open-menu');
 for(const [width,height] of [[360,640],[390,844],[1280,800]]){
   await page.setViewportSize({width,height});
   const fits=await page.locator('#intro').evaluate(el=>{
     const outer=el.getBoundingClientRect();return [...el.children].every(child=>{const r=child.getBoundingClientRect();return r.top>=outer.top&&r.bottom<=outer.bottom&&r.left>=outer.left&&r.right<=outer.right;});
   });
   assert.equal(fits,true,`Settings must fit at ${width}x${height}`);
   await page.screenshot({path:`artifacts/settings-${width}.png`});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: 3 difficulties × 2 opening players × 4 patterns, saved settings, captures, AI turns, all four openings, full games, retry, help, title, 360/390/1280 layouts. Outcomes:',[...outcomes]);
}finally{await browser.close();}
