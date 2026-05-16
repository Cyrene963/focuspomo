"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18];

const DEMO_EVENTS = [
  { day: 1, startHour: 10, duration: 45, label: "Reading", color: "#F06858" },
  { day: 1, startHour: 11, duration: 25, label: "Presentation", color: "#FF8A65" },
  { day: 3, startHour: 12, duration: 60, label: "Work", color: "#4CAF50" },
  { day: 3, startHour: 14, duration: 25, label: "Meditation", color: "#66BB6A" },
  { day: 5, startHour: 10, duration: 30, label: "Study", color: "#00BCD4" },
  { day: 5, startHour: 13, duration: 45, label: "Design", color: "#FFC107" },
  { day: 6, startHour: 11, duration: 30, label: "Focus", color: "#F06858" },
  { day: 6, startHour: 14, duration: 60, label: "Read", color: "#CDDC39" },
];

export default function CalendarPage() {
  const [view, setView] = useState<"day" | "week">("week");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="text-brown-700/40">‹</button>
          <span className="text-brown-800 font-semibold">
            {today.getFullYear()}年{today.getMonth() + 1}月
          </span>
        </div>
        <div className="flex items-center gap-1 bg-cream-200 rounded-tag px-3 py-1">
          <button className="text-brown-700/40 text-sm">‹</button>
          <span className="text-xs text-brown-700/60 px-2">W{Math.ceil((today.getDate() + new Date(today.getFullYear(), today.getMonth(), 1).getDay()) / 7)}, {today.getMonth() + 1}月{weekStart.getDate()}-{weekStart.getDate() + 6}</span>
          <button className="text-brown-700/40 text-sm">›</button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView("day")}
            className={`px-3 py-1 rounded-tag text-xs font-medium transition-all ${
              view === "day" ? "bg-brown-800 text-white" : "text-brown-700/50"
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1 rounded-tag text-xs font-medium transition-all ${
              view === "week" ? "bg-brown-800 text-white" : "text-brown-700/50"
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Day selector */}
      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto">
        {dates.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-tag text-xs font-medium transition-all ${
                isToday
                  ? "bg-coral-500 text-white"
                  : selectedDay === i
                  ? "bg-cream-300 text-brown-800"
                  : "text-brown-700/50"
              }`}
            >
              {DAYS[i]} {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4">
        {view === "week" ? (
          <div className="relative">
            {/* Hour grid */}
            {HOURS.map((hour) => (
              <div key={hour} className="flex border-b border-cream-300/50" style={{ height: 60 }}>
                <div className="w-10 text-xs text-brown-700/30 pt-1 shrink-0">{hour}</div>
                <div className="flex-1 relative">
                  {DEMO_EVENTS.filter(e => e.startHour === hour).map((event, i) => {
                    const dayIdx = event.day;
                    const left = `${(dayIdx / 7) * 100}%`;
                    const width = `${100 / 7 - 1}%`;
                    return (
                      <motion.div
                        key={`${event.label}-${i}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute rounded-tag px-2 py-1 text-white text-[10px] overflow-hidden"
                        style={{
                          left,
                          width,
                          height: Math.max(event.duration * 0.8, 30),
                          backgroundColor: event.color,
                          top: 0,
                        }}
                      >
                        <div className="font-semibold">{event.label}</div>
                        <div className="opacity-70">{event.duration >= 60 ? `${Math.floor(event.duration / 60)}h` : `${event.duration}m`}</div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {HOURS.map((hour) => {
              const events = DEMO_EVENTS.filter(e => e.startHour === hour && e.day === selectedDay);
              return (
                <div key={hour} className="flex gap-3">
                  <div className="w-10 text-xs text-brown-700/30 pt-2 shrink-0">{hour}</div>
                  <div className="flex-1 space-y-1">
                    {events.map((event, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-tag px-3 py-2 text-white flex justify-between items-center"
                        style={{ backgroundColor: event.color }}
                      >
                        <span className="font-semibold text-sm">{event.label}</span>
                        <span className="text-xs opacity-70">{event.duration}m</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
