// Ridge Runner: the chase camera and the world-to-screen projection. The
// camera sits behind and above the plane, looks along the heading, and rolls
// with the plane only a little — enough to feel the bank, never enough to
// fight the pilot.
import { CONFIG } from './config.js';
import { degToRad } from './random.js';

export function makeCamera(plane) {
  const hdg = degToRad(plane.heading);
  const fwdX = Math.sin(hdg), fwdZ = Math.cos(hdg);
  // Camera trails the plane by 17 m and sits 3.6 m above it.
  const cx = plane.x - fwdX * 17;
  const cy = plane.y + 3.6;
  const cz = plane.z - fwdZ * 17;
  return {
    x: cx, y: cy, z: cz,
    yaw: plane.heading,
    pitch: plane.pitch * 0.55,
    roll: plane.roll * 0.35,
    fov: CONFIG.fov,
    cx: CONFIG.canvasWidth / 2,
    cy: CONFIG.horizonY,
  };
}

// Project a world point to screen space. Returns null when behind the camera.
export function project(cam, x, y, z) {
  const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
  const yaw = degToRad(-cam.yaw);
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  // Rotate around Y by -yaw (heading 0 looks along +z).
  let rx = dx * cosY - dz * sinY;
  let rz = dx * sinY + dz * cosY;
  let ry = dy;
  // Rotate around X by -pitch.
  const pitch = degToRad(-cam.pitch);
  const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
  const ry2 = ry * cosP - rz * sinP;
  const rz2 = ry * sinP + rz * cosP;
  ry = ry2; rz = rz2;
  // Rotate around Z by -roll.
  const roll = degToRad(-cam.roll);
  const cosR = Math.cos(roll), sinR = Math.sin(roll);
  const rx2 = rx * cosR - ry * sinR;
  const ry3 = rx * sinR + ry * cosR;
  rx = rx2; ry = ry3;
  if (rz < 2) return null;
  const s = cam.fov / rz;
  return { x: cam.cx + rx * s, y: cam.cy - ry * s, d: rz, s };
}

// Bearing (deg, relative to the camera heading) and elevation of a direction.
export function bearingOf(cam, x, y, z) {
  const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
  const yaw = degToRad(cam.yaw);
  const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
  const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
  const along = dx * fwdX + dz * fwdZ;
  const across = dx * rightX + dz * rightZ;
  return {
    bearing: Math.atan2(across, along) * 180 / Math.PI,
    elev: Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI,
    dist: Math.hypot(dx, dy, dz),
  };
}
