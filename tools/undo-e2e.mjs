import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:360,height:640}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__game.getState());
try{
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5173');
 await page.click('#open-menu');
  await page.locator('input[name="difficulty"][value="beginner"] + span').click();
  await page.click('#start');
  const initial=await state();assert.equal(await page.locator('#undo').isDisabled(),true);
  await page.locator('[data-edge="15"]').click();
  await page.evaluate(()=>window.__game.move(15)); // Illegal moves must not add history.
  await page.click('#undo');assert.deepEqual(await state(),initial);
  assert.equal(await page.locator('#undo').isDisabled(),true);
  await page.locator('[data-edge="15"]').click();
  const afterCapture=await state();
  await page.locator('[data-edge="3"]').click();
  await page.click('#undo');assert.deepEqual(await state(),afterCapture);
  // Wait beyond the AI delay: stale timers must not place a line after undo.
  await page.waitForTimeout(800);assert.deepEqual(await state(),afterCapture);
  await page.locator('[data-edge="3"]').click();
  await page.waitForFunction(()=>window.__game.getState().turn==='you');
  await page.click('#undo');assert.deepEqual(await state(),afterCapture);
  await page.click('#undo');assert.deepEqual(await state(),initial);
  let checkedDecided=false;
  for(let turn=0;turn<24;turn++){
    const s=await state();
    if(s.boxes.filter(x=>x==='you').length>=5||s.boxes.filter(x=>x==='ai').length>=5){
      assert.equal(s.canUndo,false);assert.equal(await page.locator('#undo').isDisabled(),true);
      assert.equal(await page.evaluate(()=>window.__game.undo()),false);
      assert.deepEqual(await state(),s);checkedDecided=true;
    }
    if(s.over)break;
    if(s.turn==='ai')await page.evaluate(()=>window.__game.aiStep());
    else{await page.locator(`[data-edge="${s.edges.indexOf(null)}"]`).click();}
  }
  assert.equal((await state()).over,true);
  await page.evaluate(()=>window.__game.finishAnimations());
  const finalState=await state();
  assert.equal(checkedDecided,true);
  assert.equal(await page.locator('#undo').isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.__game.undo()),false);
  assert.deepEqual(await state(),finalState);
  assert.equal(await page.locator('#result').isVisible(),true);
  assert.equal(await page.evaluate(()=>window.__game.audio().musicScheduled),false);
  await page.screenshot({path:'artifacts/undo-360.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));
  await page.click('#menu');await page.click('#start');
  assert.equal(await page.locator('#undo').isDisabled(),true);
  await page.evaluate(()=>window.__game.menu());
  await page.locator('input[name="first"][value="ai"] + span').click();
  await page.click('#start');assert.equal(await page.locator('#undo').isDisabled(),true);
  await page.waitForFunction(()=>window.__game.getState().turn==='you');
  const cpuOpening=await state();assert.equal(await page.locator('#undo').isDisabled(),true);
  await page.locator(`[data-edge="${cpuOpening.edges.indexOf(null)}"]`).click();
  await page.click('#undo');assert.deepEqual(await state(),cpuOpening);
  assert.deepEqual(errors,[]);
  console.log('PASS: capture rollback, illegal move, CPU pending/completed response, repeated undo, undo blocked at 5 tiles and after result, history reset, CPU opening preserved, 360px layout.');
}finally{await browser.close();}
