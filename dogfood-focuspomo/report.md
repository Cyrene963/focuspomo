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

## 2026-05-28T19:08:14+08:00 Google OAuth invalid request redirect_uri 修复

用户反馈：Google 登录页显示 `this app sent an invalid request`。

定位：
- 线上 `/api/auth/google` 实际发给 Google 的旧 `redirect_uri` 是 `https://focuspomo.bz9.me/api/auth/google/callback`。
- 这类报错最常见原因是 Google Cloud Console 的 Authorized redirect URI 与请求里的 `redirect_uri` 完全不一致。
- 为了贴近 NextAuth/常见配置，改成标准路径 `https://focuspomo.bz9.me/api/auth/callback/google`。

修复：
- `googleClient()` 的 redirect URI 改为 `/api/auth/callback/google`。
- 新增 `/api/auth/callback/google` callback route。
- 保留 `/api/auth/google/callback` 作为旧路径兼容入口。
- callback 逻辑抽到 `src/lib/server/googleCallback.ts`，避免两条路径复制不同步。

验证：
- `npx tsc --noEmit`：通过。
- `npm run build`：通过，routes 包含 `/api/auth/callback/google` 和 `/api/auth/google/callback`。
- `pm2 restart focuspomo --update-env`：成功。
- 公网 `/api/auth/google` Location 解析结果：
  - client_id = 用户提供的 `1030792488504-...apps.googleusercontent.com`
  - redirect_uri = `https://focuspomo.bz9.me/api/auth/callback/google`
  - scope 包含 `https://www.googleapis.com/auth/calendar.events`
- 新旧 callback probe 都返回 307，不再 404。
- 公网首页 200。

Google Console 需要确认：
- Authorized redirect URIs 必须包含：`https://focuspomo.bz9.me/api/auth/callback/google`
- 如果还想兼容旧链接，也可额外包含：`https://focuspomo.bz9.me/api/auth/google/callback`

## 2026-05-28T20:10:44+08:00 Google 登录与 Calendar 授权拆分

用户目标：当前主要需要云同步功能，不希望 Google Calendar verification 阻塞整个登录/云备份能力。

问题：
- 原先 `/api/auth/google` 登录时直接请求 `calendar.events`。
- Google OAuth app 处于 Testing / 未完成 verification 时，Calendar scope 会让普通登录也被 403 `access_denied` 拦住。
- 这会把“云备份/恢复”错误地绑定到“Calendar 写入权限”。

修复：
- 基础登录 `/api/auth/google` 现在只请求 `openid email profile`。
- 新增 `/api/auth/google/calendar`，只在用户开启 Calendar 同步时才请求 `calendar.events`，并带 `state=calendar`。
- OAuth callback 根据 `state=calendar` 区分普通登录与 Calendar 增量授权。
- Calendar 授权成功后才开启 `calendar_sync_enabled`。
- `/api/calendar/sync` 在缺少 Calendar 授权时返回 `428 calendar_permission_required`，前端会跳转到单独 Calendar 授权。
- 未登录时仍返回 401，避免误触发授权流程。

验证：
- `npx tsc --noEmit`：通过。
- `npm run build`：通过，routes 包含 `/api/auth/google/calendar`。
- `pm2 restart focuspomo --update-env`：成功。
- 公网 `/api/auth/google` Location 解析：scope = `openid email profile`，不包含 Calendar。
- 公网 `/api/auth/google/calendar` Location 解析：scope 包含 `calendar.events`，state = `calendar`。
- 未登录 POST `/api/calendar/sync` 返回 401，符合认证边界。

产品结论：
- 云备份/恢复可先作为主线能力上线。
- Calendar 同步作为可选增强能力，后续需要公开给多人时再处理 Google verification，不再挡住基础云同步。

## 2026-05-28T20:44:18+08:00 云同步自动化修正

用户反馈：云同步不应该是需要手动记得点的按钮；登录后用户心智是自动备份、自动恢复、自动保护数据。

问题：
- 之前真正的云备份只在设置页“备份本机 / 恢复云端”按钮里触发。
- 后台 agent 只自动同步 Google Calendar，不自动同步核心本地数据。
- 这会造成产品语言叫“云同步”，但实际体验像“手动导入导出”。

修复：
- 新增 `src/lib/cloudSync.ts`，统一 snapshot keys、clientUpdatedAt、签名、读取/应用 snapshot、json fetch。
- `CloudSyncAgent` 登录后自动 GET `/api/sync`：
  - 云端较新：自动恢复并刷新页面；
  - 本机较新：自动上传本机 snapshot；
  - 云端为空且本机有数据：自动初始化云端备份。
- 本机任务、标签、番茄记录、设置等持久化状态变化后，2 秒 debounce 自动 PUT `/api/sync`。
- Calendar 同步仍保持单独：只同步已完成真实专注块，不影响基础云备份。
- 设置页改成状态入口：显示“自动同步已开启 / 正在自动同步 / 已自动同步 / 离线稍后重试”，手动按钮改为“立即同步 / 从云端恢复”作为兜底。

验证：
- `npx tsc --noEmit`：通过。
- `npm run build`：通过。
- `pm2 restart focuspomo --update-env`：成功。
- 公网 `GET /api/sync` 未登录返回 401。
- 公网 `PUT /api/sync` 未登录返回 401。
- 根页面返回 200 且 no-cache header 正常。

产品结论：
- 最合适的方案不是做复杂 CRDT/实时协作，而是 local-first 单用户自动 snapshot 同步：简单、稳定、符合番茄钟/任务清单的实际风险模型。
- 以后如果要多设备冲突合并，再做 per-record merge；当前阶段用 clientUpdatedAt 的 last-writer-wins 足够，不会把项目搞臃肿。

## 2026-05-28T23:28:00+08:00 PWA Google session + 倾斜偏好持久化回归

用户反馈：
- PWA 中完成 Google 登录后，再打开应用“不记得账号”。
- “开启倾斜番茄”看起来像每次打开网页都要重新开启授权。
- 设置和数据是否都有云同步不清晰。

定位：
- OAuth callback 固定落到 `focuspomo.bz9.me`，但用户可能从 `pomofocus.bz9.me` 别名安装/打开 PWA；旧 session cookie 只属于回调域名，因此别名 PWA 看起来像没有登录。
- 旧 session 生命周期为 30 天，cookie 没有显式 `maxAge/domain`，不适合两个 public 子域共用登录态。
- iOS/iPadOS 的 `DeviceMotionEvent` / `DeviceOrientationEvent` 权限不能由网站或云同步永久静默授予，必须由用户手势触发；但产品可以记住“用户想开启倾斜番茄”的偏好。
- `fp-tilt-tomatoes` 此前不存在于 store 和云同步自动上传订阅里，倾斜偏好不是一等设置。

修复：
- session cookie 改为 90 天，生产环境默认 `Domain=.bz9.me`、`SameSite=Lax`、`Secure`、`HttpOnly`、`Path=/`，退出登录也按同域清 cookie。
- `/api/auth/google` 与 `/api/auth/google/calendar` 把当前 `Host` 编进 OAuth `state`；callback 解码后回到原本打开的 PWA 域名，避免 canonical 域与别名域打架。
- OAuth state 从裸 `calendar` 改成 JSON base64url，仍兼容旧 `state=calendar`。
- 新增 `tiltTomatoes` store 字段、`fp-tilt-tomatoes` localStorage key 和设置页“倾斜番茄”开关。
- `CloudSyncAgent` 把倾斜偏好纳入自动同步依赖；`cloudSync` snapshot keys 纳入 `fp-tilt-tomatoes`。
- `TomatoPhysics` 只在用户开启倾斜偏好后显示授权按钮；iOS 需要时文案变为“重新授权倾斜”，避免误以为设置丢失。
- 设备传感器事件添加 cleanup，避免重复启用时叠加监听。

验证：
- `npx tsc --noEmit`：通过。
- `rm -rf .next && npm run build`：通过，routes 正常生成，SW 注入 12 个静态资源。
- `pm2 restart focuspomo --update-env`：成功，`focuspomo` online。
- 公网 `/api/auth/google`：
  - `focuspomo.bz9.me` state = `{ flow: "signin", returnTo: "focuspomo.bz9.me" }`。
  - `pomofocus.bz9.me` state = `{ flow: "signin", returnTo: "pomofocus.bz9.me" }`。
  - scope = `openid email profile`，不含 Calendar。
- 公网 `/api/auth/google/calendar`：state = `{ flow: "calendar", returnTo: "pomofocus.bz9.me" }`，scope 包含 `calendar.events`。
- 公网首页：`focuspomo.bz9.me` 与 `pomofocus.bz9.me` 均 200。
- 公网 `/api/me`：未登录返回 200 + `{ "user": null }`，符合当前状态 API 语义。
- `SNAPSHOT_KEYS` 已包含 `fp-tilt-tomatoes`，自动同步 agent 订阅 `tiltTomatoes`。

待真机/账号确认：
- 需要用户在真实 Google consent 完成一次 callback，确认 `Set-Cookie` 在 iOS PWA 中以 `.bz9.me` 域保留，并且从 `pomofocus.bz9.me` PWA 回来仍显示账号。
- iOS 传感器权限不保证永久保存；预期体验是设置会同步，打开 PWA 后如系统要求仍需点一次“重新授权倾斜”。

## 2026-05-29T00:08:00+08:00 云同步覆盖矩阵复核

用户风险提醒：刷新网页、换设备、清理缓存、换浏览器后，应该保住所有该云同步的数据。

复核方法：
- 机械扫描源码中所有 `fp-*` 本地持久 key。
- 与 `src/lib/cloudSync.ts` 的 `SNAPSHOT_KEYS` 做差集。
- 复核自动上传触发逻辑，不只看 key 是否出现在快照里。

结果：
- 用户数据 key 共 16 个，云同步 snapshot key 共 16 个，差集 0。
- 已覆盖：标签、当前标签、专注历史、番茄池、周期计数、To-Do 任务、番茄循环、短休息、长休息、静音、通知偏好、震动、24 小时制、显示番茄、倾斜番茄、主题。
- `fp-client-updated-at` 是同步元数据，不作为用户数据上传。
- `focuspomo-*` 字符串只是 DOM shell id，不是 localStorage 数据。

发现并修复：
- `fp-theme` 已在快照表中，但主题切换不走 Zustand store，旧逻辑不会触发自动上传；只有之后再改任务/设置或手动上传才会带上主题。
- 新增 `LOCAL_PERSIST_EVENT`，所有 snapshot key 写入时统一发 `focuspomo:local-persist`。
- `CloudSyncAgent` 监听该事件并延迟上传，未来新增本地持久 key 只要进入 `SNAPSHOT_KEYS` 且走统一写入函数，就不会再漏触发。

验证：
- key 覆盖脚本：`missing_from_cloud_snapshot: []`，16/16 覆盖。
- `npx tsc --noEmit` 通过。
- `npm run build` 通过，service worker precache 已注入 12 个 Next 静态资源。
- 线上 `focuspomo.bz9.me` / `pomofocus.bz9.me` 首页均 200。
- 未登录 `/api/sync` GET/PUT 均 401，边界正常。
- OAuth state 仍正确保留 `returnTo` 域名。


## 2026-06-01T23:59:33+08:00 iPad 横屏倾斜番茄 + 跨页面物理层修复复核

用户反馈：
- iPad 横屏左边往下倾斜时，番茄不应该往左上滚；横屏下的重力方向语义反了。
- 切到统计/任务/设置等非计时页面后，成熟番茄物理层不应继续覆盖页面；这些页面不是番茄游乐场。

根因：
- 旧 `TomatoPhysics` 把 `devicemotion.accelerationIncludingGravity.x/y` 直接映射到 Matter gravity，没有按 `screen.orientation.angle` / `window.orientation` 把设备坐标旋转到当前屏幕坐标系。
- `AppShell` 的 `shouldShowTomatoes` 包含 `page === "summary"`，而全局物理层在 Summary/其它切换状态下容易制造视觉干扰；长期使用时用户只想在计时/专注场景看到番茄。

修复：
- 新增 `src/lib/motionGravity.ts`：集中处理 screen angle 归一化、设备重力向屏幕坐标旋转、Motion/Orientation 双通道映射。
- `TomatoPhysics` 改为调用 `gravityFromDeviceMotion()` / `gravityFromDeviceOrientation()`，横屏/竖屏都按屏幕坐标输出。
- `AppShell` 改为 `const shouldShowTomatoes = focusMode || page === "timer";`，非计时页面不再渲染 canvas，也不会显示倾斜授权按钮。
- 新增 `scripts/test-motion-gravity.ts` 覆盖 iPad 横屏语义：screen angle 90° 时，设备左侧向下应映射为屏幕向下；screen angle -90° 时方向相反；竖屏映射保持直觉。

验证：
- `npx tsc --noEmit`：通过。
- motionGravity 回归脚本：`motionGravity regression OK`。
- 源码断言：`AppShell_tomatoes_timer_only=True`，`AppShell_no_summary_tomatoes=True`，`rotateDeviceGravityToScreen` 存在。
- `rm -rf .next && npm run build`：通过，Next 16 production build 成功，SW 注入 12 个静态资源。
- `pm2 restart focuspomo --update-env`：成功，`focuspomo` online。
- 本地首页 `http://127.0.0.1:3457/`：200。
- 公网首页 `https://focuspomo.bz9.me/`：200，HTML bytes 16287。
- 公网 `sw.js`：200，包含 `_next/static` precache marker。
- 公网首页引用的 9 个 clean `_next/static` assets：全部 200。
- Browser runtime：计时器页 `canvasCount=1` 且核心 UI 可见；统计页 `canvasCount=0`；任务页 `canvasCount=0`；设置页 `canvasCount=0`。
- Browser visual check：计时器页面 UI 居中、按钮/文字未被 canvas 覆盖、无明显 layout defect。

证据标签：
- Verified working：生产构建、PM2 部署、本地/公网 HTTP、静态资源、SW、源码/TS gates、浏览器 DOM 页面切换 gates。
- Partially verified：真实 iPad 传感器方向仍需真机确认；浏览器工具无法模拟 iPadOS 真实 `DeviceMotionEvent` 权限弹窗和物理设备倾斜。
- Risk：真实 Safari/PWA 旧 service worker 更新可能需要用户关闭重开或等待 SW 激活；若真机仍反向，应采集一次 `screen.orientation.angle` 与 `accelerationIncludingGravity` 样本再校准。
