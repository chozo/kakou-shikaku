export const config={
 slug:'kakou-shikaku',url:'https://game.chozo.net/kakou-shikaku/',
 orientation:'portrait',game:{width:390,height:640},
 layout:{centerX:.50,centerY:.55,maxW:.90,maxH:.78},
 background:'radial-gradient(ellipse at 10% 10%,#cfdfcd,transparent 60%),radial-gradient(ellipse at 90% 80%,#eed8c5,transparent 55%),#f6f3ea',
 music:{synth:{bpm:112,gain:.16,roots:[130.81,110,174.61,98]}},
};
const moves=[15,4,8,17,7,6,23,21,19,16,5,18,9,22,11,10,2,3,13];
export default async function(p){
 await p.seed(44);
 let accent=false;
 p.on('capture',e=>{if(accent&&e.actor==='you'){p.fx(e.captured.length===2?'＋2マス':'＋1マス',{x:.50,y:.86,size:39,dur:.7,color:'#177d77'});if(e.captured.length===2)p.flash({strength:.22,dur:.18,color:'#e0eee4'});}});
 // Replay legal moves from a real beginner game; no scores or boxes are fabricated.
 await p.call('start',0);
 for(const id of moves.slice(0,15))await p.call('move',id);
 await p.skip(.1);
 accent=true;
 p.zoom(1.03,.2,{x:.50,y:.55});
 p.caption('一手で、2マス！',{y:.075,size:38,dur:1.9,color:'#273b38'});
 await p.wait(.35);await p.call('move',10);await p.wait(1.65);
 p.zoom(1,.25);
 p.title({title:'囲う□',sub:'最後の1辺で、\n陣地を獲得！',dur:3});await p.wait(3);
 await p.call('start',0);
 p.caption('点と点の間をタップ',{y:.075,size:34,dur:1.45,color:'#273b38'});
 await p.wait(.5);await p.call('move',15);await p.wait(1);
 p.caption('囲めたら、もう一手！',{y:.075,size:34,dur:1.5,color:'#273b38'});
 await p.call('move',4);await p.wait(1.5);
 p.caption('CPUと陣取り勝負',{y:.075,size:36,dur:2.5,color:'#273b38'});
 for(const id of moves.slice(2,10)){await p.call('move',id);await p.wait(.625);}
 p.caption('つなげて、連続獲得！',{y:.075,size:34,dur:3.2,color:'#273b38'});
 for(const id of moves.slice(10,13)){await p.call('move',id);await p.wait(1.1);}
 await p.call('move',22);await p.wait(.7);
 p.caption('この1辺が、決め手。',{y:.075,size:34,dur:3,color:'#273b38'});
 await p.call('move',11);await p.wait(.75);await p.call('move',10);await p.wait(2.25);
 p.caption('最後まで、気を抜かず',{y:.075,size:34,dur:2.8,color:'#273b38'});
 for(const id of moves.slice(16)){await p.call('move',id);await p.wait(1);}
 p.caption('多く囲んだ方の勝ち！',{y:.075,size:34,dur:2,color:'#273b38'});
 await p.wait(2);
 await p.call('menu');
 p.caption('強さは3段階',{y:.075,size:34,dur:2,color:'#273b38'});await p.wait(2);
 p.endCard({title:'囲う□',sub:'最後の1辺で、\n陣地を獲得！',cta:'今すぐ遊べる！',dur:3});
 await p.wait(Math.max(0,30-p.time));
}
