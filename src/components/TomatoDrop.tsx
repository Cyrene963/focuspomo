"use client";

import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { motion, AnimatePresence } from "framer-motion";
import { useTimerStore } from "@/lib/timerStore";

interface TomatoDropProps {
  onComplete?: () => void;
}

export function TomatoDrop({ onComplete }: TomatoDropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const [show, setShow] = useState(false);
  const { state, totalDuration, selectedTag } = useTimerStore();
  const prevState = useRef(state);

  // Trigger on completion or interruption
  useEffect(() => {
    const justCompleted = prevState.current === "running" && state === "completed";
    const justInterrupted = prevState.current === "running" && state === "interrupted";
    prevState.current = state;

    if (justCompleted || justInterrupted) {
      setShow(true);
      startPhysics(!justCompleted); // interrupted = true means unripe
    }
  }, [state]);

  const startPhysics = (unripe: boolean) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create engine
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.5 } });
    engineRef.current = engine;

    // Tomato size based on duration (bigger = longer focus)
    const sizeScale = Math.min(totalDuration / (25 * 60), 2); // 25min = 1x, 50min+ = 2x
    const radius = 20 + sizeScale * 20; // 40px to 60px

    // Create tomato body
    const tomato = Matter.Bodies.circle(
      canvas.width / 2,
      -radius * 2,
      radius,
      {
        restitution: 0.4,
        friction: 0.3,
        density: 0.002,
        render: { fillStyle: unripe ? "#FFD93D" : "#F06858" },
      }
    );

    // Ground
    const ground = Matter.Bodies.rectangle(
      canvas.width / 2,
      canvas.height - 40,
      canvas.width,
      80,
      { isStatic: true }
    );

    Matter.Composite.add(engine.world, [tomato, ground]);

    // Animation loop
    let frame: number;
    const animate = () => {
      Matter.Engine.update(engine, 1000 / 60);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw tomato
      const pos = tomato.position;
      const angle = tomato.angle;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);

      // Tomato body
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = unripe ? "#FFD93D" : "#F06858";
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(-radius * 0.25, -radius * 0.25, radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = unripe ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)";
      ctx.fill();

      // Stem
      ctx.beginPath();
      ctx.moveTo(-6, -radius);
      ctx.quadraticCurveTo(-8, -radius - 12, 0, -radius - 16);
      ctx.quadraticCurveTo(8, -radius - 12, 6, -radius);
      ctx.fillStyle = unripe ? "#8BC34A" : "#4CAF50";
      ctx.fill();

      // Face
      if (radius > 30) {
        // Eyes
        ctx.fillStyle = "#3A2A1C";
        ctx.beginPath();
        ctx.arc(-radius * 0.2, -radius * 0.1, 2, 0, Math.PI * 2);
        ctx.arc(radius * 0.2, -radius * 0.1, 2, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.beginPath();
        if (unripe) {
          // Sad mouth for interrupted
          ctx.arc(0, radius * 0.2, radius * 0.2, Math.PI * 1.2, Math.PI * 1.8);
        } else {
          // Happy mouth for completed
          ctx.arc(0, radius * 0.1, radius * 0.2, 0, Math.PI);
        }
        ctx.strokeStyle = "#3A2A1C";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      cancelAnimationFrame(frame);
      Matter.Engine.clear(engine);
      setShow(false);
      onComplete?.();
    }, 3000);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 pointer-events-none"
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
