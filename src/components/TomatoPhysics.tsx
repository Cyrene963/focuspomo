"use client";

import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { useStore, type HarvestedTomato } from "@/lib/store";

const { Engine, Bodies, Composite, Body } = Matter;

type MotionStatus = "unknown" | "unsupported" | "needs-permission" | "active" | "denied";

type BoundaryBodies = {
  ground: Matter.Body;
  wallL: Matter.Body;
  wallR: Matter.Body;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function motionPermissionApi() {
  const motion = typeof DeviceMotionEvent !== "undefined" ? DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: () => Promise<PermissionState> } : undefined;
  const orientation = typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<PermissionState> } : undefined;
  return motion?.requestPermission || orientation?.requestPermission;
}

export default function TomatoPhysics() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const boundariesRef = useRef<BoundaryBodies | null>(null);
  const bodiesRef = useRef<Matter.Body[]>([]);
  const drawnTomatoIdsRef = useRef<Set<string>>(new Set());
  const animFrameRef = useRef(0);
  const idleFramesRef = useRef(0);
  const redImgRef = useRef<HTMLImageElement | null>(null);
  const yellowImgRef = useRef<HTMLImageElement | null>(null);
  const [redImg, setRedImg] = useState<HTMLImageElement | null>(null);
  const [yellowImg, setYellowImg] = useState<HTMLImageElement | null>(null);
  const [motionStatus, setMotionStatus] = useState<MotionStatus>("unknown");
  const motionCleanupRef = useRef<(() => void) | null>(null);
  const tomatoes = useStore(s => s.harvestedTomatoes);
  const displayTomatoes = useStore(s => s.displayTomatoes);
  const tiltTomatoes = useStore(s => s.tiltTomatoes);
  const setTiltTomatoes = useStore(s => s.setTiltTomatoes);

  useEffect(() => {
    loadImage("/tomato-red.svg").then(img => { redImgRef.current = img; setRedImg(img); }).catch(() => {});
    loadImage("/tomato-yellow.svg").then(img => { yellowImgRef.current = img; setYellowImg(img); }).catch(() => {});
  }, []);

  const ensureAnimating = () => {
    if (animFrameRef.current || !canvasRef.current || !engineRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const engine = engineRef.current;
    if (!ctx) return;
    const draw = () => {
      Matter.Engine.update(engine, 1000 / 60);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let moving = false;
      for (const body of bodiesRef.current) {
        const pos = body.position;
        const angle = body.angle;
        const radius = (body as Matter.Body & { circleRadius?: number }).circleRadius || 22;
        const isCompleted = (body as Matter.Body & { isCompleted?: boolean }).isCompleted !== false;
        const img = isCompleted ? redImgRef.current : yellowImgRef.current;
        if (Math.abs(body.velocity.x) > 0.04 || Math.abs(body.velocity.y) > 0.04 || Math.abs(body.angularVelocity) > 0.003) moving = true;
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
      idleFramesRef.current = moving ? 0 : idleFramesRef.current + 1;
      if (idleFramesRef.current < 900 || motionStatus === "active") {
        animFrameRef.current = requestAnimationFrame(draw);
      } else {
        animFrameRef.current = 0;
      }
    };
    idleFramesRef.current = 0;
    animFrameRef.current = requestAnimationFrame(draw);
  };

  const resizeWorld = () => {
    if (!canvasRef.current || !engineRef.current) return;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    const w = Math.max(1, parent?.clientWidth || window.innerWidth);
    const h = Math.max(1, parent?.clientHeight || window.innerHeight);
    canvas.width = Math.round(w * window.devicePixelRatio);
    canvas.height = Math.round(h * window.devicePixelRatio);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const scale = window.devicePixelRatio || 1;
    const boundaries = boundariesRef.current;
    if (boundaries) {
      Body.setPosition(boundaries.ground, { x: canvas.width / 2, y: canvas.height + 20 * scale });
      Body.setVertices(boundaries.ground, Bodies.rectangle(canvas.width / 2, canvas.height + 20 * scale, canvas.width + 100 * scale, 40 * scale, { isStatic: true }).vertices);
      Body.setPosition(boundaries.wallL, { x: -20 * scale, y: canvas.height / 2 });
      Body.setPosition(boundaries.wallR, { x: canvas.width + 20 * scale, y: canvas.height / 2 });
    }
    ensureAnimating();
  };

  const addTomatoBody = (tomato: HarvestedTomato, replay = false) => {
    if (!engineRef.current || !canvasRef.current || drawnTomatoIdsRef.current.has(tomato.id)) return;
    const canvas = canvasRef.current;
    const tomatoBodyScale = Math.max(tomato.durationSeconds, 60) / (25 * 60);
    const scale = Math.min(tomatoBodyScale, 2.5);
    const radius = (18 + scale * 8) * (window.devicePixelRatio || 1);
    const x = canvas.width * 0.18 + Math.random() * canvas.width * 0.64;
    const y = replay ? canvas.height - radius * (1.8 + Math.random() * 4) : -radius * 3;
    const body = Bodies.circle(x, y, radius, {
      restitution: 0.45,
      friction: 0.35,
      density: 0.002,
    });
    (body as Matter.Body & { circleRadius?: number }).circleRadius = radius;
    (body as Matter.Body & { isCompleted?: boolean }).isCompleted = tomato.completed;
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.16);
    Body.setVelocity(body, { x: (Math.random() - 0.5) * 3, y: replay ? 0 : 1 });
    Composite.add(engineRef.current.world, body);
    bodiesRef.current.push(body);
    drawnTomatoIdsRef.current.add(tomato.id);
    while (bodiesRef.current.length > 50) {
      const old = bodiesRef.current.shift();
      if (old) Composite.remove(engineRef.current.world, old);
    }
    ensureAnimating();
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    const w = Math.max(1, parent?.clientWidth || window.innerWidth);
    const h = Math.max(1, parent?.clientHeight || window.innerHeight);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const engine = Engine.create({ gravity: { x: 0, y: 1.2 } });
    engineRef.current = engine;
    const ground = Bodies.rectangle(canvas.width / 2, canvas.height + 20 * ratio, canvas.width + 100 * ratio, 40 * ratio, { isStatic: true });
    const wallL = Bodies.rectangle(-20 * ratio, canvas.height / 2, 40 * ratio, canvas.height * 2, { isStatic: true });
    const wallR = Bodies.rectangle(canvas.width + 20 * ratio, canvas.height / 2, 40 * ratio, canvas.height * 2, { isStatic: true });
    boundariesRef.current = { ground, wallL, wallR };
    Composite.add(engine.world, [ground, wallL, wallR]);
    if (!motionPermissionApi() && ("DeviceMotionEvent" in window || "DeviceOrientationEvent" in window)) setMotionStatus("unknown");
    if (!("DeviceMotionEvent" in window) && !("DeviceOrientationEvent" in window)) setMotionStatus("unsupported");
    window.addEventListener("resize", resizeWorld);
    window.addEventListener("orientationchange", resizeWorld);
    return () => {
      window.removeEventListener("resize", resizeWorld);
      window.removeEventListener("orientationchange", resizeWorld);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      motionCleanupRef.current?.();
      motionCleanupRef.current = null;
      Engine.clear(engine);
      bodiesRef.current = [];
      drawnTomatoIdsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!engineRef.current || !canvasRef.current || !displayTomatoes) return;
    const recent = tomatoes.slice(-50);
    recent.forEach(tomato => addTomatoBody(tomato, drawnTomatoIdsRef.current.size === 0));
  }, [tomatoes, displayTomatoes]);

  useEffect(() => {
    if (!displayTomatoes) {
      const engine = engineRef.current;
      if (!engine) return;
      bodiesRef.current.forEach(body => Composite.remove(engine.world, body));
      bodiesRef.current = [];
      drawnTomatoIdsRef.current.clear();
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [displayTomatoes]);

  const enableMotion = async () => {
    const requestPermission = motionPermissionApi();
    try {
      setTiltTomatoes(true);
      if (requestPermission) {
        const result = await requestPermission();
        if (result !== "granted") {
          setMotionStatus("denied");
          return;
        }
      }
      const engine = engineRef.current;
      if (!engine) return;
      motionCleanupRef.current?.();
      let seenMotion = false;
      const applyGravity = (x: number, y: number) => {
        engine.gravity.x = Math.max(-2.4, Math.min(2.4, x));
        engine.gravity.y = Math.max(0.25, Math.min(2.4, y));
        setMotionStatus("active");
        ensureAnimating();
      };
      const handleMotion = (e: DeviceMotionEvent) => {
        const gx = e.accelerationIncludingGravity?.x;
        const gy = e.accelerationIncludingGravity?.y;
        if (typeof gx === "number" && typeof gy === "number") {
          seenMotion = true;
          applyGravity(gx / 4.5, Math.abs(gy) / 4.5 + 0.35);
        }
      };
      const handleOrientation = (e: DeviceOrientationEvent) => {
        if (seenMotion) return;
        const gamma = (e.gamma || 0) / 45;
        const beta = ((e.beta || 0) - 45) / 60;
        applyGravity(gamma * 1.35, 1.1 + beta * 0.8);
      };
      window.addEventListener("devicemotion", handleMotion);
      window.addEventListener("deviceorientation", handleOrientation);
      motionCleanupRef.current = () => {
        window.removeEventListener("devicemotion", handleMotion);
        window.removeEventListener("deviceorientation", handleOrientation);
      };
      setMotionStatus("active");
    } catch {
      setMotionStatus("denied");
    }
  };

  if (!displayTomatoes) return null;
  const showMotionButton = tiltTomatoes && motionStatus !== "active" && motionStatus !== "unsupported";
  const motionLabel = motionStatus === "denied" ? "倾斜权限未开启" : tiltTomatoes ? "重新授权倾斜" : "开启倾斜番茄";

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}
      />
      {showMotionButton && (
        <button
          type="button"
          onClick={enableMotion}
          className="pressable"
          style={{
            position: "absolute",
            right: 18,
            bottom: "max(82px, calc(env(safe-area-inset-bottom) + 72px))",
            zIndex: 22,
            padding: "9px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.62)",
            color: "var(--text)",
            boxShadow: "0 8px 24px rgba(45,38,37,0.12)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            fontSize: 12,
            fontWeight: 850,
          }}
        >
          {motionLabel}
        </button>
      )}
    </>
  );
}
