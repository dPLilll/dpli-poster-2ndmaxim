# 修改边界与本地运行环境

> 本文件内容迁移自原 SKILL.md 的同名章节，规则未删改；SKILL.md 中的硬约束与此处一致，冲突时以更严格者为准。

## 修改边界

单次制作默认只改配置和素材，不修改、复制或另写渲染脚本。渲染异常先检查原文与转换结果、断行、强调、字体覆盖和实际字形边界；能由已授权配置修复时直接修复，改变已确认文字或强调时先确认。确认为程序缺陷时保留最小复现并说明原因，仅在用户授权修复渲染器或维护技能的范围内修改正式脚本、验证后同步，不能用临时脚本绕过。

讨论或修改规则时不自动出图；验证程序可重放已确认配置。只有用户明确指定新字体时才填写 `font` 和 `fontChangeConfirmed: true`，不能自行把该标记当成授权。详细排错步骤和验收边界见 [references/acceptance.md](acceptance.md)。

## 本地运行环境

- 技能目录含 `package.json` 和 `package-lock.json`，渲染依赖为 `@napi-rs/canvas`，简繁转换依赖为 `opencc-js`。依赖统一由 `scripts/deps.cjs` 从**技能目录自己的** `node_modules` 加载；缺失时自动在技能目录执行一次 `npm ci`（需联网），渲染与验收脚本共用此加载器。也可手动在技能目录运行 `npm ci`。字体、Logo 和底纹已随技能提供。
- 从任意工作目录运行：`node <技能目录>/scripts/render-poster.cjs config.json output-directory`。在技能目录内可简写为 `node scripts/render-poster.cjs …`。自检：在技能目录运行 `npm test`（渲染并验收 `examples/configs/` 下两个示例）。
- `photo` 和 `font` 路径相对于配置文件解析；输出目录相对于当前工作目录解析。不要写入云端机器的绝对路径。安装与使用说明见 [README](../README.md)。
- 环境验证使用已确认的海报配置，不绕过版本选择和文字确认流程生成新的文案或排版。

