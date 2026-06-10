#!/usr/bin/env node

const store = new Map();
const now = 1_781_100_000_000;
const focusTag = { id: "focus", name: "专注", color: "#E07A45", duration: 60 };

function loadJSON(key, fallback) {
  const raw = store.get(key);
  return raw ? JSON.parse(raw) : fallback;
}

function saveJSON(key, value) {
  store.set(key, JSON.stringify(value));
}

function clearActiveTimer() {
  saveJSON("fp-active-timer", null);
}

function buildCompletedRecord(tag, activeDuration, startTime, task) {
  return {
    id: "record-1",
    tagId: tag.id,
    tagName: tag.name,
    tagColor: tag.color,
    plannedDuration: activeDuration,
    actualDuration: activeDuration,
    startTime,
    endTime: startTime + activeDuration * 1000,
    completed: true,
    taskId: task?.id,
    taskTitle: task?.title,
  };
}

function tomatoFromRecord(record) {
  return {
    id: record.id,
    completed: record.completed,
    durationSeconds: record.actualDuration,
    collectedAt: record.endTime,
  };
}

function restoreExpiredFocusTimer(snapshot, tag, activeDuration) {
  const history = loadJSON("fp-history", []);
  const endTime = snapshot.startTime + activeDuration * 1000;
  const alreadyRecorded = history.some(record => record.completed && Math.abs(record.endTime - endTime) < 1000);
  if (!alreadyRecorded) {
    const tasks = loadJSON("fp-tasks", []);
    const task = snapshot.taskId ? tasks.find(t => t.id === snapshot.taskId) : undefined;
    const record = buildCompletedRecord(tag, activeDuration, snapshot.startTime, task);
    const nextHistory = [...history, record];
    saveJSON("fp-history", nextHistory);
    const tomatoes = [...loadJSON("fp-harvested-tomatoes", []), tomatoFromRecord(record)].slice(-50);
    saveJSON("fp-harvested-tomatoes", tomatoes);
    saveJSON("fp-cycle-count", loadJSON("fp-cycle-count", 0) + 1);
  }
  clearActiveTimer();
  return { kind: "completed", session: "focus", tag, activeDuration };
}

function restoredTimer(tags, fallbackTag) {
  const snapshot = loadJSON("fp-active-timer", null);
  if (!snapshot || snapshot.state !== "running" || !Number.isFinite(snapshot.startTime) || !Number.isFinite(snapshot.activeDuration)) return null;
  const activeDuration = Math.max(60, Math.min(12 * 60 * 60, Math.round(snapshot.activeDuration)));
  const elapsed = Math.max(0, Math.floor((now - snapshot.startTime) / 1000));
  const tag = tags.find(t => t.id === snapshot.tagId) || fallbackTag;
  const remaining = Math.max(activeDuration - elapsed, 0);
  if (remaining <= 0) {
    if (snapshot.session === "focus") return restoreExpiredFocusTimer(snapshot, tag, activeDuration);
    clearActiveTimer();
    return null;
  }
  return {
    kind: "running",
    snapshot: { ...snapshot, activeDuration, tagId: tag.id },
    tag,
    remaining,
  };
}

saveJSON("fp-active-timer", {
  state: "running",
  session: "focus",
  tagId: "focus",
  activeDuration: 60,
  startTime: now - 70_000,
});
saveJSON("fp-history", []);
saveJSON("fp-harvested-tomatoes", []);
saveJSON("fp-cycle-count", 0);

const restored = restoredTimer([focusTag], focusTag);
const history = loadJSON("fp-history", []);
const tomatoes = loadJSON("fp-harvested-tomatoes", []);
const activeTimer = loadJSON("fp-active-timer", "missing");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(restored?.kind === "completed", "expired focus timer should restore completed UI state");
assert(history.length === 1 && history[0].completed === true, "completed history record should be persisted");
assert(tomatoes.length === 1 && tomatoes[0].completed === true, "red harvested tomato should be persisted");
assert(activeTimer === null, "active timer should be cleared after restoration");

console.log("expired timer restore ok");
