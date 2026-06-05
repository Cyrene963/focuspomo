import { gravityFromDeviceMotion, gravityFromDeviceOrientation, normalizeScreenAngle, rotateDeviceGravityToScreen } from '../src/lib/motionGravity';

function approx(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) > 0.0001) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertVector(v: {x:number;y:number}, x: number, y: number, label: string) {
  approx(v.x, x, `${label}.x`);
  approx(v.y, y, `${label}.y`);
}

assertVector(rotateDeviceGravityToScreen(1, 2, 0), 1, 2, 'portrait');
assertVector(rotateDeviceGravityToScreen(1, 2, 90), 2, -1, 'landscape-left');
assertVector(rotateDeviceGravityToScreen(1, 2, 180), -1, -2, 'upside-down');
assertVector(rotateDeviceGravityToScreen(1, 2, 270), -2, 1, 'landscape-right');

if (normalizeScreenAngle(44) !== 0) throw new Error('44 rounds to portrait bucket');
if (normalizeScreenAngle(91) !== 90) throw new Error('91 rounds to 90 bucket');
if (normalizeScreenAngle(-90) !== 270) throw new Error('-90 normalizes to 270');

// Portrait (screenAngle 0, rotation = identity). Sign convention confirmed on a real iPad.
assertVector(gravityFromDeviceMotion(4.5, 0, 0), -1, 0, 'portrait: +deviceX -> screen left');
assertVector(gravityFromDeviceMotion(-4.5, 0, 0), 1, 0, 'portrait: -deviceX -> screen right');
assertVector(gravityFromDeviceMotion(0, 4.5, 0), 0, 1, 'portrait: +deviceY -> screen down');
assertVector(gravityFromDeviceMotion(0, -4.5, 0), 0, -1, 'portrait: -deviceY -> screen up');

// iPad-landscape regression guard: a held-upright reading (gravity on deviceX) must map to a
// VERTICAL screen gravity, never a constant sideways force (the "uncontrolled roll" bug).
assertVector(gravityFromDeviceMotion(4.5, 0, 90), 0, -1, 'landscape: deviceX gravity -> vertical (not sideways)');
assertVector(gravityFromDeviceMotion(-4.5, 0, 90), 0, 1, 'landscape: -deviceX gravity -> vertical');
assertVector(gravityFromDeviceMotion(0, 4.5, 90), -1, 0, 'landscape: deviceY gravity -> horizontal');
assertVector(gravityFromDeviceMotion(0, -4.5, 90), 1, 0, 'landscape: -deviceY gravity -> horizontal');

const orient = gravityFromDeviceOrientation(90, 0, 0);
assertVector(orient, 0, 1.35, 'orientation portrait: beta forward -> screen down');
const orientLandscape = gravityFromDeviceOrientation(90, 45, 90);
assertVector(orientLandscape, -1.35, -1.35, 'orientation fallback rotates into screen space in landscape');

console.log('motionGravity regression OK');
