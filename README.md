This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## AI Agent / MCP-style access

FocusPomo can expose a signed-in user's own focus system to an AI agent. The feature is only shown in Settings after Google sign-in.

Agent-accessible resources:

- `tasks` — the full FocusPomo todo list.
- `todayTasks` — the current planned items shown in the Today's Top 3 area.
- `focusRecords` — Pomodoro history records, including completed and interrupted sessions.
- `calendar` — the current week timeline derived from focus records.
- `summary` — compact counts for open tasks, completed tasks, today's focus time, and completed focus sessions.
- `snapshot` — the sanitized local-first cloud snapshot.

Supported write actions:

- `replace_today` — replace the current planned Today Top 3 items.
- `add_task` — add one todo item.
- `update_task` — update title, notes, priority flags, plannedToday, completion, estimate, or due date.
- `delete_task` — delete one todo item.
- `plan_today` — mark existing task ids as today's planned items.

Security model:

- Users generate their own Agent Key from Settings → AI Agent.
- The key is shown once and is stored server-side only as a SHA-256 hash.
- Requests use `Authorization: Bearer YOUR_FOCUSPOMO_AGENT_KEY` against `/api/agent/tasks`.
- A user key resolves only that user's data; unauthenticated users do not see the Agent connection UI.
- Do not commit real Agent Keys, Google tokens, cookies, or `.env.local` values to GitHub.
