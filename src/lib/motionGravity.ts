export type ScreenGravityVector = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeScreenAngle(angle: number | undefined | null): 0 | 90 | 180 | 270 {
  const n = ((((Math.round(angle || 0) % 360) + 360) % 360) as number);
  if (n >= 45 && n < 135) return 90;
  if (n >= 135 && n < 225) return 180;
  if (n >= 225 && n < 315) return 270;
  return 0;
}

export function rotateDeviceGravityToScreen(x: number, y: number, screenAngle: number): ScreenGravityVector {
  const angle = normalizeScreenAngle(screenAngle);
  switch (angle) {
    case 90:
      return { x: y, y: -x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: -y, y: x };
    default:
      return { x, y };
  }
}

/**
 * Resolve the current screen rotation ROBUSTLY.
 *
 * iPad Safari frequently reports `screen.orientation.angle === 0` even while the
 * device is physically in landscape — and `window.orientation` is often absent on
 * iPad. Trusting the API alone leaves the rotation at identity in landscape, so a
 * purely-vertical gravity leaks into screen-X and the tomatoes roll sideways with a
 * near-constant force (the "uncontrolled right roll" bug).
 *
 * We therefore cross-check the API against the actual viewport aspect ratio
 * (innerWidth>innerHeight is reliable for landscape) and only trust the API angle
 * when the two agree; otherwise we derive the angle from screen.orientation.type
 * (or default to the primary rotation for that aspect).
 */
export function resolveScreenAngle(): 0 | 90 | 180 | 270 {
  if (typeof window === "undefined") return 0;
  const so = (typeof screen !== "undefined" && (screen as Screen & { orientation?: ScreenOrientation }).orientation) || null;
  let apiAngle: number | undefined;
  if (so && typeof so.angle === "number") apiAngle = so.angle;
  else if (typeof (window as Window & { orientation?: number }).orientation === "number") {
    apiAngle = (window as Window & { orientation?: number }).orientation;
  }
  const api = normalizeScreenAngle(apiAngle);
  const viewportLandscape = window.innerWidth > window.innerHeight;
  const apiLandscape = api === 90 || api === 270;
  if (apiLandscape === viewportLandscape) return api; // API agrees with the real viewport — trust it
  // API disagrees with the physical viewport (the iPad bug). Derive from type/aspect.
  const type = so && typeof so.type === "string" ? so.type : "";
  if (viewportLandscape) return type === "landscape-secondary" ? 270 : 90;
  return type === "portrait-secondary" ? 180 : 0;
}

/**
 * Map iPad/iPhone tilt to the visual tomato world.
 *
 * `accelerationIncludingGravity` is in DEVICE coordinates; we rotate it into SCREEN
 * coordinates via the robustly-resolved screen angle (see `resolveScreenAngle`) so a
 * vertical real-world gravity never leaks into screen-X in landscape.
 *
 * Sign convention CONFIRMED on a real iPad (2026-06):
 *   screen-X uses -r.x  (tilt right -> tomatoes roll right)
 *   screen-Y uses +r.y  (tilt a screen edge down -> tomatoes roll toward it)
 * i.e. gravity always points toward the physically-lowest screen edge, in every
 * orientation. (Earlier the Y sign was inverted -> up/down felt reversed on device.)
 */
export function gravityFromDeviceMotion(x: number, y: number, screenAngle: number): ScreenGravityVector {
  const r = rotateDeviceGravityToScreen(x, y, screenAngle);
  return {
    x: clamp(-r.x / 4.5, -2.4, 2.4),
    y: clamp(r.y / 4.5, -2.4, 2.4),
  };
}

/**
 * Orientation fallback (used only when DeviceMotion never fires). beta/gamma are
 * also device-frame, so build the in-plane vector then rotate it into screen space,
 * keeping the same device-validated sign convention as DeviceMotion.
 */
export function gravityFromDeviceOrientation(beta: number, gamma: number, screenAngle: number): ScreenGravityVector {
  const rawX = clamp(gamma / 45, -1.8, 1.8);
  const rawY = clamp((beta - 45) / 45, -1.8, 1.8);
  const r = rotateDeviceGravityToScreen(rawX, rawY, screenAngle);
  return {
    x: clamp(-r.x * 1.35, -2.4, 2.4),
    y: clamp(r.y * 1.35, -2.4, 2.4),
  };
}
