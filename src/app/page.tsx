"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTimerStore } from "@/lib/timerStore";

const DEMO_TOMATOES = [
  { id: 1, size: 42, ripe: true, tag: "Focus", minutes: 25, hour: 10 },
  { id: 2, size: 36, ripe: true, tag: "Read", minutes: 30, hour: 14 },
  { id: 3, size: 56, ripe: true, tag: "Work", minutes: 60, hour: 9 },
  { id: 4, size: 28, ripe: false, tag: "Study", minutes: 15, hour: 16 },
  { id: 5, size: 40, ripe: true, tag: "Focus", minutes: 25, hour: 20 },
  { id: 6, size: 32, ripe: true, tag: "Read", minutes: 20, hour: 11 },
  { id: 7, size: 48, ripe: true, tag: "Work", minutes: 45, hour: 13 },
  { id: 8, size: 24, ripe: false, tag: "Focus", minutes: 10, hour: 15 },
];

function TomatoIcon({ size, ripe, delay = 0 }: { size: number; ripe: boolean; delay?: number }) {
  const s = Math.max(size, 28);
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 20 }}
      className="flex flex-col items-center"
    >
      <svg width={s} height={s + 14} viewBox="0 0 100 120" fill="none">
        {/* Shadow */}
        <ellipse cx="50" cy="112" rx="20" ry="4" fill="rgba(0,0,0,0.06)" />
        {/* Stem */}
        <path d="M45 18 C42 6 50 2 50 2 C50 2 58 6 55 18" fill={ripe ? "#66BB6A" : "#AED581"} />
        <path d="M48 18 C44 10 40 8 38 12" fill={ripe ? "#4CAF50" : "#8BC34A"} stroke="none" />
        <path d="M52 18 C56 10 60 8 62 12" fill={ripe ? "#4CAF50" : "#8BC34A"} stroke="none" />
        {/* Body */}
        <ellipse cx="50" cy="62" rx="30" ry="34" fill={ripe ? "#E8533E" : "#F9C74F"} />
        {/* Highlight */}
        <ellipse cx="38" cy="48" rx="10" ry="14" fill="rgba(255,255,255,0.25)" transform="rotate(-15 38 48)" />
        {/* Eyes */}
        <circle cx="40" cy="58" r="3" fill="#3A2A1C" />
        <circle cx="60" cy="58" r="3" fill="#3A2A1C" />
        {/* Eye shine */}
        <circle cx="41" cy="57" r="1" fill="white" />
        <circle cx="61" cy="57" r="1" fill="white" />
        {/* Mouth */}
        {ripe ? (
          <path d="M42 68 Q50 76 58 68" fill="none" stroke="#3A2A1C" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <path d="M42 72 Q50 68 58 72" fill="none" stroke="#3A2A1C" strokeWidth="2" strokeLinecap="round" />
        )}
        {/* Cheek blush for ripe */}
        {ripe && (
          <>
            <circle cx="33" cy="65" r="5" fill="rgba(255,100,100,0.2)" />
            <circle cx="67" cy="65" r="5" fill="rgba(255,100,100,0.2)" />
          </>
        )}
      </svg>
      <span className="text-[11px] text-[#8B7355] mt-0.5 font-medium">{size >= 35 ? `${Math.round(size/2)}min` : `${Math.round(size/2.5)}min`}</span>
    </motion.div>
  );
}

export default function HomePage() {
  const { todayFocusSeconds, todayCompleted } = useTimerStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const totalMinutes = Math.floor(todayFocusSeconds / 60) || 128;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #FBF0E3 0%, #FDF6EC 40%, #FFFFFF 100%)" }}>
      <div className="max-w-md mx-auto px-6 pt-12 pb-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2"
        >
          <h1 className="text-[28px] font-bold text-[#3A2A1C] leading-tight">Welcome ^ ^</h1>
          <p className="text-[13px] text-[#8B7355] mt-1.5 italic leading-relaxed">
            &ldquo;What I do today is important because I am exchanging a day of my life for it.&rdquo;
          </p>
        </motion.div>

        {/* Month header + tomato count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between mt-6 mb-4"
        >
          <h2 className="text-[22px] font-bold text-[#3A2A1C]">
            2026年5月
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="text-[18px] font-bold text-[#3A2A1C]">{DEMO_TOMATOES.length}</span>
            <span className="text-[20px]">🍅</span>
          </div>
        </motion.div>

        {/* Stats cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {[
            { value: mounted ? totalMinutes : 128, label: "分钟专注", color: "#E8533E" },
            { value: mounted ? todayCompleted : 5, label: "完成番茄", color: "#E8533E" },
            { value: 3, label: "连续天数", color: "#E8533E" },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-[14px] py-4 px-3 text-center"
              style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
            >
              <div className="text-[24px] font-extrabold" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-[11px] text-[#8B7355] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Tomato section header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-[#3A2A1C]">本月番茄</h3>
          <Link href="/summary" className="text-[13px] font-medium text-[#E8533E] hover:text-[#D14432] transition-colors">
            查看统计 ›
          </Link>
        </div>

        {/* Tomato grid */}
        <div className="grid grid-cols-4 gap-x-4 gap-y-5">
          {DEMO_TOMATOES.map((tomato, i) => (
            <TomatoIcon
              key={tomato.id}
              size={tomato.size}
              ripe={tomato.ripe}
              delay={0.2 + i * 0.04}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
