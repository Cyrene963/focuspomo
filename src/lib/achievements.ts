export type AchievementId =
  | 'first-pomodoro'
  | 'streak-7'
  | 'streak-30'
  | 'milestone-10'
  | 'milestone-50'
  | 'milestone-100'
  | 'milestone-500'
  | 'daily-star'
  | 'early-bird';

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'streak' | 'milestone' | 'special';
}

export interface AchievementProgress {
  id: AchievementId;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  target: number;
}

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  'first-pomodoro': {
    id: 'first-pomodoro',
    name: '第一个番茄',
    description: '完成第一个25分钟番茄',
    icon: '🌱',
    color: '#55A67A',
    category: 'special',
  },
  'streak-7': {
    id: 'streak-7',
    name: '连续7天',
    description: '连续7天完成番茄',
    icon: '🔥',
    color: '#E07A45',
    category: 'streak',
  },
  'streak-30': {
    id: 'streak-30',
    name: '月度坚持',
    description: '连续30天完成番茄',
    icon: '💎',
    color: '#3ABFBF',
    category: 'streak',
  },
  'milestone-10': {
    id: 'milestone-10',
    name: '起步',
    description: '累计完成10个番茄',
    icon: '⭐',
    color: '#D4A82A',
    category: 'milestone',
  },
  'milestone-50': {
    id: 'milestone-50',
    name: '进阶',
    description: '累计完成50个番茄',
    icon: '🌟',
    color: '#D4A82A',
    category: 'milestone',
  },
  'milestone-100': {
    id: 'milestone-100',
    name: '专家',
    description: '累计完成100个番茄',
    icon: '✨',
    color: '#D4A82A',
    category: 'milestone',
  },
  'milestone-500': {
    id: 'milestone-500',
    name: '大师',
    description: '累计完成500个番茄',
    icon: '🏆',
    color: '#D4A82A',
    category: 'milestone',
  },
  'daily-star': {
    id: 'daily-star',
    name: '单日之星',
    description: '单日完成8个番茄',
    icon: '⚡',
    color: '#E8644E',
    category: 'special',
  },
  'early-bird': {
    id: 'early-bird',
    name: '早起勋章',
    description: '6:00前完成番茄',
    icon: '🌅',
    color: '#B8C840',
    category: 'special',
  },
};

export interface UnlockedAchievement {
  id: AchievementId;
  unlockedAt: number;
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, val: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export function getUnlockedAchievements(): UnlockedAchievement[] {
  return loadJSON<UnlockedAchievement[]>('fp-achievements', []);
}

export function unlockAchievement(id: AchievementId): boolean {
  const unlocked = getUnlockedAchievements();
  if (unlocked.some(a => a.id === id)) return false;
  const newAchievement = { id, unlockedAt: Date.now() };
  saveJSON('fp-achievements', [...unlocked, newAchievement]);
  return true;
}

export function isAchievementUnlocked(id: AchievementId): boolean {
  return getUnlockedAchievements().some(a => a.id === id);
}

// Calculate current streak from history
export function calculateStreak(history: Array<{ endTime: number; completed: boolean }>): number {
  const completed = history.filter(h => h.completed).sort((a, b) => b.endTime - a.endTime);
  if (completed.length === 0) return 0;

  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  // Group by day
  const daySet = new Set<number>();
  for (const record of completed) {
    const recordDate = new Date(record.endTime);
    recordDate.setHours(0, 0, 0, 0);
    daySet.add(recordDate.getTime());
  }

  const days = Array.from(daySet).sort((a, b) => b - a);
  if (days.length === 0) return 0;

  // Check if today or yesterday has activity
  const latestDay = days[0];
  if (latestDay < todayStart - dayMs) return 0; // More than 1 day ago, streak broken

  let streak = 0;
  let expectedDay = todayStart;
  for (const day of days) {
    if (day === expectedDay || day === expectedDay - dayMs) {
      streak++;
      expectedDay = day - dayMs;
    } else {
      break;
    }
  }

  return streak;
}

// Get completed pomodoros for a specific day
export function getCompletedTodayCount(history: Array<{ endTime: number; completed: boolean }>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  return history.filter(h => h.completed && h.endTime >= todayStart && h.endTime < todayEnd).length;
}

// Check if a pomodoro was completed before 6 AM
export function wasCompletedBeforeSixAM(endTime: number): boolean {
  const date = new Date(endTime);
  const hour = date.getHours();
  return hour < 6;
}

// Calculate achievement progress
export function calculateAchievementProgress(
  history: Array<{ endTime: number; completed: boolean }>
): AchievementProgress[] {
  const unlocked = getUnlockedAchievements();
  const completedCount = history.filter(h => h.completed).length;
  const streak = calculateStreak(history);
  const todayCount = getCompletedTodayCount(history);
  const hasEarlyBird = history.some(h => h.completed && wasCompletedBeforeSixAM(h.endTime));

  const progress: AchievementProgress[] = [];

  for (const achievement of Object.values(ACHIEVEMENTS)) {
    const isUnlocked = unlocked.some(u => u.id === achievement.id);
    const unlockedAt = unlocked.find(u => u.id === achievement.id)?.unlockedAt;

    let current = 0;
    let target = 1;

    switch (achievement.id) {
      case 'first-pomodoro':
        current = completedCount > 0 ? 1 : 0;
        target = 1;
        break;
      case 'streak-7':
        current = streak;
        target = 7;
        break;
      case 'streak-30':
        current = streak;
        target = 30;
        break;
      case 'milestone-10':
        current = completedCount;
        target = 10;
        break;
      case 'milestone-50':
        current = completedCount;
        target = 50;
        break;
      case 'milestone-100':
        current = completedCount;
        target = 100;
        break;
      case 'milestone-500':
        current = completedCount;
        target = 500;
        break;
      case 'daily-star':
        current = todayCount;
        target = 8;
        break;
      case 'early-bird':
        current = hasEarlyBird ? 1 : 0;
        target = 1;
        break;
    }

    progress.push({
      id: achievement.id,
      unlocked: isUnlocked,
      unlockedAt,
      progress: current,
      target,
    });
  }

  return progress;
}

// Check and unlock achievements based on current progress
export function checkAndUnlockAchievements(
  history: Array<{ endTime: number; completed: boolean }>
): AchievementId[] {
  const progress = calculateAchievementProgress(history);
  const newlyUnlocked: AchievementId[] = [];

  for (const p of progress) {
    if (!p.unlocked && p.progress >= p.target) {
      const wasUnlocked = unlockAchievement(p.id);
      if (wasUnlocked) {
        newlyUnlocked.push(p.id);
      }
    }
  }

  return newlyUnlocked;
}
