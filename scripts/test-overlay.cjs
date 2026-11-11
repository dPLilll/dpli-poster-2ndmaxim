'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {createCanvas,loadImage}=require('./deps.cjs')('@napi-rs/canvas');
(async()=>{
 const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'quote-overlay-'));
 try{
  const canvas=createCanvas(1200,1600),ctx=canvas.getContext('2d');ctx.fillStyle='#b54434';ctx.fillRect(0,0,1200,1600);const photo=path.join(tmp,'bg.png');fs.writeFileSync(photo,canvas.toBuffer('image/png'));
  const base=JSON.parse(fs.readFileSync(path.join(root,'examples/configs/darkroom.json')));
  let samples=[];
  for(const [i,opacity] of [undefined,0,0.6].entries()){
   const cfg={...base,photo,backgroundTreatment:'preserve',outputName:'overlay',...(opacity===undefined?{}:{blackOverlayOpacity:opacity})};const file=path.join(tmp,`${i}.json`),out=path.join(tmp,`${i}`);fs.writeFileSync(file,JSON.stringify(cfg));
   execFileSync(process.execPath,[path.join(root,'scripts/render-poster.cjs'),file,out]);
   ctx.clearRect(0,0,1200,1600);ctx.drawImage(await loadImage(path.join(out,'overlay.png')),0,0);samples.push(ctx.getImageData(1100,1450,1,1).data);
  }
  assert.deepEqual(Array.from(samples[1]),[181,68,52,255]);
  for(const [i,scale] of [[0,0.7],[2,0.4]])for(let c=0;c<3;c++)assert.ok(Math.abs(samples[i][c]-samples[1][c]*scale)<2,'Background pixel must match black compositing');
  const cfg={...base,photo,blackOverlayOpacity:1.1};const file=path.join(tmp,'invalid.json');fs.writeFileSync(file,JSON.stringify(cfg));assert.throws(()=>execFileSync(process.execPath,[path.join(root,'scripts/render-poster.cjs'),file,path.join(tmp,'invalid')],{stdio:'pipe'}));
  console.log('PASS black overlay: default, disabled, custom opacity pixels; invalid opacity rejected');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
