"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

export default function CloudSyncAgent() {
  const history = useStore(s => s.history);
  const lastSignature = useRef("");

  useEffect(() => {
    const completed = history.filter(r => r.completed && r.actualDuration >= 60);
    const signature = completed.map(r => r.id).sort().join("|");
    if (!signature || signature === lastSignature.current) return;
    lastSignature.current = signature;

    const timer = window.setTimeout(() => {
      fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: completed }),
      }).catch(() => {});
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [history]);

  return null;
}
