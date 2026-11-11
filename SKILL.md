---
name: quote-poster
description: >-
  二流名言，Audience2 品牌的歌词和金句海报，支持红黑照片底绿字、浅绿织纹底红字两种版本。每次新制作先让用户选择版本，输出 PNG、可编辑分层
  HTML 和参数 JSON。用于“二流名言”、歌词海报、金句图、“把这句话/这句歌词做张图”、暗房海报、红黑颗粒海报、浅绿歌词海报及使用这套模板出图的请求。
metadata:
  version: "1.7.3"
  brand: "Audience2"
---
# 二流名言（quote-poster）

品牌：Audience2。下文路径均相对本技能目录（本文件所在目录）。更新记录见 `CHANGELOG.md`。详细规则已拆分到 `references/`，每个判断步骤前必须先读对应文件；**下列硬约束任何时候都适用，不可自行放宽**。

## 硬约束

- **版本必须由用户选**：新制作先在对话中问“这次用哪个版本？① 红黑底绿字（darkroom），② 浅绿底红字（mint）。”未选不得默认，不以图片色彩或上次选择代替；本次已指定、或在改同一张图时沿用；明确要两版就都做。
- **先确认后出图**：正文实际断行、实际标点、放大词（正文下方用三级标题单列）和完整来源先给用户确认，确认后才渲染；改文字、断行、标点或强调都要重新确认。讨论规则不等于出图授权。
- **默认简体，不换字体**：默认 `scriptMode: simplified`（繁体也先转简体再确认）；只有用户明确要求保留繁体/逐字不改才 `preserve`。正文与来源只用又又意宋，浅绿背景字只用京華老宋体 v3.0；用户明确指定新字体才填 `font` + `fontChangeConfirmed: true`。缺字时停止并列出缺字，不回退系统字体、不出方框。
- **字体文件不得修改**：不对两款字体做子集化、转 woff/woff2 或任何改写（授权禁止），只可原样复制或引用。见 `references/font-licensing.md`。
- **排版数值固定**：正文字距 −45 px；强调字 1.55 倍；小字视觉行距以 14 px 可见空隙为参照；正文位于顶部 1200 × 1200 框内、四周至少 8 px、无越界与碰撞；来源右边界 x=1190、上沿 y=1200、来源字距 −4.666667 px、不拉伸；Logo 用原图（红黑 `assets/watermark-exact.png`，浅绿 `assets/logo-red.png`）放 (2,1513)、278 × 57，不重绘；正文每个「。」默认在内孔放句号水印 `assets/period-er.png`（「贰」，以实测内孔 1 px 间隙尺寸为基准、默认放大 `periodWatermarkScale: 1.35` 倍，着正文色；图层在「。」下方：先画贰、再画句号，圆环压在字上，不做镂空），句号本身不放大不改，仅 `periodWatermark: false` 可关闭。
- **保字保序**：原文字词与顺序必须保留；默认每张都有符合句意的标点（`punctuationPolicy: semantic`），标点不得独占一行或出现在行首，换行不自动加标点。
- **来源不编造**：歌词的词曲作者必须查证，不把歌手默认当词曲作者；名言必须查到具体媒介和标题，查不到先请用户补充。
- **只改配置**：常规制作只写配置，用 `scripts/render-poster.cjs` 渲染；不复制、改写临时脚本，不用旧版入口绕过异常。
- **验收后交付**：程序验收必须通过，再实际看 PNG，完成视觉检查后才标记 `--visual-reviewed` 并交付；未看图不算通过。

约束冲突（如语义断行与填满不可兼顾）时，先保证语义断行和阅读节奏，报告冲突与可选方案；改文字或强调仍需确认。

## 制作流程

1. **选版本**：按硬约束在对话中问用户。版本、简繁、字体与素材细节——开始前必须先读 `references/fonts-and-assets.md`。
2. **转简体并提取**：转换显示文字（作者、作品名、署名、背景字一并转换），提取正文、来源、照片、用户明确要求的强调词。
3. **断行与标点**：编排 `lines` 和补标点之前，必须先读 `references/line-breaks-punctuation.md` 和 `references/layout.md`（顶部正方形布局、长文、行距）；参数写法读 `references/unified.md`。短句优先三或四行，先理解完整句意再换行。
4. **选放大词**：选择或建议强调词之前，必须先读 `references/emphasis.md`。
5. **核实来源**：补全或核实署名之前，必须先读 `references/source-verification.md`；用网络搜索核实，查证链接放在确认说明里。
6. **文字确认**：把实际断行、标点、放大词（三级标题单列）、完整来源发给用户，等确认。
7. **底图（仅红黑版）**：用户照片直接用；需要生成时必须先读 `references/red-background.md`，用图像生成工具（Grok Bot 中为 `GenerateImage`）生成无文字 3:4 底图，存入项目目录，`photo` 指向它并设 `backgroundTreatment: preserve`。红黑版默认由渲染器叠加 30% 黑色遮罩（`blackOverlayOpacity: 0.3`），只压暗底图，不影响文字、来源与 Logo；详见底图规则。浅绿版无需照片。
8. **渲染**：`node <技能目录>/scripts/render-poster.cjs config.json output-directory`（两版同一命令；未设 `variant` 会拒绝渲染）。`photo`/`font` 相对配置文件解析，输出目录相对当前工作目录。依赖由 `scripts/deps.cjs` 从技能目录 `node_modules` 加载，缺失时自动在技能目录执行 `npm ci`。
9. **输出与 HTML 素材**：确定项目目录、文件命名、是否使用共享字体目录 `sharedFontDir` 之前，必须先读 `references/output-and-html-assets.md`。
10. **验收**：渲染器自动生成验收 JSON。通过后实际查看 PNG，按 `references/acceptance.md` 的清单检查，再运行 `node <技能目录>/scripts/verify-poster.cjs config.json output-directory --visual-reviewed`。失败或未看图不交付；排错按 `references/acceptance.md`，修改边界见 `references/modification-boundary.md`。
11. **交付**：先展示 PNG，再附可编辑 HTML（SVG 文字 + CSS 图层）、排版 JSON、验收 JSON。PNG 由 Canvas 按相同坐标输出，不声称是 HTML 截图。

## 参考文件

| 文件 | 何时读 |
|---|---|
| `references/fonts-and-assets.md` | 选版本、简繁、字体、底纹、Logo |
| `references/line-breaks-punctuation.md` | 断行、补标点 |
| `references/layout.md` | 顶部正方形布局、长文与 `layout: legacy`、行距实现 |
| `references/emphasis.md` | 选放大词 |
| `references/source-verification.md` | 来源补全与确认稿格式 |
| `references/red-background.md` | 红黑版生成底图 |
| `references/output-and-html-assets.md` | 目录命名、`_assets` 共享素材、`sharedFontDir` |
| `references/unified.md` / `references/parameters.md` | 配置字段与大小字参数 |
| `references/acceptance.md` | 验收清单与异常处理 |
| `references/modification-boundary.md` | 修改边界、运行环境 |
| `references/font-licensing.md` | 字体授权 |
| `references/original-workflow.md` | 原版执行要点与制作步骤原文（核对用） |
| `references/psd-reference.md`、`references/source-layout-reference.jpg` | 原 PSD 参照 |

示例配置：`examples/configs/mint.json`、`examples/configs/darkroom.json`；在技能目录运行 `npm test` 可渲染并验收两例。
