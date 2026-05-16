"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTimerStore } from "@/lib/timerStore";

// Simulated tomato data for demo
const DEMO_TOMATOES = [
  { id: 1, size: 45, ripe: true, tag: "Focus", minutes: 25, hour: 10 },
  { id: 2, size: 35, ripe: true, tag: "Read", minutes: 30, hour: 14 },
  { id: 3, size: 55, ripe: true, tag: "Work", minutes: 60, hour: 9 },
  { id: 4, size: 30, ripe: false, tag: "Study", minutes: 15, hour: 16 },
  { id: 5, size: 40, ripe: true, tag: "Focus", minutes: 25, hour: 20 },
  { id: 6, size: 25, ripe: true, tag: "Read", minutes: 20, hour: 11 },
  { id: 7, size: 50, ripe: true, tag: "Work", minutes: 45, hour: 13 },
  { id: 8, size: 35, ripe: false, tag: "Focus", minutes: 10, hour: 15 },
];

export default function HomePage() {
  const { todayFocusSeconds, todayCompleted } = useTimerStore();
  const [month] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const totalMinutes = Math.floor(todayFocusSeconds / 60);

  return (
    <div className="min-h-screen px-6 py-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-brown-800">Welcome ^ ^</h1>
        <p className="text-brown-700/50 text-sm mt-1 italic">
          &ldquo;What I do today is important because I am exchanging a day of my life for it.&rdquo;
        </p>
      </motion.div>

      {/* Month stats card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-card p-5 mb-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-brown-800">
            {month.year}年{month.month}月
          </h2>
          <span className="text-coral-500 text-sm font-medium">{DEMO_TOMATOES.length} 🍅</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-coral-500">{totalMinutes || 128}</div>
            <div className="text-xs text-brown-700/50">分钟专注</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-coral-500">{todayCompleted || 5}</div>
            <div className="text-xs text-brown-700/50">完成番茄</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-coral-500">3</div>
            <div className="text-xs text-brown-700/50">连续天数</div>
          </div>
        </div>
      </motion.div>

      {/* Tomato garden */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-brown-700/50">本月番茄</h3>
          <Link href="/summary" className="text-xs text-coral-500 font-medium hover:text-coral-600">
            查看统计 ›
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {DEMO_TOMATOES.map((tomato, i) => (
            <motion.div
              key={tomato.id}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3 + i * 0.06, type: "spring", damping: 12 }}
              className="flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-transform"
            >
              {/* Tomato SVG */}
              <svg width={tomato.size} height={tomato.size + 12} viewBox="0 0 60 72">
                {/* Stem */}
                <path
                  d="M25 8 Q22 -4 30 -2 Q38 -4 35 8"
                  fill={tomato.ripe ? "#4CAF50" : "#8BC34A"}
                />
                <line x1="30" y1="0" x2="30" y2="10" stroke={tomato.ripe ? "#388E3C" : "#689F38"} strokeWidth="2" />
                {/* Body */}
                <circle cx="30" cy="38" r="22" fill={tomato.ripe ? "#F06858" : "#FFD93D"} />
                {/* Highlight */}
                <circle cx="23" cy="31" r="7" fill="rgba(255,255,255,0.25)" />
                {/* Face */}
                <circle cx="24" cy="36" r="1.5" fill="#3A2A1C" />
                <circle cx="36" cy="36" r="1.5" fill="#3A2A1C" />
                <path
                  d={tomato.ripe ? "M25 42 Q30 47 35 42" : "M25 44 Q30 41 35 44"}
                  fill="none"
                  stroke="#3A2A1C"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-[10px] text-brown-700/40">{tomato.minutes}min</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
