#!/usr/bin/env python3
"""Verify FocusPomo/Pomofocus can be restored from the Git checkout."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_PATHS = [
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "ecosystem.dev.config.js",
    "public/manifest.json",
    "public/icons/icon-192.png",
    "public/icons/icon-512.png",
    "src/app/page.tsx",
    "src/lib/store.ts",
    "src/lib/cloudSync.ts",
    "src/lib/tomatoVisuals.ts",
    "scripts/disaster_recovery_audit.py",
]


def git_tracked(rel: str) -> bool:
    return subprocess.run(
        ["git", "ls-files", "--error-unmatch", rel],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    ).returncode == 0


def fail(message: str) -> None:
    print(f"❌ {message}")
    sys.exit(1)


def main() -> None:
    for rel in REQUIRED_PATHS:
        path = ROOT / rel
        if not path.exists():
            fail(f"missing required path: {rel}")
        if not git_tracked(rel):
            fail(f"required path is not tracked by Git: {rel}")

    public_files = [p for p in (ROOT / "public").rglob("*") if p.is_file()]
    untracked_public = [str(p.relative_to(ROOT)) for p in public_files if not git_tracked(str(p.relative_to(ROOT)))]
    if untracked_public:
        fail(f"public assets not tracked: {untracked_public[:20]}")

    print({
        "ok": True,
        "public_files": len(public_files),
        "note": "Timer/session data is client-local unless cloud sync is configured; no server DB is required for baseline restore.",
    })


if __name__ == "__main__":
    main()
