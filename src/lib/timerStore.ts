import { create } from 'zustand';

export type TimerState = 'idle' | 'running' | 'paused' | 'break' | 'completed' | 'interrupted';

export interface Tag {
  id: string;
  name: string;
  color: string;
  defaultDuration: number; // seconds
  icon: string;
}

export const DEFAULT_TAGS: Tag[] = [
  { id: 'focus', name: 'Focus', color: '#F06858', defaultDuration: 25 * 60, icon: '🎯' },
  { id: 'work', name: 'Work', color: '#4CAF50', defaultDuration: 60 * 60, icon: '💼' },
  { id: 'study', name: 'Study', color: '#00BCD4', defaultDuration: 45 * 60, icon: '📚' },
  { id: 'read', name: 'Read', color: '#CDDC39', defaultDuration: 30 * 60, icon: '📖' },
  { id: 'fitness', name: 'Fitness', color: '#FFC107', defaultDuration: 10 * 60, icon: '💪' },
];

interface TimerStore {
  // State
  state: TimerState;
  selectedTag: Tag;
  totalDuration: number;     // seconds
  remaining: number;          // seconds
  completedPomodoros: number;
  cycleCount: number;         // pomodoros in current cycle
  
  // Settings
  pomodoroCycle: number;
  shortBreak: number;         // seconds
  longBreak: number;          // seconds
  
  // History
  todayFocusSeconds: number;
  todayCompleted: number;
  todayInterrupted: number;
  
  // Actions
  setTag: (tag: Tag) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  complete: () => void;
  interrupt: () => void;
  tick: () => void;
  startBreak: () => void;
  skipBreak: () => void;
  reset: () => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  state: 'idle',
  selectedTag: DEFAULT_TAGS[0],
  totalDuration: DEFAULT_TAGS[0].defaultDuration,
  remaining: DEFAULT_TAGS[0].defaultDuration,
  completedPomodoros: 0,
  cycleCount: 0,
  
  pomodoroCycle: 4,
  shortBreak: 5 * 60,
  longBreak: 20 * 60,
  
  todayFocusSeconds: 0,
  todayCompleted: 0,
  todayInterrupted: 0,
  
  setTag: (tag) => set({ 
    selectedTag: tag, 
    totalDuration: tag.defaultDuration, 
    remaining: tag.defaultDuration,
    state: 'idle',
  }),
  
  start: () => {
    const { selectedTag } = get();
    set({ 
      state: 'running', 
      totalDuration: selectedTag.defaultDuration,
      remaining: selectedTag.defaultDuration,
    });
  },
  
  pause: () => set({ state: 'paused' }),
  
  resume: () => set({ state: 'running' }),
  
  complete: () => {
    const s = get();
    const focusTime = s.totalDuration;
    set({
      state: 'completed',
      todayFocusSeconds: s.todayFocusSeconds + focusTime,
      todayCompleted: s.todayCompleted + 1,
      completedPomodoros: s.completedPomodoros + 1,
      cycleCount: s.cycleCount + 1,
    });
  },
  
  interrupt: () => {
    const s = get();
    const elapsed = s.totalDuration - s.remaining;
    set({
      state: 'interrupted',
      todayFocusSeconds: s.todayFocusSeconds + elapsed,
      todayInterrupted: s.todayInterrupted + 1,
    });
  },
  
  tick: () => {
    const s = get();
    if (s.state !== 'running') return;
    if (s.remaining <= 1) {
      get().complete();
      return;
    }
    set({ remaining: s.remaining - 1 });
  },
  
  startBreak: () => {
    const s = get();
    const isLongBreak = s.cycleCount >= s.pomodoroCycle;
    const breakDuration = isLongBreak ? s.longBreak : s.shortBreak;
    set({
      state: 'break',
      remaining: breakDuration,
      totalDuration: breakDuration,
      cycleCount: isLongBreak ? 0 : s.cycleCount,
    });
  },
  
  skipBreak: () => set({ state: 'idle', remaining: get().totalDuration }),
  
  reset: () => {
    const s = get();
    set({
      state: 'idle',
      remaining: s.selectedTag.defaultDuration,
      totalDuration: s.selectedTag.defaultDuration,
    });
  },
}));
