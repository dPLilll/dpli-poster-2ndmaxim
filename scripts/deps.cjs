'use strict';
// Load npm dependencies from this skill's own node_modules (portable across agents).
// If missing, run `npm ci` once in the skill directory, then retry.
const path=require('node:path'),fs=require('node:fs'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
let installed=false;
module.exports=function dep(name){
 const load=()=>require(require.resolve(name,{paths:[root]}));
 try{return load();}catch(e){
  if(e.code!=='MODULE_NOT_FOUND'||installed)throw e;
  installed=true;
  const cmd=fs.existsSync(path.join(root,'package-lock.json'))?['ci','--no-audit','--no-fund']:['install','--no-audit','--no-fund'];
  process.stderr.write(`[quote-poster] ${name} 未安装，正在技能目录执行 npm ${cmd[0]} …\n`);
  const r=spawnSync(process.platform==='win32'?'npm.cmd':'npm',cmd,{cwd:root,stdio:['ignore','inherit','inherit']});
  if(r.status!==0)throw Error(`依赖安装失败，请在 ${root} 手动运行 npm ci`);
  return load();
 }
};
