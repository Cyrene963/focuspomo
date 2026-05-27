"use client";

import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";

const { Engine, Bodies, Composite } = Matter;

interface TomatoPhysicsProps {
  trigger: { completed: boolean; durationSeconds: number } | null;
}

// Pre-load SVG images
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function TomatoPhysics({ trigger }: TomatoPhysicsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const bodiesRef = useRef<Matter.Body[]>([]);
  const [redImg, setRedImg] = useState<HTMLImageElement | null>(null);
  const [yellowImg, setYellowImg] = useState<HTMLImageElement | null>(null);

  // Load SVG images once
  useEffect(() => {
    loadImage("/tomato-red.svg").then(setRedImg).catch(() => {});
    loadImage("/tomato-yellow.svg").then(setYellowImg).catch(() => {});
  }, []);

  // Init engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const engine = Engine.create({ gravity: { x: 0, y: 1.2 } });
    engineRef.current = engine;

    // Ground + walls
    const ground = Bodies.rectangle(w / 2, h + 20, w + 100, 40, { isStatic: true });
    const wallL = Bodies.rectangle(-20, h / 2, 40, h * 2, { isStatic: true });
    const wallR = Bodies.rectangle(w + 20, h / 2, 40, h * 2, { isStatic: true });
    Composite.add(engine.world, [ground, wallL, wallR]);

    return () => {
      Engine.clear(engine);
      bodiesRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || bodiesRef.current.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const engine = engineRef.current;
    if (!ctx || !engine) return;
    let animFrame = 0;
    let idleFrames = 0;
    const draw = () => {
      Matter.Engine.update(engine, 1000 / 60);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let moving = false;
      for (const body of bodiesRef.current) {
        const pos = body.position;
        const angle = body.angle;
        const radius = (body as any).circleRadius || 22;
        const isCompleted = (body as any).isCompleted !== false;
        const img = isCompleted ? redImg : yellowImg;
        if (Math.abs(body.velocity.x) > 0.06 || Math.abs(body.velocity.y) > 0.06 || Math.abs(body.angularVelocity) > 0.004) moving = true;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        const drawW = radius * 2;
        const drawH = radius * 2 * (125 / 107);
        if (img) {
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fillStyle = isCompleted ? "#ff9029" : "#ffd83f";
          ctx.fill();
        }
        ctx.restore();
      }
      idleFrames = moving ? 0 : idleFrames + 1;
      if (idleFrames < 90) animFrame = requestAnimationFrame(draw);
    };
    animFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrame);
  }, [redImg, yellowImg, trigger]);

  // Gyroscope
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = (e.gamma || 0) / 90;
      const beta = ((e.beta || 0) - 45) / 90;
      engine.gravity.x = gamma * 2;
      engine.gravity.y = 1.2 + beta * 0.8;
    };
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      (DeviceOrientationEvent as any).requestPermission().then((p: string) => {
        if (p === "granted") window.addEventListener("deviceorientation", handleOrientation);
      }).catch(() => {});
    } else {
      window.addEventListener("deviceorientation", handleOrientation);
    }
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  // Drop tomato on trigger
  useEffect(() => {
    if (!trigger || !engineRef.current || !canvasRef.current) return;
    const engine = engineRef.current;
    const w = canvasRef.current.width;

    const scale = Math.min(trigger.durationSeconds / (25 * 60), 2.5);
    const radius = 18 + scale * 8;
    const x = w * 0.2 + Math.random() * w * 0.6;

    const tomato = Bodies.circle(x, -radius * 3, radius, {
      restitution: 0.45,
      friction: 0.3,
      density: 0.002,
    });
    (tomato as any).circleRadius = radius;
    (tomato as any).isCompleted = trigger.completed;

    Composite.add(engine.world, tomato);
    bodiesRef.current.push(tomato);

    if (bodiesRef.current.length > 50) {
      const old = bodiesRef.current.shift()!;
      Composite.remove(engine.world, old);
    }
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        pointerEvents: "none",
      }}
    />
  );
}
