"use client";

import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { useStore, type HarvestedTomato } from "@/lib/store";
import { gravityFromDeviceMotion, gravityFromDeviceOrientation, resolveScreenAngle } from "@/lib/motionGravity";

const { Engine, Bodies, Composite, Body } = Matter;

type MotionStatus = "unknown" | "unsupported" | "needs-permission" | "active" | "denied";

type BoundaryBodies = {
  ground: Matter.Body;
  ceiling: Matter.Body;
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
  const motionInitializedRef = useRef(false);
  // Tilt debug HUD: enable with ?tiltdebug=1 or localStorage fp-tilt-debug=1.
  const [tiltDebug, setTiltDebug] = useState(false);
  const [tiltDbg, setTiltDbg] = useState<null | { src: string; angle: number; ax?: number; ay?: number; az?: number; beta?: number | null; gamma?: number | null; gvx: number; gvy: number }>(null);
  const tiltDebugRef = useRef(false);
  const lastDbgRef = useRef(0);
  const tomatoes = useStore(s => s.harvestedTomatoes);
  const displayTomatoes = useStore(s => s.displayTomatoes);
  const tiltTomatoes = useStore(s => s.tiltTomatoes);
  const setTiltTomatoes = useStore(s => s.setTiltTomatoes);
  const page = useStore(s => s.page);

  useEffect(() => {
    loadImage("/tomato-red.svg").then(img => { redImgRef.current = img; setRedImg(img); }).catch(() => {});
    loadImage("/tomato-yellow.svg").then(img => { yellowImgRef.current = img; setYellowImg(img); }).catch(() => {});

    // 从localStorage恢复授权状态，如果之前授权过，自动启动重力感应
    try {
      const savedStatus = localStorage.getItem("fp-motion-permission");
      if (savedStatus === "granted") {
        motionInitializedRef.current = true;
        // 延迟一点，等engine初始化完成后自动启动
        setTimeout(() => {
          if (tiltTomatoes) {
            enableMotion();
          }
        }, 500);
      } else if (savedStatus === "denied") {
        setMotionStatus("denied");
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const on = new URLSearchParams(window.location.search).has("tiltdebug") || localStorage.getItem("fp-tilt-debug") === "1";
      tiltDebugRef.current = on;
      setTiltDebug(on);
    } catch {}
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
      Body.setPosition(boundaries.ceiling, { x: canvas.width / 2, y: -20 * scale });
      Body.setVertices(boundaries.ceiling, Bodies.rectangle(canvas.width / 2, -20 * scale, canvas.width + 100 * scale, 40 * scale, { isStatic: true }).vertices);
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
    const ceiling = Bodies.rectangle(canvas.width / 2, -20 * ratio, canvas.width + 100 * ratio, 40 * ratio, { isStatic: true });
    const wallL = Bodies.rectangle(-20 * ratio, canvas.height / 2, 40 * ratio, canvas.height * 2, { isStatic: true });
    const wallR = Bodies.rectangle(canvas.width + 20 * ratio, canvas.height / 2, 40 * ratio, canvas.height * 2, { isStatic: true });
    boundariesRef.current = { ground, ceiling, wallL, wallR };
    Composite.add(engine.world, [ground, ceiling, wallL, wallR]);
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
    // 如果已经初始化过且在active状态，不重复请求
    if (motionInitializedRef.current && motionStatus === "active") {
      return;
    }

    const requestPermission = motionPermissionApi();
    try {
      setTiltTomatoes(true);
      if (requestPermission) {
        const result = await requestPermission();
        if (result !== "granted") {
          setMotionStatus("denied");
          localStorage.setItem("fp-motion-permission", "denied");
          return;
        }
        localStorage.setItem("fp-motion-permission", "granted");
      }
      const engine = engineRef.current;
      if (!engine) return;
      motionCleanupRef.current?.();
      let seenMotion = false;
      const applyGravity = ({ x, y }: { x: number; y: number }) => {
        engine.gravity.x = x;
        engine.gravity.y = y;
        setMotionStatus("active");
        ensureAnimating();
      };
      const pushDbg = (d: { src: string; angle: number; ax?: number; ay?: number; az?: number; beta?: number | null; gamma?: number | null; gvx: number; gvy: number }) => {
        if (!tiltDebugRef.current) return;
        const now = Date.now();
        if (now - lastDbgRef.current < 100) return; // throttle HUD to ~10fps
        lastDbgRef.current = now;
        setTiltDbg(d);
      };
      // Per-orientation vertical-sign auto-calibration. iOS accelerationIncludingGravity
      // sign AND the landscape 90/270 ambiguity are both unreliable on iPad, so instead of
      // hardcoding signs we lock the vertical direction the first time we see a strong
      // vertical reading in each orientation (i.e. when the user is holding the device up to
      // view it, gravity should point toward the bottom of the screen). Robust, no guessing.
      const vCal: Record<number, number> = {};
      const calibrateVSign = (angle: number, gy: number): number => {
        if (vCal[angle] === undefined && Math.abs(gy) > 0.5) vCal[angle] = gy >= 0 ? 1 : -1;
        return vCal[angle] ?? 1;
      };
      const handleMotion = (e: DeviceMotionEvent) => {
        const ax = e.accelerationIncludingGravity?.x;
        const ay = e.accelerationIncludingGravity?.y;
        const az = e.accelerationIncludingGravity?.z;
        if (typeof ax === "number" && typeof ay === "number") {
          seenMotion = true;
          const angle = resolveScreenAngle();
          const g = gravityFromDeviceMotion(ax, ay, angle);
          const fg = { x: g.x, y: g.y * calibrateVSign(angle, g.y) };
          applyGravity(fg);
          pushDbg({ src: "motion", angle, ax, ay, az: az ?? 0, gvx: fg.x, gvy: fg.y });
        }
      };
      const handleOrientation = (e: DeviceOrientationEvent) => {
        if (seenMotion) return;
        const angle = resolveScreenAngle();
        const g = gravityFromDeviceOrientation(e.beta || 0, e.gamma || 0, angle);
        const fg = { x: g.x, y: g.y * calibrateVSign(angle, g.y) };
        applyGravity(fg);
        pushDbg({ src: "orient", angle, beta: e.beta, gamma: e.gamma, gvx: fg.x, gvy: fg.y });
      };
      const resetGravity = () => {
        if (!engineRef.current) return;
        engineRef.current.gravity.x = 0;
        engineRef.current.gravity.y = 1.2;
      };
      window.addEventListener("devicemotion", handleMotion);
      window.addEventListener("deviceorientation", handleOrientation);
      motionCleanupRef.current = () => {
        window.removeEventListener("devicemotion", handleMotion);
        window.removeEventListener("deviceorientation", handleOrientation);
        resetGravity();
      };
      setMotionStatus("active");
      motionInitializedRef.current = true;
    } catch {
      setMotionStatus("denied");
    }
  };

  if (!displayTomatoes) return null;
  const showMotionButton = page === "timer" && tiltTomatoes && motionStatus !== "active" && motionStatus !== "unsupported";
  const motionLabel = motionStatus === "denied" ? "倾斜权限未开启" : "授权倾斜";

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
            top: "max(14px, env(safe-area-inset-top))",
            zIndex: 22,
            padding: "8px 11px",
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
      {tiltDebug && tiltDbg && (
        <div style={{
          position: "absolute", left: 8, top: "max(8px, env(safe-area-inset-top))", zIndex: 30,
          background: "rgba(0,0,0,0.74)", color: "#fff", fontFamily: "ui-monospace, monospace", fontSize: 11,
          lineHeight: 1.5, padding: "8px 10px", borderRadius: 8, pointerEvents: "none", whiteSpace: "pre",
        }}>
          {`src ${tiltDbg.src}   angle ${tiltDbg.angle}°\n`}
          {tiltDbg.src === "motion"
            ? `accel x ${tiltDbg.ax?.toFixed(2)} y ${tiltDbg.ay?.toFixed(2)} z ${tiltDbg.az?.toFixed(2)}\n`
            : `β ${tiltDbg.beta?.toFixed(1)}  γ ${tiltDbg.gamma?.toFixed(1)}\n`}
          {`grav  x ${tiltDbg.gvx.toFixed(2)}  y ${tiltDbg.gvy.toFixed(2)}\n`}
          {`roll  ${tiltDbg.gvx > 0.2 ? "→ 右" : tiltDbg.gvx < -0.2 ? "← 左" : "·"}   ${tiltDbg.gvy > 0.2 ? "↓ 下" : tiltDbg.gvy < -0.2 ? "↑ 上" : "·"}\n`}
          {typeof window !== "undefined" ? `view ${window.innerWidth}×${window.innerHeight}` : ""}
        </div>
      )}
    </>
  );
}
