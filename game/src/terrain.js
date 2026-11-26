// Ridge Runner: the valley itself — its height field, the airstrip, the ring
// course and the clouds. Everything is a pure function of (x, z) and the seed,
// so the same seed always builds the same valley.
import { CONFIG } from './config.js';
import { clamp, hash2, lerp, mulberry32 } from './random.js';

const RIDGE = CONFIG.ridgeHeight;

// Smooth value noise over the (x, z) plane, in [0, 1).
function noise2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t);
  const u = s(xf), v = s(zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

// Terrain height in metres at world (x, z). The valley floor is flat near the
// centre line and the walls rise steeply past the valley edge; ridges add
// rolling detail that grows with distance from the centre.
export function terrainHeight(x, z) {
  const ax = Math.abs(x);
  const edge = CONFIG.valleyHalfWidth;
  const wall = clamp((ax - edge) / 420, 0, 1);
  const wallShape = wall * wall * (3 - 2 * wall);
  const detail = noise2(x * 0.004, z * 0.004) * 0.65
    + noise2(x * 0.013 + 40, z * 0.013) * 0.35;
  const floor = noise2(x * 0.01, z * 0.01) * 6;
  return floor + wallShape * (120 + detail * RIDGE);
}

// Height of the ridge skyline at a given bearing, for the far mountain layers.
// Bearing 0 is straight ahead (north, +z); positive bearings turn right.
export function ridgeSkyline(bearingDeg, layer) {
  const b = bearingDeg;
  const scale = [0.011, 0.017, 0.026][layer] || 0.017;
  const amp = [0.42, 0.62, 0.85][layer] || 0.62;
  const n = noise2(b * scale * 40 + layer * 91, layer * 57 + 13);
  const n2 = noise2(b * scale * 110 + layer * 31, layer * 17 + 71);
  return amp * (0.55 * n + 0.45 * n2);
}

export function makeClouds(seed, count) {
  const rnd = mulberry32(seed);
  const clouds = [];
  for (let i = 0; i < count; i++) {
    clouds.push({
      x: (rnd() - 0.5) * 5200,       // lateral offset from valley centre
      y: 260 + rnd() * 420,          // altitude
      z: 400 + rnd() * 9000,         // distance ahead
      r: 90 + rnd() * 190,           // radius
      speed: 2 + rnd() * 5,          // drift m/s
      shade: 0.75 + rnd() * 0.25,
    });
  }
  return clouds;
}

export function makeRings(mission) {
  const rings = [];
  const n = mission.ringCount || 0;
  for (let i = 0; i < n; i++) {
    const z = mission.ringStartZ + i * mission.ringSpacing;
    const x = Math.sin(i * 1.35) * 175;
    const y = 115 + Math.sin(i * 0.72) * 62;
    rings.push({ x, y, z, r: 34, passed: false, missed: false });
  }
  return rings;
}

// Runway corners in world space (a flat strip, heading 0, centred on x = 0).
export function runwayCorners() {
  const r = CONFIG.runway;
  const halfL = r.length / 2, halfW = r.width / 2;
  const z0 = r.z - halfL, z1 = r.z + halfL;
  return [
    { x: -halfW, y: 0.5, z: z0 }, { x: halfW, y: 0.5, z: z0 },
    { x: halfW, y: 0.5, z: z1 }, { x: -halfW, y: 0.5, z: z1 },
  ];
}

export function runwayDistance(planeZ) {
  return CONFIG.runway.z - planeZ;
}
