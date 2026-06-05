"use client";

import { useEffect, useState } from "react";
import { ACHIEVEMENTS, type AchievementId } from "@/lib/achievements";

interface AchievementCelebrationProps {
  achievementId: AchievementId | null;
  onClose: () => void;
}

export default function AchievementCelebration({ achievementId, onClose }: AchievementCelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievementId) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 400);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [achievementId, onClose]);

  if (!achievementId) return null;

  const achievement = ACHIEVEMENTS[achievementId];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.75)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-glass)",
          borderRadius: 28,
          padding: "48px 36px",
          maxWidth: 320,
          width: "90%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
          border: "1px solid var(--separator)",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.8) translateY(20px)",
          transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon with glow effect */}
        <div
          style={{
            fontSize: 72,
            marginBottom: 20,
            animation: visible ? "achievement-pulse 1.5s ease infinite" : "none",
          }}
        >
          {achievement.icon}
        </div>

        {/* Achievement unlocked text */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: achievement.color,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          成就解锁
        </div>

        {/* Achievement name */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--text)",
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          {achievement.name}
        </div>

        {/* Achievement description */}
        <div
          style={{
            fontSize: 14,
            color: "var(--text-sec)",
            lineHeight: 1.5,
          }}
        >
          {achievement.description}
        </div>

        {/* Confetti elements */}
        {visible && (
          <>
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: achievement.color,
                  top: "50%",
                  left: "50%",
                  opacity: 0,
                  animation: `confetti-${i % 4} 1.2s ease-out forwards`,
                  animationDelay: `${i * 0.05}s`,
                }}
              />
            ))}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes achievement-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes confetti-0 {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(-60px, -80px) rotate(180deg);
            opacity: 0;
          }
        }

        @keyframes confetti-1 {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(60px, -80px) rotate(-180deg);
            opacity: 0;
          }
        }

        @keyframes confetti-2 {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(-80px, 60px) rotate(90deg);
            opacity: 0;
          }
        }

        @keyframes confetti-3 {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(80px, 60px) rotate(-90deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
