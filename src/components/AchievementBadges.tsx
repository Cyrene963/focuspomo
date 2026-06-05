"use client";

import { useStore } from "@/lib/store";
import { ACHIEVEMENTS, calculateAchievementProgress, type AchievementProgress } from "@/lib/achievements";

function Badge({ progress }: { progress: AchievementProgress }) {
  const achievement = ACHIEVEMENTS[progress.id];
  const unlocked = progress.unlocked;
  const progressPercent = Math.min(100, (progress.progress / progress.target) * 100);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: 16,
        borderRadius: 16,
        background: unlocked
          ? `linear-gradient(135deg, ${achievement.color}15, ${achievement.color}08)`
          : "var(--bg-glass)",
        border: unlocked
          ? `1.5px solid ${achievement.color}40`
          : "1px solid var(--separator)",
        boxShadow: unlocked ? `0 4px 16px ${achievement.color}20` : "none",
        transition: "all 0.3s ease",
        opacity: unlocked ? 1 : 0.5,
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: 40,
          filter: unlocked ? "none" : "grayscale(100%)",
          transition: "filter 0.3s ease",
        }}
      >
        {achievement.icon}
      </div>

      {/* Name */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: unlocked ? achievement.color : "var(--text-sec)",
          textAlign: "center",
          letterSpacing: "-0.01em",
        }}
      >
        {achievement.name}
      </div>

      {/* Description or Progress */}
      {unlocked ? (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-sec)",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {achievement.description}
        </div>
      ) : (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-sec)",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {progress.progress}/{progress.target}
        </div>
      )}

      {/* Progress bar for locked achievements */}
      {!unlocked && progressPercent > 0 && (
        <div
          style={{
            width: "100%",
            height: 4,
            borderRadius: 2,
            background: "var(--separator)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: achievement.color,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      )}

      {/* Unlocked date */}
      {unlocked && progress.unlockedAt && (
        <div
          style={{
            fontSize: 10,
            color: "var(--text-sec)",
            opacity: 0.7,
          }}
        >
          {new Date(progress.unlockedAt).toLocaleDateString("zh-CN", {
            month: "short",
            day: "numeric",
          })}
        </div>
      )}
    </div>
  );
}

export default function AchievementBadges() {
  const history = useStore((state) => state.history);
  const progressList = calculateAchievementProgress(history);

  // Sort: unlocked first, then by category, then by progress
  const sorted = [...progressList].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    const achA = ACHIEVEMENTS[a.id];
    const achB = ACHIEVEMENTS[b.id];
    if (achA.category !== achB.category) {
      const order = { special: 0, streak: 1, milestone: 2 };
      return order[achA.category] - order[achB.category];
    }
    return b.progress / b.target - a.progress / a.target;
  });

  const unlockedCount = sorted.filter((p) => p.unlocked).length;
  const totalCount = sorted.length;

  return (
    <div>
      {/* Header with count */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 18px 12px",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 650, color: "var(--text)" }}>
          成就徽章
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--accent)",
          }}
        >
          {unlockedCount}/{totalCount}
        </div>
      </div>

      {/* Badges grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 12,
          padding: "0 18px",
        }}
      >
        {sorted.map((progress) => (
          <Badge key={progress.id} progress={progress} />
        ))}
      </div>
    </div>
  );
}
