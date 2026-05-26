# PWA offline verification

## Current FocusPomo policy

FocusPomo is intended to be local-first. After one successful online load and service-worker install, the timer shell should open offline and continue to use localStorage data.

The service worker caches:

- `/` app shell HTML
- current `/_next/static/*` assets discovered from the app shell
- manifest and app icons

It does not claim cloud sync or server-backed offline data.

## iPad verification checklist

1. Open `https://focuspomo.bz9.me/` online.
2. Wait until the page fully loads once.
3. Add to Home Screen or reopen the installed PWA.
4. Turn on Airplane Mode.
5. Open FocusPomo from the Home Screen.
6. Expected: app shell opens, existing local timer/task/stat data is visible.

If it still shows Safari's offline error, the service worker was not installed/activated before going offline. Reopen once online after this version and retry.

## Current beibei finding

beibei already has a stronger offline mode with IndexedDB (`src/lib/offline-db.ts`) and `/api/offline/bulk`, but its OfflineManager currently checks for cached `/offline` while the active PWA config uses `/offline.html`. That mismatch can make the manager think precache is broken and repeatedly unregister/reinstall the SW, which is a likely cause of iPad offline unreliability.

Fix target for beibei:

- Change OfflineManager cache check from `/offline` to `/offline.html`, or accept both.
- Verify `/api/offline/bulk` works for logged-in users before claiming full question-bank offline mode.
