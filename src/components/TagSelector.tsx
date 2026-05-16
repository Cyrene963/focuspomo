"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTimerStore, DEFAULT_TAGS, type Tag } from "@/lib/timerStore";

interface TagSelectorProps {
  onSelect: () => void;
}

export function TagSelector({ onSelect }: TagSelectorProps) {
  const { selectedTag, setTag } = useTimerStore();
  const [tags] = useState<Tag[]>(DEFAULT_TAGS);

  const handleSelect = (tag: Tag) => {
    setTag(tag);
    onSelect();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background: "linear-gradient(180deg, #3A2A1C 0%, #5A4538 50%, #4A3728 100%)",
      }}
    >
      {/* Header */}
      <div className="w-full max-w-sm mb-8">
        <div className="flex justify-end gap-2">
          <button className="glass px-4 py-2 rounded-tag text-white text-sm font-medium">
            New Tag
          </button>
          <button className="glass w-10 h-10 rounded-full flex items-center justify-center text-white">
            •••
          </button>
        </div>
      </div>

      {/* Tags grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {tags.map((tag, i) => {
          const isSelected = selectedTag.id === tag.id;
          return (
            <motion.button
              key={tag.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(tag)}
              className={`flex items-center gap-3 p-4 rounded-card transition-all duration-200 ${
                isSelected
                  ? "shadow-lg"
                  : "glass hover:bg-white/15"
              }`}
              style={isSelected ? { backgroundColor: tag.color } : undefined}
            >
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <div className="text-left">
                <div className="text-white font-semibold text-base">{tag.name}</div>
                <div className="text-white/70 text-sm">
                  {Math.floor(tag.defaultDuration / 60)}:{String(tag.defaultDuration % 60).padStart(2, "0")}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
