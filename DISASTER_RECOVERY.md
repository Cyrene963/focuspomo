# FocusPomo Disaster Recovery

This repository should be enough to restore the FocusPomo/Pomofocus web app after server loss.

## What Must Be Restorable

- Application source code.
- PWA manifest, service worker, app icons, screenshots, and tomato visual assets under `public/`.
- PM2 development deployment config: `ecosystem.dev.config.js`.
- Cloud sync API/client code.
- Recovery audit script.

Focus/session records are client-local by default unless cloud sync is configured. Baseline app recovery does not depend on a server database.

## Restore Steps

```bash
git clone https://github.com/Cyrene963/focuspomo.git /root/projects/focuspomo
cd /root/projects/focuspomo
npm install
python3 scripts/disaster_recovery_audit.py
npm run build
pm2 start ecosystem.dev.config.js --only focuspomo
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3457/
```

## Required Gates

```bash
python3 scripts/disaster_recovery_audit.py
curl -s -L -o /dev/null -w '%{http_code}\n' https://pomofocus.bz9.me
```

## Notes

- `.env.local` is intentionally ignored; keep only non-secret defaults in code.
- `public/` assets are required recovery assets and must be Git-tracked.
- Do not rely on server-local `.next/` or PM2 process memory as a backup.
- After meaningful changes, commit and push to `origin/main`, then verify remote HEAD.
