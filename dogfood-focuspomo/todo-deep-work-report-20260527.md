# FocusPomo To-Do / Top-3 深度体验与实现报告

时间：2026-05-27 00:56 +08
线上地址：https://focuspomo.bz9.me/
工作区：/root/projects/focuspomo
本轮目标：完整真人用户视角审计 FocusPomo 长期使用体验，并新增一个不臃肿、精致、能真正推动行动的 To-Do / 今日三件事功能。

## 结论

已完成并部署一个新的“今天三件事”任务页，集成到现有左右滑动导航中：

统计 ← 计时器 ←→ 任务 ←→ 日历 ←→ 设置

这次没有做假 Google Calendar、假账号同步、假 AI 大模型按钮。原因是当前项目还没有用户账号/后端同步/授权模型，直接放 Google Sync 会变成 no-op 或半成品。先做本地离线优先的高质量闭环，符合 PWA 原生体验和“不臃肿”的目标。

## 本轮产品判断

用户真实痛点不是“再多一个任务管理器”，而是：

1. 想法太多，最后自动滑向轻松长视频。
2. 每天看似有很多可做的事，但缺少“今天只推进三件”的强约束。
3. 过去 To-Do list 曾经有效，说明任务系统有真实价值，但长期坚持困难，需要更轻、更少输入、更强行动入口。
4. FocusPomo 本身是专注计时器，不应变成 Notion/Todoist/ClickUp；任务层必须服务“开始一个番茄”，而不是把用户困在整理系统里。

因此本轮设计采用：

- 今日 Top 3：每天只让用户挑最多三件真正推进的事。
- Eisenhower 四象限：重要且紧急 / 重要不紧急 / 紧急不重要 / 不重要不紧急。
- 高中低优先级：由重要/紧急自动推导，避免用户填太多字段。
- 番茄估算：每个任务估 1-8 个番茄，把 To-Do 和计时器连接起来。
- 智能选今天三件事：本地 deterministic scoring，不伪装成联网 AI。
- 简单拆解：对“读书、写作、运动”这类一次性输入，用逗号/顿号/分号拆成小任务。

## 已实现

### 1. 新增任务数据模型

文件：src/lib/store.ts

新增 TaskItem：

- id
- title
- notes
- priority: low / medium / high
- important
- urgent
- estimatedPomodoros
- completed
- plannedToday
- createdAt / updatedAt / completedAt
- dueDate

持久化：localStorage `fp-tasks`。

### 2. 新增任务操作

文件：src/lib/store.ts

- addTask
- updateTask
- toggleTask
- deleteTask
- smartPlanToday
- splitTask
- clearCompletedTasks

smartPlanToday 的排序逻辑：

- 重要 +8
- 紧急 +5
- 高优先级 +4 / 中 +2 / 低 +0
- 近 due date 加权
- 太大的任务轻微降权，鼓励今天推进可开始的小块

### 3. 新增 TasksPage

文件：src/components/TasksPage.tsx

页面结构：

- 顶部“今天三件事”标题 + 圆形完成进度
- 新任务输入卡片
- 重要/紧急按钮
- 番茄估算 stepper
- “智能选今天三件事”按钮
- 今日 Top 3 卡片
- 任务统计：未完成 / 今日完成 / 本周完成
- 四象限任务列表
- 已完成列表 + 清理按钮

视觉上保持现有 FocusPomo 的玻璃卡片、番茄橙、iOS-like 控件风格，没有引入重型 kanban/项目管理 UI。

### 4. 接入导航

文件：src/components/AppShell.tsx

新增 page 类型：tasks。

导航顺序调整为：

- 左侧：统计
- 中心：计时器
- 右侧第一层：任务
- 右侧第二层：日历
- 右侧第三层：设置

键盘左右箭头仍然复用相对 swipe handler，没有破坏之前“左键=向左滑，右键=向右滑”的硬规则。

## 验证结果

### Build

命令：npm run build

结果：通过。

仅保留 Next.js 16 的既有提示：middleware file convention deprecated，建议未来迁移到 proxy。这不是本轮新增错误。

### 静态断言

全部通过：

- TasksPage 已被 AppShell import。
- Page union 已包含 tasks。
- 页面包含“今天三件事 / 今日 Top 3”。
- 四象限文案全部存在。
- smartPlanToday 和 fp-tasks 持久化存在。
- 没有加入假的 Google Sync UI。
- 没有保留“AI 选今天三件事”这种会误导用户以为已接入模型的文案。

### 部署

已执行：pm2 restart focuspomo --update-env

结果：focuspomo online。

### HTTP

- 本地 http://127.0.0.1:3457/ → 200
- 线上 https://focuspomo.bz9.me/ → 200
- root header：no-cache, no-store, must-revalidate, max-age=0
- cf-cache-status：DYNAMIC

### served bundle

已验证线上/本地服务出来的 JS chunk 包含“今天三件事”标记，说明不是只改源码，运行态已加载新功能。

### PWA 回归

- service worker 不再 cache.put('/')。
- service worker 静态列表不含根路径 '/'。
- favicon.ico payload 为 PNG 编码。
- apple-touch-icon.png 存在，RGBA，180x180。

## Claude 审计状态

按你的要求尝试调用 Claude Code 做第二审计。

结果：Claude CLI 返回：Not logged in · Please run /login。

我检查到存在 /root/.hermes/secrets/claude_anyrouter.env，里面有 ANTHROPIC_API_KEY 和 ANTHROPIC_BASE_URL，但当前 Claude Code 2.1.150 仍走登录态，未成功进入 API-key 审计模式。因此本轮没有把 Claude 的空结果当成有效审计，也没有声称 Claude 已审过。

产物：dogfood-focuspomo/claude-todo-audit-20260527-004622.md 记录了失败输出。

## Google Calendar / Google Account 同步判断

暂不做，原因：

1. 当前 FocusPomo 没有用户系统。
2. 没有后端数据模型。
3. Google OAuth + Calendar Sync 需要 token 存储、刷新、冲突解决、隐私边界、离线合并策略。
4. 如果现在放入口，会违反之前定下的规则：不做 fake controls、不做 no-op 设置。

合理路线是下一阶段单独做“账号与同步”设计：

- 本地优先数据模型先稳定。
- 再加可选登录。
- 再做导出/导入。
- 最后做 Google Calendar 单向/双向同步。

## 剩余建议 backlog

P1：任务和番茄计时更深联动
- 在开始计时前可选择“当前任务”。
- 完成番茄后自动给任务累计一个番茄。
- 任务达到 estimatedPomodoros 后提示完成。

P1：手动补录专注时间
- 原版“我的番茄”有手动添加专注时间。
- 这对真实长期用户很重要，因为不是每次都会打开计时器。

P2：正计时模式
- 原版支持 count-up，适合不知道要做多久的开放任务。

P2：任务长期统计
- 当前已做今日完成/本周完成。
- 后续可加入“连续完成 Top 3 天数”“本周重要不紧急投入”。

P2：真正 AI 任务拆解
- 需要后端 API route + provider 配置 + 隐私提示。
- 不应在纯前端假装 AI。

## 文件变更

- src/lib/store.ts
- src/components/AppShell.tsx
- src/components/TasksPage.tsx
- dogfood-focuspomo/todo-deep-work-state-20260527.json
- dogfood-focuspomo/todo-deep-work-report-20260527.md

注意：public/sw.js 仍显示为已修改，这是上一轮 PWA cache-name 修复遗留/延续状态，本轮验证确认它仍符合“不缓存根 HTML”的规则。
