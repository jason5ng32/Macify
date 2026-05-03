# AGENTS.md

> **维护规则**：≤ 80 行；`<待补充>` 表示暂未确认，应通过读代码、查 [local-context.md](./local-context.md) 或问 Jason 来获取，不要假装确认；每条 Never 配一条 Do；末尾 [local-context.md](./local-context.md) 指向必须保留。

## 项目定位

Chrome 扩展。把新标签页变成 macOS 航拍屏保视频。主打"漂亮 + 平静的浏览开始"，不做生产力工具（待办、番茄钟、AI 集成等已明确拒绝）。已上架 Chrome Web Store，有真实用户量。

## 技术栈

Vite 8 + Svelte 5 (Runes) + JS（**无 TypeScript**） + Tailwind 4 + `@crxjs/vite-plugin`（MV3）+ `unplugin-icons` + `@iconify/json`（按需打包）。MV3 service worker 简单使用。无测试框架。

## 常用命令

- 装依赖：`npm install`
- 启动 dev：`npm run dev`（HMR；加载 `dist/` 为 unpacked extension）
- 构建：`npm run build`
- 出商店 zip：`npm run zip`
- 重新抓视频元数据：`npm run build:videos`（读用户本地 macOS aerial manifest）
- 重新抓格言：`npm run build:quotes`（拉公开数据集）
- 跑测试 / lint / type check：`<待补充：未配置>`

## 项目特定的陷阱与领域词汇

- **新标签页对首屏延迟极敏感**。不引重型 runtime 库、不在 popup mount 路径上做远程 fetch。能 build-time bundle 就 bundle（locales / quotes / videos.json 都是这么做的）。
- **苹果视频真实 catalog** 在用户 Mac 的 `~/Library/Application Support/com.apple.wallpaper/aerials/manifest/entries.json`（156 条）。`sylvan.apple.com/Aerials/2x/entries.json` 只有 13 条，不要用它。
- **反代 Worker**（`applescreensaver.macify.workers.dev`）路径要跟 Apple 当前 CDN 路径同步。当前支持 `/itunes-assets/*` 和老的 `/Videos/*`。新增 Apple 路径要先改 Worker（Jason 维护）。
- **MV3 storage**：service worker 拿不到 `localStorage`。所有缓存走 `chrome.storage.local`。
- **v1 升级兼容**：storage 里有用户老 key（如 `googleAPIKEY` / `translateMotto`）。**Do**: storage allowlist 静默忽略未知 key。**Never**: 主动清理 storage 残留。
- **Pomodoro / 番茄钟 / 极简模式 / "Thanos 响指" 这几个想法已确认 NOT TO DO**——前两个偏离定位、后两个尝试过被回退。
- **域名词汇**：`shotID`（Apple 内部视频代号，如 `TA_L_002`），`pointsOfInterest`（Apple 视频内地标时间戳），`accessibilityLabel`（人类可读位置名）。

## 协作偏好

- **Do**: 工作树本地 commit，Jason 验收通过后直接执行（标准在 memory）。**Never**: 主动 push 到 remote、merge 到 dev/main、改既有 commit。
- **Do**: 在工作树（`.claude/worktrees/...`）里做改动。**Never**: 直接动主 repo（`/Users/jasonng/Codes/macOS-Screen-Saver-as-Chrome-New-Tab/` 根）的文件——主 repo 是 dev 分支。
- **Do**: 多步骤工作走 `.plan/plan.md` + `.plan/phases/NN-*.md`（已 gitignore）。**Never**: 替 Jason 跳过 phase 任务——只能他明确说"跳过"才标 `[-]`。
- 当前工作分支 `refactor/vite-svelte`（v2.0 重构），未合回 `dev`。

---

如果工作区根存在 [local-context.md](./local-context.md)，请一并读取和使用它（仅本机生效，不进 git）。
