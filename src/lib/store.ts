import { create } from 'zustand';
import { writeClientUpdatedAt, writeLocalSnapshotKey, type SNAPSHOT_KEYS } from "@/lib/cloudSync";
import type { AchievementId } from "@/lib/achievements";

export type TimerState = 'idle' | 'running' | 'completed';
export type TimerSession = 'focus' | 'shortBreak' | 'longBreak';
export type Page = 'timer' | 'stats' | 'tasks' | 'calendar' | 'settings' | 'summary';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskQuadrant = 'do' | 'schedule' | 'delegate' | 'drop';

export interface Tag {
  id: string;
  name: string;
  color: string;
  duration: number; // seconds
}

export interface PomodoroRecord {
  id: string;
  tagId: string;
  tagName: string;
  tagColor: string;
  plannedDuration: number;
  actualDuration: number;
  startTime: number;
  endTime: number;
  completed: boolean;
  taskId?: string;
  taskTitle?: string;
}

export interface HarvestedTomato {
  id: string;
  completed: boolean;
  durationSeconds: number;
  collectedAt: number;
}

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  priority: TaskPriority;
  important: boolean;
  urgent: boolean;
  estimatedPomodoros: number;
  completed: boolean;
  plannedToday: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  dueDate?: number;
}

interface ActiveTimerSnapshot {
  state: 'running';
  session: TimerSession;
  tagId: string;
  activeDuration: number;
  startTime: number;
  taskId?: string;
}

interface Store {
  // Navigation
  page: Page;
  setPage: (p: Page) => void;
  focusMode: boolean;
  enterFocusMode: () => void;
  exitFocusMode: () => void;

  // Timer
  state: TimerState;
  selectedTag: Tag;
  session: TimerSession;
  activeDuration: number;
  remaining: number;
  startTime: number | null;
  muted: boolean;
  notificationsEnabled: boolean;

  // Tags
  tags: Tag[];
  addTag: (t: Omit<Tag, 'id'>) => void;
  removeTag: (id: string) => void;
  selectTag: (id: string) => void;
  setSelectedTagDuration: (seconds: number) => void;

  // Timer actions
  start: () => void;
  startTask: (taskId: string) => void;
  startBreak: () => void;
  complete: () => void;
  interrupt: () => void;
  reset: () => void;
  tick: () => void;
  toggleMute: () => void;
  setNotificationsEnabled: (v: boolean) => void;

  // History
  history: PomodoroRecord[];
  cycleCount: number;
  harvestedTomatoes: HarvestedTomato[];
  addManualRecord: (input: { tagId: string; startTime: number; durationSeconds: number }) => void;

  // Tasks
  tasks: TaskItem[];
  addTask: (input: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt' | 'completed' | 'plannedToday'> & Partial<Pick<TaskItem, 'completed' | 'plannedToday'>>) => void;
  updateTask: (id: string, patch: Partial<Omit<TaskItem, 'id' | 'createdAt'>>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  smartPlanToday: () => void;
  splitTask: (id: string) => void;
  clearCompletedTasks: () => void;

  // Settings
  pomodoroCycle: number;
  shortBreak: number;
  longBreak: number;
  vibration: boolean;
  use24HourTime: boolean;
  displayTomatoes: boolean;
  tiltTomatoes: boolean;
  setPomodoroCycle: (n: number) => void;
  setShortBreak: (s: number) => void;
  setLongBreak: (s: number) => void;
  toggleVibration: () => void;
  toggle24HourTime: () => void;
  toggleDisplayTomatoes: () => void;
  setTiltTomatoes: (v: boolean) => void;

  // Achievements
  unlockedAchievements: Set<AchievementId>;
  celebratingAchievement: AchievementId | null;
  setCelebratingAchievement: (id: AchievementId | null) => void;
  checkAndUnlockAchievements: () => AchievementId | null;
}

// --- Persistence ---
function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function saveJSON(key: typeof SNAPSHOT_KEYS[number], val: unknown) {
  try { writeLocalSnapshotKey(key, val); } catch {}
}

function clearActiveTimer() {
  saveJSON('fp-active-timer', null);
}

function saveActiveTimer(snapshot: ActiveTimerSnapshot) {
  saveJSON('fp-active-timer', snapshot);
}

function buildCompletedRecord(tag: Tag, activeDuration: number, startTime: number, task?: TaskItem): PomodoroRecord {
  return {
    id: crypto.randomUUID(),
    tagId: tag.id,
    tagName: tag.name,
    tagColor: tag.color,
    plannedDuration: activeDuration,
    actualDuration: activeDuration,
    startTime,
    endTime: startTime + activeDuration * 1000,
    completed: true,
    taskId: task?.id,
    taskTitle: task?.title,
  };
}

function buildInterruptedRecord(tag: Tag, activeDuration: number, startTime: number, endTime: number, task?: TaskItem): PomodoroRecord {
  const actualDuration = Math.max(0, Math.round((endTime - startTime) / 1000));
  return {
    id: crypto.randomUUID(),
    tagId: tag.id,
    tagName: tag.name,
    tagColor: tag.color,
    plannedDuration: activeDuration,
    actualDuration,
    startTime,
    endTime,
    completed: false,
    taskId: task?.id,
    taskTitle: task?.title,
  };
}

export const MIN_INTERRUPTED_RECORD_SECONDS = 1;

export function tomatoFromRecord(record: PomodoroRecord): HarvestedTomato {
  return {
    id: record.id,
    completed: record.completed,
    durationSeconds: record.actualDuration,
    collectedAt: record.endTime,
  };
}

export function mergeHarvestedTomatoes(history: PomodoroRecord[], harvested: HarvestedTomato[]): HarvestedTomato[] {
  const byId = new Map<string, HarvestedTomato>();
  for (const tomato of harvested) byId.set(tomato.id, tomato);
  for (const record of history) {
    if (record.completed || record.actualDuration >= MIN_INTERRUPTED_RECORD_SECONDS) {
      byId.set(record.id, tomatoFromRecord(record));
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => a.collectedAt - b.collectedAt)
    .slice(-50);
}

function sameHarvestedTomatoes(a: HarvestedTomato[], b: HarvestedTomato[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type RestoredTimer =
  | {
      kind: 'running';
      snapshot: ActiveTimerSnapshot;
      tag: Tag;
      remaining: number;
    }
  | {
      kind: 'completed';
      session: 'focus';
      tag: Tag;
      activeDuration: number;
    };

function restoreExpiredFocusTimer(snapshot: ActiveTimerSnapshot, tag: Tag, activeDuration: number): RestoredTimer {
  const history = loadJSON<PomodoroRecord[]>('fp-history', []);
  const endTime = snapshot.startTime + activeDuration * 1000;
  const alreadyRecorded = history.some(record => record.completed && Math.abs(record.endTime - endTime) < 1000);
  if (!alreadyRecorded) {
    const tasks = loadJSON<TaskItem[]>('fp-tasks', []);
    const task = snapshot.taskId ? tasks.find(t => t.id === snapshot.taskId) : undefined;
    const record = buildCompletedRecord(tag, activeDuration, snapshot.startTime, task);
    const nextHistory = [...history, record];
    saveJSON('fp-history', nextHistory);
    const tomatoes = mergeHarvestedTomatoes(nextHistory, loadJSON<HarvestedTomato[]>('fp-harvested-tomatoes', []));
    saveJSON('fp-harvested-tomatoes', tomatoes);
    saveJSON('fp-cycle-count', loadJSON('fp-cycle-count', 0) + 1);
  }
  clearActiveTimer();
  return { kind: 'completed', session: 'focus', tag, activeDuration };
}

function restoredTimer(tags: Tag[], fallbackTag: Tag): RestoredTimer | null {
  const snapshot = loadJSON<ActiveTimerSnapshot | null>('fp-active-timer', null);
  if (!snapshot || snapshot.state !== 'running' || !Number.isFinite(snapshot.startTime) || !Number.isFinite(snapshot.activeDuration)) return null;
  const activeDuration = Math.max(60, Math.min(12 * 60 * 60, Math.round(snapshot.activeDuration)));
  const elapsed = Math.max(0, Math.floor((Date.now() - snapshot.startTime) / 1000));
  const tag = tags.find(t => t.id === snapshot.tagId) || fallbackTag;
  const remaining = Math.max(activeDuration - elapsed, 0);
  if (remaining <= 0) {
    if (snapshot.session === 'focus') return restoreExpiredFocusTimer(snapshot, tag, activeDuration);
    clearActiveTimer();
    return null;
  }
  return {
    kind: 'running',
    snapshot: { ...snapshot, activeDuration, tagId: tag.id },
    tag,
    remaining,
  };
}

const DEFAULT_TAGS: Tag[] = [
  { id: 'focus', name: '专注', color: '#E07A45', duration: 25 * 60 },
  { id: 'work', name: '工作', color: '#55A67A', duration: 60 * 60 },
  { id: 'study', name: '学习', color: '#3ABFBF', duration: 45 * 60 },
  { id: 'read', name: '阅读', color: '#B8C840', duration: 30 * 60 },
  { id: 'fitness', name: '运动', color: '#D4A82A', duration: 10 * 60 },
  { id: 'design', name: '创作', color: '#D4A82A', duration: 45 * 60 },
];

const savedTags = loadJSON<Tag[]>('fp-tags', DEFAULT_TAGS);
const savedTag = loadJSON<{ id: string }>('fp-selected-tag', { id: 'focus' });
const initTag = savedTags.find(t => t.id === savedTag.id) || savedTags[0];
const initRestoredTimer = restoredTimer(savedTags, initTag);
const savedHistory = loadJSON<PomodoroRecord[]>('fp-history', []);
const storedHarvestedTomatoes = loadJSON<HarvestedTomato[]>('fp-harvested-tomatoes', []);
const savedHarvestedTomatoes = mergeHarvestedTomatoes(savedHistory, storedHarvestedTomatoes);
if (!sameHarvestedTomatoes(savedHarvestedTomatoes, storedHarvestedTomatoes)) {
  saveJSON('fp-harvested-tomatoes', savedHarvestedTomatoes);
  writeClientUpdatedAt(Date.now());
}

export const useStore = create<Store>((set, get) => ({
  page: 'timer',
  setPage: (p) => set({ page: p, focusMode: false }),
  focusMode: false,
  enterFocusMode: () => set({ page: 'timer', focusMode: true }),
  exitFocusMode: () => set({ focusMode: false }),

  state: initRestoredTimer?.kind === 'running' ? 'running' : initRestoredTimer?.kind === 'completed' ? 'completed' : 'idle',
  selectedTag: initRestoredTimer?.tag || initTag,
  session: initRestoredTimer?.kind === 'running' ? initRestoredTimer.snapshot.session : initRestoredTimer?.kind === 'completed' ? initRestoredTimer.session : 'focus',
  activeDuration: initRestoredTimer?.kind === 'running' ? initRestoredTimer.snapshot.activeDuration : initRestoredTimer?.kind === 'completed' ? initRestoredTimer.activeDuration : initTag.duration,
  remaining: initRestoredTimer?.kind === 'running' ? initRestoredTimer.remaining : initRestoredTimer?.kind === 'completed' ? 0 : initTag.duration,
  startTime: initRestoredTimer?.kind === 'running' ? initRestoredTimer.snapshot.startTime : null,
  muted: loadJSON('fp-muted', false),
  notificationsEnabled: loadJSON('fp-notifications-enabled', false),

  tags: savedTags,
  addTag: (t) => {
    const tag = { ...t, id: crypto.randomUUID().slice(0, 8) };
    const tags = [...get().tags, tag];
    saveJSON('fp-tags', tags);
    set({ tags });
  },
  removeTag: (id) => {
    const tags = get().tags.filter(t => t.id !== id);
    saveJSON('fp-tags', tags);
    set({ tags });
  },
  selectTag: (id) => {
    const tag = get().tags.find(t => t.id === id);
    if (tag) {
      saveJSON('fp-selected-tag', { id: tag.id });
      set({ selectedTag: tag, remaining: tag.duration });
    }
  },
  setSelectedTagDuration: (seconds) => {
    const clamped = Math.max(60, Math.min(120 * 60, Math.round(seconds)));
    const { selectedTag, tags, state } = get();
    const updatedTag = { ...selectedTag, duration: clamped };
    const updatedTags = tags.map(t => t.id === selectedTag.id ? updatedTag : t);
    saveJSON('fp-tags', updatedTags);
    set({
      tags: updatedTags,
      selectedTag: updatedTag,
      activeDuration: state === 'running' ? get().activeDuration : clamped,
      remaining: state === 'running' ? get().remaining : clamped,
    });
  },

  start: () => {
    const { selectedTag } = get();
    const startTime = Date.now();
    saveActiveTimer({ state: 'running', session: 'focus', tagId: selectedTag.id, activeDuration: selectedTag.duration, startTime });
    set({ state: 'running', session: 'focus', activeDuration: selectedTag.duration, remaining: selectedTag.duration, startTime, page: 'timer', focusMode: true });
  },
  startTask: (taskId) => {
    const { selectedTag, tasks } = get();
    const task = tasks.find(t => t.id === taskId && !t.completed);
    if (!task) return;
    const startTime = Date.now();
    saveActiveTimer({ state: 'running', session: 'focus', tagId: selectedTag.id, activeDuration: selectedTag.duration, startTime, taskId });
    set({ state: 'running', session: 'focus', activeDuration: selectedTag.duration, remaining: selectedTag.duration, startTime, page: 'timer', focusMode: true });
  },
  startBreak: () => {
    const { shortBreak, longBreak, cycleCount, pomodoroCycle, selectedTag } = get();
    const useLongBreak = cycleCount > 0 && cycleCount % Math.max(1, pomodoroCycle) === 0;
    const session = useLongBreak ? 'longBreak' : 'shortBreak';
    const duration = useLongBreak ? longBreak : shortBreak;
    const startTime = Date.now();
    saveActiveTimer({ state: 'running', session, tagId: selectedTag.id, activeDuration: duration, startTime });
    set({
      state: 'running',
      session,
      activeDuration: duration,
      remaining: duration,
      startTime,
    });
  },
  complete: () => {
    const { selectedTag, startTime, history, cycleCount, session, activeDuration, tasks } = get();
    if (session !== 'focus') {
      clearActiveTimer();
      set({ state: 'completed', remaining: 0, startTime: null });
      return;
    }
    const now = Date.now();
    const record: PomodoroRecord = startTime
      ? buildCompletedRecord(selectedTag, activeDuration, startTime, loadJSON<ActiveTimerSnapshot | null>('fp-active-timer', null)?.taskId ? tasks.find(t => t.id === loadJSON<ActiveTimerSnapshot | null>('fp-active-timer', null)?.taskId) : undefined)
      : {
          id: crypto.randomUUID(),
          tagId: selectedTag.id,
          tagName: selectedTag.name,
          tagColor: selectedTag.color,
          plannedDuration: activeDuration,
          actualDuration: activeDuration,
          startTime: now - activeDuration * 1000,
          endTime: now,
          completed: true,
        };
    const activeSnapshot = loadJSON<ActiveTimerSnapshot | null>('fp-active-timer', null);
    const boundTask = activeSnapshot?.taskId ? tasks.find(t => t.id === activeSnapshot.taskId) : undefined;
    if (!record.taskId && boundTask) { record.taskId = boundTask.id; record.taskTitle = boundTask.title; }
    const nextTasks = boundTask ? tasks.map(t => t.id === boundTask.id ? { ...t, estimatedPomodoros: Math.max(0, t.estimatedPomodoros - 1), completed: t.estimatedPomodoros <= 1 ? true : t.completed, completedAt: t.estimatedPomodoros <= 1 ? now : t.completedAt, updatedAt: now } : t) : tasks;
    const h = [...history, record];
    saveJSON('fp-history', h);
    const tomatoes = mergeHarvestedTomatoes(h, get().harvestedTomatoes);
    saveJSON('fp-harvested-tomatoes', tomatoes);
    const nextCycleCount = cycleCount + 1;
    saveJSON('fp-cycle-count', nextCycleCount);
    if (boundTask) saveJSON('fp-tasks', nextTasks);
    clearActiveTimer();
    set({ state: 'completed', session: 'focus', remaining: 0, history: h, harvestedTomatoes: tomatoes, cycleCount: nextCycleCount, startTime: null, tasks: nextTasks });

    // Check for achievements
    const achievementId = get().checkAndUnlockAchievements();
    if (achievementId) {
      set({ celebratingAchievement: achievementId });
    }
  },
  interrupt: () => {
    const { selectedTag, startTime, history, session, activeDuration } = get();
    if (session !== 'focus') {
      clearActiveTimer();
      set({ state: 'idle', session: 'focus', activeDuration: selectedTag.duration, remaining: selectedTag.duration, startTime: null, focusMode: false });
      return;
    }
    const now = Date.now();
    const elapsed = startTime ? Math.round((now - startTime) / 1000) : 0;
    if (startTime && elapsed >= MIN_INTERRUPTED_RECORD_SECONDS) {
      const record = buildInterruptedRecord(selectedTag, activeDuration, startTime, now);
      const h = [...history, record];
      saveJSON('fp-history', h);
      const tomatoes = mergeHarvestedTomatoes(h, get().harvestedTomatoes);
      saveJSON('fp-harvested-tomatoes', tomatoes);
      clearActiveTimer();
      set({ state: 'idle', session: 'focus', activeDuration: selectedTag.duration, remaining: selectedTag.duration, startTime: null, focusMode: false, history: h, harvestedTomatoes: tomatoes });
    } else {
      clearActiveTimer();
      set({ state: 'idle', session: 'focus', activeDuration: selectedTag.duration, remaining: selectedTag.duration, startTime: null, focusMode: false });
    }
  },
  reset: () => {
    clearActiveTimer();
    set({ state: 'idle', session: 'focus', activeDuration: get().selectedTag.duration, remaining: get().selectedTag.duration, startTime: null, focusMode: false });
  },
  tick: () => {
    const { state, startTime, activeDuration } = get();
    if (state !== 'running' || !startTime) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(activeDuration - elapsed, 0);
    if (remaining <= 0) { get().complete(); return; }
    set({ remaining });
  },
  toggleMute: () => {
    const m = !get().muted;
    saveJSON('fp-muted', m);
    set({ muted: m });
  },
  setNotificationsEnabled: (v) => {
    saveJSON('fp-notifications-enabled', v);
    set({ notificationsEnabled: v });
  },

  history: savedHistory,
  cycleCount: loadJSON('fp-cycle-count', 0),
  harvestedTomatoes: savedHarvestedTomatoes,
  addManualRecord: ({ tagId, startTime, durationSeconds }) => {
    const tag = get().tags.find(t => t.id === tagId) || get().selectedTag;
    const plannedDuration = Math.max(60, Math.min(12 * 60 * 60, Math.round(durationSeconds)));
    const safeStart = Number.isFinite(startTime) ? startTime : Date.now() - plannedDuration * 1000;
    const record: PomodoroRecord = {
      id: crypto.randomUUID(),
      tagId: tag.id,
      tagName: tag.name,
      tagColor: tag.color,
      plannedDuration,
      actualDuration: plannedDuration,
      startTime: safeStart,
      endTime: safeStart + plannedDuration * 1000,
      completed: true,
    };
    const h = [...get().history, record];
    saveJSON('fp-history', h);
    const tomatoes = mergeHarvestedTomatoes(h, get().harvestedTomatoes);
    saveJSON('fp-harvested-tomatoes', tomatoes);
    set({ history: h, harvestedTomatoes: tomatoes });
  },

  tasks: loadJSON<TaskItem[]>('fp-tasks', []),
  addTask: (input) => {
    const now = Date.now();
    const task: TaskItem = {
      id: crypto.randomUUID().slice(0, 10),
      title: input.title.trim(),
      notes: input.notes?.trim() || undefined,
      priority: input.priority,
      important: input.important,
      urgent: input.urgent,
      estimatedPomodoros: Math.max(1, Math.min(8, Math.round(input.estimatedPomodoros || 1))),
      completed: input.completed ?? false,
      plannedToday: input.plannedToday ?? false,
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now,
    };
    if (!task.title) return;
    const tasks = [task, ...get().tasks];
    saveJSON('fp-tasks', tasks);
    set({ tasks });
  },
  updateTask: (id, patch) => {
    const tasks = get().tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t);
    saveJSON('fp-tasks', tasks);
    set({ tasks });
  },
  toggleTask: (id) => {
    const tasks = get().tasks.map(t => {
      if (t.id !== id) return t;
      const done = !t.completed;
      return { ...t, completed: done, plannedToday: t.plannedToday, completedAt: done ? Date.now() : undefined, updatedAt: Date.now() };
    });
    saveJSON('fp-tasks', tasks);
    set({ tasks });
  },
  deleteTask: (id) => {
    const tasks = get().tasks.filter(t => t.id !== id);
    saveJSON('fp-tasks', tasks);
    set({ tasks });
  },
  smartPlanToday: () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const scored = get().tasks
      .filter(t => !t.completed)
      .map(t => {
        const dueBoost = t.dueDate ? Math.max(0, 4 - Math.floor((t.dueDate - now) / day)) : 0;
        const score =
          (t.important ? 8 : 0) +
          (t.urgent ? 5 : 0) +
          ({ high: 4, medium: 2, low: 0 } as Record<TaskPriority, number>)[t.priority] +
          dueBoost -
          Math.max(0, t.estimatedPomodoros - 2) * 0.8;
        return { id: t.id, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => x.id);
    const tasks = get().tasks.map(t => ({ ...t, plannedToday: scored.includes(t.id), updatedAt: scored.includes(t.id) ? Date.now() : t.updatedAt }));
    saveJSON('fp-tasks', tasks);
    set({ tasks });
  },
  splitTask: (id) => {
    const source = get().tasks.find(t => t.id === id);
    if (!source) return;
    const pieces = source.title
      .split(/[，,、；;\/]|\s+and\s+|\s+then\s+/i)
      .map(s => s.trim())
      .filter(s => s.length >= 2 && s !== source.title)
      .slice(0, 5);
    if (pieces.length <= 1) return;
    const now = Date.now();
    const children: TaskItem[] = pieces.map((title, i) => ({
      id: crypto.randomUUID().slice(0, 10),
      title,
      notes: `来自拆解：${source.title}`,
      priority: source.priority,
      important: source.important,
      urgent: source.urgent && i === 0,
      estimatedPomodoros: 1,
      completed: false,
      plannedToday: source.plannedToday && i < 3,
      dueDate: source.dueDate,
      createdAt: now,
      updatedAt: now,
    }));
    const tasks = [source, ...children, ...get().tasks.filter(t => t.id !== id)];
    saveJSON('fp-tasks', tasks);
    set({ tasks });
  },
  clearCompletedTasks: () => {
    const tasks = get().tasks.filter(t => !t.completed);
    saveJSON('fp-tasks', tasks);
    set({ tasks });
  },


  pomodoroCycle: loadJSON('fp-pomodoro-cycle', 4),
  shortBreak: loadJSON('fp-short-break', 5 * 60),
  longBreak: loadJSON('fp-long-break', 20 * 60),
  vibration: loadJSON('fp-vibration', true),
  use24HourTime: loadJSON('fp-24-hour-time', false),
  displayTomatoes: loadJSON('fp-display-tomatoes', true),
  tiltTomatoes: loadJSON('fp-tilt-tomatoes', false),
  setPomodoroCycle: (n) => { saveJSON('fp-pomodoro-cycle', n); set({ pomodoroCycle: n }); },
  setShortBreak: (s) => { saveJSON('fp-short-break', s); set({ shortBreak: s }); },
  setLongBreak: (s) => { saveJSON('fp-long-break', s); set({ longBreak: s }); },
  toggleVibration: () => { const v = !get().vibration; saveJSON('fp-vibration', v); set({ vibration: v }); },
  toggle24HourTime: () => { const v = !get().use24HourTime; saveJSON('fp-24-hour-time', v); set({ use24HourTime: v }); },
  toggleDisplayTomatoes: () => { const v = !get().displayTomatoes; saveJSON('fp-display-tomatoes', v); set({ displayTomatoes: v }); },
  setTiltTomatoes: (v) => { saveJSON('fp-tilt-tomatoes', v); set({ tiltTomatoes: v }); },

  // Achievements
  unlockedAchievements: new Set(loadJSON<AchievementId[]>('fp-unlocked-achievements', [])),
  celebratingAchievement: null,
  setCelebratingAchievement: (id) => set({ celebratingAchievement: id }),
  checkAndUnlockAchievements: () => {
    const state = get();
    const completedCount = state.history.filter(r => r.completed).length;
    const unlocked = state.unlockedAchievements;

    // Check milestone achievements
    if (completedCount === 1 && !unlocked.has('first-pomodoro')) {
      const newUnlocked = new Set(unlocked).add('first-pomodoro');
      saveJSON('fp-unlocked-achievements', Array.from(newUnlocked));
      set({ unlockedAchievements: newUnlocked });
      return 'first-pomodoro';
    }
    if (completedCount === 10 && !unlocked.has('milestone-10')) {
      const newUnlocked = new Set(unlocked).add('milestone-10');
      saveJSON('fp-unlocked-achievements', Array.from(newUnlocked));
      set({ unlockedAchievements: newUnlocked });
      return 'milestone-10';
    }
    if (completedCount === 50 && !unlocked.has('milestone-50')) {
      const newUnlocked = new Set(unlocked).add('milestone-50');
      saveJSON('fp-unlocked-achievements', Array.from(newUnlocked));
      set({ unlockedAchievements: newUnlocked });
      return 'milestone-50';
    }
    if (completedCount === 100 && !unlocked.has('milestone-100')) {
      const newUnlocked = new Set(unlocked).add('milestone-100');
      saveJSON('fp-unlocked-achievements', Array.from(newUnlocked));
      set({ unlockedAchievements: newUnlocked });
      return 'milestone-100';
    }

    return null;
  },
}));
