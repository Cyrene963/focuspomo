"use client";

import { motion } from "framer-motion";
import { useTimerStore, DEFAULT_TAGS, type Tag } from "@/lib/timerStore";

interface TagSelectorProps {
  onSelect: () => void;
}

export function TagSelector({ onSelect }: TagSelectorProps) {
  const { selectedTag, setTag } = useTimerStore();

  const handleSelect = (tag: Tag) => {
    setTag(tag);
    onSelect();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col px-6 py-16"
      style={{
        background: "linear-gradient(160deg, #2C1E14 0%, #4A3425 40%, #3A2A1C 100%)",
      }}
    >
      {/* Header */}
      <div className="flex justify-end gap-2 mb-8">
        <button
          className="px-4 py-2 rounded-[10px] text-white/80 text-[13px] font-medium"
          style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
        >
          New Tag
        </button>
        <button
          className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-white/60 text-sm"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          •••
        </button>
      </div>

      {/* Tags */}
      <div className="flex-1 flex items-center">
        <div className="grid grid-cols-2 gap-3 w-full">
          {DEFAULT_TAGS.map((tag, i) => {
            const isSelected = selectedTag.id === tag.id;
            const mins = Math.floor(tag.defaultDuration / 60);
            return (
              <motion.button
                key={tag.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(tag)}
                className="flex items-center gap-3 p-[14px] rounded-[14px] transition-all duration-200"
                style={{
                  background: isSelected
                    ? tag.color
                    : "rgba(255,255,255,0.07)",
                  backdropFilter: isSelected ? "none" : "blur(10px)",
                  boxShadow: isSelected ? `0 4px 20px ${tag.color}40` : "none",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full shrink-0"
                  style={{
                    backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : tag.color,
                  }}
                />
                <div className="text-left">
                  <div className="text-white font-semibold text-[15px]">{tag.name}</div>
                  <div className="text-white/60 text-[13px] font-medium">
                    {mins}:{String(tag.defaultDuration % 60).padStart(2, "0")}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
