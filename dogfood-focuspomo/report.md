# FocusPomo 深度 Dogfood 评测报告

时间：2026-05-28T17:12:26+08:00
目标基准：App Store「我的番茄 - 自律番茄钟 专注必备神器」
线上地址：https://focuspomo.bz9.me/
工作区：/root/projects/focuspomo/dogfood-focuspomo

## 本轮覆盖

本轮接着长期 dogfood，重点复核用户反馈的真实设备问题：主页时钟在 iPad Safari toolbar/小可见高度下被压扁，以及 Summary/运行中页面的纵向手势是否符合“上滑复盘、下滑回主页”的原生心智。同时保留前序 P1-13 手动补录、pwa8 离线 app shell、任务文案真实度等改动作为同一批待提交工作。

浏览器工具本轮在当前 runtime 不可用，因此没有把 CDP 异常当应用事实；验证使用源码断言、TypeScript、生产构建、PM2、curl 线上资源探针和 live SW/manifest/icon 检查。

## 本轮新增并修复的问题

### P0-7 小高度/iPad Safari toolbar 场景下主计时圆盘和数字仍可能被纵向压扁

证据：
- 用户真机反馈主页仍有压扁感。
- 旧 idle timer 尺寸主要跟随宽度：`clamp(200px, 45vw, 380px)`。
- 页面用 flex spacer 分配高度；当 Safari toolbar 占用可见高度时，圆盘和底部按钮会在同一纵向空间里互相挤压。

修复：
- `TimerPage` idle 布局改为稳定 grid rows，而不是靠 flex spacer 隐式压缩。
- 圆盘尺寸改为同时受宽度和 `--app-height` 约束：`min(clamp(...), calc(var(--app-height) * 0.42))`。
- 圆盘增加 `aspectRatio: "1 / 1"` 和 `flex: "0 0 auto"`，保证它是正圆，不参与 flex 压缩。
- 空闲页和运行页大数字都加可见高度上限，避免极端小高度下字号压住按钮或标题。
- 底部按钮间距使用 safe-area，兼容 iPad/iPhone 底部系统区域。

### P0-8 Summary 下滑返回与运行页下滑回主页在 iOS Safari 上不够稳

证据：
- 用户明确要求下滑能回主页。
- `GestureWrapper` 原本只依赖 PointerEvent；iOS Safari 的触控滚动/`pan-y` 场景下，垂直手势可能被浏览器原生滚动接管，导致 sheet 关闭不稳。
- 运行中计时页只有上滑 Summary 和长按停止，没有独立“下滑取消/回主页”的手势。

修复：
- `GestureWrapper` 增加 `touchstart/touchend` fallback，并保留 PointerEvent 路径。
- `GestureWrapper` 支持 `touchAction` prop；Summary 页面使用 `touchAction="none"`，让下滑关闭优先被组件识别。
- 滚动面板内部已经滚动时仍让原生滚动优先，避免阅读 Summary 时误触关闭。
- 运行中计时页增加纵向下滑分支：取消当前专注/休息并回到主页计时状态；上滑仍进入 Summary。

## 本轮验证

- 源码断言：`idleTimerSize`、`aspectRatio: "1 / 1"`、`flex: "0 0 auto"`、Summary `touchAction="none"`、touch fallback、运行中 `Swipe DOWN` 分支均存在。
- `npx tsc --noEmit`：通过。
- `rm -rf .next && npm run build`：通过。
- `pm2 restart focuspomo --update-env`：成功，`focuspomo` online。
- 本地首页 `http://127.0.0.1:3457/`：200。
- 线上首页 `https://focuspomo.bz9.me/`：200。
- 线上首页引用的 9 个 `_next/static` assets：全部 200。
- live `sw.js`：`focuspomo-v1779372627-pwa8`。
- live `sw.js`：包含 build-time `_next/static` precache marker，预缓存条目 12 个。
- live `sw.js` app-shell 离线 fallback：存在 `cache.put(APP_SHELL_URL)` 与 `cache.match(APP_SHELL_URL)`。
- manifest/icons：`192`、`512`、`apple`、`apple-touch-icon.png`、`favicon.ico` 全部 200。
- 源码扫描：没有 `智能选` / `AI` / demo / mock / 空 onClick / range slider 残留。

## 本轮统计

- 新增问题：2（P0-7、P0-8）。
- 修复问题：2（P0-7、P0-8）。
- 本轮 P0：2，均已部署验证。
- 当前仍需真机确认：iPad installed-PWA 旧 SW 更新、实际 toolbar 收起/展开体感、动画主观丝滑度。

## 剩余 backlog / 下一轮重点

1. 真 iPad installed-PWA 离线复测：确认旧 PWA 是否拿到 `pwa8` 与新 app shell。
2. 正计时模式（App Store 基准功能）。
3. 继续按 App Store 截图做逐屏视觉/动效还原，避免 AI 味大卡片/过度渐变。
