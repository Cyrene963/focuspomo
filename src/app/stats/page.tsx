"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const DEMO_DAILY = [45, 120, 30, 90, 60, 150, 75, 0, 40, 110, 85, 0, 65, 95, 130, 55, 0, 80, 100, 70, 45, 120, 90, 0, 60, 110, 85, 0, 140, 50];
const TAG_COLORS: Record<string, string> = {
  Focus: "#F06858",
  Work: "#4CAF50",
  Study: "#00BCD4",
  Read: "#CDDC39",
  Fitness: "#FFC107",
};

export default function StatsPage() {
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month");

  const totalMinutes = DEMO_DAILY.reduce((a, b) => a + b, 0);
  const avgDaily = Math.round(totalMinutes / DEMO_DAILY.filter(d => d > 0).length);
  const streak = 7;
  const maxDaily = Math.max(...DEMO_DAILY);

  return (
    <div className="min-h-screen px-6 py-6">
      <h1 className="text-2xl font-bold text-brown-800 mb-6">Statistics</h1>

      {/* Period tabs */}
      <div className="flex gap-2 mb-6">
        {(["day", "week", "month", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-pill text-sm font-medium transition-all ${
              period === p ? "bg-coral-500 text-white" : "bg-cream-200 text-brown-700/60"
            }`}
          >
            {p === "day" ? "今日" : p === "week" ? "本周" : p === "month" ? "本月" : "本年"}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-card p-4"
        >
          <div className="text-xs text-brown-700/40 mb-1">总专注时长</div>
          <div className="text-2xl font-bold text-coral-500">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-card p-4"
        >
          <div className="text-xs text-brown-700/40 mb-1">日均专注</div>
          <div className="text-2xl font-bold text-coral-500">{avgDaily}m</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-card p-4"
        >
          <div className="text-xs text-brown-700/40 mb-1">连续天数</div>
          <div className="text-2xl font-bold text-coral-500">{streak} 天 🔥</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-card p-4"
        >
          <div className="text-xs text-brown-700/40 mb-1">最长单次</div>
          <div className="text-2xl font-bold text-coral-500">{maxDaily}m</div>
        </motion.div>
      </div>

      {/* Bar chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-card p-4 mb-6"
      >
        <h3 className="text-sm font-semibold text-brown-800 mb-4">
          {period === "month" ? "每日专注时长" : period === "week" ? "本周" : "今日"}
        </h3>
        <div className="flex items-end gap-1 h-40">
          {(period === "month" ? DEMO_DAILY.slice(0, 30) : period === "week" ? DEMO_DAILY.slice(0, 7) : DEMO_DAILY.slice(0, 1)).map((min, i) => {
            const height = maxDaily > 0 ? (min / maxDaily) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 2)}%` }}
                  transition={{ delay: 0.3 + i * 0.02, duration: 0.4 }}
                  className="w-full rounded-t-sm min-h-[2px]"
                  style={{
                    backgroundColor: min > 0 ? "#F06858" : "rgba(74,55,40,0.08)",
                  }}
                />
              </div>
            );
          })}
        </div>
        {period === "month" && (
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-brown-700/30">1</span>
            <span className="text-[10px] text-brown-700/30">15</span>
            <span className="text-[10px] text-brown-700/30">30</span>
          </div>
        )}
      </motion.div>

      {/* By tag */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-card p-4"
      >
        <h3 className="text-sm font-semibold text-brown-800 mb-3">按标签分类</h3>
        <div className="space-y-3">
          {Object.entries(TAG_COLORS).map(([tag, color], i) => {
            const minutes = Math.floor(Math.random() * 200 + 30);
            const pct = Math.round((minutes / totalMinutes) * 100);
            return (
              <div key={tag}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm text-brown-800">{tag}</span>
                  </div>
                  <span className="text-xs text-brown-700/50">{minutes}m ({pct}%)</span>
                </div>
                <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.4 + i * 0.05, duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
