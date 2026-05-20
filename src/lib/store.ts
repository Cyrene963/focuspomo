import { create } from 'zustand';

export type TimerState = 'idle' | 'running' | 'completed';
export type Page = 'timer' | 'stats' | 'settings' | 'summary';

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
}

interface Store {
  // Navigation
  page: Page;
  setPage: (p: Page) => void;

  // Timer
  state: TimerState;
  selectedTag: Tag;
  remaining: number;
  startTime: number | null;
  muted: boolean;

  // Tags
  tags: Tag[];
  addTag: (t: Omit<Tag, 'id'>) => void;
  removeTag: (id: string) => void;
  selectTag: (id: string) => void;

  // Timer actions
  start: () => void;
  complete: () => void;
  interrupt: () => void;
  reset: () => void;
  tick: () => void;
  toggleMute: () => void;

  // History
  history: PomodoroRecord[];
  cycleCount: number;

  // Settings
  pomodoroCycle: number;
  shortBreak: number;
  longBreak: number;
  setPomodoroCycle: (n: number) => void;
  setShortBreak: (s: number) => void;
  setLongBreak: (s: number) => void;
}

// --- Persistence ---
function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function saveJSON(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

const DEFAULT_TAGS: Tag[] = [
  { id: 'focus', name: 'Focus', color: '#E07A45', duration: 25 * 60 },
  { id: 'work', name: 'Work', color: '#55A67A', duration: 60 * 60 },
  { id: 'study', name: 'Study', color: '#3ABFBF', duration: 45 * 60 },
  { id: 'read', name: 'Read', color: '#B8C840', duration: 30 * 60 },
  { id: 'fitness', name: 'Fitness', color: '#D4A82A', duration: 10 * 60 },
  { id: 'design', name: 'Design', color: '#D4A82A', duration: 45 * 60 },
];

const savedTags = loadJSON<Tag[]>('fp-tags', DEFAULT_TAGS);
const savedTag = loadJSON<{ id: string }>('fp-selected-tag', { id: 'focus' });
const initTag = savedTags.find(t => t.id === savedTag.id) || savedTags[0];

export const useStore = create<Store>((set, get) => ({
  page: 'timer',
  setPage: (p) => set({ page: p }),

  state: 'idle',
  selectedTag: initTag,
  remaining: initTag.duration,
  startTime: null,
  muted: loadJSON('fp-muted', false),

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

  start: () => {
    const { selectedTag } = get();
    set({ state: 'running', remaining: selectedTag.duration, startTime: Date.now() });
  },
  complete: () => {
    const { selectedTag, startTime, history, cycleCount } = get();
    const now = Date.now();
    const record: PomodoroRecord = {
      id: crypto.randomUUID(),
      tagId: selectedTag.id,
      tagName: selectedTag.name,
      tagColor: selectedTag.color,
      plannedDuration: selectedTag.duration,
      actualDuration: startTime ? Math.round((now - startTime) / 1000) : selectedTag.duration,
      startTime: startTime || now - selectedTag.duration * 1000,
      endTime: now,
      completed: true,
    };
    const h = [...history, record];
    saveJSON('fp-history', h);
    set({ state: 'completed', remaining: 0, history: h, cycleCount: cycleCount + 1 });
  },
  interrupt: () => {
    const { selectedTag, startTime, history } = get();
    const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    if (elapsed > 10) {
      const record: PomodoroRecord = {
        id: crypto.randomUUID(),
        tagId: selectedTag.id,
        tagName: selectedTag.name,
        tagColor: selectedTag.color,
        plannedDuration: selectedTag.duration,
        actualDuration: elapsed,
        startTime: startTime || Date.now() - elapsed * 1000,
        endTime: Date.now(),
        completed: false,
      };
      const h = [...history, record];
      saveJSON('fp-history', h);
      set({ state: 'idle', remaining: selectedTag.duration, startTime: null, history: h });
    } else {
      set({ state: 'idle', remaining: selectedTag.duration, startTime: null });
    }
  },
  reset: () => {
    set({ state: 'idle', remaining: get().selectedTag.duration, startTime: null });
  },
  tick: () => {
    const { state, startTime, selectedTag } = get();
    if (state !== 'running' || !startTime) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(selectedTag.duration - elapsed, 0);
    if (remaining <= 0) { get().complete(); return; }
    set({ remaining });
  },
  toggleMute: () => {
    const m = !get().muted;
    saveJSON('fp-muted', m);
    set({ muted: m });
  },

  history: loadJSON<PomodoroRecord[]>('fp-history', []),
  cycleCount: loadJSON('fp-cycle-count', 0),

  pomodoroCycle: 4,
  shortBreak: 5 * 60,
  longBreak: 20 * 60,
  setPomodoroCycle: (n) => set({ pomodoroCycle: n }),
  setShortBreak: (s) => set({ shortBreak: s }),
  setLongBreak: (s) => set({ longBreak: s }),
}));
