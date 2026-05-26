# Open-source configuration notes

FocusPomo should stay fully usable without private cloud credentials. Keep the default app local-first:

- Timer, task list, statistics, calendar view, theme, sound, vibration, and local notifications must work without login.
- Google login / Google Calendar sync must be optional and hidden or disabled when OAuth env vars are absent.
- Do not commit OAuth client secrets, API keys, VAPID private keys, database URLs, personal domains beyond public deployment examples, or local absolute secret paths.
- For hosted deployments, inject secrets through the process manager / hosting environment, not source code.

Recommended optional env names for future sync features:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://your-domain.example
```

Google Calendar should be introduced in phases:

1. Sign in only: `openid email profile`.
2. One-way calendar export: write completed focus sessions to Google Calendar only when the user explicitly enables it.
3. Read calendar context for today's planning.
4. Two-way sync only after conflict resolution and duplicate prevention exist.

Notification policy:

- Browser/local notifications need no secret and are safe for the open-source default.
- Web Push for server-scheduled reminders needs VAPID keys. If added later, commit only public key examples; never commit `VAPID_PRIVATE_KEY`.
