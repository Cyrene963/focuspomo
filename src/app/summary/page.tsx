"use client";

import { useState } from "react";
import { motion } from "framer-motion";

// Demo data
const DEMO_ACTIVITIES = [
  { name: "Reading", color: "#F06858", minutes: 194, pct: 50 },
  { name: "Deep Work", color: "#00BCD4", minutes: 150, pct: 30 },
  { name: "Housework", color: "#66BB6A", minutes: 60, pct: 16 },
  { name: "Design", color: "#D7CCC8", minutes: 40, pct: 4 },
];

const DEMO_DAILY = [
  { day: "S", segments: [{ color: "#F06858", h: 3 }, { color: "#66BB6A", h: 2 }] },
  { day: "M", segments: [{ color: "#F06858", h: 4 }, { color: "#66BB6A", h: 2.5 }] },
  { day: "T", segments: [{ color: "#00BCD4", h: 3.5 }, { color: "#66BB6A", h: 1.5 }] },
  { day: "W", segments: [{ color: "#66BB6A", h: 5 }, { color: "#CDDC39", h: 1 }] },
  { day: "T", segments: [{ color: "#42A5F5", h: 2 }, { color: "#F06858", h: 1 }] },
  { day: "F", segments: [] },
  { day: "S", segments: [] },
];

const HAPPY_TOMATOES = 32;
const SAD_TOMATOES = 3;

export default function SummaryPage() {
  const [showAllActivities, setShowAllActivities] = useState(false);

  return (
    <div className="min-h-screen bg-cream-100 pb-24">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-cream-100/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <button className="text-brown-700/40 text-xl">‹</button>
          <h1 className="text-xl font-bold text-brown-800">Summary</h1>
          <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">BETA</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-cream-200 rounded-tag px-3 py-1.5">
            <button className="text-brown-700/40 text-xs">‹</button>
            <span className="text-xs text-brown-700 font-medium px-1">May 16, Today</span>
            <button className="text-brown-700/40 text-xs">›</button>
          </div>
          <button className="bg-cream-200 w-8 h-8 rounded-tag flex items-center justify-center text-brown-700/40 text-lg">+</button>
        </div>
      </div>

      {/* Content — stacks on mobile, 3-col on iPad */}
      <div className="px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* ═══ Column 1: Focus Trend ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-base font-bold text-brown-800">Focus Trend</h2>

            {/* Today / This Week */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-card p-3">
                <div className="text-[11px] text-brown-700/40 mb-1">Today&apos;s Focus</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-brown-800">6h 35m</span>
                  <span className="text-[10px] text-red-500 font-medium">↑ 20%</span>
                </div>
              </div>
              <div className="bg-white rounded-card p-3">
                <div className="text-[11px] text-brown-700/40 mb-1">This Week</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-brown-800">40h 27m</span>
                  <span className="text-[10px] text-green-500 font-medium">↓ 5%</span>
                </div>
              </div>
            </div>

            {/* Daily Avg + Bar Chart */}
            <div className="bg-white rounded-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-coral-500 text-xs font-bold">Daily Avg</span>
                <span className="text-sm font-bold text-brown-800">6h 12m</span>
              </div>
              <div className="flex items-end gap-2 h-32">
                {DEMO_DAILY.map((d, i) => {
                  const totalH = d.segments.reduce((a, s) => a + s.h, 0);
                  const maxH = 8;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col-reverse" style={{ height: `${(totalH / maxH) * 100}%` }}>
                        {d.segments.length > 0 ? (
                          d.segments.map((seg, j) => (
                            <motion.div
                              key={j}
                              initial={{ height: 0 }}
                              animate={{ height: `${(seg.h / totalH) * 100}%` }}
                              transition={{ delay: 0.3 + i * 0.05 + j * 0.1, duration: 0.4 }}
                              className="w-full first:rounded-t-sm last:rounded-b-sm"
                              style={{ backgroundColor: seg.color }}
                            />
                          ))
                        ) : (
                          <div className="w-full h-full border-2 border-cream-300 rounded-sm" />
                        )}
                      </div>
                      <span className="text-[10px] text-brown-700/40 font-medium">{d.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Breakdown */}
            <div className="bg-white rounded-card p-4">
              <h3 className="text-xs font-semibold text-brown-800 mb-3">Activity Breakdown</h3>
              <div className="space-y-2.5">
                {DEMO_ACTIVITIES.slice(0, showAllActivities ? undefined : 3).map((act, i) => (
                  <motion.div
                    key={act.name}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: act.color }} />
                      <span className="text-sm text-brown-800">{act.name}</span>
                    </div>
                    <span className="text-xs text-brown-700/50">
                      {Math.floor(act.minutes / 60)}h {act.minutes % 60}m · {act.pct}%
                    </span>
                  </motion.div>
                ))}
              </div>
              {!showAllActivities && DEMO_ACTIVITIES.length > 3 && (
                <button
                  onClick={() => setShowAllActivities(true)}
                  className="mt-3 w-full py-1.5 bg-cream-200 rounded-tag text-xs text-brown-700/50 font-medium hover:bg-cream-300 transition-colors"
                >
                  Show All
                </button>
              )}
            </div>
          </motion.div>

          {/* ═══ Column 2: Pomodoro Details ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <h2 className="text-base font-bold text-brown-800">Pomodoro Details</h2>

            {/* Today's / Abandoned */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-card p-3">
                <div className="text-[11px] text-brown-700/40 mb-1">Today&apos;s Pomos</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-coral-500 text-sm">🍅</span>
                  <span className="text-xl font-bold text-brown-800">32</span>
                  <span className="text-[10px] text-red-500 font-medium">↑ 7</span>
                </div>
              </div>
              <div className="bg-white rounded-card p-3">
                <div className="text-[11px] text-brown-700/40 mb-1">Abandoned</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm">🍅</span>
                  <span className="text-xl font-bold text-brown-800">3</span>
                  <span className="text-[10px] text-green-500 font-medium">↓ 2</span>
                </div>
              </div>
            </div>

            {/* Tomato Grid */}
            <div className="bg-white rounded-card p-4">
              <div className="grid grid-cols-6 gap-2">
                {/* Happy tomatoes */}
                {Array.from({ length: HAPPY_TOMATOES }).map((_, i) => (
                  <motion.div
                    key={`happy-${i}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.02, type: "spring", damping: 12 }}
                    className="flex items-center justify-center"
                  >
                    <svg width="28" height="32" viewBox="0 0 60 72">
                      <path d="M25 8 Q22 -4 30 -2 Q38 -4 35 8" fill="#4CAF50" />
                      <line x1="30" y1="0" x2="30" y2="10" stroke="#388E3C" strokeWidth="2" />
                      <circle cx="30" cy="40" r="22" fill="#F06858" />
                      <circle cx="23" cy="33" r="7" fill="rgba(255,255,255,0.2)" />
                      <circle cx="24" cy="38" r="1.5" fill="#3A2A1C" />
                      <circle cx="36" cy="38" r="1.5" fill="#3A2A1C" />
                      <path d="M25 44 Q30 49 35 44" fill="none" stroke="#3A2A1C" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </motion.div>
                ))}
                {/* Sad tomatoes */}
                {Array.from({ length: SAD_TOMATOES }).map((_, i) => (
                  <motion.div
                    key={`sad-${i}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.05, type: "spring", damping: 12 }}
                    className="flex items-center justify-center"
                  >
                    <svg width="28" height="32" viewBox="0 0 60 72">
                      <path d="M25 8 Q22 -4 30 -2 Q38 -4 35 8" fill="#8BC34A" />
                      <line x1="30" y1="0" x2="30" y2="10" stroke="#689F38" strokeWidth="2" />
                      <circle cx="30" cy="40" r="22" fill="#FFD93D" />
                      <circle cx="23" cy="33" r="7" fill="rgba(255,255,255,0.2)" />
                      <circle cx="24" cy="38" r="1.5" fill="#3A2A1C" />
                      <circle cx="36" cy="38" r="1.5" fill="#3A2A1C" />
                      <path d="M25 46 Q30 43 35 46" fill="none" stroke="#3A2A1C" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </motion.div>
                ))}
              </div>
              <button className="mt-3 w-full py-1.5 bg-cream-200 rounded-tag text-xs text-brown-700/50 font-medium hover:bg-cream-300 transition-colors">
                Show All
              </button>
            </div>
          </motion.div>

          {/* ═══ Column 3: All Data + More ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* All Data */}
            <h2 className="text-base font-bold text-brown-800">All Data</h2>
            <div className="bg-white rounded-card p-4">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">🍅</span>
                    <span className="text-[11px] text-brown-700/40">Total Pomodoros</span>
                  </div>
                  <div className="text-2xl font-bold text-brown-800">3,020</div>
                </div>
                <div className="w-px h-10 bg-cream-300" />
                <div>
                  <div className="text-[11px] text-brown-700/40 mb-1">Total Focus</div>
                  <div className="text-2xl font-bold text-brown-800">1,540h</div>
                </div>
              </div>
            </div>

            {/* More */}
            <h2 className="text-base font-bold text-brown-800">More</h2>
            <div className="bg-white rounded-card overflow-hidden divide-y divide-cream-300/30">
              <MoreRow
                icon="☰"
                title="Focus Distribution"
                subtitle="Old Version"
              />
              <MoreRow
                icon="✈️"
                title="Feedback"
                subtitle="We're still refining Summary — your feedback helps us get it right"
              />
              <MoreRow
                icon="🗺️"
                title="Summary Roadmap"
                subtitle="Sub-tags, pie charts, habit tracking, and a smoother experience"
              />
              <MoreRow
                icon="⚡"
                title="What's New in 5.0"
                subtitle="All-new iPad design, analytics, and tag management"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom banner */}
      <div className="fixed bottom-16 left-4 right-4 md:left-6 md:right-6 z-40">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-coral-500 rounded-card px-4 py-3 flex items-center justify-between shadow-lg shadow-coral-500/20"
        >
          <span className="text-white text-xs font-medium">
            This is demo chart, unlock all features with FocusPomo PLUS
          </span>
          <button className="bg-white text-coral-500 text-xs font-bold px-4 py-1.5 rounded-pill shrink-0 ml-3">
            Try Free
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function MoreRow({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <span className="text-lg mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-brown-800">{title}</h4>
        <p className="text-[11px] text-brown-700/40 mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
      <span className="text-brown-700/30 text-sm shrink-0 mt-1">›</span>
    </div>
  );
}
