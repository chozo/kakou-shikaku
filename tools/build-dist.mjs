import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
const output=new URL('../dist/',import.meta.url);
await rm(output,{recursive:true,force:true});
await mkdir(new URL('kakou-shikaku/src/',output),{recursive:true});
for(const file of ['index.html','src/game.js','src/main.js','src/audio.js','src/ai.js','src/ai-worker.js','src/style.css']){
  await copyFile(new URL('../'+file,import.meta.url),new URL('kakou-shikaku/'+file,output));
}
// public/ のファイル（favicon.svg・ogp.png）はそのままの名前で公開ルートに置く
await cp(new URL('../public/',import.meta.url),new URL('kakou-shikaku/',output),{recursive:true});
console.log('Built public files in dist/kakou-shikaku/');
