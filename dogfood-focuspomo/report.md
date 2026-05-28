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

## 2026-05-28T17:22:37+08:00 用户反馈修复：任务页不应纵向跳 Summary

问题：
- 今日三件事/任务页也能通过纵向手势跳到 Summary。
- 这违背了产品语义：只有主页计时器页面才应该有上滑/下滑操作；任务页是工作页，纵向动作应优先给滚动和操作本身。

根因：
- `AppShell` 给 tasks 页也挂了 `onSwipeUp={() => go("summary")}`。
- 键盘 `ArrowUp` 也是全局进入 Summary，不限当前页面。

修复：
- 移除 tasks 页的 `onSwipeUp`。
- `ArrowUp` 只在 `page === "timer"` 时进入 Summary。
- `ArrowDown` / `Escape` 只在 Summary 页返回 timer。
- 左右滑和左右键仍保持当前页相对横向导航。

验证：
- 源码断言：tasks 页面 wrapper 中不再包含 `onSwipeUp`。
- 源码断言：全局只剩 timer 页一个 `onSwipeUp={() => go("summary")}`。
- 源码断言：`ArrowUp` 条件包含 `page === "timer"`。
- `npx tsc --noEmit`：通过。
- `npm run build`：通过，并注入 12 个 Next static assets 到 `sw.js`。
- `pm2 restart focuspomo --update-env`：成功。
- 本地首页：200。
- 线上首页：200。
- 线上首页引用的 9 个 `_next/static` assets：全部 200。

## 2026-05-28T18:31:06+08:00 Google 同步 + Calendar + 今晚容量规划

新增：
- Google OAuth 登录入口：`/api/auth/google`，scope 包含 `openid email profile` 与 `calendar.events`。
- 服务端独立 `focuspomo` PostgreSQL 用户/库，表：`focuspomo_users`、`focuspomo_sessions`、`focuspomo_sync_snapshots`、`focuspomo_calendar_events`。
- 设置页新增 Google 云同步面板：登录、备份本机、恢复云端、开启/触发 Calendar 同步。
- Calendar 同步只写入已完成且真实存在的番茄记录；使用本地 `record.id` 去重，避免重复日历块。
- 全局后台同步 agent：Calendar 已开启时，完成新番茄后自动尝试同步。
- 任务页新增“今晚还剩多少番茄？”容量面板：按当前专注时长 + 短休息估算到 24:00 可用番茄数，并和今日 Top 3 剩余估算番茄数对比。

验证：
- `npx tsc --noEmit`：通过。
- `rm -rf .next && npm run build`：通过，API routes 进入 production bundle。
- `pm2 restart focuspomo --update-env`：成功。
- 本地 `/api/me`：200，未登录返回 `user:null`。
- 本地 `/api/sync`：未登录 401，不再 500。
- 本地 `/api/calendar/sync`：未登录 401。
- 本地 `/api/auth/google`：307 到 Google OAuth，redirect_uri 指向 `https://focuspomo.bz9.me/api/auth/google/callback`，scope 包含 Calendar events。
- 公网首页：200。
- 公网 9 个 `_next/static` assets：全部 200。
- 公网 `/api/me`：200，未登录返回 `user:null`。
- 公网 `/api/sync`：未登录 401。
- `focuspomo_*` 数据表存在。
- `.env.local` 未被 git 跟踪；`.next`、`public`、`src`、`package.json`、`ecosystem.config.js` 扫描未发现 Google secret 字符串。

剩余需要真机/账号验证：
- 用户在浏览器中完成 Google consent 后，验证 callback 建 session、设置页显示头像邮箱、备份/恢复云端快照、完成番茄后 Google Calendar 出现对应事件。

## 2026-05-28T18:57:34+08:00 物理番茄持久化 + iPad 倾斜修复

用户反馈：
- 完成番茄掉落的物理引擎没有随着 iPad 陀螺仪/倾斜移动。
- 回到主页后成熟红番茄全部消失。

根因：
- `TomatoPhysics` 原来挂在 `TimerPage` 内；切到任务/统计/设置页时 TimerPage 卸载，Matter world 被销毁，回主页会重建一个空 world。
- 完成番茄只通过 `dropTrigger` 发 100ms 的瞬时信号，没有持久化为“已收获番茄池”。
- iOS/iPadOS 传感器需要用户手势触发 `DeviceMotionEvent.requestPermission()` / `DeviceOrientationEvent.requestPermission()`；自动 effect 请求不可靠，也缺少用户可见入口。

修复：
- 新增 `HarvestedTomato` store 类型和 `fp-harvested-tomatoes` localStorage key。
- 完成专注或手动添加记录时，追加一颗持久番茄，最多保留最近 50 颗。
- `TomatoPhysics` 改为全局挂载在 `AppShell`，不再由 `TimerPage` 拥有，页面切换不会销毁 Matter world。
- 物理层从 store 读取番茄池，只对新增番茄创建 Matter body；刷新后会恢复最近番茄。
- 新增 “开启倾斜番茄” 按钮；点击后请求 iPad 传感器权限，并优先用 `devicemotion.accelerationIncludingGravity` 驱动重力，`deviceorientation` 作为 fallback。
- 云同步快照加入 `fp-harvested-tomatoes`，避免换设备后有历史记录但没有可见番茄池。

验证：
- `npx tsc --noEmit`：通过。
- `rm -rf .next && npm run build`：通过。
- `pm2 restart focuspomo --update-env`：成功。
- 本地首页：200。
- 公网首页：200。
- 公网 9 个 `_next/static` assets：全部 200。
- 源码断言：`<TomatoPhysics />` 只在 `AppShell` 挂载一次。
- 源码断言：`TimerPage.tsx` 不再引用 `TomatoPhysics`。
- 源码/Bundle 断言：`fp-harvested-tomatoes`、`requestPermission`、`devicemotion`、`deviceorientation`、`开启倾斜番茄` 均存在。

待真机验证：
- 在 iPad Safari/PWA 上点一次 `开启倾斜番茄`，允许动作与方向访问后，倾斜设备观察红番茄是否滚动。
