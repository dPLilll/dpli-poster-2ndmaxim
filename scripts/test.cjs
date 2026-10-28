#!/usr/bin/env node
'use strict';
// Smoke test: render + automatic verification for every example config,
// once with default per-folder _assets copies and once with sharedFontDir (fonts stored once, unmodified).
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'examples/configs'),outRoot=path.join(root,'test-output');
fs.rmSync(outRoot,{recursive:true,force:true});
const size=d=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).reduce((s,e)=>s+(e.isDirectory()?size(path.join(d,e.name)):fs.statSync(path.join(d,e.name)).size),0):0;
const mb=n=>(n/1024/1024).toFixed(2)+' MB';
let failed=0;
function run(cfgFile,out,label){
 const r=spawnSync(process.execPath,[path.join(__dirname,'render-poster.cjs'),cfgFile,out],{encoding:'utf8'});
 let status='failed';try{status=JSON.parse(JSON.parse(r.stdout.trim().split('\n').pop()).verification).automaticStatus;}catch{}
 const ok=r.status===0&&status==='passed';if(!ok)failed++;
 console.log(`${ok?'PASS':'FAIL'} ${label} (automaticStatus: ${status})`);if(!ok)console.log(r.stderr||r.stdout);
}
const configs=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort();
// 1) default: fonts copied into <out>/_assets
const outA=path.join(outRoot,'default/成品');
for(const f of configs)run(path.join(dir,f),outA,`${f} [default _assets]`);
// 2) sharedFontDir: temporary configs next to the examples so relative photo paths still resolve
const tmp=fs.mkdtempSync(path.join(dir,'.tmp-'));
try{
 for(const f of configs){
  const cfg=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
  if(cfg.photo)cfg.photo=path.relative(tmp,path.join(dir,cfg.photo));
  cfg.sharedFontDir=path.relative(tmp,path.join(outRoot,'shared/fonts'));
  const file=path.join(tmp,f);fs.writeFileSync(file,JSON.stringify(cfg,null,2));
  run(file,path.join(outRoot,'shared/成品'),`${f} [sharedFontDir]`);
 }
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
// 3) 句号水印：示例浅绿配置不含「。」，借用红黑示例正文生成一张含句号的浅绿图，覆盖浅绿版水印
const tmp2=fs.mkdtempSync(path.join(dir,'.tmp-'));
try{
 const mint=JSON.parse(fs.readFileSync(path.join(dir,'mint.json'),'utf8')),dark=JSON.parse(fs.readFileSync(path.join(dir,'darkroom.json'),'utf8'));
 const cfg={...mint,outputName:'03_句号水印_浅绿',originalText:dark.originalText,text:dark.text,lines:dark.lines,author:dark.author,workTitle:dark.workTitle,credits:dark.credits,backgroundText:[dark.author,dark.workTitle],emphasis:dark.emphasis};
 const file=path.join(tmp2,'period-mint.json');fs.writeFileSync(file,JSON.stringify(cfg,null,2));
 run(file,path.join(outRoot,'period/成品'),'period-mint [句号水印]');
}finally{fs.rmSync(tmp2,{recursive:true,force:true});}
console.log(`default output folder: ${mb(size(outA))}`);
console.log(`sharedFontDir output folder: ${mb(size(path.join(outRoot,'shared/成品')))} (+ shared fonts ${mb(size(path.join(outRoot,'shared/fonts')))}, stored once)`);
process.exitCode=failed?1:0;
