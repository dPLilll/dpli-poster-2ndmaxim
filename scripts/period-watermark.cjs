'use strict';
// 句号水印：在正文每个「。」的内孔里放入 assets/period-er.png（「贰」）。
// 句号本身不放大、不改笔画；水印按实际渲染出的内孔尺寸缩放，与圆环保持 ≥ clearance px 的间隙。
// 渲染器与验收器共用本模块，保证测量与缩放方式一致。
const INK=8; // alpha > 8/255 视为可见墨迹（圆环与水印都用此阈值，判定偏保守）

// 在离屏画布上按渲染器相同方式（fill + stroke，线宽 size×0.009）绘制单个「。」，测量其内孔。
function measureHole(createCanvas,font,size,x,y){
 const pad=Math.ceil(size*.05)+4,probe=createCanvas(4,4).getContext('2d');probe.font=`${size}px ${font}`;
 const m=probe.measureText('。'),sw=size*.009;
 const ox=Math.floor(x-m.actualBoundingBoxLeft-sw)-pad,oy=Math.floor(y-m.actualBoundingBoxAscent-sw)-pad;
 const w=Math.ceil(x+m.actualBoundingBoxRight+sw)+pad-ox,h=Math.ceil(y+m.actualBoundingBoxDescent+sw)+pad-oy;
 const cv=createCanvas(w,h),g=cv.getContext('2d');g.font=`${size}px ${font}`;g.fillStyle='#000';g.strokeStyle='#000';g.lineWidth=sw;
 g.fillText('。',x-ox,y-oy);g.strokeText('。',x-ox,y-oy);
 const a=g.getImageData(0,0,w,h).data,ring=new Uint8Array(w*h);for(let i=0;i<w*h;i++)ring[i]=a[i*4+3]>INK?1:0;
 // 外部区域：从画布边缘泛洪；剩下未被触及的非墨迹像素即内孔
 const outside=new Uint8Array(w*h),stack=[];
 const push=i=>{if(!ring[i]&&!outside[i]){outside[i]=1;stack.push(i);}};
 for(let X=0;X<w;X++){push(X);push((h-1)*w+X);}for(let Y=0;Y<h;Y++){push(Y*w);push(Y*w+w-1);}
 while(stack.length){const i=stack.pop(),X=i%w,Y=(i-X)/w;if(X>0)push(i-1);if(X<w-1)push(i+1);if(Y>0)push(i-w);if(Y<h-1)push(i+w);}
 const hole=new Uint8Array(w*h);let n=0,sx=0,sy=0,minX=w,minY=h,maxX=-1,maxY=-1;
 for(let i=0;i<w*h;i++)if(!ring[i]&&!outside[i]){hole[i]=1;n++;const X=i%w,Y=(i-X)/w;sx+=X;sy+=Y;minX=Math.min(minX,X);maxX=Math.max(maxX,X);minY=Math.min(minY,Y);maxY=Math.max(maxY,Y);}
 if(!n)throw Error('句号水印：未测到「。」内孔');
 // 每个内孔像素到最近圆环像素中心的距离（与 scipy distance_transform_edt 相同定义）
 const edge=[];for(let i=0;i<w*h;i++)if(ring[i]){const X=i%w,Y=(i-X)/w;if((X>0&&hole[i-1])||(X<w-1&&hole[i+1])||(Y>0&&hole[i-w])||(Y<h-1&&hole[i+w])||(X>0&&Y>0&&hole[i-w-1])||(X<w-1&&Y>0&&hole[i-w+1])||(X>0&&Y<h-1&&hole[i+w-1])||(X<w-1&&Y<h-1&&hole[i+w+1]))edge.push([X,Y]);}
 const dist=new Float32Array(w*h);for(let i=0;i<w*h;i++)if(hole[i]){const X=i%w,Y=(i-X)/w;let d=Infinity;for(const [ex,ey] of edge){const q=(ex-X)**2+(ey-Y)**2;if(q<d)d=q;}dist[i]=Math.sqrt(d);}
 return {ox,oy,w,h,hole,outside,dist,area:n,cx:ox+sx/n,cy:oy+sy/n,bbox:{left:ox+minX,top:oy+minY,right:ox+maxX+1,bottom:oy+maxY+1}};
}

// 面积平均缩小（盒式滤波，按覆盖面积加权），只取 alpha 通道；颜色由调用方按版本文字色着色。
function downsampleAlpha(src,sw,sh,w,h){
 const weights=(S,D)=>{const r=S/D,out=[];for(let i=0;i<D;i++){const a=i*r,b=(i+1)*r,list=[];for(let s=Math.floor(a);s<Math.min(S,Math.ceil(b));s++){const wt=Math.min(b,s+1)-Math.max(a,s);if(wt>0)list.push([s,wt/r]);}out.push(list);}return out;};
 const wx=weights(sw,w),wy=weights(sh,h),tmp=new Float32Array(w*sh),out=new Uint8ClampedArray(w*h);
 for(let y=0;y<sh;y++)for(let x=0;x<w;x++){let v=0;for(const [s,wt] of wx[x])v+=src[(y*sw+s)*4+3]*wt;tmp[y*w+x]=v;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(const [s,wt] of wy[y])v+=tmp[s*w+x]*wt;out[y*w+x]=Math.round(v);}
 return out;
}

// 返回该尺寸下水印墨迹与圆环的最小间隙（px，按像素中心距离 −0.5 计）；任一墨迹像素不在内孔内则返回 -1。
function gapAt(hole,alpha,w,h,X,Y){
 let g=Infinity;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(alpha[y*w+x]<=INK)continue;const hx=X-hole.ox+x,hy=Y-hole.oy+y;if(hx<0||hy<0||hx>=hole.w||hy>=hole.h)return -1;const i=hy*hole.w+hx;if(!hole.hole[i])return -1;g=Math.min(g,hole.dist[i]-.5);}
 return g;
}

// 在内孔中放入尽可能大的水印：等比缩放，位置以内孔重心为中心、允许 ±3 px 微调，间隙 ≥ clearance。
function fit(hole,src,sw,sh,clearance){
 let best=null;const maxW=Math.ceil(hole.bbox.right-hole.bbox.left);
 for(let w=4;w<=maxW;w++){
  const h=Math.max(1,Math.round(w*sh/sw)),alpha=downsampleAlpha(src,sw,sh,w,h);let pick=null;
  for(let dx=-3;dx<=3;dx++)for(let dy=-3;dy<=3;dy++){const X=Math.round(hole.cx-w/2)+dx,Y=Math.round(hole.cy-h/2)+dy,g=gapAt(hole,alpha,w,h,X,Y);if(g>=clearance&&(!pick||Math.abs(dx)+Math.abs(dy)<pick.off))pick={x:X,y:Y,gap:g,off:Math.abs(dx)+Math.abs(dy)};}
  if(pick)best={x:pick.x,y:pick.y,w,h,gap:pick.gap,alpha};
 }
 if(!best)throw Error('句号水印：内孔过小，放不下水印');
 return best;
}
// 以 fit 得到的 1 px 间隙尺寸为基准，按 scale 等比放大，中心不变；scale>1 时笔画伸到圆环下方（渲染时「。」后画，圆环压在字上）。
function scaleMark(base,src,sw,sh,scale){
 const w=Math.max(1,Math.round(base.w*scale)),h=Math.max(1,Math.round(w*sh/sw)),cx=base.x+base.w/2,cy=base.y+base.h/2;
 return {x:Math.round(cx-w/2),y:Math.round(cy-h/2),w,h,alpha:downsampleAlpha(src,sw,sh,w,h)};
}
// 放大后的水印墨迹是否全部落在「。」外轮廓以内（内孔或圆环上，不溢出到句号外）。
function withinPeriod(hole,alpha,w,h,X,Y){
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(alpha[y*w+x]<=INK)continue;const hx=X-hole.ox+x,hy=Y-hole.oy+y;if(hx<0||hy<0||hx>=hole.w||hy>=hole.h||hole.outside[hy*hole.w+hx])return false;}
 return true;
}
module.exports={INK,withinPeriod,measureHole,downsampleAlpha,gapAt,fit,scaleMark};
