// Ridge Runner: the world outside the cockpit — sky, sun, clouds, ridge
// layers, valley floor, river, road, runway and the glowing rings.
import { CONFIG } from './config.js';
import { project } from './camera.js';
import { ridgeSkyline, runwayCorners } from './terrain.js';

export function drawSky(ctx, cam, time, mood) {
  const W = CONFIG.canvasWidth, H = CONFIG.canvasHeight;
  const C = CONFIG.colours;
  const pal = mood === 'storm'
    ? [C.stormTop, C.stormMid, C.stormLow]
    : mood === 'dusk'
      ? [C.duskTop, C.duskMid, C.duskLow]
      : [C.skyTop, C.skyMid, C.skyLow];
  const g = ctx.createLinearGradient(0, 0, 0, CONFIG.horizonY + 40);
  g.addColorStop(0, pal[0]);
  g.addColorStop(0.55, pal[1]);
  g.addColorStop(1, pal[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, CONFIG.horizonY + 42);

  // Sun: fixed in the world at bearing -38 deg, elevation 16 deg.
  const sunBearing = -38, sunElev = 16;
  const sx = CONFIG.canvasWidth / 2 + Math.tan((sunBearing * Math.PI) / 180) * CONFIG.fov;
  const sy = CONFIG.horizonY - Math.tan((sunElev * Math.PI) / 180) * CONFIG.fov;
  const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 130);
  glow.addColorStop(0, 'rgba(255, 244, 200, 0.95)');
  glow.addColorStop(0.25, 'rgba(255, 220, 140, 0.55)');
  glow.addColorStop(1, 'rgba(255, 220, 140, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 140, sy - 140, 280, 280);
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath();
  ctx.arc(sx, sy, 26, 0, Math.PI * 2);
  ctx.fill();
}

export function drawClouds(ctx, cam, clouds, time) {
  for (const c of clouds) {
    const cx = c.x + Math.sin(time * 0.05 + c.z) * 30 + c.speed * time * 0.4;
    const p = project(cam, cx, c.y, c.z);
    if (!p || p.d > 9000) continue;
    const r = c.r * p.s * 0.9;
    if (r < 2) continue;
    const shade = Math.round(235 * c.shade);
    ctx.fillStyle = `rgba(${shade}, ${shade + 6}, ${shade + 12}, 0.85)`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.36, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - r * 0.55, p.y + r * 0.08, r * 0.6, r * 0.26, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + r * 0.55, p.y + r * 0.06, r * 0.62, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Far ridge silhouettes: sample the skyline across the view and fill down.
export function drawRidges(ctx, cam) {
  const W = CONFIG.canvasWidth, H = CONFIG.canvasHeight;
  const layers = [
    { col: CONFIG.colours.ridgeFar, base: 0.30, scale: 1.0 },
    { col: CONFIG.colours.ridgeMid, base: 0.52, scale: 1.35 },
    { col: CONFIG.colours.ridgeNear, base: 0.78, scale: 1.8 },
  ];
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    ctx.fillStyle = L.col;
    ctx.beginPath();
    ctx.moveTo(0, H);
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const sx = (i / steps) * W;
      const bearing = ((sx - W / 2) / CONFIG.fov) * (180 / Math.PI) * 0.9;
      const sky = ridgeSkyline(bearing, li) * L.scale;
      const y = CONFIG.horizonY - sky * 260 * L.base - 8;
      ctx.lineTo(sx, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    // Snow caps on the nearest layer's high points.
    if (li === 2) {
      ctx.fillStyle = CONFIG.colours.snow;
      for (let i = 0; i <= steps; i++) {
        const sx = (i / steps) * W;
        const bearing = ((sx - W / 2) / CONFIG.fov) * (180 / Math.PI) * 0.9;
        const sky = ridgeSkyline(bearing, li) * L.scale;
        if (sky > 0.62) {
          const y = CONFIG.horizonY - sky * 260 * L.base - 8;
          ctx.beginPath();
          ctx.ellipse(sx, y + 6, 26, 12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

// Valley floor: transverse strips from near to far, with fields, a river and
// a road. Strips are drawn far-to-near so nearer ground covers farther.
export function drawGround(ctx, cam, plane, time) {
  const W = CONFIG.canvasWidth, H = CONFIG.canvasHeight;
  const C = CONFIG.colours;
  const halfW = CONFIG.valleyHalfWidth + 260;
  const strips = [];
  let d = 24;
  while (d < 3400) {
    strips.push(d);
    d *= 1.22;
  }
  strips.reverse();
  for (let i = 0; i < strips.length; i++) {
    const z0 = plane.z + strips[i];
    const z1 = plane.z + (strips[i + 1] || strips[i] * 1.22);
    const a = project(cam, -halfW, 0, z0);
    const b = project(cam, halfW, 0, z0);
    const c = project(cam, halfW, 0, z1);
    const e = project(cam, -halfW, 0, z1);
    if (!a || !b || !c || !e) continue;
    const band = Math.floor(z0 / 260) % 3;
    ctx.fillStyle = [C.groundFar, C.fieldA, C.fieldB][band];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y); ctx.lineTo(e.x, e.y);
    ctx.closePath(); ctx.fill();

    // River: a meandering band left of centre.
    const rx0 = Math.sin(z0 * 0.0011) * 130 - 60;
    const rx1 = Math.sin(z1 * 0.0011) * 130 - 60;
    const r1 = project(cam, rx0 - 16, 0.4, z0);
    const r2 = project(cam, rx0 + 16, 0.4, z0);
    const r3 = project(cam, rx1 + 16, 0.4, z1);
    const r4 = project(cam, rx1 - 16, 0.4, z1);
    if (r1 && r2 && r3 && r4) {
      ctx.fillStyle = C.river;
      ctx.beginPath();
      ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y);
      ctx.lineTo(r3.x, r3.y); ctx.lineTo(r4.x, r4.y);
      ctx.closePath(); ctx.fill();
    }
    // Road: a straight band right of centre with a dashed centre line.
    const d1 = project(cam, 118, 0.4, z0);
    const d2 = project(cam, 132, 0.4, z0);
    const d3 = project(cam, 132, 0.4, z1);
    const d4 = project(cam, 118, 0.4, z1);
    if (d1 && d2 && d3 && d4) {
      ctx.fillStyle = C.road;
      ctx.beginPath();
      ctx.moveTo(d1.x, d1.y); ctx.lineTo(d2.x, d2.y);
      ctx.lineTo(d3.x, d3.y); ctx.lineTo(d4.x, d4.y);
      ctx.closePath(); ctx.fill();
    }
  }
}

export function drawRunway(ctx, cam, time) {
  const C = CONFIG.colours;
  const corners = runwayCorners().map((p) => project(cam, p.x, p.y, p.z));
  if (corners.some((p) => !p)) return;
  // Strip surface.
  ctx.fillStyle = C.runway;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (const p of corners) ctx.lineTo(p.x, p.y);
  ctx.closePath(); ctx.fill();
  // Centreline dashes.
  ctx.strokeStyle = C.runwayLine;
  ctx.lineWidth = 2;
  const r = CONFIG.runway;
  for (let z = r.z - r.length / 2 + 40; z < r.z + r.length / 2 - 20; z += 90) {
    const p1 = project(cam, 0, 0.8, z);
    const p2 = project(cam, 0, 0.8, z + 45);
    if (!p1 || !p2) continue;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }
  // Threshold bars at both ends.
  for (const tz of [r.z - r.length / 2 + 18, r.z + r.length / 2 - 18]) {
    const p1 = project(cam, -14, 0.8, tz);
    const p2 = project(cam, 14, 0.8, tz);
    if (!p1 || !p2) continue;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }
  // Edge lights, pulsing gently.
  const pulse = 0.55 + 0.45 * Math.sin(time * 2.4);
  ctx.fillStyle = `rgba(255, 240, 170, ${pulse})`;
  for (let z = r.z - r.length / 2; z <= r.z + r.length / 2; z += 120) {
    for (const x of [-r.width / 2 - 3, r.width / 2 + 3]) {
      const p = project(cam, x, 1.2, z);
      if (!p) continue;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Windsock at the threshold.
  const wp = project(cam, -r.width / 2 - 26, 0, r.z - r.length / 2 + 30);
  if (wp) {
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(wp.x, wp.y); ctx.lineTo(wp.x, wp.y - 26); ctx.stroke();
    ctx.fillStyle = '#ff7a3c';
    ctx.beginPath();
    ctx.moveTo(wp.x, wp.y - 26);
    ctx.lineTo(wp.x + 16, wp.y - 22);
    ctx.lineTo(wp.x + 16, wp.y - 16);
    ctx.lineTo(wp.x, wp.y - 18);
    ctx.closePath(); ctx.fill();
  }
  // Strip name painted on the threshold.
  const np = project(cam, 0, 1, r.z - r.length / 2 + 90);
  if (np && np.d < 2400) {
    ctx.fillStyle = 'rgba(242,242,232,0.9)';
    ctx.font = `bold ${Math.max(11, 6200 / np.d)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(r.name, np.x, np.y);
  }
}

export function drawRings(ctx, cam, rings, nextIndex, time) {
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    const p = project(cam, ring.x, ring.y, ring.z);
    if (!p || p.d < 8 || p.d > 5200) continue;
    const radius = (ring.r * p.s);
    if (radius < 3) continue;
    const isNext = i === nextIndex;
    const col = ring.passed ? CONFIG.colours.ringDone
      : ring.missed ? CONFIG.colours.ringMissed
      : isNext ? CONFIG.colours.ringNext : 'rgba(200, 220, 240, 0.75)';
    const pulse = isNext ? 0.75 + 0.25 * Math.sin(time * 5) : 1;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(3, radius * 0.14);
    ctx.shadowColor = col;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1.5, radius * 0.05);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    if (isNext) {
      ctx.fillStyle = col;
      ctx.font = `bold ${Math.max(13, radius * 0.42)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), p.x, p.y - radius - 10);
    }
    ctx.restore();
  }
}
