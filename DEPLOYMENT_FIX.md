# FocusPomo & Beibei 部署修复报告

## 2026-06-05 发现的问题

### ❌ 主要问题
1. **代码已提交但未部署** - git有最新代码，但服务器运行的是旧build
2. **Focuspomo 6029次崩溃重启** - 没有.next目录
3. **成就系统创建了但未接入** - AchievementCelebration/AchievementBadges组件存在但无任何引用
4. **重力感应重复授权** - 每次切换页面都重新请求权限

### ✅ 已修复
1. ✅ 重新build两个项目
2. ✅ pm2 reload重启服务
3. ✅ 重力感应授权状态持久化到localStorage
4. ✅ 防止重复授权请求

### 🔧 还需要做的
1. **成就系统接入** - 需要在complete()时检查成就并显示庆祝动画
2. **Beibei通知权限持久化** - 检查是否有重复授权问题
3. **测试PWA离线体验** - 确认SW正常工作

## 重力感应修复详情

修改文件：`/root/projects/focuspomo/src/components/TomatoPhysics.tsx`

**问题**：
- 每次切换页面重新挂载组件时都会重新请求权限
- 用户已授权但状态未保存

**解决方案**：
1. 添加 `motionInitializedRef` 跟踪是否已初始化
2. 授权成功/失败时保存到 localStorage: `fp-motion-permission`
3. 组件挂载时恢复授权状态
4. `enableMotion()` 检查是否已初始化，避免重复请求

## 成就系统现状

**已创建的文件**：
- `/root/projects/focuspomo/src/lib/achievements.ts` - 9种成就定义
- `/root/projects/focuspomo/src/components/AchievementCelebration.tsx` - 全屏庆祝动画
- `/root/projects/focuspomo/src/components/AchievementBadges.tsx` - 徽章网格展示

**问题**：
- ❌ 没有任何地方import这些组件
- ❌ store中没有成就状态管理
- ❌ complete()时没有检查成就触发

**需要的改动**：
1. 在store中添加 `unlockedAchievements: Set<AchievementId>`
2. 在store中添加 `checkAndUnlockAchievements()` 方法
3. 在 `complete()` 方法后调用成就检查
4. 在ClientApp.tsx中添加AchievementCelebration组件
5. 在stats页面添加AchievementBadges展示

## 用户反馈的问题

1. ✅ "没看到成就系统" - 因为根本没接入
2. ✅ "切换页面又要授权倾斜" - 已修复，加入localStorage持久化
3. ⚠️ "PWA授权过一次还需要再授权" - 需要检查是否有类似问题

## 下一步行动

优先级排序：

**P0 (立即修复)**:
1. 重新build + reload (✅ 已完成)
2. 清除用户浏览器缓存指南

**P1 (本周完成)**:
1. 成就系统真正接入
2. PWA通知权限持久化检查
3. 添加"清除缓存"提示到设置页面

**P2 (可选优化)**:
1. 添加重力感应校准UI
2. 成就系统数据同步到云端
3. 分享成就卡片功能
