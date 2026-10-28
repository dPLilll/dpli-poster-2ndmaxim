# 参数与调用

依赖 Node.js 与 `@napi-rs/canvas`。依赖由 `scripts/deps.cjs` 从技能目录的 `node_modules` 加载，缺失时自动在技能目录执行 `npm ci`。字体与图片在本地读取；无需网页服务、浏览器或网络。

```bash
node /absolute/path/to/skill/scripts/render-poster.cjs /absolute/path/to/config.json /absolute/path/to/output
```

配置相对路径均相对于 JSON 所在目录。输出目录属于本次任务，不能写入 Skill。不要在同一目录同时运行多份配置。

```json
{
  "photo": "/absolute/path/to/photo.jpg",
  "text": "当我的光\n曝在你身上，\n重逢\n就是一间暗室。",
  "author": "毕赣《路边野餐》",
  "brand": "@二流观众",
  "preset": "darkroom",
  "emphasis": -1,
  "tint": "#c90b13",
  "blend": "multiply",
  "opacity": 0.85,
  "grainOpacity": 0.23,
  "texture": "fabric"
}
```

以上引文只作参数示例，不自动填入其他用户的海报。

| 参数 | 默认与说明 |
| --- | --- |
| photo、text | 必填。本地照片路径、以换行分隔的正文。 |
| preset | `darkroom` 短文或 `monologue` 多行独白。默认前者。 |
| author、brand | 作者默认空白；账号默认 `@二流观众`，空字符串可隐藏。 |
| font | 可选 TTF/OTF 路径；缺省使用用户提供的又又意宋（`assets/fonts/YouyouYisong.ttf.gz`）。 |
| fontSize、lineHeight | 暗室默认字号 203 px；独白默认字号 127 px、行高 1.28。暗室使用 baselineStep 控制行距。 |
| emphasis | 仅用户明确要求时放大指定行，索引从 0 开始；默认 -1，不放大。新图不继承上一张的强调行。 |
| textColor | `#b4ddbe`。 |
| tint、blend、opacity | 红色 `#c90b13`、`multiply`、0.85。黑蒙版推荐 `#000000`、`normal`、0.55。 |
| brightness、contrast、saturation | 1.05、1.2、0。饱和度 0 表示灰度底片，1 保留原色。 |
| texture | `fabric` 细密织纹，或 `noise` 随机颗粒。 |
| grainOpacity、grainSize | 0.23、2 px。固定随机种子，重复生成不会改变纹理。 |
| focusX、focusY | 默认 0.5；0 到 1 控制铺满裁切时保留哪部分。 |
| crop | 可选 `[x,y,width,height]`，全部为 0 到 1 的归一化比例。只在需指定裁切时设置。 |
| signaturePosition | `bottom-left` 或 `top-right`；独白默认右上竖排。 |
| layers | `{"photo":true,"tint":true,"grain":true,"text":true}`，按需关闭图层用于对照。 |

输出固定 1200 × 1600。若用户指定其他比例，需改造版面与导出尺寸，不能仅在描述中宣称改了比例。现有参考样式为 3:4，不自动切成 9:16。

每次生成 `poster.png`、`poster.html`、`recipe.json`。HTML 中照片与纹理已内嵌，颜色蒙版独立，顶层文字是 SVG 文本。HTML 可通过改蒙版颜色和透明度作局部调整；正式修改优先重用 JSON 重渲染，保持 PNG 与 HTML 参数一致。

PNG 通过本地 Canvas 绘制，HTML 通过浏览器的 CSS 混合与 SVG 文本渲染。字号、坐标与纹理相同，但不同渲染器的字形抗锯齿可能略有差异，不宣称像素级一致。

默认字体以 gzip 无损压缩保存完整字库，渲染脚本自动解压到内存后加载；不删减字符，HTML 嵌入解压后的原字体。

## 暗室排版校准

按用户第一张参考海报的实测位置校准，默认四行正文的字块边界与参考相差约 1～2 px。仅作用于 darkroom，保留 monologue 原有排版。

| 参数 | 默认值（1200 × 1600） |
| --- | --- |
| fontSize | 203 px |
| letterSpacing | 固定 -45 px；不可由配置覆盖，字号变化时不缩放字距，PNG 与 SVG 同步 |
| bodyX | -12 px 字框起点；实际笔画左边界约 2～21 px，因字形不同而变化 |
| firstBaseline / baselineStep | 243 px / 222 px |
| authorSize / authorBaseline / authorRight | 75 px / 1264 px / 0 px |
| brandSize / brandX / brandBaseline | 68 px / -7 px / 1566 px |
| authorRule | true，署名前的两段水平装饰线；false 可关闭 |

参考正文四行实际边界（左、上、右、下）为 [21,87,688,257]、[12,305,950,483]、[15,530,343,704]、[2,753,1140,925]。署名区域为 [535,1205,1195,1272]；账号区域为 [3,1515,277,1569]。不同图片背景、抗锯齿与 JPEG 压缩会导致像素差异，不宣称像素级相同。

暗室行距以 baselineStep 为准，不用 lineHeight 调节。短文默认采用此紧字距、大字、窄页边距风格；新文案过长时检查底部碰撞，按需减小字号与 baselineStep，或选择独白版式，不直接让文字溢出。

重点文字放大是可选排版，同样适用于 `darkroom` 和 `monologue`。例如用户明确要求放大第一行时才使用 `"emphasis": 0`。emphasis 按 1.85 倍尝试放大并按宽度适配，不等同于 PSD 的实测字号；精确字号或行内局部放大使用 textLayout。

## 混排与原版账号

`textLayout` 可指定多行，每行包含 `x`、`baseline` 和 `runs`，每个 run 为 `{"text":"爱意","fontSize":400}`。同一行的 runs 共用基线，支持多个强调词。所有 runs 按序拼接必须等于 text 去掉换行后的原文。每行超宽时仅缩小字号，字距仍固定 -45 px；制作时应先调整分行和字号，避免依赖过度缩小。正文无特殊说明时，不设置大小字混排。

默认 `@二流观众` 使用内嵌原版 PNG，位置 (1,1513)，尺寸 278 × 57；`brand: ""` 隐藏账号。用户确实要求文字账号时可用 `brandMode: "text"`。自定义账号保持文本。默认图片账号固定左下角，明确要求其他位置时需要调整图片坐标。

字距是固定模板参数，优先级高于撑满画面和避免孤字。全局及逐行 letterSpacing 输入不会改变暗室正文和混排的 -45 px，导出 recipe 记录实际固定值。不得用两端对齐拉开短行，或收紧上一行来消除孤字。

正文默认禁止空行：text 不插入空白行，textLayout 不使用空 runs，也不通过 baseline 跨度人为留出空白区。按相邻行实际字形高度安排连续紧凑基线，禁止为了展示底图主体额外增大行间间隙。只有用户明确指定空行时才允许例外。
