"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";

const PRESET_COLORS = ["#E07A45", "#55A67A", "#3ABFBF", "#B8C840", "#D4A82A", "#E06E50", "#6B9FCF", "#D4A82A"];

export default function TagSelector({ onClose }: { onClose: () => void }) {
  const { tags, selectedTag, selectTag, addTag } = useStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newDuration, setNewDuration] = useState(25);

  const handleSelect = (id: string) => {
    selectTag(id);
    onClose();
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    addTag({ name: newName.trim(), color: newColor, duration: newDuration * 60 });
    setShowNew(false);
    setNewName("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div style={{
        position: "absolute", inset: 0,
        background: "var(--bg-glass-dark)",
        backdropFilter: "blur(25px) saturate(180%)",
        WebkitBackdropFilter: "blur(25px) saturate(180%)",
      }} />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(85vw, 380px)",
          maxHeight: "70vh",
          background: "var(--bg-glass)",
          backdropFilter: "blur(25px) saturate(180%)",
          WebkitBackdropFilter: "blur(25px) saturate(180%)",
          borderRadius: 24,
          padding: 24,
          overflow: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 20 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNew(!showNew)}
            style={{
              padding: "6px 14px", borderRadius: 14,
              background: "rgba(255,255,255,0.12)",
              color: "var(--text)", fontSize: 13, fontWeight: 600,
              border: "none", cursor: "pointer", fontFamily: "var(--font)",
            }}
          >
            + New Tag
          </motion.button>
        </div>

        {/* New tag form */}
        {showNew && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ marginBottom: 16, overflow: "hidden" }}
          >
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Tag name"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                color: "var(--text)", fontSize: 15, fontFamily: "var(--font)",
                outline: "none", marginBottom: 10,
              }}
            />
            {/* Color picker */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: c, border: newColor === c ? "3px solid var(--text)" : "2px solid transparent",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            {/* Duration */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "var(--text-sec)", fontFamily: "var(--font)" }}>Duration:</span>
              <input
                type="range" min={5} max={120} value={newDuration}
                onChange={e => setNewDuration(Number(e.target.value))}
                style={{ flex: 1, accentColor: newColor }}
              />
              <span style={{ fontSize: 13, color: "var(--text)", minWidth: 40, fontFamily: "var(--font)" }}>{newDuration}m</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCreate}
              style={{
                width: "100%", padding: "10px", borderRadius: 12,
                background: newColor, color: "#FFF", fontSize: 14, fontWeight: 600,
                border: "none", cursor: "pointer", fontFamily: "var(--font)",
              }}
            >
              Create Tag
            </motion.button>
          </motion.div>
        )}

        {/* Tag list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tags.map(tag => {
            const isSelected = selectedTag.id === tag.id;
            const mins = Math.floor(tag.duration / 60);
            return (
              <motion.button
                key={tag.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(tag.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "0 16px", height: 52, borderRadius: 26,
                  border: "none", cursor: "pointer",
                  background: isSelected ? tag.color : "rgba(255,255,255,0.06)",
                  color: isSelected ? "#FFF" : "var(--text)",
                  fontFamily: "var(--font)",
                  transition: "background 0.2s",
                }}
              >
                <span style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: isSelected ? "rgba(255,255,255,0.4)" : tag.color,
                }} />
                <span style={{ flex: 1, textAlign: "left", fontSize: 16, fontWeight: isSelected ? 600 : 500 }}>
                  {tag.name}
                </span>
                <span style={{ fontSize: 13, opacity: 0.5 }}>{mins}min</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
