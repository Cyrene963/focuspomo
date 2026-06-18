"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { applySnapshot, hasUsefulLocalSnapshot, jsonFetch, LOCAL_PERSIST_EVENT, localClientUpdatedAt, readSnapshot, snapshotSignature, type Snapshot } from "@/lib/cloudSync";

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

async function hasSignedInUser() {
  try {
    const res = await jsonFetch<{ user: unknown | null }>("/api/me");
    return Boolean(res.user);
  } catch {
    return false;
  }
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
  const signedInRef = useRef(false);
  const cloudSignature = useRef("");
  const lastUploadedSignature = useRef("");
  const lastCalendarSignature = useRef("");
  const [persistVersion, setPersistVersion] = useState(0);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    const refreshAuthState = async () => {
      try {
        const signedIn = await hasSignedInUser();
        signedInRef.current = signedIn;
        setSignedIn(signedIn);
        if (!alive) return;
        if (!signedIn) {
          hydrated.current = true;
          emit("ready");
          return;
        }

        const { snapshot } = await jsonFetch<CloudSnapshotResponse>("/api/sync");
        if (!alive) return;
        const local = readSnapshot();
        const localUpdatedAt = localClientUpdatedAt();
        const localSignature = snapshotSignature(local);

        if (snapshot?.data) {
          const remoteSignature = snapshotSignature(snapshot.data);
          cloudSignature.current = remoteSignature;
          if (snapshot.clientUpdatedAt > localUpdatedAt && remoteSignature !== localSignature) {
            emit("restoring");
            applySnapshot({ ...snapshot.data, "fp-client-updated-at": snapshot.clientUpdatedAt });
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
      } catch {
        if (!alive) return;
        hydrated.current = true;
        emit("offline");
      }
    };

    void refreshAuthState();

    const onAuth = (event: Event) => {
      const auth = (event as CustomEvent<{ auth?: string }>).detail?.auth;
      if (!auth || auth === "connected" || auth === "calendar_connected" || auth === "signed_out") {
        void refreshAuthState();
      }
    };
    window.addEventListener("focuspomo:auth", onAuth);
    return () => {
      alive = false;
      window.removeEventListener("focuspomo:auth", onAuth);
    };
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    const poll = () => {
      jsonFetch<CloudSnapshotResponse>("/api/sync")
        .then(({ snapshot }) => {
          if (!snapshot?.data) return;
          const local = readSnapshot();
          const localUpdatedAt = localClientUpdatedAt();
          const remoteSignature = snapshotSignature(snapshot.data);
          if (snapshot.clientUpdatedAt > localUpdatedAt && remoteSignature !== snapshotSignature(local)) {
            emit("restoring");
            cloudSignature.current = remoteSignature;
            applySnapshot({ ...snapshot.data, "fp-client-updated-at": snapshot.clientUpdatedAt });
          }
        })
        .catch(() => {});
    };
    const timer = window.setInterval(poll, 30000);
    return () => window.clearInterval(timer);
  }, [signedIn]);

  useEffect(() => {
    const onPersist = () => setPersistVersion(v => v + 1);
    window.addEventListener(LOCAL_PERSIST_EVENT, onPersist);
    return () => window.removeEventListener(LOCAL_PERSIST_EVENT, onPersist);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    if (!signedInRef.current) {
      emit("ready");
      return;
    }
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
  }, [persistVersion, history, tasks, tags, selectedTag, cycleCount, harvestedTomatoes, pomodoroCycle, shortBreak, longBreak, muted, notificationsEnabled, vibration, use24HourTime, displayTomatoes, tiltTomatoes]);

  useEffect(() => {
    if (!signedInRef.current) return;
    const completed = history.filter(r => r.completed && r.actualDuration >= 60);
    const signature = completeRecordSignature(history);
    if (!signature || signature === lastCalendarSignature.current) return;
    lastCalendarSignature.current = signature;

    const timer = window.setTimeout(() => {
      jsonFetch("/api/calendar/sync", {
        method: "POST",
        body: JSON.stringify({ records: completed }),
      }).catch(() => {});
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [history]);

  return null;
}
