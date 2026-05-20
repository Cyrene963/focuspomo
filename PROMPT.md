# FocusPomo 像素级复刻 — 完整提示词

> 本文档供 Hermes Agent 执行。目标：将 /root/projects/focuspomo 从"能用"提升到"像素级还原"。
> 原版：FocusPomo (我的番茄) — iOS App Store 上的番茄钟应用。

---

## ⚠️ 架构级问题（必须最先解决）

### 问题 1：页面切换机制完全错误

**现状**：使用 Next.js 路由（`/`, `/timer`, `/calendar`, `/stats`, `/settings`），每次切换是整页刷新。
**原版**：单页面 + 左右滑动切换面板，TabBar 只切换视图区域，**不刷新页面**。

**修复方案**：
- 删除 `src/app/timer/`, `src/app/calendar/`, `src/app/stats/`, `src/app/summary/` 目录
- 在 `src/app/page.tsx` 中实现一个 **SwipeableViews** 容器
- 使用 CSS `transform: translateX()` + touch events 实现滑动
- 5 个面板横向排列：Home | Timer | Calendar | Stats | Settings
- 底部 TabBar 点击 = 滑动到对应面板（带动画）
- 面板切换时 **不卸载组件**，保持所有状态（计时器不会因为切到 Stats 再切回来就重置）

```tsx
// 核心布局结构
<div className="app-shell" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
  <div className="panels-container" style={{
    display: 'flex',
    width: '500%',  // 5 panels
    transform: `translateX(-${activeTab * 20}%)`,
    transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    flex: 1,
  }}>
    <HomePanel />
    <TimerPanel />
    <CalendarPanel />
    <StatsPanel />
    <SettingsPanel />
  </div>
  <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
</div>
```

**Touch 手势**：
```tsx
// onTouchStart 记录起点
// onTouchMove 计算 deltaX，实时跟手拖动（去掉 transition）
// onTouchEnd 如果 deltaX > 50px 或速度 > 0.3，则切换面板
// 松手后加回 transition 做归位动画
```

### 问题 2：TabBar 用 emoji 而不是 SVG 图标

**现状**：`🏠 ⏱ 📅 📊 ⚙️` — 看起来廉价，跟原版差距巨大。
**原版**：精致的线性 SVG 图标，未选中时为浅灰色，选中时为主题色。

**修复方案**：TabBar 用 SVG path 图标。5 个图标分别是：
1. Home：房子轮廓（圆角矩形 + 三角屋顶）
2. Timer：沙漏或时钟轮廓
3. Calendar：日历轮廓（方框 + 两个小挂耳 + 横线）
4. Stats：柱状图（3 根竖条，中间最高）
5. Settings：齿轮轮廓（圆形 + 6 个齿）

```tsx
const tabs = [
  { id: 'home', label: 'Home', icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#F06858' : '#B8A99A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" /><path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
    </svg>
  )},
  // ... 其他 4 个
];
```

---

## 页面 1：Timer（番茄钟计时器）

这是核心页面，也是差距最大的页面。

### 状态 A：待机（idle）

**背景**：
```
background: linear-gradient(180deg, #FDE8D8 0%, #FDE8D8 55%, #FFFFFF 55%, #FFFFFF 100%);
```
注意：原版是**硬切渐变**，不是平滑过渡！上半部分是暖桃色 `#FDE8D8`，约 55% 处突然变白。仿版用的是平滑渐变，这是最大视觉差异之一。

**圆形计时器**：
- 直径：260px（不是 280px）
- 描边：`stroke-width: 1.5`，颜色 `rgba(180, 150, 130, 0.35)`（淡棕色半透明）
- **无进度弧线**，只有静态圆圈轮廓
- 圆内居中显示时间：
  - 字号 68px（不是 72px），font-weight 600，颜色 `#5C4A3E`
  - 格式 `25:00`，冒号不缩小（当前代码冒号字号 60px 而数字 72px，要统一）
  - `font-variant-numeric: tabular-nums` 确保数字等宽
  - 字体：SF Pro Rounded（iOS）或 Nunito（Web fallback）

**标签选择器（圆下方）**：
- 位置：圆下方 14px
- 格式：`● Focus ›`（圆点 + 空格 + 标签名 + 空格 + 箭头）
- 圆点：8px，颜色 = 当前 tag 颜色（Focus = `#E07A45`）
- 文字：14px，weight 500，颜色 `#5C4A3E`
- 箭头 `›`：用 SVG `<path d="M4 2l4 4-4 4">` 而不是文字字符
- 点击弹出 Tag 选择弹窗（见下方）

**底部翻页指示器（Dots）**：
- **不是**番茄循环进度点！是页面滑动指示器
- 4 个点（对应 4 种计时模式：Focus / Short Break / Long Break / 自定义）
- 点直径 6px，间距 8px
- 当前页：实心 `#5C4A3E`
- 其他页：空心，描边 `rgba(91, 74, 66, 0.2)`
- 位置：标签选择器下方 20px

**开始按钮**：
- 文字：`Start Focus`（不是 `Start`）
- 宽 200px，高 50px，圆角 25px（pill 形）
- 背景 `#5C4A3E`（深棕色），文字白色
- 字号 16px，weight 600
- 阴影：`0 2px 12px rgba(92, 74, 62, 0.15)`
- 位置：dots 下方 24px

### 状态 B：计时中（running）

**背景**：
```
background: linear-gradient(180deg, #FCC89E 0%, #FDE8D8 60%, #FFFFFF 100%);
```
注意：也是**硬切渐变**！上半部分是更深的暖橙色 `#FCC89E`，比待机状态更暖更橙。当前代码用的是 `radial-gradient`（径向渐变），完全不对。

**隐藏的元素**：
- 标签选择器按钮 → 隐藏
- Dots 指示器 → 隐藏
- 开始按钮 → 隐藏
- TabBar → 保持显示

**计时数字**：
- 水平垂直居中于整个视口（不是在圆圈内）
- 字号 88px（不是 96px），weight 600，颜色 `#5C4A3E`
- **无圆圈**！计时中不显示圆环

**右上角静音按钮**：
- 位置：`position: absolute; right: 20px; top: 60px;`
- 图标：喇叭 SVG，24x24，颜色 `#C8A88A`
- 点击切换静音/有声（localStorage 持久化）

**底部 "Hold To Stop" 文字**：
- 文字：`Hold To Stop Focus`（跟当前 tag 名称联动：`Hold To Stop {tagName}`）
- 颜色 `rgba(92, 74, 62, 0.35)`，字号 13px，weight 400
- 位置：距 TabBar 上方约 80px
- **长按 500ms 才停止**，防止误触
- 长按时显示环形进度条（从 0% 到 100% 的圆弧动画，0.5s）

### Tag 选择弹窗

**触发**：点击标签选择器按钮（`● Focus ›`）

**遮罩层**：
- 全屏覆盖，背景 `rgba(0, 0, 0, 0.55)` + `backdrop-filter: blur(8px)`
- 点击遮罩关闭

**内容区**：
- 垂直居中，宽 80%（不是 65%，太窄了）
- 背景 `rgba(40, 32, 28, 0.92)`（深棕色毛玻璃），圆角 20px
- 内边距 20px

**Tag 列表**：
- 每个 tag 是一个胶囊按钮，高 52px，宽 100%，圆角 26px
- 选中态：背景色 = tag 颜色，文字白色，weight 600
- 未选中态：背景 `rgba(255, 255, 255, 0.08)`，文字白色
- 每行布局：`[颜色圆点 12px] [tag名称 16px weight 500] [右侧时长 13px rgba(255,255,255,0.5)]`
- 间距：每行之间 8px

**右上角按钮**：
- `+ New Tag`：胶囊形，背景 `rgba(255, 255, 255, 0.12)`，文字白色 13px
- `•••`：更多选项菜单

### 模式切换（Swipe）

4 种模式，通过左右滑动或点击 dots 切换：

| 模式 | 时长 | 主题色 | 背景渐变上半色 |
|------|------|--------|----------------|
| Focus | 25:00 | #E07A45 | #FDE8D8 (idle) / #FCC89E (running) |
| Short Break | 5:00 | #6BAF8B | #E8F5EE |
| Long Break | 20:00 | #6B9FCF | #E3F0FA |
| Custom | 用户自定义 | 用户自定义 | 跟随 tag 颜色计算 |

**切换动画**：
- 面板滑动 300ms `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- 背景色 crossfade 400ms
- Dots 指示器实时跟随

### 计时完成

**动画**：
1. 计时到 0:00 时，页面闪烁（背景快速闪白 2 次）
2. 播放提示音（Web Audio API 或 `<audio>` 元素）
3. 弹出 "完成" 弹窗：显示本轮信息 + "开始休息" / "跳过休息" 按钮
4. 番茄掉落动画（已有的 TomatoDrop 组件可以保留）

**数据持久化**：
```ts
// localStorage key: 'focuspomo-history'
interface PomodoroRecord {
  id: string;           // crypto.randomUUID()
  tagId: string;        // 'focus', 'work', etc.
  tagName: string;      // 'Focus', 'Work', etc.
  duration: number;     // 计划时长（秒）
  actualDuration: number; // 实际时长（秒）
  startTime: number;    // Date.now()
  endTime: number;      // Date.now()
  completed: boolean;   // true=完成, false=中断
}
```

---

## 页面 2：Home（首页）

**背景**：白色 `#FFFFFF`，无渐变。

**顶部区域**：
- 左上角：当前日期（如 "Sun, May 17"），字号 13px，颜色 `#B8A99A`
- 右上角：用户头像（圆形 36px，默认显示首字母）

**今日番茄卡片**：
- 大圆环进度条（直径 160px，描边 8px）
- 圆环背景色：`rgba(240, 104, 88, 0.1)`
- 圆环进度色：`#F06858`
- 圆内数字：今日完成数（大字号 48px weight 700）+ `/ 目标数`（小字号 18px）
- 下方标签："Today's Pomodoros"

**统计卡片行**：
- 横向滚动，每张卡片宽 140px，高 100px，圆角 16px
- 3 张卡片：
  1. "Focus Time" — 总专注分钟数，图标 ⏱
  2. "Completed" — 完成番茄数，图标 🍅
  3. "Streak" — 连续天数，图标 🔥
- 卡片背景：浅色（对应主题色的 10% 透明度版本）

**本月番茄区域**：
- 标题："本月番茄"（15px weight 700 颜色 #5B4A42）
- 番茄网格：按日期排列的小圆点（每行 7 个，对应一周）
- 完成的 = 实心 `#F06858`，未完成 = 空心 `rgba(91, 74, 66, 0.1)`

**快速开始按钮**：
- 页面底部（TabBar 上方）
- 圆角胶囊按钮："Start Focus →"
- 跳转到 Timer 面板

---

## 页面 3：Calendar（日历视图）

**背景**：白色 `#FFFFFF`

**顶部**：
- 月份切换器：`< 2026年5月 >`，左右箭头切换
- 星期行：日 一 二 三 四 五 六（字号 12px 颜色 #B8A99A）

**日历网格**：
- 7 列 × 5-6 行
- 每个日期格子：40x40px
- 有番茄记录的日期：下方显示小圆点（颜色 = tag 颜色）
- 今天：圆形背景 `rgba(240, 104, 88, 0.12)` + 文字 `#F06858`
- 选中日期：圆形背景 `#F06858` + 文字白色

**下方时间线**：
- 选中日期后，下方显示该日的时间线
- 每个番茄记录是一个色块（高度 = 时长比例，背景色 = tag 颜色）
- 显示标签名 + 时间范围（如 "Focus 10:00 - 10:25"）

---

## 页面 4：Stats（统计）

**背景**：白色 `#FFFFFF`

**顶部切换器**：
- 3 个选项：Week | Month | Year
- 胶囊形切换，选中态背景 `#5C4A3E` 文字白色

**柱状图**：
- 每根柱子宽 20px，圆角 10px（顶部）
- 柱子颜色：`#F06858`（有数据）/ `rgba(91, 74, 66, 0.06)`（无数据）
- X 轴标签：日期缩写（Mon, Tue, ...）
- Y 轴：分钟数
- 柱子之间间距 8px
- 当前选中的柱子有高亮效果（阴影 + 放大 1.05x）

**统计摘要**：
- 柱状图下方，3 列数据：
  - Total Focus: Xh Xm
  - Avg/Day: Xm
  - Best Day: Xh Xm

**标签分布**：
- 环形图或横向条形图
- 每个 tag 显示：颜色圆点 + 名称 + 百分比 + 总时长
- 条形高度 24px，圆角 12px

---

## 页面 5：Settings（设置）

**背景**：`#F8F4F0`（浅暖灰）

**设置组**（每组之间有间距，组内有分割线）：

**Timer 组**：
- Focus Duration: 滑块或步进器，范围 1-120 分钟
- Short Break: 1-30 分钟
- Long Break: 1-60 分钟
- Pomodoros Until Long Break: 2-8 个

**Notifications 组**：
- Sound: 开关 toggle
- Vibration: 开关 toggle
- Auto-start Break: 开关 toggle

**Appearance 组**：
- Theme: Light / Dark / System（横向选择器）

**About 组**：
- Share FocusPomo With Friends（箭头行，点击分享）
- About FocusPomo（箭头行）
- "Your valuable feedback will help us make FocusPomo even better."

**Toggle 开关样式**：
- 关：灰色轨道 `#E0D8D0`，白色圆形按钮
- 开：绿色轨道 `#6BAF8B`，白色圆形按钮
- 动画：200ms ease

---

## 全局样式规范

### 颜色系统

```
主色调：
  Brown-800:  #5C4A3E  （主要文字、按钮背景）
  Brown-600:  #8B7A6B  （次要文字）
  Brown-400:  #B8A99A  （占位文字、禁用态）
  Brown-200:  #D9CEC5  （分割线、边框）
  Brown-100:  #F0EBE6  （卡片背景、hover）

主题色：
  Orange:     #F06858  （Focus tag、强调色）
  Orange-Light: #FDE8D8 （待机背景上半）
  Orange-Mid:   #FCC89E （计时中背景上半）
  Green:      #6BAF8B  （Short Break）
  Blue:       #6B9FCF  （Long Break）
  Yellow:     #F0C75E  （自定义）

背景：
  White:      #FFFFFF
  Warm-White: #FDF6EC
  Warm-Gray:  #F8F4F0
```

### 字体

```css
font-family: 'SF Pro Rounded', 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
```

### 圆角规范

- 按钮：pill 形（height/2）
- 卡片：16px
- 弹窗：20px
- 输入框：12px
- Tag 胶囊：26px

### 动画规范

- 页面切换：300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)
- 按钮点击：scale(0.96) 100ms
- 弹窗出现：fade + scale(0.95→1) 250ms
- 背景色过渡：400ms ease
- 数字变化：200ms ease（用于计时器和统计数字）

---

## 实现优先级

1. **P0 — 架构重构**：单页面 + 滑动切换（替换路由方案）
2. **P0 — Timer 页面**：背景渐变 + 圆圈 + 计时逻辑 + 长按停止
3. **P1 — TabBar**：SVG 图标替换 emoji
4. **P1 — Tag 选择弹窗**：overlay + 毛玻璃
5. **P2 — Home 页面**：番茄进度环 + 统计卡片
6. **P2 — Calendar 页面**：月历 + 时间线
7. **P2 — Stats 页面**：柱状图 + 标签分布
8. **P3 — Settings 页面**：toggle 开关 + 滑块
9. **P3 — PWA 完善**：manifest + service worker + 离线支持

---

## 执行注意事项

1. **用 inline style 而不是 Tailwind class**：当前项目 Tailwind v4 配置有问题，arbitrary values 不生效。所有关键样式用 `style={{}}` 写死。
2. **不要用 `next/link` 做页面切换**：改用状态驱动的面板滑动。
3. **Framer Motion 只用于微动画**（按钮 hover、弹窗出现），不用来做页面切换。
4. **localStorage 做数据持久化**：不需要后端 API，所有数据存 localStorage。
5. **Web Worker 或 requestAnimationFrame 做计时器**：setInterval 在页面后台会被节流。
6. **`100dvh` 而不是 `100vh`**：移动端 Safari 的地址栏会遮挡 `100vh`。
7. **Touch 事件**：用 `onTouchStart/onTouchMove/onTouchEnd`，不要用 mouse events 模拟。
8. **Safe area**：TabBar 底部加 `padding-bottom: env(safe-area-inset-bottom)`。
