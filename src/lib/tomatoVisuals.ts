export type TomatoVisualVariant = "stats" | "summary";

const TOMATO_VISUALS = {
  stats: { min: 24, max: 52, baseline: 25, cap: 120 },
  summary: { min: 26, max: 58, baseline: 25, cap: 120 },
} as const;

export function tomatoVisualSize(durationSeconds: number, variant: TomatoVisualVariant = "stats") {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  const visual = TOMATO_VISUALS[variant];
  const normalized = Math.min(visual.cap, minutes) / visual.baseline;
  const ratio = Math.min(1, Math.log1p(normalized) / Math.log1p(visual.cap / visual.baseline));
  return Math.round(visual.min + (visual.max - visual.min) * ratio);
}

export function tomatoWallGridStyle(variant: TomatoVisualVariant = "stats"): React.CSSProperties {
  const cellWidth = variant === "stats" ? "clamp(32px, 5.6vw, 50px)" : "clamp(36px, 6vw, 56px)";
  const gap = variant === "stats" ? "clamp(6px, 1.2vw, 10px)" : "clamp(7px, 1.4vw, 12px)";
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fill, ${cellWidth})`,
    gap,
    alignItems: "end",
    justifyContent: "start",
  };
}
