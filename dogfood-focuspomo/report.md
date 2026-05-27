# FocusPomo 深度 Dogfood 评测报告

时间：2026-05-27T23:21:17+08:00
目标基准：App Store「我的番茄 - 自律番茄钟 专注必备神器」
线上地址：https://focuspomo.bz9.me/
工作区：/root/projects/focuspomo/dogfood-focuspomo
本轮代码基线：`97f9a31`

## 本轮用户反馈

用户反馈两个 P0 级真实问题：
1. PWA 离线使用完全不可用。
2. 连着网也会一直卡在“正在从本地缓存启动”的页面。

同时指出主页面上滑的 Summary/复盘页 UI 仍简陋，并要求 Claude 参与审计。

## Claude 审计结论

已通过 AnyRouter Claude 进行 bounded review。Claude 的核心判断：
- 在线卡启动壳通常来自 hydration gate 永不翻转，或旧 SW/旧 HTML 引用已不存在的 JS chunks 导致客户端接管失败。
- 离线白屏/不可用的标准修法是 navigation fallback 返回 cached app shell，而不是只缓存静态资源或只返回离线提示卡片。
- 上滑页应该按 bottom-sheet/复盘行动页设计：有 handle、关键数字、行动承接、Top-3 任务，而不是普通统计列表。

## 本轮新增并关闭的问题

### P0-3 联网也卡在 SSR 启动壳
- 证据：用户真机反馈；本地重建前所有 `/_next/static/...` chunk 返回 500，客户端 JS 无法接管；`ClientApp` 还额外等待 `requestAnimationFrame` mounted gate。
- 修复：`src/components/ClientApp.tsx` 立即渲染 `<AppShell />`，删除 mounted gate。
- 验证：重建+重启后，本地首页 HTML 引用的所有 `_next/static` chunks 均 200。

### P0-4 PWA 离线完全不可用
- 证据：上一轮 SW 为避免陈旧 HTML，删除了 app shell fallback，离线 navigation 只能显示 `/offline.html`，不是可用 App。
- 修复：`public/sw.js` 升级到 `focuspomo-v1779372627-pwa7`：
  - online navigation：network-first；
  - install/ready：缓存当前 `APP_SHELL_URL` 和解析出的 `_next/static` assets；
  - offline navigation：优先返回 cached `APP_SHELL_URL`，否则才返回 `/offline.html`。
- 验证：live `sw.js` 包含 `pwa7`、`cache.put(APP_SHELL_URL)`、`cache.match(APP_SHELL_URL)`，且无 stale `pwa6`。

### P1-9 上滑 Summary 页简陋
- 修复：`src/components/SummaryPage.tsx` 重写为行动复盘页：
  - bottom-sheet handle；
  - 今日专注/番茄/连续天数；
  - “今天只抓三件事”Top-3 待办入口；
  - 重要紧急象限文案 + 番茄估算；
  - 月度复利番茄网格；
  - 回到计时 / 查看统计的真实按钮。

## 其他顺手修复保留

- `src/lib/store.ts`：休息阶段长按停止不再写入专注历史；完成/中断记录使用 `activeDuration`。
- `src/components/StatsPage.tsx`：残留 `h/m` 单位改为中文。
- `src/components/TasksPage.tsx`：保留前序 Top-3/任务页改动。
- `src/app/layout.tsx`：SW 注册改为等 `navigator.serviceWorker.ready` 后再发送 `CACHE_APP_SHELL`，避免 active SW 尚未 ready 时错过预热。

## 本轮验证

### Build / deploy
- `rm -rf .next && npm run build`：成功。
- `pm2 restart focuspomo --update-env`：成功。
- 本地 `http://127.0.0.1:3457/`：200。
- 线上 `https://focuspomo.bz9.me/`：200。

### JS chunks
- 首页 HTML 引用的 9 个本地 `_next/static` chunk 全部返回 200。
- 修复前这些 chunk 返回 500，是“联网也停在启动页”的关键服务器端证据之一。

### PWA / SW
- live `sw.js`：`focuspomo-v1779372627-pwa7`。
- `cache.put(APP_SHELL_URL)`：存在，用于离线 app shell。
- `cache.match(APP_SHELL_URL)`：存在，用于离线 navigation fallback。
- `/offline.html`：仍作为兜底存在。
- `/manifest.json` 图标与 `sw.js` 缓存列表对齐。
- favicon/apple icons：RGBA；ICO payload 为 PNG，符合 Safari 要求。
- 首页/`sw.js` 响应头：`no-cache, no-store, must-revalidate`，Cloudflare 非静态缓存。

## 当前状态

- 新增问题：3
- 本轮关闭：3（P0-3、P0-4、P1-9）
- 正式开放 issue：0
- 仍需真机确认：如果 iPad 桌面 PWA 仍由旧 SW 控制，可能需要关闭/重开或删除旧 PWA 后重新添加，才能拿到 `pwa7`。服务器端已部署并验证。

## 后续高价值方向

1. 真 iPad installed-PWA 离线复测。
2. 手动补录专注时间。
3. 正计时模式。
4. 继续对照 App Store 截图做逐屏视觉/动效还原。

## 2026-05-27T23:58:03+08:00 真机反馈修复：Summary 下滑 + iPad Toolbar 压扁

用户反馈：
1. 上滑进入 Summary 后，下滑根本不能返回。
2. iPad Safari 如果没有隐藏 toolbar，整套响应式布局像被压扁。

根因：
- 手势方向写反：上一版把进入 Summary 绑定成 onSwipeDown，把返回 timer 绑定成 onSwipeUp，和“上滑展开 / 下滑关闭”的 sheet 心智相反。
- iPad Safari toolbar 显示时，100vh/fixed inset:0 不等于真实可见区域，导致网页在未隐藏 toolbar 状态下高度计算过大或被视觉压缩。

修复：
- src/components/AppShell.tsx：timer/tasks 上滑进入 Summary；summary 下滑返回 timer；键盘同步为 ↑ 打开 Summary、↓/Esc 返回 timer；监听 visualViewport.height 写入 --app-height。
- src/components/GestureWrapper.tsx：加入 touchAction: pan-y；如果手势从已滚动面板内部开始，优先让原生滚动处理，减少 Summary 滚动与关闭手势冲突。
- src/components/SummaryPage.tsx：使用 overflowY:auto、WebkitOverflowScrolling:touch、touchAction:pan-y；底部文案改为“下滑回计时”。
- src/app/globals.css / src/app/page.tsx：height/minHeight 改用 var(--app-height, 100dvh)，保留 100svh/100dvh fallback。

验证：
- 源码断言：手势方向、keyboard mapping、visualViewport、Summary scroll markers 均存在。
- npx tsc --noEmit：通过。
- rm -rf .next && npm run build：通过。
- pm2 restart focuspomo --update-env：通过。
- 本地首页：200。
- 线上首页：200。
- 线上首页引用的 9 个 _next/static assets：全部 200。
- live sw.js 仍为 focuspomo-v1779372627-pwa7，app-shell offline fallback 未回退。

仍需真机确认：iPad Safari toolbar 行为只能由真实设备最终确认；服务器端与代码路径已部署验证。

## 2026-05-28T00:11:58+08:00 深色模式与动画丝滑度修复

用户反馈：
1. 深色模式很丑。
2. 动画不像原生 App 那么丝滑，怀疑是网页限制、Safari 问题，还是实现问题。

判断：
- 不是单纯 Web/Safari 天花板。PWA/Safari 确实比原生 App 更容易掉帧，尤其 backdrop-filter、fixed 全屏、canvas、Framer layout 动画叠加时；但本项目当前实现也有明显问题。
- 深色模式主要是我们自己的设计问题：接近纯黑背景 + 白字 + generic iOS dark card，和番茄暖色品牌不协调。
- 动画主要是我们自己的实现问题占较大比例：500ms tick、layoutId 跨状态 morph、Matter.js Runner + canvas RAF 常驻、spring 偏慢、玻璃/阴影叠加，都会让 iPad Safari 更像网页而不是原生。

修复：
- `src/app/globals.css`
  - 深色模式改成暖棕黑/番茄橙体系：`#17110E` 背景、`#FFF4EA` 文字、`#FF8A63` accent。
  - dark gradients、glass、separator、shadow 全部改成暖色低亮方案。
  - 新增 `.app-composited`，并加入 `prefers-reduced-motion` fallback。
- `src/components/TimerPage.tsx`
  - tick 从 500ms 改为 1000ms，减少无意义全局 store 更新。
  - 移除 `layoutId="timer-face"` 跨状态 morph，避免 Framer 做昂贵布局测量/重排。
  - spring 调快：`stiffness 360 / damping 36 / mass 0.72`。
  - 开始按钮用 `var(--text)/var(--bg)`，深色模式不再硬编码黑白。
  - 运行中垂直手势同步修正为上滑进入 Summary。
- `src/components/GestureWrapper.tsx`
  - spring 调快。
  - 增加 compositor class 和 `layout={false}`，降低页面切换布局动画负担。
- `src/components/TomatoPhysics.tsx`
  - 不再长期运行 Matter Runner + requestAnimationFrame。
  - 只有掉番茄触发后才临时 `Engine.update + RAF`，静止约 90 帧后停止。
- `src/components/SettingsPage.tsx`
  - section card 边框/阴影改用 theme variables，深色模式不再用浅色硬编码阴影。

验证：
- 源码断言：dark palette、compositor helper、reduced-motion、1000ms tick、layoutId 移除、physics idle runner 移除均存在。
- `npx tsc --noEmit`：通过。
- `rm -rf .next && npm run build`：通过。
- `pm2 restart focuspomo --update-env`：通过。
- 本地首页：200。
- 线上首页：200。
- 线上 9 个 `_next/static` assets：全部 200。
- live `sw.js` 仍为 `focuspomo-v1779372627-pwa7`，PWA app shell 未回退。

后续真机判断：如果 iPad 上仍不够丝滑，下一步应继续减少 `backdrop-filter` 和大面积 box-shadow，并把页面切换改成更接近 native UINavigation 的 transform-only transition；但本轮已经先去掉了最明显的实现型卡顿源。

