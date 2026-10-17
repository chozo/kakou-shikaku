// Small mastering trim for this soundtrack after the shared recorder's limiter.
import {spawnSync} from 'node:child_process';
import {renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import ffmpeg from 'ffmpeg-static';
if(!Number(process.env.PROMO_EVERY||0)){
 const root=new URL('../../../video/',import.meta.url);
 const target=fileURLToPath(new URL('kakou-shikaku-promo.mp4',root));
 const temp=fileURLToPath(new URL('work/final.mp4',root));
 const wav=fileURLToPath(new URL('work/mixed.wav',root));
 const run=args=>{const r=spawnSync(ffmpeg,['-hide_banner','-y',...args],{encoding:'utf8',maxBuffer:1<<24});if(r.status!==0)throw new Error(r.stderr);return r.stderr;};
 run(['-i',target,'-i',wav,'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','volume=0.3dB','-c:a','aac','-b:a','192k','-ar','44100','-shortest','-movflags','+faststart',temp]);
 const report=run(['-i',temp,'-af','ebur128=peak=true,volumedetect','-f','null','-']);
 const loud=Number(report.match(/Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/)[1]);
 const peak=Number(report.match(/True peak:\s+Peak:\s+(-?[\d.]+) dBFS/)[1]);
 if(Math.abs(loud+14)>1||peak> -1||peak< -2)throw new Error(`Mastering outside target: ${loud} LUFS / ${peak} dBTP`);
 renameSync(temp,target);
 console.log(`Final master: ${loud} LUFS / ${peak} dBTP`);
}
