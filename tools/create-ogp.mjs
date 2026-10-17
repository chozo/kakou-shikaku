import {chromium} from 'playwright-core';
import {fileURLToPath} from 'node:url';
// Original vector artwork, rendered to PNG for social sharing.
let board='';
const cells=[[0,0,'#d6e9df','○'],[1,0,'#f4dfcd','×'],[0,1,'#d6e9df','○'],[1,1,'#b8ded0','○']];
for(const [x,y,color,mark] of cells)board+=`<rect x="${40+x*110+9}" y="${40+y*110+9}" width="92" height="92" rx="13" fill="${color}"/><text x="${95+x*110}" y="${98+y*110}" text-anchor="middle" dominant-baseline="central" font-size="36" fill="${mark==='○'?'#177d77':'#c96345'}" opacity=".6">${mark}</text>`;
for(let y=0;y<4;y++)for(let x=0;x<3;x++){const solid=y<3&&x<2;board+=`<path d="M${40+x*110} ${40+y*110}h110" stroke="${solid?(y===0&&x===1?'#c96345':'#177d77'):'#dce2d6'}" stroke-width="${solid?10:3}" ${solid?'':'stroke-dasharray="2 9"'}/>`;}
for(let y=0;y<3;y++)for(let x=0;x<4;x++){const solid=y<2&&x<3;board+=`<path d="M${40+x*110} ${40+y*110}v110" stroke="${solid?(x===2&&y===0?'#c96345':'#177d77'):'#dce2d6'}" stroke-width="${solid?10:3}" ${solid?'':'stroke-dasharray="2 9"'}/>`;}
// Highlight the final edge of the newly claimed central square.
board+='<path d="M150 260h110" stroke="#177d77" stroke-width="24" opacity=".15"/><path d="M150 260h110" stroke="#177d77" stroke-width="10"/><circle cx="205" cy="260" r="5" fill="#fffdf6"/>';
for(let y=0;y<4;y++)for(let x=0;x<4;x++)board+=`<circle cx="${40+x*110}" cy="${40+y*110}" r="7" fill="#46584e"/>`;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await page.setContent(`<!doctype html><html lang="ja"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:radial-gradient(ellipse at 0 0,#e2eadb,transparent 65%),radial-gradient(ellipse at 100% 100%,#eedfcb,transparent 60%),#f6f3ea;color:#273b38;font-family:"Hiragino Kaku Gothic ProN",sans-serif}.frame{position:absolute;inset:27px;border:1px solid #cfd7c8;border-radius:28px}.copy{position:absolute;left:76px;top:100px}.brand{font-size:16px;letter-spacing:4px;color:#64776a;font-weight:700;margin:0 0 41px}h1{font-size:112px;letter-spacing:3px;line-height:1.3;margin:0;font-weight:800}.reading{font-size:19px;letter-spacing:8px;color:#77817b;margin:9px 0 40px}.tagline{font-size:29px;font-weight:700;letter-spacing:1px;margin:0;white-space:nowrap}.note{margin-top:38px;display:inline-block;border:1px solid #c9d8ca;border-radius:30px;padding:11px 19px;color:#527065;font-size:16px;letter-spacing:2px}.board{position:absolute;right:64px;top:90px;width:442px;height:450px;border-radius:30px;background:#fffdf6;border:1px solid #e0e4d5;box-shadow:0 20px 40px #4351360c;padding:16px}svg{width:410px;height:410px;stroke-linecap:round}</style><div class="frame"></div><div class="copy"><p class="brand">KAKOU SHIKAKU</p><h1>囲う□</h1><p class="reading">かこうしかく</p><p class="tagline">最後の1辺で、陣地を獲得！</p><p class="note">時間制限なしのCPU対戦</p></div><div class="board"><svg viewBox="0 0 410 410">${board}</svg></div></html>`);
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:fileURLToPath(new URL('../public/ogp.png',import.meta.url))});
 console.log('Created public/ogp.png (1200 × 630)');
}finally{await browser.close();}
