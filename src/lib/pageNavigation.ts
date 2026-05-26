import type { Page } from '@/lib/store';

export function swipeLeftFrom(page: Page): Page | null {
  switch (page) {
    case 'timer':
      return 'stats';
    case 'tasks':
      return 'timer';
    case 'calendar':
      return 'tasks';
    case 'settings':
      return 'calendar';
    default:
      return null;
  }
}

export function swipeRightFrom(page: Page): Page | null {
  switch (page) {
    case 'stats':
      return 'timer';
    case 'timer':
      return 'tasks';
    case 'tasks':
      return 'calendar';
    case 'calendar':
      return 'settings';
    default:
      return null;
  }
}
