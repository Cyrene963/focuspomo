"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { applySnapshot, hasUsefulLocalSnapshot, jsonFetch, localClientUpdatedAt, readSnapshot, snapshotSignature, type Snapshot } from "@/lib/cloudSync";

type CloudSnapshotResponse = {
  snapshot: {
    data: Snapshot;
    clientUpdatedAt: number;
    serverUpdatedAt: number;
  } | null;
};

type SyncStatus = "ready" | "restoring" | "uploading" | "synced" | "offline";

function emit(status: SyncStatus) {
  window.dispatchEvent(new CustomEvent("focuspomo:cloud-sync", { detail: { status } }));
}

function completeRecordSignature(history: ReturnType<typeof useStore.getState>["history"]) {
  return history
    .filter(r => r.completed && r.actualDuration >= 60)
    .map(r => r.id)
    .sort()
    .join("|");
}

async function uploadSnapshot(snapshot: Snapshot) {
  await jsonFetch<{ ok: boolean; serverUpdatedAt: number }>("/api/sync", {
    method: "PUT",
    body: JSON.stringify({ data: snapshot, clientUpdatedAt: localClientUpdatedAt() }),
  });
}

export default function CloudSyncAgent() {
  const history = useStore(s => s.history);
  const tasks = useStore(s => s.tasks);
  const tags = useStore(s => s.tags);
  const selectedTag = useStore(s => s.selectedTag);
  const cycleCount = useStore(s => s.cycleCount);
  const harvestedTomatoes = useStore(s => s.harvestedTomatoes);
  const pomodoroCycle = useStore(s => s.pomodoroCycle);
  const shortBreak = useStore(s => s.shortBreak);
  const longBreak = useStore(s => s.longBreak);
  const muted = useStore(s => s.muted);
  const notificationsEnabled = useStore(s => s.notificationsEnabled);
  const vibration = useStore(s => s.vibration);
  const use24HourTime = useStore(s => s.use24HourTime);
  const displayTomatoes = useStore(s => s.displayTomatoes);
  const tiltTomatoes = useStore(s => s.tiltTomatoes);

  const hydrated = useRef(false);
  const cloudSignature = useRef("");
  const lastUploadedSignature = useRef("");
  const lastCalendarSignature = useRef("");

  useEffect(() => {
    let alive = true;
    jsonFetch<CloudSnapshotResponse>("/api/sync")
      .then(async ({ snapshot }) => {
        if (!alive) return;
        const local = readSnapshot();
        const localUpdatedAt = localClientUpdatedAt();
        const localSignature = snapshotSignature(local);

        if (snapshot?.data) {
          const remoteSignature = snapshotSignature(snapshot.data);
          cloudSignature.current = remoteSignature;
          if (snapshot.clientUpdatedAt > localUpdatedAt && remoteSignature !== localSignature) {
            emit("restoring");
            applySnapshot(snapshot.data);
            return;
          }
          if (localUpdatedAt > snapshot.clientUpdatedAt && hasUsefulLocalSnapshot(local) && remoteSignature !== localSignature) {
            emit("uploading");
            await uploadSnapshot(local);
            if (!alive) return;
            cloudSignature.current = localSignature;
            lastUploadedSignature.current = localSignature;
            emit("synced");
          }
        } else if (hasUsefulLocalSnapshot(local)) {
          emit("uploading");
          const touched = readSnapshot({ touch: true });
          await uploadSnapshot(touched);
          if (!alive) return;
          const signature = snapshotSignature(touched);
          cloudSignature.current = signature;
          lastUploadedSignature.current = signature;
          emit("synced");
        }

        hydrated.current = true;
        emit("ready");
      })
      .catch(() => {
        if (!alive) return;
        hydrated.current = true;
        emit("offline");
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const snapshot = readSnapshot({ touch: true });
    const signature = snapshotSignature(snapshot);
    if (!signature || signature === cloudSignature.current || signature === lastUploadedSignature.current) return;

    const timer = window.setTimeout(() => {
      emit("uploading");
      uploadSnapshot(snapshot)
        .then(() => {
          cloudSignature.current = signature;
          lastUploadedSignature.current = signature;
          emit("synced");
        })
        .catch(() => emit("offline"));
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [history, tasks, tags, selectedTag, cycleCount, harvestedTomatoes, pomodoroCycle, shortBreak, longBreak, muted, notificationsEnabled, vibration, use24HourTime, displayTomatoes, tiltTomatoes]);

  useEffect(() => {
    const completed = history.filter(r => r.completed && r.actualDuration >= 60);
    const signature = completeRecordSignature(history);
    if (!signature || signature === lastCalendarSignature.current) return;
    lastCalendarSignature.current = signature;

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
