"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";

const PRESET_COLORS = ["#E07A45", "#55A67A", "#3ABFBF", "#B8C840", "#D4A82A", "#E06E50", "#6B9FCF", "#D4A82A"];

export default function TagSelector({ onClose }: { onClose: () => void }) {
  const { tags, selectedTag, selectTag, addTag } = useStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newDuration, setNewDuration] = useState(25);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const roundedDuration = useMemo(() => Math.max(5, Math.round(newDuration / 5) * 5), [newDuration]);

  const adjustDuration = (delta: number) => {
    setNewDuration((value) => Math.max(5, Math.min(120, value + delta)));
  };

  const handleSelect = (id: string) => {
    selectTag(id);
    onClose();
  };

  const handleDelete = (id: string) => {
    if (tags.length <= 1) return;
    setDeletingId(id);
    requestAnimationFrame(() => {
      useStore.getState().removeTag(id);
      if (selectedTag.id === id && useStore.getState().tags[0]) {
        selectTag(useStore.getState().tags[0].id);
      }
      setDeletingId(null);
    });
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    addTag({ name: newName.trim(), color: newColor, duration: roundedDuration * 60 });
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
        initial={false}
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
            onClick={() => setShowNew((v) => !v)}
            style={{
              padding: "6px 14px", borderRadius: 14,
              background: "rgba(255,255,255,0.12)",
              color: "var(--text)", fontSize: 13, fontWeight: 600,
              border: "none", cursor: "pointer", fontFamily: "var(--font)",
            }}
          >
            {showNew ? "取消" : "+ 新标签"}
          </motion.button>
        </div>

        {/* New tag form */}
        <AnimatePresence initial={false}>
          {showNew && (
            <motion.div
              key="new-tag-form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ marginBottom: 16, overflow: "hidden" }}
            >
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="标签名称"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 12,
                background: "var(--control-bg)", border: "1px solid var(--separator)",
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
                  aria-label={`选择颜色 ${c}`}
                  aria-pressed={newColor === c}
                />
              ))}
            </div>
            {/* Duration */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              marginBottom: 12, padding: "10px 12px", borderRadius: 14,
              background: "var(--control-bg)",
            }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--text-sec)", fontFamily: "var(--font)" }}>时长</div>
                <div style={{ fontSize: 12, color: "var(--text-sec)", opacity: 0.8, marginTop: 2 }}>按 5 分钟微调</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => adjustDuration(-5)}
                  style={{
                    width: 30, height: 30, borderRadius: "50%", border: "none", cursor: "pointer",
                    background: "rgba(255,255,255,0.12)", color: "var(--text)", fontSize: 20, lineHeight: "30px",
                  }}
                >−</button>
                <span style={{ fontSize: 14, color: "var(--text)", minWidth: 48, textAlign: "center", fontFamily: "var(--font)", fontWeight: 700 }}>{roundedDuration}分</span>
                <button
                  type="button"
                  onClick={() => adjustDuration(5)}
                  style={{
                    width: 30, height: 30, borderRadius: "50%", border: "none", cursor: "pointer",
                    background: newColor, color: "#FFF", fontSize: 20, lineHeight: "30px",
                  }}
                >+</button>
              </div>
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
              创建标签
            </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tag list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tags.map(tag => {
            const isSelected = selectedTag.id === tag.id;
            const mins = Math.floor(tag.duration / 60);
            const canDelete = tags.length > 1;
            return (
              <motion.div
                key={tag.id}
                layout
                initial={false}
                animate={{ opacity: deletingId === tag.id ? 0.35 : 1 }}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelect(tag.id)}
                  style={{
                    flex: 1,
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "0 16px", height: 52, borderRadius: 26,
                    border: "none", cursor: "pointer",
                    background: isSelected ? tag.color : "var(--control-bg)",
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
                  <span style={{ fontSize: 13, opacity: 0.5 }}>{mins}分</span>
                </motion.button>
                {canDelete && (
                  <button
                    type="button"
                    className="pressable"
                    onClick={(e) => { e.stopPropagation(); handleDelete(tag.id); }}
                    aria-label={`删除标签 ${tag.name}`}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      color: "var(--text-sec)", background: "var(--control-bg)",
                      fontSize: 16, flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
